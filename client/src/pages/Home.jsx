import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import "./Home.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Home({ onAdd }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const url = useMemo(() => {
    const u = new URL(`${API_URL}/products`);
    u.searchParams.set("limit", "3");
    u.searchParams.set("page", "1");
    u.searchParams.set("sort", "newest");
    u.searchParams.set("tag", "hot"); // показва само Hot продукти
    return u.toString();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(data.items || []);
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
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <h1 className="heroTitle">Fusion Shop</h1>
        <p className="heroText">
          Консумативи и продукти за ежедневието — бърза поръчка с наложен платеж.
        </p>

        <div className="heroActions">
          <Link to="/products" className="btn btnPrimary">
            Разгледай каталога →
          </Link>

          <Link to="/products?category=shampoo" className="btn btnGhost">
            Шампоани
          </Link>

          <Link to="/products?category=razor-blades" className="btn btnGhost">
            Ножчета
          </Link>
        </div>
      </section>

      {/* Hot products */}
      <section className="hot">
        <div className="hotHeader">
          <h2 className="hotTitle">Топ продукти</h2>
          <Link to="/products" className="hotLink">
            Виж всички →
          </Link>
        </div>

        {loading && <p className="msg">Loading...</p>}
        {err && <p className="msg msgError">{err}</p>}

        <div className="hotGrid">
          {items.map((p) => (
            <ProductCard key={p._id} p={p} onAdd={onAdd} />
          ))}
        </div>

        {!loading && !err && items.length === 0 && (
          <p className="msg">Няма продукти.</p>
        )}
      </section>
    </div>
  );
}
