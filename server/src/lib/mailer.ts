import nodemailer, { type Transporter } from "nodemailer";
import type { Order, OrderItem } from "@prisma/client";

let cachedTransporter: Transporter | null | undefined;

/**
 * Lazily builds a Gmail SMTP transporter from GMAIL_USER / GMAIL_APP_PASSWORD.
 * Returns null if not configured, so the app runs fine (just silently skips
 * notification emails) without Gmail set up.
 *
 * GMAIL_APP_PASSWORD is NOT your normal Gmail password — it's a 16-character
 * "App Password" generated at https://myaccount.google.com/apppasswords
 * (requires 2-Step Verification to be turned on for the Google account).
 */
function getTransporter(): Transporter | null {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

function fmtMoney(n: number): string {
  return `${n.toFixed(2)} €`;
}

function orderEmailHtml(order: Order & { items: OrderItem[] }): string {
  const rows = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${i.title}${i.variantName ? ` — ${i.variantName}` : ""}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fmtMoney(Number(i.price))}</td>
        </tr>`
    )
    .join("");

  const paymentLine =
    order.paymentMethod === "card"
      ? `Карта (${order.paymentStatus === "paid" ? "платено" : "изчаква потвърждение"})`
      : "Наложен платеж";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="margin:0 0 4px;">Нова поръчка #${order.id.slice(0, 8)}</h2>
      <p style="color:#555;margin:0 0 16px;">${new Date(order.createdAt).toLocaleString("bg-BG")}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr><td style="padding:2px 0;"><b>Клиент:</b></td><td>${order.customerName}</td></tr>
        <tr><td style="padding:2px 0;"><b>Телефон:</b></td><td>${order.customerPhone}</td></tr>
        <tr><td style="padding:2px 0;"><b>Адрес:</b></td><td>${order.customerAddress}</td></tr>
        ${order.customerNote ? `<tr><td style="padding:2px 0;"><b>Бележка:</b></td><td>${order.customerNote}</td></tr>` : ""}
        <tr><td style="padding:2px 0;"><b>Плащане:</b></td><td>${paymentLine}</td></tr>
      </table>

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="text-align:left;border-bottom:2px solid #ddd;">
            <th style="padding:6px 10px;">Артикул</th>
            <th style="padding:6px 10px;text-align:center;">Бр.</th>
            <th style="padding:6px 10px;text-align:right;">Цена</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <p style="text-align:right;font-size:18px;font-weight:bold;margin-top:10px;">
        Общо: ${fmtMoney(Number(order.total))}
      </p>
    </div>
  `;
}

/**
 * Fire-and-forget-ish: never throws. A mail failure should never break order
 * creation — this just logs and moves on.
 */
export async function sendNewOrderEmail(order: Order & { items: OrderItem[] }): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.GMAIL_USER;
  if (!to) return;

  try {
    await transporter.sendMail({
      from: `"Fusion Shop" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Нова поръчка #${order.id.slice(0, 8)} — ${fmtMoney(Number(order.total))}`,
      html: orderEmailHtml(order),
    });
  } catch (err) {
    console.error("Failed to send new-order notification email:", err);
  }
}
