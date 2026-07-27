"use client";

/**
 * App-wide error boundary — catches any unhandled exception thrown while
 * rendering a page under [locale] (storefront AND admin, since admin nests
 * here too) and shows a branded, retryable message instead of Next's bare
 * default error screen.
 *
 * Why this matters more than it looks: a handful of pages (the product
 * catalog, admin dashboard/orders) call the database directly with no
 * try/catch, and middleware itself calls auth() on every request — a
 * transient DB hiccup or a misconfigured AUTH_SECRET after a redeploy would
 * otherwise surface as an unbranded, un-translated crash screen to a
 * customer mid-checkout. This one file is the safety net for all of that,
 * present and future — it doesn't matter which page throws.
 *
 * Still nested inside layout.tsx, so NextIntlClientProvider/CartProvider
 * are intact — translations and the cart badge keep working here.
 */
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorBoundary");

  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl border text-center flex flex-col items-center gap-4"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        <span className="text-4xl" aria-hidden="true">😕</span>
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
        >
          {t("title")}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {t("message")}
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm border"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {t("home")}
          </Link>
        </div>
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "972501234567"}`}
          className="text-sm underline pt-2"
          style={{ color: "var(--primary)" }}
        >
          {t("whatsapp")}
        </a>
      </div>
    </div>
  );
}
