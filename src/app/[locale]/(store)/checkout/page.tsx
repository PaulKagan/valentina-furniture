"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

// Pending Valentina's decision: card-brand + last-4 payment reference is
// built and working (server accepts it either way — see /api/orders), but
// held off customer-facing until she chooses between this and collecting
// nothing. Flip to true to bring the fields back.
const CARD_PAYMENT_REF_ENABLED = false;

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const router = useRouter();
  const t = useTranslations("checkout");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", floor: "", notes: "", cardType: "", cardLast4: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (count === 0) {
    router.replace("/cart");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          termsAccepted,
          // Only ids + quantities — the server looks up real prices itself
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });

      if (!res.ok) throw new Error(t("sendError"));

      const { id } = await res.json();
      clear();
      router.push(`/order-confirmed?id=${id}`);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: "name", label: t("nameLabel"), type: "text", placeholder: t("namePlaceholder"), required: true },
    { name: "phone", label: t("phoneLabel"), type: "tel", placeholder: t("phonePlaceholder"), required: true },
    // Optional — when given, the customer gets an order confirmation email
    { name: "email", label: t("emailLabel"), type: "email", placeholder: t("emailPlaceholder"), required: false },
    { name: "address", label: t("addressLabel"), type: "text", placeholder: t("addressPlaceholder"), required: true },
    // Delivery cost/feasibility depends on floor + elevator access (see
    // /delivery) — required so the store never has to chase this down later.
    { name: "floor", label: t("floorLabel"), type: "text", placeholder: t("floorPlaceholder"), required: true },
  ] as const;

  const CARD_TYPES = ["visa", "mastercard", "isracard", "amex", "diners", "other"] as const;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>

      {/* Order summary */}
      <div className="mb-8 p-4 rounded-xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>
          {t("orderSummary")}
        </p>
        <ul className="flex flex-col gap-1 mb-3">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between text-sm" style={{ color: "var(--muted)" }}>
              <span>{i.name} × {i.quantity}</span>
              <span>₪{(i.price * i.quantity).toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-bold border-t pt-3" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
          <span>{t("totalLabel")}</span>
          <span>₪{total.toLocaleString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {field.label}
            </label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              required={field.required}
              value={form[field.name]}
              onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
              className="h-11 px-4 rounded-lg border outline-none transition-colors focus:border-[oklch(0.52_0.14_32)] text-sm"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", color: "var(--ink)" }}
            />
          </div>
        ))}

        {/* Payment reference only — brand + last 4 digits, never the full
            card number or CVV. Payment itself is arranged with the store
            after order review, same as the rest of checkout. Held off
            pending Valentina's decision — see CARD_PAYMENT_REF_ENABLED. */}
        {CARD_PAYMENT_REF_ENABLED && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {t("cardTypeLabel")}
                </label>
                <select
                  required
                  value={form.cardType}
                  onChange={(e) => setForm({ ...form, cardType: e.target.value })}
                  className="h-11 px-4 rounded-lg border outline-none transition-colors focus:border-[oklch(0.52_0.14_32)] text-sm"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", color: "var(--ink)" }}
                >
                  <option value="" disabled>
                    {t("cardTypeLabel")}
                  </option>
                  {CARD_TYPES.map((key) => (
                    <option key={key} value={key}>
                      {t(`cardTypeOptions.${key}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {t("cardLast4Label")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  dir="ltr"
                  required
                  placeholder={t("cardLast4Placeholder")}
                  value={form.cardLast4}
                  onChange={(e) => setForm({ ...form, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  className="h-11 px-4 rounded-lg border outline-none transition-colors focus:border-[oklch(0.52_0.14_32)] text-sm"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", color: "var(--ink)" }}
                />
              </div>
            </div>
            <p className="text-xs -mt-3" style={{ color: "var(--muted)" }}>
              {t("cardLast4Hint")}
            </p>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {t("notesLabel")}
          </label>
          <textarea
            rows={3}
            placeholder={t("notesPlaceholder")}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="px-4 py-3 rounded-lg border outline-none transition-colors focus:border-[oklch(0.52_0.14_32)] text-sm resize-none"
            style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)", color: "var(--ink)" }}
          />
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
          <input
            type="checkbox"
            required
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {t("termsPrefix")}{" "}
            <Link href="/delivery" target="_blank" className="underline" style={{ color: "var(--primary)" }}>
              {t("termsLinkText")}
            </Link>
          </span>
        </label>

        {error && (
          <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: "oklch(0.95 0.02 25)", color: "oklch(0.4 0.15 25)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {loading ? t("submitting") : t("submit")}
        </button>

        <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
          {t("disclaimer")}
        </p>
      </form>
    </div>
  );
}
