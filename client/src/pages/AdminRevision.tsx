import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiSend } from "../lib/api";
import type { Product } from "../types";

interface RevisionRowState {
  draft: string;
  saving: boolean;
  savedAt: number | null;
}

export default function AdminRevision() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [rowState, setRowState] = useState<Record<string, RevisionRowState>>({});

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const data = await apiGet<{ items: Product[] }>(
        `/stock/products${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        { admin: true }
      );
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Нещо се обърка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function draftFor(p: Product) {
    return rowState[p.id]?.draft ?? String(p.stockQty);
  }

  function setDraft(id: string, value: string) {
    setRowState((prev) => ({ ...prev, [id]: { ...prev[id], draft: value, saving: false, savedAt: prev[id]?.savedAt ?? null } }));
  }

  async function onSave(p: Product) {
    const draft = draftFor(p);
    const counted = Number(draft);
    if (!Number.isFinite(counted) || counted < 0 || !Number.isInteger(counted)) {
      alert("Невалидно преброено количество");
      return;
    }

    setRowState((prev) => ({ ...prev, [p.id]: { draft, saving: true, savedAt: null } }));
    try {
      const res = await apiSend<{ product: Product }>(
        "/stock/audits",
        "POST",
        { productId: p.id, countedQty: counted },
        { admin: true }
      );

      setItems((prev) => prev.map((x) => (x.id === p.id ? res.product : x)));
      setRowState((prev) => ({ ...prev, [p.id]: { draft: String(counted), saving: false, savedAt: Date.now() } }));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Неуспешен запис на ревизията");
      setRowState((prev) => ({ ...prev, [p.id]: { ...prev[p.id], draft, saving: false, savedAt: null } }));
    }
  }

  const rows = useMemo(
    () =>
      items.map((p) => {
        const draft = draftFor(p);
        const countedNum = Number(draft);
        const hasValidDraft = Number.isFinite(countedNum) && Number.isInteger(countedNum) && countedNum >= 0;
        const difference = hasValidDraft ? countedNum - p.stockQty : null;
        return { p, draft, difference };
      }),
    // rowState is read via draftFor, so it must be a dep too
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, rowState]
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ marginTop: 18 }}>Ревизия на склад</h1>
        <Link to="/admin/products" style={{ opacity: 0.8, fontWeight: 800 }}>
          ← Назад към продукти
        </Link>
      </div>

      <p style={{ opacity: 0.75, marginTop: 4 }}>
        Въведи реално преброеното количество за всеки продукт. Записването нулира разликата — новото
        количество става това, което пазарувачите виждат.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Търсене на продукт..."
        style={{ ...input, marginTop: 10, maxWidth: 360 }}
      />

      {loading && <p>Зареждане...</p>}
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ marginTop: 14, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
              <th style={th}>Продукт</th>
              <th style={th}>Категория</th>
              <th style={{ ...th, textAlign: "right" }}>Системно к-во</th>
              <th style={{ ...th, textAlign: "right" }}>Преброено</th>
              <th style={{ ...th, textAlign: "right" }}>Разлика</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, draft, difference }) => {
              const state = rowState[p.id];
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 800 }}>
                      {p.title} {p.variantName ? `— ${p.variantName}` : ""}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{p.brand}</div>
                  </td>
                  <td style={td}>{p.category || "-"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{p.stockQty}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(p.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSave(p);
                      }}
                      inputMode="numeric"
                      style={{ ...input, width: 90, textAlign: "right" }}
                    />
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      fontWeight: 800,
                      color: difference === null || difference === 0 ? "inherit" : difference > 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {difference === null ? "-" : difference > 0 ? `+${difference}` : difference}
                  </td>
                  <td style={td}>
                    <button
                      type="button"
                      onClick={() => onSave(p)}
                      disabled={!!state?.saving}
                      style={{
                        ...btn,
                        opacity: state?.saving ? 0.6 : 1,
                      }}
                    >
                      {state?.saving ? "Запис..." : state?.savedAt ? "✓ Записано" : "Запази"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {!loading && !err && items.length === 0 && (
              <tr>
                <td style={td} colSpan={6}>
                  Няма продукти.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: CSSProperties = { padding: "8px 10px", fontSize: 13, opacity: 0.7 };
const td: CSSProperties = { padding: "8px 10px" };

const input: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
};

const btn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontWeight: 800,
};
