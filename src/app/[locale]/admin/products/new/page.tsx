import { db } from "@/db";
import { categories } from "@/db/schema";
import { getTranslations } from "next-intl/server";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.products" });
  const allCategories = await db.select().from(categories);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        {t("new")}
      </h1>
      <ProductForm categories={allCategories} />
    </div>
  );
}
