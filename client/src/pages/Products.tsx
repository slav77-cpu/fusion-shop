import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { API_URL } from "../lib/api";
import type { CartItem, Paginated, Product, ProductsMeta } from "../types";
import "./Products.css";

interface ProductsProps {
  cart?: CartItem[];
  onAdd?: (p: Product) => void;
  onInc?: (id: string) => void;
  onDec?: (id: string) => void;
}

export default function Products({ cart = [], onAdd, onInc, onDec }: ProductsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL params
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const page = Number(searchParams.get("page") || "1");
  // No page-size picker in the UI (matches the mockup's flat, unpaginated
  // grid) — high enough that a small catalog fits on one screen.
  const limit = Number(searchParams.get("limit") || "24");

  // data
  const [meta, setMeta] = useState<ProductsMeta>({ categories: [], brands: [] });
  const [items, setItems] = useState<Product[]>([]);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function setParams(next: Record<string, string | number | null | undefined>) {
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
        const data = (await res.json()) as ProductsMeta;
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
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    return u.toString();
  }, [q, category, page, limit]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as Paginated<Product>;

        if (!cancelled) {
          setItems(data.items || []);
          setPages(data.pages || 1);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const cartTotalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotalPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="productsPage">
      <h1 className="productsTitle">Продукти</h1>

      <Link to="/wholesale" className="bulkBanner">
        Купуваш повече от няколко кашона? <span>Виж цени на едро →</span>
      </Link>

      {/* Category pills */}
      <div className="categoryRow">
        <button
          type="button"
          className={`categoryPill ${!category ? "is-active" : ""}`}
          onClick={() => setParams({ category: "", page: 1 })}
        >
          Всички
        </button>
        {meta.categories.map((c) => (
          <button
            type="button"
            key={c}
            className={`categoryPill ${category === c ? "is-active" : ""}`}
            onClick={() => setParams({ category: c, page: 1 })}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p className="msg">Зареждане...</p>}
      {err && <p className="msg msgError">{err}</p>}

      <div className="productsGrid">
        {items.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            qty={cart.find((x) => x.id === p.id)?.qty ?? 0}
            onAdd={onAdd}
            onInc={onInc}
            onDec={onDec}
          />
        ))}
      </div>

      {!loading && !err && items.length === 0 && <p className="msg">Няма резултати.</p>}

      {/* Pagination — only shown once the catalog outgrows one page */}
      {pages > 1 && (
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
      )}

      {cart.length > 0 && (
        <Link to="/cart" className="cartFloatBar">
          <span>
            {cartTotalItems} артикул{cartTotalItems === 1 ? "" : "а"} · {cartTotalPrice.toFixed(2)} €
          </span>
          <span className="cartFloatBar__cta">Виж количката →</span>
        </Link>
      )}
    </div>
  );
}
