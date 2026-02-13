import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAdminToken } from "../utils/adminAuth";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [savingStatus, setSavingStatus] = useState(false);

  const url = useMemo(() => `${API_URL}/orders/${id}`, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(url, {
  headers: { Authorization: `Bearer ${getAdminToken()}` },
});
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `API error: ${res.status}`);
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function changeStatus(nextStatus) {
    if (!order) return;

    setSavingStatus(true);
    setErr("");
    try {
      const res = await fetch(`${API_URL}/orders/${order._id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `API error: ${res.status}`);

      // update UI instantly
      setOrder((prev) => ({ ...prev, status: data.status }));
    } catch (e) {
      setErr(e?.message || "Неуспешна промяна на статуса");
    } finally {
      setSavingStatus(false);
    }
  }

  const itemsCount = (order?.items || []).reduce((s, i) => s + (i.qty || 0), 0);
  const total = Number(order?.total || 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ marginTop: 18 }}>Детайли на поръчка</h1>
        <Link to="/admin/orders" style={{ opacity: 0.75, fontWeight: 800 }}>
          ← Назад към поръчки
        </Link>
      </div>

      {loading && <p>Зареждане...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {order && (
        <>
          <div
            style={{
              marginTop: 12,
              padding: 14,
              border: "1px solid #eee",
              borderRadius: 14,
              background: "white",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ opacity: 0.8 }}>
                <div><b>ID:</b> <span style={{ fontFamily: "monospace" }}>{order._id}</span></div>
                <div><b>Дата:</b> {fmtDate(order.createdAt)}</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{total.toFixed(2)} €</div>
                <div style={{ opacity: 0.8 }}>Артикули: <b>{itemsCount}</b></div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 950 }}>Клиент</div>
              <div><b>Име:</b> {order.customer?.name}</div>
              <div><b>Телефон:</b> {order.customer?.phone}</div>
              <div><b>Адрес:</b> {order.customer?.address}</div>
              {order.customer?.note ? <div><b>Бележка:</b> {order.customer.note}</div> : null}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>Статус:</div>

              <select
                value={order.status || "new"}
                onChange={(e) => changeStatus(e.target.value)}
                disabled={savingStatus}
                style={control}
              >
                <option value="new">Нови</option>
                <option value="confirmed">За изпращане</option>
                <option value="shipped">Изпратени</option>
                <option value="done">Приключени</option>
                <option value="cancelled">Отказани</option>
              </select>

              {savingStatus && <span style={{ opacity: 0.7 }}>Запис...</span>}

              <button
                onClick={() => navigate("/admin/orders")}
                style={{
                  ...btn,
                  marginLeft: "auto",
                  border: "none",
                  color: "white",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: "0 10px 18px rgba(22,163,74,0.28)",
                }}
              >
                Готово
              </button>
            </div>
          </div>

          <h2 style={{ marginTop: 18 }}>Артикули</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {(order.items || []).map((it, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  border: "1px solid #eee",
                  borderRadius: 14,
                  background: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 950 }}>
                    {it.title} {it.variantName ? `— ${it.variantName}` : ""}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    {Number(it.price).toFixed(2)} € / бр.
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 950 }}>x{it.qty}</div>
                  <div style={{ fontWeight: 950 }}>
                    {(Number(it.price) * Number(it.qty)).toFixed(2)} €
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const control = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
};

const btn = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}
