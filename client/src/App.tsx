import { Routes, Route } from "react-router-dom";
import { useMemo, useState, useEffect, useRef } from "react";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetails from "./pages/AdminOrderDetails";
import AdminLogin from "./pages/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProducts from "./pages/AdminProducts";
import AdminProductForm from "./pages/AdminProductForm";
import AdminRevision from "./pages/AdminRevision";
import NotFound from "./pages/NotFound";

import { isAdminLoggedIn } from "./utils/adminAuth";
import type { CartItem, Product } from "./types";

export default function App() {
  // ✅ admin state (source of truth)
  const [isAdmin, setIsAdmin] = useState(() => isAdminLoggedIn());

  useEffect(() => {
    // in case token exists on first load
    setIsAdmin(isAdminLoggedIn());
  }, []);

  function handleAdminLogin() {
    setIsAdmin(true);
  }

  function handleAdminLogout() {
    setIsAdmin(false);
  }

  // cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]") as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addSoundRef = useRef<HTMLAudioElement | null>(null);

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.qty, 0),
    [cart]
  );

  function addToCart(p: Product) {
    if (!addSoundRef.current) {
      addSoundRef.current = new Audio("/sounds/pop.mp3");
      addSoundRef.current.volume = 0.35;
      addSoundRef.current.preload = "auto";
    }
    const s = addSoundRef.current;
    try {
      s.currentTime = 0;
      s.play();
    } catch {
      // ignore if browser blocks audio
    }

    setCart((prev) => {
      const existing = prev.find((x) => x.id === p.id);
      if (existing) {
        return prev.map((x) =>
          x.id === p.id ? { ...x, qty: x.qty + 1 } : x
        );
      }
      return [
        ...prev,
        {
          id: p.id,
          title: p.title,
          variantName: p.variantName,
          price: Number(p.price),
          packLabel: p.packLabel || (p.sizeMl ? `${p.sizeMl} ml` : ""),
          imageUrl: p.imageUrl || "",
          qty: 1,
        },
      ];
    });
  }

  function inc(id: string) {
    setCart((prev) =>
      prev.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x))
    );
  }

  function dec(id: string) {
    setCart((prev) =>
      prev
        .map((x) => (x.id === id ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <>
      <Navbar
        cartCount={cartCount}
        isAdmin={isAdmin}
        onAdminLogout={handleAdminLogout}
      />

      <Routes>
        <Route path="/" element={<Home onAdd={addToCart} />} />
        <Route path="/products" element={<Products onAdd={addToCart} />} />

        <Route
          path="/cart"
          element={
            <Cart
              cart={cart}
              onInc={inc}
              onDec={dec}
              onRemove={removeItem}
              onClear={clearCart}
            />
          }
        />

        <Route
          path="/checkout"
          element={<Checkout cart={cart} onClear={clearCart} />}
        />

        {/* ✅ Admin login (public) */}
        <Route
          path="/admin/login"
          element={<AdminLogin onAdminLogin={handleAdminLogin} />}
        />

        {/* ✅ Admin routes (protected) */}
        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute>
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/orders/:id"
          element={
            <ProtectedRoute>
              <AdminOrderDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute>
              <AdminProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <ProtectedRoute>
              <AdminProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/products/:id/edit"
          element={
            <ProtectedRoute>
              <AdminProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stock/revision"
          element={
            <ProtectedRoute>
              <AdminRevision />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
