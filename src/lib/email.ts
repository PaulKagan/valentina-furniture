/**
 * Order emails via Valentina's Gmail (nodemailer + SMTP app password).
 *
 * Setup (once, on her Google account):
 *   1. Turn on 2-Step Verification
 *   2. Create an App Password (Google Account → Security → App passwords)
 *   3. Set GMAIL_USER + GMAIL_APP_PASSWORD in the environment
 *
 * If those env vars are missing the app still runs — sending is skipped
 * and logged. An email failure must never lose an order, so callers
 * treat the result as advisory (the admin can always resend).
 *
 * Server-only.
 */
import nodemailer from "nodemailer";

export type OrderItem = { productId: number; name: string; price: number; quantity: number };

export type OrderEmailData = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string;
  customerFloor: string | null;
  items: OrderItem[];
  total: string;
  notes: string | null;
  createdAt: Date;
};

export function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function transporter() {
  // SMTP_HOST overrides Gmail — used to point at a local catcher in
  // development so order emails can be verified without sending real mail.
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "2525", 10),
      secure: false,
      ignoreTLS: true,
    });
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const money = (n: number) => `₪${n.toLocaleString("he-IL")}`;

/** Shared RTL HTML shell — inline styles only, as email clients strip <style>. */
function shell(title: string, intro: string, order: OrderEmailData, footer: string): string {
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e0dc;">${escapeHtml(i.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e0dc;text-align:center;">${i.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e0dc;">${money(i.price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e0dc;">${money(i.price * i.quantity)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html dir="rtl" lang="he">
<body style="margin:0;padding:24px;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;color:#2b2320;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e0dc;border-radius:12px;overflow:hidden;">
    <div style="background:#a1503a;color:#ffffff;padding:20px 24px;">
      <h1 style="margin:0;font-size:20px;">ולנטינה בן עמי ריהוט</h1>
      <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">${escapeHtml(title)}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${intro}</p>

      <h2 style="font-size:16px;margin:24px 0 8px;">הזמנה #${order.id}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f7f7f7;">
            <th style="padding:8px;text-align:right;">מוצר</th>
            <th style="padding:8px;text-align:center;">כמות</th>
            <th style="padding:8px;text-align:right;">מחיר</th>
            <th style="padding:8px;text-align:right;">סה"כ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:left;font-size:18px;font-weight:bold;margin:16px 0 24px;">
        סה"כ לתשלום: ${money(parseFloat(order.total))}
      </p>

      <h2 style="font-size:16px;margin:0 0 8px;">פרטי הלקוח</h2>
      <table style="font-size:14px;line-height:1.8;">
        <tr><td style="padding-left:12px;color:#6b615c;">שם:</td><td>${escapeHtml(order.customerName)}</td></tr>
        <tr><td style="padding-left:12px;color:#6b615c;">טלפון:</td><td dir="ltr">${escapeHtml(order.customerPhone)}</td></tr>
        ${order.customerEmail ? `<tr><td style="padding-left:12px;color:#6b615c;">אימייל:</td><td dir="ltr">${escapeHtml(order.customerEmail)}</td></tr>` : ""}
        <tr><td style="padding-left:12px;color:#6b615c;">כתובת:</td><td>${escapeHtml(order.customerAddress)}</td></tr>
        ${order.customerFloor ? `<tr><td style="padding-left:12px;color:#6b615c;">קומה:</td><td>${escapeHtml(order.customerFloor)}</td></tr>` : ""}
        ${order.notes ? `<tr><td style="padding-left:12px;color:#6b615c;">הערות:</td><td>${escapeHtml(order.notes)}</td></tr>` : ""}
      </table>

      <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e5e0dc;font-size:13px;color:#6b615c;line-height:1.6;">
        ${footer}
      </p>
    </div>
  </div>
</body>
</html>`;
}

/** Escape user-supplied text before putting it in the HTML email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function storeEmailHtml(order: OrderEmailData): string {
  return shell(
    "הזמנה חדשה מהאתר",
    `התקבלה הזמנה חדשה באתר בתאריך ${order.createdAt.toLocaleString("he-IL")}.`,
    order,
    "יש ליצור קשר עם הלקוח לאישור הפרטים ותיאום משלוח. ניתן לנהל את ההזמנה בממשק הניהול."
  );
}

function customerEmailHtml(order: OrderEmailData): string {
  return shell(
    "אישור קבלת הזמנה",
    `שלום ${escapeHtml(order.customerName)}, תודה על הזמנתכם! קיבלנו אותה בהצלחה.`,
    order,
    "ההזמנה עדיין לא מאושרת סופית ולא בוצע חיוב. נציג מהחנות יחזור אליכם בהקדם לאישור הפרטים ותיאום משלוח."
  );
}

type SendResult = { sent: boolean; skipped?: string; error?: string };

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  if (!isEmailConfigured()) {
    console.warn("[email] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping send");
    return { sent: false, skipped: "not-configured" };
  }
  try {
    await transporter().sendMail({
      from: `"ולנטינה בן עמי ריהוט" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] send failed:", err);
    return { sent: false, error: "send-failed" };
  }
}

/** Notify the store owner about a new (or resent) order. */
export function sendOrderToStore(order: OrderEmailData): Promise<SendResult> {
  const to = process.env.ORDER_NOTIFY_EMAIL || process.env.GMAIL_USER || "";
  if (!to) return Promise.resolve({ sent: false, skipped: "no-recipient" });
  return send(to, `הזמנה חדשה #${order.id} — ${order.customerName}`, storeEmailHtml(order));
}

/** Confirmation to the customer — only when they left an email address. */
export function sendOrderToCustomer(order: OrderEmailData): Promise<SendResult> {
  if (!order.customerEmail) return Promise.resolve({ sent: false, skipped: "no-customer-email" });
  return send(
    order.customerEmail,
    `אישור הזמנה #${order.id} — ולנטינה בן עמי ריהוט`,
    customerEmailHtml(order)
  );
}
