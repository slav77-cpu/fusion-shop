import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import ProductImage from "../components/ProductImage";
import { API_URL, apiSend } from "../lib/api";
import type { Paginated, Product, ProductsMeta } from "../types";
import "./Wholesale.css";

interface QuoteForm {
  businessName: string;
  email: string;
  businessType: string;
  estVolume: string;
}

const emptyQuoteForm: QuoteForm = {
  businessName: "",
  email: "",
  businessType: "Хотел",
  estVolume: "",
};

export default function Wholesale() {
  const [meta, setMeta] = useState<ProductsMeta>({ categories: [], brands: [] });
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<QuoteForm>(emptyQuoteForm);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [successId, setSuccessId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/products/meta`);
        setMeta((await res.json()) as ProductsMeta);
      } catch {
        // not critical
      }
    })();
  }, []);

  const url = useMemo(() => {
    const u = new URL(`${API_URL}/products`);
    u.searchParams.set("limit", "100");
    if (category) u.searchParams.set("category", category);
    if (q) u.searchParams.set("q", q);
    return u.toString();
  }, [category, q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(url);
        const data = (await res.json()) as Paginated<Product>;
        if (!cancelled) setItems(data.items || []);
      } catch {
        // list is non-critical to the page working
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  function onFormChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setSending(true);
    try {
      const data = await apiSend<{ id: string }>("/wholesale/quotes", "POST", form);
      setSuccessId(data.id);
      setForm(emptyQuoteForm);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Заявката не успя");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="wholesalePage">
      <section className="wsHero">
        <div className="wsEyebrow">За бизнеси и едро</div>
        <h1 className="wsTitle">Купувай на кашон, палет или цял камион.</h1>
        <p className="wsText">
          За хотели, офиси, фитнес зали и магазини — същият каталог на цени на едро, с отстъпки, които растат с обема.
        </p>
      </section>

      <section className="wsTierGrid">
        <div className="wsTierCard">
          <div className="wsTierName">На кашон</div>
          <div className="wsTierText">Без минимална поръчка. Добро за пробен старт на един обект.</div>
          <div className="wsTierPrice">Цена от каталога</div>
        </div>
        <div className="wsTierCard wsTierCard--dark">
          <div className="wsTierName">На палет</div>
          <div className="wsTierText">Смесени или еднородни палети. Повечето хотели и вериги поръчват тук.</div>
          <div className="wsTierPrice">До 25% отстъпка</div>
        </div>
        <div className="wsTierCard">
          <div className="wsTierName">На камион / индивидуално</div>
          <div className="wsTierText">Многопалетни, повтарящи се поръчки. Индивидуална цена и личен консултант.</div>
          <div className="wsTierPrice">По заявка</div>
        </div>
      </section>

      <section className="wsListSection">
        <h2 className="wsListTitle">Ценова листа на едро</h2>

        <div className="categoryRow">
          <button
            type="button"
            className={`categoryPill ${!category ? "is-active" : ""}`}
            onClick={() => setCategory("")}
          >
            Всички
          </button>
          {meta.categories.map((c) => (
            <button
              type="button"
              key={c}
              className={`categoryPill ${category === c ? "is-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
          <div className="wsSearchWrap">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Търсене"
              className="wsSearchInput"
            />
          </div>
        </div>

        {loading && <p className="msg">Зареждане...</p>}

        <div className="wsList">
          {items.map((p) => {
            const title = `${p.title}${p.variantName ? ` — ${p.variantName}` : ""}`;
            return (
              <div className="wsRow" key={p.id}>
                <div className="wsRowImage">
                  <ProductImage src={p.imageUrl} alt={title} />
                </div>
                <div className="wsRowInfo">
                  {p.category && <div className="wsRowCategory">{p.category}</div>}
                  <div className="wsRowTitle">{title}</div>
                </div>
                <div className="wsRowTiers">
                  {p.priceTiers && p.priceTiers.length > 0 ? (
                    p.priceTiers.map((t, i) => (
                      <div className="wsTierRow" key={t.id ?? i}>
                        <span className="wsTierRow__label">{t.label}</span>
                        <span className="wsTierRow__moq">MOQ {t.moqTiers ?? 1}</span>
                        <span className="wsTierRow__price">
                          {t.price.toFixed(2)} €
                          <em>≈ {(t.price / t.unitQty).toFixed(2)} €/бр.</em>
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="wsNoTiers">Свържете се за оферта</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && items.length === 0 && <p className="msg">Няма продукти в тази категория.</p>}
      </section>

      <section id="quote" className="wsQuoteSection">
        <div className="wsQuoteGrid">
          <div>
            <h2 className="wsQuoteTitle">Заяви оферта за едро</h2>
            <p className="wsQuoteText">
              Кажи ни какъв е бизнесът ти и очаквания месечен обем. Потвърждаваме цени и график за доставка до един работен ден.
            </p>
          </div>

          {successId ? (
            <div className="wsSuccess">
              <div className="wsSuccessBadge">✓</div>
              <div className="wsSuccessTitle">Заявката е изпратена!</div>
              <div className="wsSuccessText">Ще се свържем с теб скоро.</div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="wsQuoteForm">
              {err && <p className="wsError">{err}</p>}
              <input
                name="businessName"
                value={form.businessName}
                onChange={onFormChange}
                placeholder="Име на фирма"
                required
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onFormChange}
                placeholder="Работен имейл"
                required
              />
              <select name="businessType" value={form.businessType} onChange={onFormChange}>
                <option>Хотел</option>
                <option>Офис</option>
                <option>Магазин</option>
                <option>Друго</option>
              </select>
              <input
                name="estVolume"
                value={form.estVolume}
                onChange={onFormChange}
                placeholder="Очакван месечен обем"
              />
              <button disabled={sending} type="submit" className="wsSubmitBtn">
                {sending ? "Изпращане..." : "Заяви оферта за едро"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
