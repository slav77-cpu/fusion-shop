import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiSend } from "../lib/api";
import type { CartItem } from "../types";
import "./Checkout.css";

interface CheckoutProps {
  cart: CartItem[];
  onClear?: () => void;
}

interface CheckoutForm {
  name: string;
  phone: string;
  address: string;
  note: string;
}

// Card payments (Stripe) are implemented on the backend (routes/orders.ts
// card-intent + routes/payments.ts webhook, and the client has
// components/CardPaymentForm.tsx + lib/stripe.ts) but are switched off here
// for now — cash on delivery only. To bring it back, restore the payment
// method choice + <CardPaymentForm> wiring that used to be in this file.

export default function Checkout({ cart, onClear }: CheckoutProps) {
  const navigate = useNavigate();

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.price * i.qty, 0),
    [cart]
  );

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successId, setSuccessId] = useState("");

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setSuccessId("");

    if (cart.length === 0) {
      setErr("Количката е празна.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          note: form.note.trim(),
        },
        items: cart.map((i) => ({
          productId: i.id,
          title: i.title,
          variantName: i.variantName,
          price: i.price,
          qty: i.qty,
        })),
      };

      const data = await apiSend<{ orderId: string }>("/orders", "POST", payload);
      setSuccessId(data.orderId);
      onClear?.();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (successId) {
    return (
      <div className="checkoutPage">
        <div className="checkoutSuccessWrap">
          <div className="checkoutSuccessBadge">
            <div className="checkoutSuccessCheck">✓</div>
          </div>

          <h2 className="checkoutSuccessTitle">
            Поръчката е приета!
          </h2>

          <p className="checkoutSuccessSub">
            Номер на поръчка: <b>{successId}</b>
          </p>

          <button
            onClick={() => navigate("/products")}
            className="checkoutPrimaryBtn"
          >
            Назад към продуктите →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkoutPage">
      <h1 className="checkoutTitle">Checkout (Наложен платеж)</h1>

      <div className="checkoutSummary">
        <div className="checkoutSummaryRow">
          <span>Items:</span>
          <b>{cart.reduce((s, i) => s + i.qty, 0)}</b>
        </div>
        <div className="checkoutSummaryRow">
          <span>Total:</span>
          <b>{total.toFixed(2)} €</b>
        </div>
      </div>

      {err && <p className="checkoutError">{err}</p>}

      <form onSubmit={onSubmit} className="checkoutForm">
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          placeholder="Име и фамилия"
          required
        />
        <input
          name="phone"
          value={form.phone}
          onChange={onChange}
          placeholder="Телефон"
          required
        />
        <textarea
          name="address"
          value={form.address}
          onChange={onChange}
          placeholder="Адрес за доставка"
          required
          rows={3}
        />
        <textarea
          name="note"
          value={form.note}
          onChange={onChange}
          placeholder="Бележка (по желание)"
          rows={2}
        />

        <button
          disabled={loading}
          className="checkoutPrimaryBtn"
          type="submit"
        >
          {loading ? "Изпращам..." : "Поръчай"}
        </button>
      </form>
    </div>
  );
}
