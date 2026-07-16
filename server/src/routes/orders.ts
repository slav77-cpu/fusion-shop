import express, { type Request, type Response, type NextFunction } from "express";
import { Prisma, OrderStatus, PaymentMethod, PaymentStatus, type Product } from "@prisma/client";
import { prisma } from "../config/db.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { serializeOrder } from "../lib/serialize.js";
import { getStripe } from "../lib/stripe.js";
import { sendNewOrderEmail } from "../lib/mailer.js";

const router = express.Router();

interface OrderItemInput {
  productId?: string;
  title?: string;
  variantName?: string;
  price?: number | string;
  qty: number | string;
}

interface CustomerInput {
  name?: string;
  phone?: string;
  address?: string;
  note?: string;
}

class InsufficientStockError extends Error {
  constructor(public productTitle: string, public available: number) {
    super(`Insufficient stock for "${productTitle}" (${available} left)`);
  }
}

class ProductNotFoundError extends Error {
  constructor(public productId: string) {
    super(`Product ${productId} not found`);
  }
}

/**
 * Validates the cart against the DB (never trusts client-submitted prices),
 * decrements stock atomically per line, and returns the data needed to
 * create the Order + OrderItems. Throws InsufficientStockError /
 * ProductNotFoundError on failure, which the caller turns into a 409/400.
 */
async function reserveItemsAndBuildOrderData(
  tx: Prisma.TransactionClient,
  items: OrderItemInput[]
): Promise<{ total: number; itemsData: Prisma.OrderItemCreateWithoutOrderInput[] }> {
  let total = 0;
  const itemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

  for (const raw of items) {
    const qty = Number(raw.qty);
    if (!raw.productId || !Number.isFinite(qty) || qty < 1) {
      throw new ProductNotFoundError(raw.productId || "(missing productId)");
    }

    const product: Product | null = await tx.product.findUnique({ where: { id: raw.productId } });
    if (!product) throw new ProductNotFoundError(raw.productId);

    // Atomic "decrement only if enough stock" — translates to a single
    // UPDATE ... WHERE id = ? AND stock_qty >= ?, safe under concurrent orders.
    const result = await tx.product.updateMany({
      where: { id: product.id, stockQty: { gte: qty } },
      data: { stockQty: { decrement: qty } },
    });
    if (result.count === 0) {
      throw new InsufficientStockError(product.title, product.stockQty);
    }

    const price = Number(product.price);
    total += price * qty;

    itemsData.push({
      product: { connect: { id: product.id } },
      title: product.title + (product.variantName ? ` — ${product.variantName}` : ""),
      variantName: product.variantName || "",
      price: new Prisma.Decimal(price),
      qty,
    });
  }

  return { total, itemsData };
}

function readCustomer(customer: CustomerInput | undefined) {
  if (!customer?.name || !customer?.phone || !customer?.address) return null;
  return {
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    customerNote: customer.note || "",
  };
}

// POST /orders — cash-on-delivery checkout (unchanged from the shopper's point of view)
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer, items } = (req.body || {}) as { customer?: CustomerInput; items?: OrderItemInput[] };

    const customerData = readCustomer(customer);
    if (!customerData) return res.status(400).json({ message: "Missing customer fields" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const order = await prisma.$transaction(async (tx) => {
      const { total, itemsData } = await reserveItemsAndBuildOrderData(tx, items);
      return tx.order.create({
        data: {
          ...customerData,
          total: new Prisma.Decimal(total),
          status: OrderStatus.new,
          paymentMethod: PaymentMethod.cod,
          paymentStatus: PaymentStatus.pending,
          items: { create: itemsData },
        },
        include: { items: true },
      });
    });

    res.status(201).json({ orderId: order.id });

    // Fire-and-forget: never let a mail hiccup affect the response above.
    void sendNewOrderEmail(order);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return res.status(409).json({ message: `Няма достатъчно наличност: ${err.productTitle} (${err.available} бр. остават)` });
    }
    if (err instanceof ProductNotFoundError) {
      return res.status(400).json({ message: "Продукт от количката вече не съществува" });
    }
    next(err);
  }
});

// POST /orders/card-intent — creates the Order (pending) + a Stripe PaymentIntent.
// Stock is only decremented once Stripe confirms the payment (see the webhook
// in routes/payments.ts) so an abandoned card payment never locks up inventory.
router.post("/card-intent", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: "Card payments are not configured on this server" });
    }

    const { customer, items } = (req.body || {}) as { customer?: CustomerInput; items?: OrderItemInput[] };

    const customerData = readCustomer(customer);
    if (!customerData) return res.status(400).json({ message: "Missing customer fields" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate against the DB and compute the authoritative total, but run it
    // as a read-only pass (no stock decrement yet — see comment above).
    let total = 0;
    const itemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    for (const raw of items) {
      const qty = Number(raw.qty);
      if (!raw.productId || !Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({ message: "Продукт от количката вече не съществува" });
      }
      const product = await prisma.product.findUnique({ where: { id: raw.productId } });
      if (!product) return res.status(400).json({ message: "Продукт от количката вече не съществува" });
      if (product.stockQty < qty) {
        return res.status(409).json({
          message: `Няма достатъчно наличност: ${product.title} (${product.stockQty} бр. остават)`,
        });
      }
      const price = Number(product.price);
      total += price * qty;
      itemsData.push({
        product: { connect: { id: product.id } },
        title: product.title + (product.variantName ? ` — ${product.variantName}` : ""),
        variantName: product.variantName || "",
        price: new Prisma.Decimal(price),
        qty,
      });
    }

    if (total <= 0) return res.status(400).json({ message: "Cart is empty" });

    const currency = process.env.STRIPE_CURRENCY || "eur";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency,
      automatic_payment_methods: { enabled: true },
    });

    const order = await prisma.order.create({
      data: {
        ...customerData,
        total: new Prisma.Decimal(total),
        status: OrderStatus.new,
        paymentMethod: PaymentMethod.card,
        paymentStatus: PaymentStatus.pending,
        stripePaymentIntentId: paymentIntent.id,
        items: { create: itemsData },
      },
    });

    res.status(201).json({ orderId: order.id, clientSecret: paymentIntent.client_secret });
  } catch (err) {
    next(err);
  }
});

// GET /orders?page=&limit=&status=
router.get("/", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20", status, phone, name, from, to } =
      req.query as Record<string, string | undefined>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status as OrderStatus;

    // Live search (case-insensitive)
    if (phone) {
      const p = String(phone).trim();
      if (p) where.customerPhone = { contains: p, mode: "insensitive" };
    }

    if (name) {
      const n = String(name).trim();
      if (n) where.customerName = { contains: n, mode: "insensitive" };
    }

    // Date range filter (createdAt)
    // expects from/to like: YYYY-MM-DD (from date inclusive, to date inclusive)
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (from) {
        const dFrom = new Date(String(from));
        if (!Number.isNaN(dFrom.getTime())) {
          dFrom.setHours(0, 0, 0, 0);
          createdAt.gte = dFrom;
        }
      }

      if (to) {
        const dTo = new Date(String(to));
        if (!Number.isNaN(dTo.getTime())) {
          dTo.setHours(23, 59, 59, 999);
          createdAt.lte = dTo;
        }
      }

      if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;
    }

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" }, // newest first
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      items: items.map(serializeOrder),
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id
router.get("/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = String(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(serializeOrder(order));
  } catch (err) {
    next(err);
  }
});

// PATCH /orders/:id/status
router.patch("/:id/status", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body || {};

    const allowed = ["new", "confirmed", "shipped", "done", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await prisma.order.update({
      where: { id: String(req.params.id) },
      data: { status: status as OrderStatus },
    });

    res.json({ id: order.id, status: order.status });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ message: "Order not found" });
    }
    next(err);
  }
});

export default router;
