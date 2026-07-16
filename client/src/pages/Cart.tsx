import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { resolveImageUrl } from "../lib/api";
import type { CartItem } from "../types";
import "./Cart.css";

interface CartProps {
  cart: CartItem[];
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function Cart({ cart, onInc, onDec, onRemove, onClear }: CartProps) {
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState<string | null>(null);

  return (
    <div className="cartPage">
      <h1 className="cartTitle">Количка</h1>

      {cart.length === 0 && <p className="cartEmpty">Количката е празна.</p>}

      {cart.length > 0 && (
        <>
          <div className="cartList">
            {cart.map((i) => (
              <div
                key={i.id}
                className={`cartRow ${removingId === i.id ? "cartRow--removing" : ""}`}
              >
                <div className="cartImageWrap">
                  <img
                    src={resolveImageUrl(i.imageUrl)}
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
                    <button onClick={() => onDec(i.id)} className="qtyBtn">-</button>
                    <div className="qtyVal">{i.qty}</div>
                    <button onClick={() => onInc(i.id)} className="qtyBtn">+</button>
                  </div>

                  <div className="cartLineTotal">
                    {(i.price * i.qty).toFixed(2)} €
                  </div>

                  <button
                    onClick={() => {
                      setRemovingId(i.id);
                      setTimeout(() => {
                        onRemove(i.id);
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
