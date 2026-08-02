"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartContext";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

export default function CheckoutPage() {
  const { items, total, count, clear } = useCart();
  const router = useRouter();
  const t = useTranslations("checkout");
  const tDelivery = useTranslations("delivery");
  const deliverySections = tDelivery.raw("sections") as { title: string; body: string }[];
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", floor: "", notes: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
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

  type CheckoutField = {
    name: keyof typeof form;
    label: string;
    type: string;
    placeholder: string;
    required: boolean;
    pattern?: string;
    title?: string;
  };

  const fields: CheckoutField[] = [
    { name: "name", label: t("nameLabel"), type: "text", placeholder: t("namePlaceholder"), required: true },
    {
      name: "phone",
      label: t("phoneLabel"),
      type: "tel",
      placeholder: t("phonePlaceholder"),
      required: true,
      // Israeli landline (0X-XXXXXXX, 9 digits) or mobile (05X-XXXXXXX, 10
      // digits), dash optional — rejects both too-short strings and
      // anything that doesn't start with a 0.
      pattern: "0\\d{1,2}-?\\d{7}",
      title: t("phoneInvalid"),
    },
    // Optional — when given, the customer gets an order confirmation email
    { name: "email", label: t("emailLabel"), type: "email", placeholder: t("emailPlaceholder"), required: false },
    { name: "address", label: t("addressLabel"), type: "text", placeholder: t("addressPlaceholder"), required: true },
    // Delivery cost/feasibility depends on floor + elevator access (see
    // /delivery) — required so the store never has to chase this down later.
    { name: "floor", label: t("floorLabel"), type: "text", placeholder: t("floorPlaceholder"), required: true },
  ];

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
              pattern={field.pattern}
              title={field.title}
              dir={field.type === "tel" ? "ltr" : undefined}
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
            <button
              type="button"
              onClick={() => setTermsModalOpen(true)}
              className="underline"
              style={{ color: "var(--primary)" }}
            >
              {t("termsLinkText")}
            </button>
          </span>
        </label>

        <Modal
          open={termsModalOpen}
          onClose={() => setTermsModalOpen(false)}
          title={tDelivery("title")}
          closeLabel={t("close")}
        >
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            {tDelivery("intro")}
          </p>
          <div className="flex flex-col gap-4 leading-relaxed" style={{ color: "var(--ink)" }}>
            {deliverySections.map((s) => (
              <div key={s.title}>
                <h3 className="font-bold mb-1">{s.title}</h3>
                <p className="text-sm">{s.body}</p>
              </div>
            ))}
          </div>
        </Modal>

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
