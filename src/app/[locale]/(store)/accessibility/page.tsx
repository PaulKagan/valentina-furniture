/**
 * Accessibility statement — /accessibility
 * Required by Israeli regulations (IS 5568). Describes the site's
 * accessibility level, the available adjustments, and how to contact
 * the accessibility coordinator.
 */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "a11y.statement" });
  return { title: t("title") };
}

export default async function AccessibilityPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "a11y.statement" });
  const phone = process.env.NEXT_PUBLIC_PHONE ?? "050-123-4567";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1
        className="text-3xl font-bold mb-6"
        style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
      >
        {t("title")}
      </h1>
      <div className="flex flex-col gap-4 leading-relaxed" style={{ color: "var(--ink)" }}>
        <p>{t("intro")}</p>
        <h2 className="text-xl font-bold mt-2">{t("featuresTitle")}</h2>
        <ul className="list-disc ps-6 flex flex-col gap-1">
          {["f1", "f2", "f3", "f4", "f5"].map((k) => (
            <li key={k}>{t(`features.${k}`)}</li>
          ))}
        </ul>
        <h2 className="text-xl font-bold mt-2">{t("contactTitle")}</h2>
        <p>
          {t("contactText")}{" "}
          <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="underline" dir="ltr">
            {phone}
          </a>
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{t("updated")}</p>
      </div>
    </div>
  );
}
