/**
 * Terms of Service / Policy — /terms
 * Draft placeholder content (see messages/*.json "terms" namespace) — the
 * store owner is supplying the real legal text separately; this scaffolds
 * the page structure so it's a straightforward copy-swap once that's ready.
 */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return { title: t("title") };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  const sections = t.raw("sections") as { title: string; body: string }[];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>
      <div className="flex flex-col gap-4 leading-relaxed" style={{ color: "var(--ink)" }}>
        <p style={{ color: "var(--muted)" }}>{t("intro")}</p>
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-xl font-bold mt-2 mb-1">{s.title}</h2>
            <p>{s.body}</p>
          </div>
        ))}
        <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
          {t("updated")}
        </p>
      </div>
    </div>
  );
}
