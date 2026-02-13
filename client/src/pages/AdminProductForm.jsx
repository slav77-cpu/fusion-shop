import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAdminToken } from "../utils/adminAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // ако има id => edit
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    title: "",
    variantName: "",
    brand: "",
    category: "",
    packLabel: "",
    price: "",
    imageUrl: "",
    inStock: true,
    tag: "",
    groupId: "",
  });

  const loadUrl = useMemo(() => (isEdit ? `${API_URL}/products/${id}` : ""), [isEdit, id]);

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(loadUrl, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `API error: ${res.status}`);

        if (!cancelled) {
          setForm({
            title: data.title || "",
            variantName: data.variantName || "",
            brand: data.brand || "",
            category: data.category || "",
            packLabel: data.packLabel || "",
            price: data.price ?? "",
            imageUrl: data.imageUrl || "",
            inStock: Boolean(data.inStock),
            tag: data.tag || "",
            groupId: data.groupId || "",
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Неуспешно зареждане на продукта");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, loadUrl]);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  function normalizePrice(raw) {
    // allow comma as decimal separator
    const s = String(raw ?? "").trim().replace(/,/g, ".");
    // keep only digits and dot
    const cleaned = s.replace(/[^0-9.]/g, "");
    // prevent multiple dots
    const parts = cleaned.split(".");
    const safe = parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
    return safe;
  }

  function onPriceChange(e) {
    const v = normalizePrice(e.target.value);
    setForm((p) => ({ ...p, price: v }));
  }

  function onPriceBlur() {
    const v = normalizePrice(form.price);
    if (!v) return;
    const n = Number(v);
    if (Number.isFinite(n)) {
      setForm((p) => ({ ...p, price: n.toFixed(2) }));
    }
  }

  function resolveImageUrl(url) {
    if (!url) return "";
    // absolute http(s) or data URL
    if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
    // if backend returns /uploads/..., prefix API
    if (url.startsWith("/")) return `${API_URL}${url}`;
    // otherwise treat as relative
    return url;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);

    try {
      const priceStr = normalizePrice(form.price);
      const priceNum = Number(priceStr);

      if (!form.title.trim()) {
        throw new Error("Моля въведи име на продукта.");
      }

      if (!Number.isFinite(priceNum)) {
        throw new Error("Моля въведи валидна цена.");
      }

      if (priceNum < 0) {
        throw new Error("Цената не може да е отрицателна.");
      }

      const payload = {
        ...form,
        price: priceNum,
      };

      const res = await fetch(isEdit ? `${API_URL}/products/${id}` : `${API_URL}/products`, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Записът не успя (${res.status})`);

      navigate("/admin/products");
    } catch (e2) {
      setErr(e2?.message || "Записът не успя");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h1 style={{ marginTop: 18 }}>{isEdit ? "Редактиране на продукт" : "Нов продукт"}</h1>
        <Link to="/admin/products" style={{ opacity: 0.8, fontWeight: 800 }}>
          ← Назад
        </Link>
      </div>

      {loading && <p>Зареждане...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!loading && (
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input name="title" value={form.title} onChange={onChange} placeholder="Име на продукта" required style={input} />
            <input name="variantName" value={form.variantName} onChange={onChange} placeholder="Вариант (по избор)" style={input} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input name="brand" value={form.brand} onChange={onChange} placeholder="Марка" style={input} />
            <input name="category" value={form.category} onChange={onChange} placeholder="Категория (напр. шампоан)" style={input} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 220px", gap: 10 }}>
            <input
              name="packLabel"
              value={form.packLabel}
              onChange={onChange}
              placeholder='Разфасовка (напр. "400 мл" / "5 бр.")'
              style={input}
            />
            <input
              name="price"
              value={form.price}
              onChange={onPriceChange}
              onBlur={onPriceBlur}
              inputMode="decimal"
              placeholder="Цена (€)"
              required
              style={input}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 12 }}>
              <input type="checkbox" name="inStock" checked={form.inStock} onChange={onChange} />
              В наличност
            </label>
          </div>

          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={onChange}
            placeholder="Снимка (линк или път до файл)"
            style={input}
          />

          {form.imageUrl?.trim() && (
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 14,
                background: "#fafafa",
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900, opacity: 0.8 }}>Преглед на снимка</div>
              <div
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 14,
                  background: "white",
                  border: "1px solid #eee",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <img
                  src={resolveImageUrl(form.imageUrl.trim())}
                  alt={form.title || "preview"}
                  style={{
                    maxWidth: "100%",
                    maxHeight: 220,
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    e.currentTarget.src = "/no-image.png";
                  }}
                />
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Ако линкът е грешен, ще видиш fallback картинката.
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input name="tag" value={form.tag} onChange={onChange} placeholder='Таг (по избор, напр. "Хит")' style={input} />
            <input name="groupId" value={form.groupId} onChange={onChange} placeholder="Група (по избор)" style={input} />
          </div>

          <button
            disabled={saving}
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
            {saving ? "Записване..." : "Запази"}
          </button>
        </form>
      )}
    </div>
  );
}

const input = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
};
