"use client";

/**
 * OrderDetail — the admin's control panel for one order.
 *
 * Everything she needs in one place: view items, edit quantities or remove
 * lines, fix customer details, change status, keep an internal note,
 * print (or save as PDF via the browser's print dialog), resend the
 * confirmation email, and delete.
 *
 * Prices and totals are never sent from here — the server re-prices from
 * the DB on every save, so the number shown after saving is authoritative.
 * The `.print-area` / `.no-print` classes drive the print stylesheet in
 * globals.css so the printed page is a clean delivery note.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Printer, Mail, Trash2, Save, Plus, Minus, X } from "lucide-react";
import { imageUrl } from "@/lib/images";

type Item = { productId: number; name: string; price: number; quantity: number };

export type OrderData = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string;
  items: Item[];
  total: string;
  status: string;
  notes: string | null;
  adminNote: string | null;
  createdAt: string;
};

const STATUSES = ["pending", "confirmed", "cancelled", "delivered"] as const;

export default function OrderDetail({
  order: initial,
  images,
  emailConfigured,
}: {
  order: OrderData;
  /** productId → image url, for item thumbnails */
  images: Record<number, string | null>;
  emailConfigured: boolean;
}) {
  const t = useTranslations("admin.orderDetail");
  const tStatus = useTranslations("admin.orders.statusValues");
  const router = useRouter();

  const [order, setOrder] = useState(initial);
  const [items, setItems] = useState<Item[]>(initial.items);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const dirty =
    JSON.stringify(items) !== JSON.stringify(order.items) ||
    order.customerName !== initial.customerName ||
    order.customerPhone !== initial.customerPhone ||
    order.customerEmail !== initial.customerEmail ||
    order.customerAddress !== initial.customerAddress ||
    order.adminNote !== initial.adminNote;

  async function patch(body: Record<string, unknown>, okText: string) {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrder({ ...order, ...updated, items: JSON.parse(updated.items) });
      setItems(JSON.parse(updated.items));
      setMessage({ kind: "ok", text: okText });
      router.refresh();
    } else {
      setMessage({ kind: "err", text: t("errorSave") });
    }
    setSaving(false);
  }

  async function resend(to: "store" | "customer") {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/admin/orders/${order.id}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setMessage(
      res.ok
        ? { kind: "ok", text: t("emailSent") }
        : { kind: "err", text: t("emailFailed") }
    );
    setSaving(false);
  }

  async function remove() {
    if (!confirm(t("deleteConfirm", { id: order.id }))) return;
    const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/orders");
    else setMessage({ kind: "err", text: t("errorSave") });
  }

  function setQty(productId: number, delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(99, Math.max(1, i.quantity + delta)) }
          : i
      )
    );
  }

  const money = (n: number) => `₪${n.toLocaleString("he-IL")}`;
  const inputClass = "h-10 px-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-full";
  const inputStyle = { borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" };
  const btn = "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[oklch(0.974_0_0)] flex items-center gap-2";

  return (
    <div className="print-area flex flex-col gap-6 max-w-4xl">
      {/* ── Action bar (hidden when printing) ── */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => window.print()} className={btn} style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
          <Printer size={15} aria-hidden="true" /> {t("print")}
        </button>
        {emailConfigured && (
          <>
            <button type="button" onClick={() => resend("store")} disabled={saving} className={btn} style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
              <Mail size={15} aria-hidden="true" /> {t("resendStore")}
            </button>
            <button
              type="button"
              onClick={() => resend("customer")}
              disabled={saving || !order.customerEmail}
              title={!order.customerEmail ? t("noCustomerEmail") : undefined}
              className={`${btn} disabled:opacity-40`}
              style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            >
              <Mail size={15} aria-hidden="true" /> {t("resendCustomer")}
            </button>
          </>
        )}
        <button type="button" onClick={remove} className={`${btn} ms-auto`} style={{ borderColor: "var(--border)", color: "oklch(0.5 0.15 25)" }}>
          <Trash2 size={15} aria-hidden="true" /> {t("delete")}
        </button>
      </div>

      {message && (
        <p
          className="no-print text-sm"
          role="status"
          style={{ color: message.kind === "ok" ? "oklch(0.45 0.12 150)" : "oklch(0.45 0.15 25)" }}
        >
          {message.text}
        </p>
      )}

      {/* ── Print header (only visible on paper) ── */}
      <div className="print-only" style={{ display: "none" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>ולנטינה בן עמי ריהוט</h1>
        <p style={{ fontSize: "13px" }}>
          {t("orderNumber", { id: order.id })} · {new Date(order.createdAt).toLocaleString("he-IL")}
        </p>
      </div>

      {/* ── Status ── */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("status")}</span>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ status: s }, t("statusUpdated"))}
              disabled={saving}
              className="no-print px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
              style={{
                borderColor: order.status === s ? "var(--primary)" : "var(--border)",
                color: order.status === s ? "var(--primary)" : "var(--muted)",
              }}
              aria-pressed={order.status === s}
            >
              {tStatus(s)}
            </button>
          ))}
        </div>
        <span className="print-only text-sm" style={{ display: "none" }}>{tStatus(order.status)}</span>
      </div>

      {/* ── Items ── */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {[t("product"), t("quantity"), t("unitPrice"), t("lineTotal"), ""].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-start font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const img = imageUrl(images[item.productId] ?? null, "thumb");
              return (
                <tr key={item.productId} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {img && (
                        <Image src={img} alt="" width={40} height={40} className="rounded object-cover" />
                      )}
                      <span className="font-medium" style={{ color: "var(--ink)" }}>{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setQty(item.productId, -1)} className="no-print p-1 rounded border" style={{ borderColor: "var(--border)" }} aria-label={t("decrease")}>
                        <Minus size={12} />
                      </button>
                      <span style={{ color: "var(--ink)", minWidth: "1.5rem", textAlign: "center" }}>{item.quantity}</span>
                      <button type="button" onClick={() => setQty(item.productId, 1)} className="no-print p-1 rounded border" style={{ borderColor: "var(--border)" }} aria-label={t("increase")}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{money(item.price)}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{money(item.price * item.quantity)}</td>
                  <td className="px-4 py-3">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((i) => i.productId !== item.productId))}
                        className="no-print p-1 rounded"
                        style={{ color: "oklch(0.5 0.15 25)" }}
                        aria-label={t("removeItem")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: "var(--surface)" }}>
              <td colSpan={3} className="px-4 py-3 font-bold text-start" style={{ color: "var(--ink)" }}>{t("total")}</td>
              <td colSpan={2} className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }}>{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Customer details ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          { key: "customerName" as const, label: t("customerName"), type: "text" },
          { key: "customerPhone" as const, label: t("customerPhone"), type: "tel" },
          { key: "customerEmail" as const, label: t("customerEmail"), type: "email" },
          { key: "customerAddress" as const, label: t("customerAddress"), type: "text" },
        ]).map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--ink)" }}>
            {f.label}
            <input
              type={f.type}
              className={inputClass}
              style={inputStyle}
              value={order[f.key] ?? ""}
              onChange={(e) => setOrder({ ...order, [f.key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      {order.notes && (
        <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "var(--surface)", color: "var(--ink)" }}>
          <span className="font-medium">{t("customerNotes")}: </span>
          {order.notes}
        </div>
      )}

      {/* Internal note — never shown to the customer, never printed */}
      <label className="no-print flex flex-col gap-1.5 text-sm font-medium" style={{ color: "var(--ink)" }}>
        {t("adminNote")}
        <textarea
          rows={3}
          className="px-3 py-2 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm resize-none"
          style={inputStyle}
          placeholder={t("adminNotePlaceholder")}
          value={order.adminNote ?? ""}
          onChange={(e) => setOrder({ ...order, adminNote: e.target.value })}
        />
      </label>

      <button
        type="button"
        disabled={saving || !dirty}
        onClick={() =>
          patch(
            {
              items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              customerEmail: order.customerEmail ?? "",
              customerAddress: order.customerAddress,
              adminNote: order.adminNote ?? "",
            },
            t("saved")
          )
        }
        className="no-print self-start px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 active:scale-[0.97] flex items-center gap-2"
        style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
      >
        <Save size={15} aria-hidden="true" />
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
}
