import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAdminToken } from "../utils/adminAuth";
import "./AdminOrders.css";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AdminOrders() {
    
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const status = searchParams.get("status") || ""; // "" = all
  const phone = (searchParams.get("phone") || "").trim();
  const name = (searchParams.get("name") || "").trim();
  const from = (searchParams.get("from") || "").trim();
  const to = (searchParams.get("to") || "").trim();

  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState("");
  const [nameInput, setNameInput] = useState(name);
  const [phoneInput, setPhoneInput] = useState(phone);
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);
  async function updateStatus(id, nextStatus) {
    if (busyId) return;
    setBusyId(id);

    try {
      const res = await fetch(`${API_URL}/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `API error: ${res.status}`);

      // update UI with the returned status
      setItems((prev) => prev.map((o) => (o._id === id ? { ...o, status: data.status } : o)));

      // toast
      setToast("Поръчката е приключена");
      window.clearTimeout(updateStatus._t);
      updateStatus._t = window.setTimeout(() => setToast(""), 1800);
    } catch (e) {
      alert(e?.message || "Неуспешна промяна на статуса");
    } finally {
      setBusyId(null);
    }
  }

  function setParams(next) {
    const sp = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined) sp.delete(k);
      else sp.set(k, String(v));
    });
    navigate(`/admin/orders?${sp.toString()}`);
  }

  // keep inputs in sync if URL changes (back/forward, manual edits)
  useEffect(() => {
    setNameInput(name);
    setPhoneInput(phone);
    setFromInput(from);
    setToInput(to);
  }, [name, phone, from, to]);

  // live (debounced) search
  useEffect(() => {
    const t = setTimeout(() => {
      setParams({
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        from: fromInput.trim(),
        to: toInput.trim(),
        page: 1,
      });
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameInput, phoneInput, fromInput, toInput]);

  const url = useMemo(() => {
    const u = new URL(`${API_URL}/orders`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    if (status) u.searchParams.set("status", status);
    if (name) u.searchParams.set("name", name);
    if (phone) u.searchParams.set("phone", phone);
    if (from) u.searchParams.set("from", from);
    if (to) u.searchParams.set("to", to);
    return u.toString();
  }, [page, limit, status, name, phone, from, to]);

  function yyyyMmDd(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function setRange(range) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    let f = "";
    let t = "";

    if (range === "today") {
      f = yyyyMmDd(startOfToday);
      t = yyyyMmDd(startOfToday);
    } else if (range === "yesterday") {
      const y = new Date(startOfToday);
      y.setDate(y.getDate() - 1);
      f = yyyyMmDd(y);
      t = yyyyMmDd(y);
    } else if (range === "week") {
      const w = new Date(startOfToday);
      w.setDate(w.getDate() - 6); // last 7 days incl today
      f = yyyyMmDd(w);
      t = yyyyMmDd(startOfToday);
    } else if (range === "month") {
      const m = new Date(startOfToday);
      m.setDate(1);
      f = yyyyMmDd(m);
      t = yyyyMmDd(startOfToday);
    }

    setFromInput(f);
    setToInput(t);
    setParams({ from: f, to: t, page: 1 });
  }

  function clearRange() {
    setFromInput("");
    setToInput("");
    setParams({ from: "", to: "", page: 1 });
  }

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

        if (!cancelled) {
          setItems(data.items || []);
          setPages(data.pages || 1);
          setTotal(data.total || 0);
        }
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

  return (
    <div className="aoPage">
      {toast && (
        <div className="aoToast">
          {toast}
        </div>
      )}
      <div className="aoHeader">
        <h1 style={{ marginTop: 18 }}>Админ • Поръчки</h1>
        <Link to="/" className="aoBack">
          ← Обратно към магазина
        </Link>
      </div>

      <div className="aoControls">
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Търси по име..."
          className="aoControl"
        />

        <input
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="Търси по телефон..."
          className="aoControl"
        />

        <div className="aoChips">
          <button type="button" className="aoChip" onClick={() => setRange("today")}>Днес</button>
          <button type="button" className="aoChip" onClick={() => setRange("yesterday")}>Вчера</button>
          <button type="button" className="aoChip" onClick={() => setRange("week")}>7 дни</button>
          <button type="button" className="aoChip" onClick={() => setRange("month")}>Този месец</button>
          <button type="button" className="aoChip aoChipGhost" onClick={clearRange}>Изчисти</button>
        </div>

        <input
          type="date"
          value={fromInput}
          onChange={(e) => setFromInput(e.target.value)}
          className="aoControl"
        />

        <input
          type="date"
          value={toInput}
          onChange={(e) => setToInput(e.target.value)}
          className="aoControl"
        />

        <select
          value={status}
          onChange={(e) => setParams({ status: e.target.value, page: 1 })}
          className="aoControl"
        >
          <option value="">Всички</option>
          <option value="new">Нови</option>
          <option value="confirmed">За изпращане</option>
          <option value="shipped">Изпратени</option>
          <option value="done">Приключени</option>
          <option value="cancelled">Отказани</option>
        </select>

        <select
          value={limit}
          onChange={(e) => setParams({ limit: e.target.value, page: 1 })}
          className="aoControl"
        >
          <option value="10">10 / стр.</option>
          <option value="20">20 / стр.</option>
          <option value="50">50 / стр.</option>
        </select>

        <div className="aoTotal">
          Общо: <b>{total}</b>
        </div>
      </div>

      {loading && <p className="aoMsg" style={{ marginTop: 12 }}>Зареждане...</p>}
      {err && <p className="aoMsg aoMsgError" style={{ marginTop: 12 }}>{err}</p>}

      <div className="aoTableWrap" style={{ marginTop: 12 }}>
        <table className="aoTable">
          <thead>
            <tr>
              <th className="aoTh">Дата</th>
              <th className="aoTh">Клиент</th>
              <th className="aoTh">Телефон</th>
              <th className="aoTh">Адрес</th>
              <th className="aoTh">Артикули</th>
              <th className="aoTh">Общо</th>
              <th className="aoTh">Статус</th>
              <th className="aoTh">Отвори</th>
            </tr>
          </thead>

          <tbody>
            {items.map((o) => {
              const itemsCount = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);

              return (
                <tr key={o._id} className="aoTr">
                  <td className="aoTd">{fmtDate(o.createdAt)}</td>
                  <td className="aoTd">{o.customer?.name}</td>
                  <td className="aoTd">{o.customer?.phone}</td>
                  <td className="aoTd">
                    <div className="aoAddr">
                      {o.customer?.address}
                    </div>
                  </td>
                  <td className="aoTd">{itemsCount}</td>
                  <td className="aoTd">
                    <b>{Number(o.total || 0).toFixed(2)} €</b>
                  </td>
                  <td className="aoTd">
                    <div className="aoStatusWrap">
                      <StatusPill status={o.status} />

                      {(o.status === "shipped" || o.status === "confirmed") && (
                        <button
                          type="button"
                          title="Маркирай като приключена"
                          onClick={() => updateStatus(o._id, "done")}
                          disabled={busyId === o._id}
                          className="aoDoneBtn"
                        >
                          ✅
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="aoTd">
                    <Link
                      to={`/admin/orders/${o._id}`}
                      className="aoOpenLink"
                    >
                      Отвори →
                    </Link>
                  </td>
                </tr>
              );
            })}

            {!loading && !err && items.length === 0 && (
              <tr>
                <td className="aoTd" colSpan={8}>
                  Няма поръчки.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="aoPager">
        <button
          onClick={() => setParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
          className="aoPagerBtn"
          style={{ opacity: page <= 1 ? 0.5 : 1 }}
        >
          ← Предишна
        </button>

        <div className="aoPagerText">
          Страница <b>{page}</b> / <b>{pages}</b>
        </div>

        <button
          onClick={() => setParams({ page: Math.min(pages, page + 1) })}
          disabled={page >= pages}
          className="aoPagerBtn"
          style={{ opacity: page >= pages ? 0.5 : 1 }}
        >
          Следваща →
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    new: "Нови",
    confirmed: "За изпращане",
    shipped: "Изпратени",
    done: "Приключени",
    cancelled: "Отказани",
  };

  const label = map[status] || status || "-";
  const cls = `statusPill ${status ? `status--${status}` : ""}`.trim();

  return <span className={cls}>{label}</span>;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}
