import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Cart.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function resolveImageUrl(url) {
  if (!url) return "/no-image.png";
  // Already absolute (http/https) or data URL
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  // If it's a public asset path, keep it
  if (url === "/no-image.png") return url;
  // If backend returns a relative path like /uploads/..., prefix API
  if (url.startsWith("/")) return `${API_URL}${url}`;
  // If backend returns uploads/... without leading slash
  return `${API_URL}/${url}`;
}

export default function Cart({ cart, onInc, onDec, onRemove, onClear }) {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState(null);

  return (
    <div className="cartPage">
      <h1 className="cartTitle">Количка</h1>

      {cart.length === 0 && <p className="cartEmpty">Количката е празна.</p>}

      {cart.length > 0 && (
        <>
          <div className="cartList">
            {cart.map((i) => (
              <div
                key={i._id}
                className={`cartRow ${removingId === i._id ? "cartRow--removing" : ""}`}
              >
                <div className="cartImageWrap">
                  <img
                    src={resolveImageUrl(i.imageUrl || i.image || (Array.isArray(i.images) ? i.images[0] : ""))}
                    alt={i.title}
                    className="cartImage"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/no-image.png";
                    }}
                  />
                </div>

                <div className="cartInfo">
                  <div className="cartItemTitle">
                    {i.title} {i.variantName ? `— ${i.variantName}` : ""}
                  </div>
                  <div className="cartMeta">{i.packLabel || ""}</div>
                  <div className="cartPrice">{i.price.toFixed(2)} € / бр.</div>
                </div>

                <div className="cartRight">
                  <div className="cartQty">
                    <button onClick={() => onDec(i._id)} className="qtyBtn">-</button>
                    <div className="qtyVal">{i.qty}</div>
                    <button onClick={() => onInc(i._id)} className="qtyBtn">+</button>
                  </div>

                  <div className="cartLineTotal">
                    {(i.price * i.qty).toFixed(2)} €
                  </div>

                  <button
                    onClick={() => {
                      setRemovingId(i._id);
                      setTimeout(() => {
                        onRemove(i._id);
                        setRemovingId(null);
                      }, 250);
                    }}
                    className="removeBtn"
                  >
                    Премахни
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cartFooter">
            <div className="cartTotal">Общо: {total.toFixed(2)} €</div>

            <div className="cartActions">
              <button onClick={onClear} className="ghostBtn">Изчисти количката</button>
              <button
                onClick={() => navigate("/checkout")}
                className="primaryBtn"
              >
                Поръчай →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
