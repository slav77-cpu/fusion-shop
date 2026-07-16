import { useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setAdminToken } from "../utils/adminAuth";
import { apiSend } from "../lib/api";

interface AdminLoginProps {
  onAdminLogin?: () => void;
}

export default function AdminLogin({ onAdminLogin }: AdminLoginProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const data = await apiSend<{ token: string }>("/auth/login", "POST", {
        username: form.username.trim(),
        password: form.password,
      });

      setAdminToken(data.token);
      onAdminLogin?.();
      navigate("/admin/orders");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Нещо се обърка");
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

const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
};
