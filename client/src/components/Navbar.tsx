import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import { clearAdminToken } from "../utils/adminAuth";
import "./Navbar.css";

interface NavbarProps {
  cartCount?: number;
  isAdmin?: boolean;
  onAdminLogout?: () => void;
}

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const ShopIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);

const CartIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="7" width="16" height="14" rx="2" />
    <path d="M8 7V6a4 4 0 0 1 8 0v1" />
  </svg>
);

const AdminIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export default function Navbar({ cartCount = 0, isAdmin = false, onAdminLogout }: NavbarProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");

  // keep search box synced with URL
  useEffect(() => {
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav__link ${isActive ? "is-active" : ""}`;

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `tabbar__link ${isActive ? "is-active" : ""}`;

  function handleLogout() {
    clearAdminToken();
    onAdminLogout?.();
    window.location.href = "/";
  }

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/" className="nav__brand">
            FUSION
          </NavLink>

          <nav className="nav__links">
            <NavLink to="/" end className={linkClass}>
              Начало
            </NavLink>
            <NavLink to="/products" className={linkClass}>
              Продукти
            </NavLink>

            {isAdmin && (
              <>
                <NavLink to="/admin/products" className={linkClass}>
                  Склад
                </NavLink>
                <NavLink to="/admin/orders" className={linkClass}>
                  Поръчки
                </NavLink>
              </>
            )}
          </nav>

          <form onSubmit={onSubmit} className="nav__search">
            <svg className="nav__searchIcon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене"
              className="nav__input"
            />
          </form>

          <div className="nav__right">
            {isAdmin && (
              <button type="button" className="nav__logout" onClick={handleLogout}>
                Изход
              </button>
            )}

            <NavLink to="/cart" aria-label="Количка" className="nav__cart">
              <CartIcon />
              {cartCount > 0 && <span className="nav__badge">{cartCount}</span>}
            </NavLink>
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Основна навигация">
        <NavLink to="/" end className={tabClass}>
          <HomeIcon />
          <span>Начало</span>
        </NavLink>
        <NavLink to="/products" className={tabClass}>
          <ShopIcon />
          <span>Магазин</span>
        </NavLink>
        <NavLink to="/cart" className={tabClass}>
          <span className="tabbar__cartIcon">
            <CartIcon />
            {cartCount > 0 && <span className="tabbar__badge">{cartCount}</span>}
          </span>
          <span>Количка</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin/products" className={tabClass}>
            <AdminIcon />
            <span>Админ</span>
          </NavLink>
        )}
      </nav>
    </>
  );
}
