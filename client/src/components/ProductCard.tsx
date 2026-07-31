import { Link } from "react-router-dom";
import type { Product } from "../types";
import ProductImage from "./ProductImage";
import "./ProductCard.css";

interface ProductCardProps {
  p: Product;
  qty?: number;
  onAdd?: (p: Product) => void;
  onInc?: (id: string) => void;
  onDec?: (id: string) => void;
}

export default function ProductCard({ p, qty = 0, onAdd, onInc, onDec }: ProductCardProps) {
  const title = `${p.title}${p.variantName ? ` — ${p.variantName}` : ""}`;

  const pack =
    p.packLabel ||
    (p.sizeMl ? `${p.sizeMl} ml` : "") ||
    (p.pcs ? `${p.pcs} pcs` : "");

  return (
    <div className="product-card">
      <Link to={`/products/${p.id}`} className="product-card__link">
        <div className="product-image-wrap">
          <ProductImage src={p.imageUrl} alt={title} />
        </div>

        <div className="product-main">
          {p.category && <div className="product-eyebrow">{p.category}</div>}
          <div className="product-title" title={title}>
            {title}
          </div>

          <div className="product-meta">
            {p.brand && <span>{p.brand}</span>}
            {p.brand && pack && <span> • </span>}
            {pack && <span>{pack}</span>}
          </div>

          <div className="product-badges">
            <span className={p.inStock ? "badge in" : "badge out"}>
              {p.inStock ? "В наличност" : "Няма наличност"}
            </span>

            {p.tag && <span className="badge tag">{p.tag}</span>}
          </div>
        </div>
      </Link>

      <div className="product-footer">
        <div className="product-price">{Number(p.price).toFixed(2)} €</div>

        {qty > 0 ? (
          <div className="qty-stepper">
            <button
              type="button"
              className="qty-stepper__btn"
              onClick={() => onDec?.(p.id)}
              aria-label="Намали"
            >
              &minus;
            </button>
            <span className="qty-stepper__val">{qty}</span>
            <button
              type="button"
              className="qty-stepper__btn qty-stepper__btn--accent"
              onClick={() => onInc?.(p.id)}
              aria-label="Увеличи"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="add-btn"
            disabled={!p.inStock}
            onClick={() => onAdd?.(p)}
          >
            <span className="add-btn__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6.5 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.6L5.2 3.5H3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>Добави</span>
          </button>
        )}
      </div>
    </div>
  );
}
