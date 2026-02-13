import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setAdminToken } from "../utils/adminAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AdminLogin({ onAdminLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function onChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Грешен потребител или парола");

      setAdminToken(data.token);
      onAdminLogin?.();
      navigate("/admin/orders");
    } catch (e2) {
      setErr(e2?.message || "Нещо се обърка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginTop: 18 }}>Вход за админ</h1>

      <Link to="/" style={{ display: "inline-block", marginTop: 6, opacity: 0.8, fontWeight: 800 }}>
        ← Обратно към магазина
      </Link>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 12,
          padding: 14,
          border: "1px solid #eee",
          borderRadius: 14,
          background: "white",
          display: "grid",
          gap: 10,
        }}
      >
        <input
          name="username"
          placeholder="Потребителско име"
          value={form.username}
          onChange={onChange}
          style={input}
          required
        />
        <input
          name="password"
          placeholder="Парола"
          type="password"
          value={form.password}
          onChange={onChange}
          style={input}
          required
        />

        <button
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            background: "#111",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {loading ? "Влизане..." : "Вход"}
        </button>
      </form>
    </div>
  );
}

const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
};
