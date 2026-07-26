import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderConfirmed" });

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>
      <p className="text-lg leading-relaxed mb-2" style={{ color: "var(--muted)" }}>
        {t("thanks")}
      </p>
      <p className="leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
        {t("pending")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {t("backHome")}
        </Link>
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "972501234567"}`}
          className="px-6 py-3 rounded-lg font-semibold text-sm border-2 hover:opacity-90 transition-opacity"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          {t("whatsapp")}
        </a>
      </div>
    </div>
  );
}
