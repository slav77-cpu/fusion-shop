import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAdminToken } from "../utils/adminAuth";
import "./AdminProducts.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AdminProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const q = (searchParams.get("q") || "").trim();
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const sort = searchParams.get("sort") || "newest";

  const [items, setItems] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [stockBusy, setStockBusy] = useState({});

  const [editingPriceId, setEditingPriceId] = useState(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [priceBusy, setPriceBusy] = useState({});
  const [toast, setToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  function setParams(next) {
    const sp = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined) sp.delete(k);
      else sp.set(k, String(v));
    });
    navigate(`/admin/products?${sp.toString()}`);
  }

  const url = useMemo(() => {
    const u = new URL(`${API_URL}/products`);
    if (q) u.searchParams.set("q", q);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    if (sort) u.searchParams.set("sort", sort);
    return u.toString();
  }, [q, page, limit, sort]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `API error: ${res.status}`);

      setItems(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      setErr(e?.message || "Нещо се обърка");
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1400);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function onDelete(id) {
    setDeleteTarget(id);
  }

  async function onToggleStock(p) {
    const id = p._id;
    if (stockBusy[id]) return;

    setStockBusy((m) => ({ ...m, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ inStock: !p.inStock }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Update failed (${res.status})`);

      setItems((prev) =>
        prev.map((x) => (x._id === id ? { ...x, inStock: !p.inStock } : x))
      );
    } catch (e) {
      alert(e?.message || "Неуспешна промяна");
    } finally {
      setStockBusy((m) => ({ ...m, [id]: false }));
    }
  }

  async function onSavePrice(p) {
    const id = p._id;
    if (priceBusy[id]) return;

    const nextPrice = Number(String(priceDraft).replace(",", "."));
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      alert("Невалидна цена");
      return;
    }

    setPriceBusy((m) => ({ ...m, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify({ price: nextPrice }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Update failed (${res.status})`);

      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, price: nextPrice } : x)));
      setEditingPriceId(null);
      showToast("Цената е обновена");
    } catch (e) {
      alert(e?.message || "Неуспешна промяна");
    } finally {
      setPriceBusy((m) => ({ ...m, [id]: false }));
    }
  }

  return (
    <div className="adminPage">
      {deleteTarget && (
        <div className="confirmOverlay" onClick={() => setDeleteTarget(null)}>
          <div className="confirmBox" onClick={(e) => e.stopPropagation()}>
            <div className="confirmTitle">Изтриване на продукт</div>
            <div className="confirmText">Сигурен ли си, че искаш да го изтриеш?</div>

            <div className="confirmActions">
              <button
                className="confirmCancel"
                onClick={() => setDeleteTarget(null)}
              >
                Отказ
              </button>

              <button
                className="confirmDelete"
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL}/products/${deleteTarget}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${getAdminToken()}` },
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data?.message || "Delete failed");
                    setDeleteTarget(null);
                    load();
                  } catch (e) {
                    alert(e?.message || "Неуспешно изтриване");
                    setDeleteTarget(null);
                  }
                }}
              >
                Изтрий
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="adminToast">{toast}</div>}

      <div className="adminHeader">
        <h1 className="adminTitle">Админ • Продукти</h1>
        <Link to="/admin/orders" className="adminOrdersLink">
          Поръчки →
        </Link>
      </div>

      <div className="adminControls">
        <input
          value={q}
          onChange={(e) => setParams({ q: e.target.value, page: 1 })}
          placeholder="Търсене..."
          className="adminControl"
        />

        <select
          value={limit}
          onChange={(e) => setParams({ limit: e.target.value, page: 1 })}
          className="adminControl"
        >
          <option value="10">10 / стр.</option>
          <option value="20">20 / стр.</option>
          <option value="50">50 / стр.</option>
        </select>

        <div className="adminRightControls">
          <div className="adminTotal">
            Общо: <b>{total}</b>
          </div>
          <Link to="/admin/products/new" className="adminNewBtn">
            + Нов продукт
          </Link>
        </div>
      </div>

      {loading && <p className="adminMsg">Зареждане...</p>}
      {err && <p className="adminMsgError">{err}</p>}

      <div className="adminTableWrap">
        <table className="adminTable">
          <thead>
            <tr>
              <th className="adminTh">
                <button
                  type="button"
                  className="adminThBtn"
                  onClick={() => {
                    const next = sort === "title_asc" ? "title_desc" : "title_asc";
                    setParams({ sort: next, page: 1 });
                  }}
                  title="Сортирай по име"
                >
                  Име {sort === "title_asc" ? "↑" : sort === "title_desc" ? "↓" : ""}
                </button>
              </th>

              <th className="adminTh">Марка</th>
              <th className="adminTh">Категория</th>
              <th className="adminTh">Опаковка</th>

              <th className="adminTh adminThRight">
                <button
                  type="button"
                  className="adminThBtn adminThBtnRight"
                  onClick={() => {
                    const next = sort === "price_asc" ? "price_desc" : "price_asc";
                    setParams({ sort: next, page: 1 });
                  }}
                  title="Сортирай по цена"
                >
                  Цена {sort === "price_asc" ? "↑" : sort === "price_desc" ? "↓" : ""}
                </button>
              </th>

              <th className="adminTh">Наличност</th>
              <th className="adminTh">Действия</th>
            </tr>
          </thead>

          <tbody>
            {items.map((p) => (
              <tr key={p._id} className="adminRow">
                <td className="adminTd">
                  <div style={{ fontWeight: 900 }}>
                    {p.title} {p.variantName ? `— ${p.variantName}` : ""}
                  </div>
                  <div className="adminId">{p._id}</div>
                </td>

                <td className="adminTd">{p.brand || "-"}</td>
                <td className="adminTd">{p.category || "-"}</td>
                <td className="adminTd">
                  {p.packLabel || (p.sizeMl ? `${p.sizeMl} ml` : p.pcs ? `${p.pcs} pcs` : "-")}
                </td>

                <td className="adminTd adminTdRight">
                  {editingPriceId === p._id ? (
                    <div className="priceWrap">
                      <input
                        value={priceDraft}
                        onChange={(e) => setPriceDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSavePrice(p);
                          if (e.key === "Escape") setEditingPriceId(null);
                        }}
                        className="priceInput"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => onSavePrice(p)}
                        disabled={!!priceBusy[p._id]}
                        className="miniBtn"
                        style={{ opacity: priceBusy[p._id] ? 0.6 : 1 }}
                        title="Запази"
                      >
                        💾
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPriceId(null)}
                        className="miniBtn"
                        title="Откажи"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="priceWrap">
                      <span className="priceVal">{Number(p.price).toFixed(2)} €</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPriceId(p._id);
                          setPriceDraft(String(Number(p.price).toFixed(2)));
                        }}
                        className="miniBtn"
                        title="Редактирай цена"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </td>

                <td className="adminTd">
                  <button
                    type="button"
                    onClick={() => onToggleStock(p)}
                    disabled={!!stockBusy[p._id]}
                    className={`stockBtn ${p.inStock ? "in" : "out"}`}
                    style={{
                      opacity: stockBusy[p._id] ? 0.6 : 1,
                      cursor: stockBusy[p._id] ? "not-allowed" : "pointer",
                    }}
                    title="Кликни, за да смениш наличността"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span aria-hidden="true">{p.inStock ? "✅" : "⛔"}</span>
                      <span>{p.inStock ? "В наличност" : "Няма"}</span>
                    </span>
                  </button>
                </td>

                <td className="adminTd">
                  <div className="adminActions">
                    <Link to={`/admin/products/${p._id}/edit`} className="editBtn">
                      Редакция
                    </Link>
                    <button onClick={() => onDelete(p._id)} className="deleteBtn">
                      Изтрий
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && !err && items.length === 0 && (
              <tr>
                <td className="adminTd" colSpan={7}>
                  Няма продукти.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="adminPager">
        <button
          onClick={() => setParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
          className="adminPagerBtn"
        >
          ← Предишна
        </button>

        <div className="adminPagerText">
          Страница <b>{page}</b> / <b>{pages}</b>
        </div>

        <button
          onClick={() => setParams({ page: Math.min(pages, page + 1) })}
          disabled={page >= pages}
          className="adminPagerBtn"
        >
          Следваща →
        </button>
      </div>
    </div>
  );
}