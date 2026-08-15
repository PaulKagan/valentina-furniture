/**
 * Root-level 404 — safety net for paths that never resolve to a valid
 * locale segment (e.g. /asdf: a single garbage segment binds directly to
 * the [locale] dynamic route, [locale]/layout.tsx then calls notFound()
 * on the invalid locale — but a notFound() thrown from a layout can't
 * nest into that same layout's own not-found.tsx, since the layout never
 * finished rendering its <html>/<body>. It bubbles here instead.
 *
 * No NextIntlClientProvider at this level, so text is hardcoded (Hebrew,
 * the site's default locale) rather than translated. Own <html>/<body>
 * required — this renders outside [locale]/layout.tsx entirely.
 */
import Link from "next/link";
import "./globals.css";

export default function RootNotFound() {
  return (
    <html lang="he" dir="rtl">
      <body
        className="min-h-screen flex items-center justify-center px-4 py-16"
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
            הדף לא נמצא
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            העמוד שחיפשתם לא קיים, או שהוסר.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            לדף הבית
          </Link>
        </div>
      </body>
    </html>
  );
}
