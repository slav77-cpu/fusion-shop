import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL, apiSend, resolveImageUrl } from "../lib/api";
import { getAdminToken } from "../utils/adminAuth";
import type { Product } from "../types";

interface ProductFormState {
  title: string;
  variantName: string;
  brand: string;
  category: string;
  packLabel: string;
  price: string;
  imageUrl: string;
  stockQty: string;
  tag: string;
  groupId: string;
}

const emptyForm: ProductFormState = {
  title: "",
  variantName: "",
  brand: "",
  category: "",
  packLabel: "",
  price: "",
  imageUrl: "",
  stockQty: "0",
  tag: "",
  groupId: "",
};

export default function AdminProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // ако има id => edit
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState<ProductFormState>(emptyForm);

  const loadUrl = useMemo(() => (isEdit ? `/products/${id}` : ""), [isEdit, id]);

  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`${API_URL}${loadUrl}`, {
          headers: { Authorization: `Bearer ${getAdminToken()}` },
        });
        const data = (await res.json()) as Product & { message?: string };
        if (!res.ok) throw new Error(data?.message || `API error: ${res.status}`);

        if (!cancelled) {
          setForm({
            title: data.title || "",
            variantName: data.variantName || "",
            brand: data.brand || "",
            category: data.category || "",
            packLabel: data.packLabel || "",
            price: data.price !== undefined && data.price !== null ? String(data.price) : "",
            imageUrl: data.imageUrl || "",
            stockQty: data.stockQty !== undefined && data.stockQty !== null ? String(data.stockQty) : "0",
            tag: data.tag || "",
            groupId: data.groupId || "",
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Неуспешно зареждане на продукта");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, loadUrl]);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  function normalizePrice(raw: string) {
    // allow comma as decimal separator
    const s = String(raw ?? "").trim().replace(/,/g, ".");
    // keep only digits and dot
    const cleaned = s.replace(/[^0-9.]/g, "");
    // prevent multiple dots
    const parts = cleaned.split(".");
    const safe = parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
    return safe;
  }

  function onPriceChange(e: ChangeEvent<HTMLInputElement>) {
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

  async function onSubmit(e: FormEvent) {
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

      const qtyNum = Number(form.stockQty);
      if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 0) {
        throw new Error("Моля въведи валидно количество (цяло число, 0 или повече).");
      }

      const payload = {
        ...form,
        price: priceNum,
        stockQty: qtyNum,
      };

      await apiSend(isEdit ? `/products/${id}` : "/products", isEdit ? "PUT" : "POST", payload, {
        admin: true,
      });

      navigate("/admin/products");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Записът не успя");
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
            <input
              name="stockQty"
              value={form.stockQty}
              onChange={onChange}
              inputMode="numeric"
              placeholder="Бройки на склад"
              required
              style={input}
            />
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

const input: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "white",
};
