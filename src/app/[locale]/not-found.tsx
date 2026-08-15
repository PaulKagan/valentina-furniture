"use client";

/**
 * Branded 404 — catches both an explicit notFound() call (e.g. a deleted
 * product's old link) and any genuinely unmatched URL under [locale].
 * Without this, either case fell through to Next's plain, unbranded,
 * un-translated default 404 screen.
 *
 * Same reasoning as error.tsx for why this is a client component with no
 * props: not-found.tsx files never receive route params, but they still
 * render nested inside layout.tsx, so NextIntlClientProvider is intact —
 * translations and locale-aware links work via context instead.
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl border text-center flex flex-col items-center gap-4"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        <span className="text-4xl" aria-hidden="true">🔍</span>
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
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {t("backHome")}
          </Link>
          <Link
            href="/products"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm border"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {t("browseProducts")}
          </Link>
        </div>
      </div>
    </div>
  );
}
