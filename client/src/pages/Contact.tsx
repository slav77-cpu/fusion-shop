import { useState, type ChangeEvent, type FormEvent } from "react";
import { apiSend } from "../lib/api";
import "./Contact.css";

interface ContactForm {
  name: string;
  email: string;
  category: string;
  message: string;
}

const emptyForm: ContactForm = {
  name: "",
  email: "",
  category: "Общ въпрос",
  message: "",
};

const FAQS = [
  {
    q: "Работите ли с наложен платеж?",
    a: "Да — плащаш в брой на куриера при доставка. Плащане с карта в момента не е активно.",
  },
  {
    q: "Колко време отнема доставката?",
    a: "Стандартните поръчки се изпращат до 2 работни дни в рамките на страната.",
  },
  {
    q: "Доставяте ли извън страната?",
    a: "В момента доставяме само на територията на страната. Свържи се с нас, ако имаш нужда от нещо друго.",
  },
  {
    q: "Какъв е минимумът за поръчка на едро?",
    a: "Зависи от продукта — виж ценовата листа на страница „На едро“ или заяви индивидуална оферта.",
  },
];

export default function Contact() {
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [successId, setSuccessId] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setSending(true);
    try {
      const data = await apiSend<{ id: string }>("/contact", "POST", form);
      setSuccessId(data.id);
      setForm(emptyForm);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Съобщението не успя да се изпрати");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contactPage">
      <section className="cHero">
        <h1 className="cTitle">Свържи се с нас</h1>
        <p className="cText">
          Въпроси за поръчка, доставка или цени на едро — можеш да ни намериш по няколко начина.
        </p>

        <div className="cInfoGrid">
          <div className="cInfoCard">
            <div className="cInfoLabel">Имейл</div>
            <div className="cInfoValue">support@fusion-shop.bg</div>
          </div>
          <div className="cInfoCard">
            <div className="cInfoLabel">Телефон и работно време</div>
            <div className="cInfoValue">Пон–Пет, 9:00–18:00</div>
          </div>
          <div className="cInfoCard">
            <div className="cInfoLabel">Склад</div>
            <div className="cInfoValue">Вземане само с предварителна уговорка</div>
          </div>
        </div>
      </section>

      <section className="cGrid">
        <form onSubmit={onSubmit} className="cForm">
          {successId ? (
            <div className="cSuccess">
              <div className="cSuccessBadge">✓</div>
              <div className="cSuccessTitle">Съобщението е изпратено!</div>
              <div className="cSuccessText">Ще ти отговорим възможно най-скоро.</div>
            </div>
          ) : (
            <>
              {err && <p className="cError">{err}</p>}
              <input name="name" value={form.name} onChange={onChange} placeholder="Твоето име" required />
              <input name="email" type="email" value={form.email} onChange={onChange} placeholder="Имейл" required />
              <select name="category" value={form.category} onChange={onChange}>
                <option>Общ въпрос</option>
                <option>Поддръжка на поръчка</option>
                <option>На едро и бизнес</option>
              </select>
              <textarea name="message" value={form.message} onChange={onChange} placeholder="Съобщение" rows={4} required />
              <button disabled={sending} type="submit" className="cSubmitBtn">
                {sending ? "Изпращане..." : "Изпрати съобщение"}
              </button>
            </>
          )}
        </form>

        <div className="cFaq">
          <h2>Често задавани въпроси</h2>
          {FAQS.map((f, i) => (
            <div className="cFaqItem" key={f.q}>
              <button
                type="button"
                className="cFaqQ"
                onClick={() => setOpen((p) => ({ ...p, [i]: !p[i] }))}
              >
                <span>{f.q}</span>
                <span className="cFaqSymbol">{open[i] ? "−" : "+"}</span>
              </button>
              {open[i] && <div className="cFaqA">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
