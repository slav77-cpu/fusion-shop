import express, { type Request, type Response, type NextFunction } from "express";
import type Stripe from "stripe";
import { Prisma, PaymentStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { getStripe } from "../lib/stripe.js";
import { sendNewOrderEmail } from "../lib/mailer.js";

const router = express.Router();

/**
 * Stripe webhook. Must receive the RAW request body (not JSON-parsed) to
 * verify the signature — this route (and only this route) is mounted in
 * index.ts BEFORE the global `express.json()` middleware for that reason.
 *
 * Handles:
 *  - payment_intent.succeeded -> mark the Order paid, decrement stock now
 *    (stock is intentionally NOT reserved at checkout time for card orders;
 *    see routes/orders.ts).
 *  - payment_intent.payment_failed -> mark the Order failed.
 */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, next: NextFunction) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      return res.status(503).send("Stripe not configured");
    }

    let event: Stripe.Event;
    try {
      const signature = req.headers["stripe-signature"];
      if (!signature || Array.isArray(signature)) throw new Error("Missing stripe-signature header");
      event = stripe.webhooks.constructEvent(req.body as Buffer, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      } else if (event.type === "payment_intent.payment_failed") {
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: pi.id },
    include: { items: true },
  });
  if (!order) {
    console.warn(`Stripe webhook: no order found for PaymentIntent ${pi.id}`);
    return;
  }
  if (order.paymentStatus === PaymentStatus.paid) return; // already processed (webhook retries)

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (!item.productId) continue;
        const result = await tx.product.updateMany({
          where: { id: item.productId, stockQty: { gte: item.qty } },
          data: { stockQty: { decrement: item.qty } },
        });
        if (result.count === 0) {
          // Payment is already captured at this point — we don't reverse the
          // charge automatically. Log loudly so the admin can reconcile
          // manually (refund or fulfil from incoming stock).
          console.error(
            `Order ${order.id}: paid but insufficient stock for product ${item.productId} — needs manual review.`
          );
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.paid },
      });
    });

    void sendNewOrderEmail({ ...order, paymentStatus: PaymentStatus.paid });
  } catch (err) {
    console.error(`Failed to finalize paid order ${order.id}:`, err);
    throw err;
  }
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  try {
    await prisma.order.update({
      where: { stripePaymentIntentId: pi.id },
      data: { paymentStatus: PaymentStatus.failed },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      console.warn(`Stripe webhook: no order found for failed PaymentIntent ${pi.id}`);
      return;
    }
    throw err;
  }
}

export default router;
