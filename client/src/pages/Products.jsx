import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import "./Products.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Products({ onAdd }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL params
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const brand = searchParams.get("brand") || "";
  const sort = searchParams.get("sort") || "newest";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "10");

  // data
  const [meta, setMeta] = useState({ categories: [], brands: [] });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function setParams(next) {
    const sp = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => {
      if (v === "" || v === null || v === undefined) sp.delete(k);
      else sp.set(k, String(v));
    });
    navigate(`/products?${sp.toString()}`);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/products/meta`);
        const data = await res.json();
        setMeta(data);
      } catch {
        // not critical
      }
    })();
  }, []);

  const url = useMemo(() => {
    const u = new URL(`${API_URL}/products`);
    if (q) u.searchParams.set("q", q);
    if (category) u.searchParams.set("category", category);
    if (brand) u.searchParams.set("brand", brand);
    if (sort) u.searchParams.set("sort", sort);
    if (minPrice) u.searchParams.set("minPrice", minPrice);
    if (maxPrice) u.searchParams.set("maxPrice", maxPrice);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    return u.toString();
  }, [q, category, brand, sort, minPrice, maxPrice, page, limit]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
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
    <div className="productsPage">
      <h1 className="productsTitle">Продукти</h1>

      {/* Filters row */}
      <div className="filtersGrid">
        <select value={sort} onChange={(e) => setParams({ sort: e.target.value, page: 1 })}>
          <option value="newest">Най-нови</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="title_asc">Име A–Z</option>
        </select>

        <select value={category} onChange={(e) => setParams({ category: e.target.value, page: 1 })}>
          <option value="">Всички категории</option>
          {meta.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={brand} onChange={(e) => setParams({ brand: e.target.value, page: 1 })}>
          <option value="">Всички марки</option>
          {meta.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select value={limit} onChange={(e) => setParams({ limit: e.target.value, page: 1 })}>
          <option value="5">5 / page</option>
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
        </select>
      </div>

      {/* Price filter */}
      <div className="priceRow">
        <input
          value={minPrice}
          onChange={(e) => setParams({ minPrice: e.target.value, page: 1 })}
          placeholder="Мин. цена"
        />
        <input
          value={maxPrice}
          onChange={(e) => setParams({ maxPrice: e.target.value, page: 1 })}
          placeholder="Макс. цена"
        />

        <button
          className="resetBtn"
          onClick={() =>
            setParams({
              category: "",
              brand: "",
              sort: "newest",
              minPrice: "",
              maxPrice: "",
              page: 1,
              limit: 10,
            })
          }
        >
          Изчисти
        </button>

        <div className="totalBox">
          Общо: <b>{total}</b>
        </div>
      </div>

      {loading && <p className="msg">Зареждане...</p>}
      {err && <p className="msg msgError">{err}</p>}

      <div className="productsGrid">
        {items.map((p) => (
          <ProductCard key={p._id} p={p} onAdd={onAdd} />
        ))}
      </div>

      {!loading && !err && items.length === 0 && <p className="msg">Няма резултати.</p>}

      {/* Pagination */}
      <div className="pager">
        <button
          className="pagerBtn"
          onClick={() => setParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
        >
          ← Предишна
        </button>

        <div className="pagerText">
          Страница <b>{page}</b> / <b>{pages}</b>
        </div>

        <button
          className="pagerBtn"
          onClick={() => setParams({ page: Math.min(pages, page + 1) })}
          disabled={page >= pages}
        >
          Следваща →
        </button>
      </div>
    </div>
  );
}
