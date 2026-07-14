/**
 * /admin/products/import — bulk Excel import with template download.
 */
import { getTranslations } from "next-intl/server";
import ImportProducts from "@/components/admin/ImportProducts";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.import" });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        {t("title")}
      </h1>
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
        {t("subtitle")}
      </p>
      <a
        href="/api/admin/products/template"
        className="inline-block text-sm font-semibold underline mb-6"
        style={{ color: "var(--primary)" }}
        download
      >
        ⬇ {t("downloadTemplate")}
      </a>
      <ImportProducts />
    </div>
  );
}
