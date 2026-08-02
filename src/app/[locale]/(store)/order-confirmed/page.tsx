import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ClearCartOnMount from "@/components/cart/ClearCartOnMount";

export default async function OrderConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { locale } = await params;
  const { id } = await searchParams;
  const t = await getTranslations({ locale, namespace: "orderConfirmed" });
  const orderId = id ? parseInt(id, 10) : null;

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <ClearCartOnMount />
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>
      {orderId != null && !isNaN(orderId) && (
        <p className="text-base font-semibold mb-4" style={{ color: "var(--primary)" }}>
          {t("orderNumber", { id: orderId })}
        </p>
      )}
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
