import "./ProductCard.css";

export default function ProductCard({ p, onAdd }) {
  const title = `${p.title}${p.variantName ? ` — ${p.variantName}` : ""}`;

  const pack =
    p.packLabel ||
    (p.sizeMl ? `${p.sizeMl} ml` : "") ||
    (p.pcs ? `${p.pcs} pcs` : "");

  const image = p.imageUrl || "/no-image.png";

  return (
    <div className="product-card">
      <div className="product-image-wrap">
        <img
          src={image}
          alt={title}
          className="product-image"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/no-image.png";
          }}
        />
      </div>

      <div className="product-main">
        <div className="product-title" title={title}>
          {title}
        </div>

        <div className="product-meta">
          {p.brand && <span>{p.brand}</span>}
          {p.brand && p.category && <span> • </span>}
          {p.category && <span>{p.category}</span>}
          {(p.brand || p.category) && pack && <span> • </span>}
          {pack && <span>{pack}</span>}
        </div>

        <div className="product-badges">
          <span className={p.inStock ? "badge in" : "badge out"}>
            {p.inStock ? "В наличност" : "Няма наличност"}
          </span>

          {p.tag && <span className="badge tag">{p.tag}</span>}
        </div>
      </div>

      <div className="product-footer">
        <div className="product-price">{Number(p.price).toFixed(2)} €</div>

        <button
          className="add-btn"
          disabled={!p.inStock}
          onClick={() => onAdd?.(p)}
          type="button"
        >
          <span className="add-btn__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          <span>Добави в количката</span>
        </button>
      </div>
    </div>
  );
}