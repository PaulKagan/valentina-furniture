"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const router = useRouter();
  const t = useTranslations("checkout");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", floor: "", notes: "" });
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
