import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import ProductImage from "../components/ProductImage";
import { API_URL } from "../lib/api";
import type { CartItem, Paginated, Product } from "../types";
import "./ProductDetail.css";

interface ProductDetailProps {
  cart?: CartItem[];
  onAdd?: (p: Product, qty?: number) => void;
  onInc?: (id: string) => void;
  onDec?: (id: string) => void;
}

export default function ProductDetail({ cart = [], onAdd, onInc, onDec }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      setQty(1);
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = (await res.json()) as Product;
        if (cancelled) return;
        setProduct(data);

        const relUrl = new URL(`${API_URL}/products`);
        relUrl.searchParams.set("limit", "4");
        if (data.category) relUrl.searchParams.set("category", data.category);
        const relRes = await fetch(relUrl.toString());
        const relData = (await relRes.json()) as Paginated<Product>;
        if (!cancelled) {
          setRelated((relData.items || []).filter((p) => p.id !== data.id).slice(0, 4));
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Продуктът не е намерен");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pack = useMemo(() => {
    if (!product) return "";
    return product.packLabel || (product.sizeMl ? `${product.sizeMl} ml` : "") || (product.pcs ? `${product.pcs} pcs` : "");
  }, [product]);

  const specs = useMemo(() => {
    if (!product) return [];
    return [
      product.brand && { label: "Марка", value: product.brand },
      product.category && { label: "Категория", value: product.category },
      pack && { label: "Разфасовка", value: pack },
      { label: "Наличност", value: product.inStock ? "В наличност" : "Изчерпан" },
    ].filter(Boolean) as { label: string; value: string }[];
  }, [product, pack]);

  if (loading) return <div className="pdPage"><p className="msg">Зареждане...</p></div>;
  if (err || !product) return <div className="pdPage"><p className="msg msgError">{err || "Продуктът не е намерен"}</p></div>;

  const title = `${product.title}${product.variantName ? ` — ${product.variantName}` : ""}`;
  const cartQty = cart.find((x) => x.id === product.id)?.qty ?? 0;

  return (
    <div className="pdPage">
      <Link to="/products" className="pdBack">← Назад към продуктите</Link>

      <div className="pdGrid">
        <div className="pdImageWrap">
          <ProductImage src={product.imageUrl} alt={title} />
        </div>

        <div className="pdInfo">
          {product.category && <div className="pdEyebrow">{product.category}</div>}
          <h1 className="pdTitle">{title}</h1>
          {pack && <div className="pdSize">{pack}</div>}
          <div className="pdPrice">{Number(product.price).toFixed(2)} €</div>

          {product.description && <p className="pdDescription">{product.description}</p>}

          {specs.length > 0 && (
            <div className="pdSpecs">
              {specs.map((s) => (
                <div className="pdSpecRow" key={s.label}>
                  <span>{s.label}</span>
                  <span>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pdActions">
            <div className="pdQty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="pdQty__btn">
                &minus;
              </button>
              <span className="pdQty__val">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="pdQty__btn">
                +
              </button>
            </div>

            <button
              type="button"
              className="pdAddBtn"
              disabled={!product.inStock}
              onClick={() => onAdd?.(product, qty)}
            >
              Добави в количката
            </button>
          </div>

          {cartQty > 0 && (
            <div className="pdInCart">
              В количката: {cartQty} бр.
              <button type="button" onClick={() => onDec?.(product.id)} className="pdInCart__btn">&minus;</button>
              <button type="button" onClick={() => onInc?.(product.id)} className="pdInCart__btn">+</button>
            </div>
          )}

          <Link to="/wholesale" className="pdBulkBanner">
            Нужно ти е повече от няколко кашона? <span>Виж цени на едро →</span>
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pdRelated">
          <h2>Свързани продукти</h2>
          <div className="pdRelatedGrid">
            {related.map((p) => (
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
        </section>
      )}
    </div>
  );
}
