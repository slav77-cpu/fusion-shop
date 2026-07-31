import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { API_URL } from "../lib/api";
import type { CartItem, Paginated, Product } from "../types";
import "./Home.css";

interface HomeProps {
  cart?: CartItem[];
  onAdd?: (p: Product) => void;
  onInc?: (id: string) => void;
  onDec?: (id: string) => void;
}

export default function Home({ cart = [], onAdd, onInc, onDec }: HomeProps) {
  const [items, setItems] = useState<Product[]>([]);
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
        const data = (await res.json()) as Paginated<Product>;
        if (!cancelled) setItems(data.items || []);
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

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="heroEyebrow">Ежедневни консумативи</div>
        <h1 className="heroTitle">Всичко за дома, доставено бързо.</h1>
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

      {/* Two paths */}
      <section className="pathGrid">
        <Link to="/products" className="pathCard">
          <div className="pathIcon pathIcon--grid">
            <span /><span /><span /><span />
          </div>
          <div className="pathTitle">Пазаруваш за дома?</div>
          <div className="pathText">Поръчай отделни бутилки и пакети, доставени като от всеки онлайн магазин.</div>
          <div className="pathLink">Разгледай продуктите →</div>
        </Link>

        <Link to="/wholesale" className="pathCard">
          <div className="pathIcon pathIcon--bars">
            <span /><span /><span />
          </div>
          <div className="pathTitle">Купуваш за бизнес?</div>
          <div className="pathText">Хотели, офиси и магазини получават цени на кашон и палет с обемни отстъпки.</div>
          <div className="pathLink">Виж цени на едро →</div>
        </Link>
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

        <div className="hotScroll">
          {items.map((p) => (
            <div className="hotScroll__item" key={p.id}>
              <ProductCard
                p={p}
                qty={cart.find((x) => x.id === p.id)?.qty ?? 0}
                onAdd={onAdd}
                onInc={onInc}
                onDec={onDec}
              />
            </div>
          ))}
        </div>

        {!loading && !err && items.length === 0 && (
          <p className="msg">Няма продукти.</p>
        )}
      </section>

      {/* Bulk CTA band */}
      <section className="bulkBand">
        <div className="bulkBandTitle">Стокираш хотел, офис или магазин?</div>
        <div className="bulkBandText">
          Получи цени на кашон и палет за целия ни каталог, с отстъпки, които растат с обема на поръчката.
        </div>
        <Link to="/wholesale" className="btn btnPrimary">
          Разгледай цени на едро
        </Link>
      </section>

      <footer className="homeFooter">
        <span>© {new Date().getFullYear()} FUSION</span>
        <div className="homeFooter__links">
          <Link to="/products">Продукти</Link>
          <Link to="/wholesale">На едро</Link>
          <Link to="/contact">Контакти</Link>
        </div>
      </footer>
    </div>
  );
}
