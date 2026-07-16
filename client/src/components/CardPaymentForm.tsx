import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getStripePromise } from "../lib/stripe";

interface CardPaymentFormProps {
  clientSecret: string;
  orderId: string;
  total: number;
  onSuccess: () => void;
}

/** Inner form — needs to be inside <Elements> to use useStripe/useElements. */
function PayButton({ orderId, total, onSuccess }: { orderId: string; total: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function onPay() {
    if (!stripe || !elements) return;
    setErr("");
    setSubmitting(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message || "Невалидни данни за плащане");

      // Card payments (and most wallets) resolve without leaving the page.
      // A few payment methods DO require a redirect — for those, Stripe
      // sends the shopper to return_url and back; we remember the order id
      // so Checkout can pick the flow back up after the redirect.
      localStorage.setItem("pendingCardOrderId", orderId);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}${window.location.pathname}#/checkout`,
        },
        redirect: "if_required",
      });

      if (error) throw new Error(error.message || "Плащането не бе успешно");

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        localStorage.removeItem("pendingCardOrderId");
        onSuccess();
      } else {
        throw new Error("Плащането не бе завършено");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Плащането не бе успешно");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      <PaymentElement />
      {err && <p className="checkoutError">{err}</p>}
      <button
        type="button"
        onClick={onPay}
        disabled={!stripe || submitting}
        className="checkoutPrimaryBtn"
      >
        {submitting ? "Обработка..." : `Плати ${total.toFixed(2)} €`}
      </button>
    </div>
  );
}

export default function CardPaymentForm({ clientSecret, orderId, total, onSuccess }: CardPaymentFormProps) {
  const stripePromise = getStripePromise();
  if (!stripePromise) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PayButton orderId={orderId} total={total} onSuccess={onSuccess} />
    </Elements>
  );
}
