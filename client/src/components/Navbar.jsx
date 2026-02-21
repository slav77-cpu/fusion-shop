import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearAdminToken } from "../utils/adminAuth";
import "./Navbar.css";

export default function Navbar({ cartCount = 0, isAdmin = false, onAdminLogout }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [open, setOpen] = useState(false);

  // keep search box synced with URL
  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function onSubmit(e) {
    e.preventDefault();
    const query = q.trim();
    setOpen(false);
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
  }

  const linkClass = ({ isActive }) => `nav__link ${isActive ? "is-active" : ""}`;

  function handleLogout() {
    clearAdminToken();
    onAdminLogout?.();
    window.location.href = "/";
  }

  return (
    <header className="nav">
      <div className="nav__inner">
        <div className="nav__left">

          {/* Brand */}
          <NavLink to="/" className="nav__brand" onClick={() => setOpen(false)}>
            Fusion
          </NavLink>

          <button
            className="nav__burger"
            type="button"
            aria-label="Меню"
            onClick={() => setOpen((o) => !o)}
          >
            ☰
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="nav__links">
          <NavLink to="/products" className={linkClass}>
            Продукти
          </NavLink>

          <NavLink to="/cart" className={linkClass}>
            Количка {cartCount > 0 && <span className="nav__badge">{cartCount}</span>}
          </NavLink>

          {isAdmin && (
            <>
              <NavLink to="/admin/products" className={linkClass}>
                Склад
              </NavLink>

              <NavLink to="/admin/orders" className={linkClass}>
                Поръчки
              </NavLink>

              <button type="button" className="nav__logout" onClick={handleLogout}>
                Изход
              </button>
            </>
          )}
        </nav>

        {/* Desktop search */}
        <form onSubmit={onSubmit} className="nav__search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Търсене..."
            className="nav__input"
          />
          <button type="submit" className="nav__btn">
            Търси
          </button>
        </form>

        {/* Mobile backdrop + drawer */}
        <div
          className={`nav__backdrop ${open ? "is-open" : ""}`}
          onClick={() => setOpen(false)}
        />

        <aside className={`nav__drawer ${open ? "is-open" : ""}`}>
          <div className="nav__drawerHeader">
            <span className="nav__brand">Меню</span>
            <button
              className="nav__close"
              type="button"
              aria-label="Затвори"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <nav className="nav__links">
            <NavLink
              to="/products"
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              Продукти
            </NavLink>

            <NavLink to="/cart" className={linkClass} onClick={() => setOpen(false)}>
              Количка {cartCount > 0 && <span className="nav__badge">{cartCount}</span>}
            </NavLink>

            {isAdmin && (
              <>
                <NavLink
                  to="/admin/products"
                  className={linkClass}
                  onClick={() => setOpen(false)}
                >
                  Склад
                </NavLink>

                <NavLink
                  to="/admin/orders"
                  className={linkClass}
                  onClick={() => setOpen(false)}
                >
                  Поръчки
                </NavLink>

                <button
                  type="button"
                  className="nav__logout"
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                >
                  Изход
                </button>
              </>
            )}
          </nav>

          {/* Mobile search inside drawer */}
          <form onSubmit={onSubmit} className="nav__search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене..."
              className="nav__input"
            />
            <button type="submit" className="nav__btn">
              Търси
            </button>
          </form>
        </aside>
      </div>
    </header>
  );
}