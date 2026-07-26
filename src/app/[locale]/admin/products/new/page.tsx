import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale } = await params;
  const { from } = await searchParams;
  const t = await getTranslations({ locale, namespace: "admin.products" });
  const allCategories = await db.select().from(categories);

  // Duplicate mode: prefill the form from an existing product (no id →
  // saving creates a new one). Image is reused by reference.
  let initial;
  const fromId = from ? parseInt(from, 10) : NaN;
  if (!isNaN(fromId)) {
    const [source] = await db.select().from(products).where(eq(products.id, fromId));
    if (source) {
      initial = {
        name: `${source.name} (עותק)`,
        nameEn: source.nameEn ?? "",
        nameRu: source.nameRu ?? "",
        description: source.description ?? "",
        descriptionEn: source.descriptionEn ?? "",
        descriptionRu: source.descriptionRu ?? "",
        price: source.price,
        categoryId: source.categoryId,
        colors: source.colors,
        widthCm: source.widthCm?.toString() ?? "",
        depthCm: source.depthCm?.toString() ?? "",
        heightCm: source.heightCm?.toString() ?? "",
        inStock: source.inStock,
        featured: source.featured,
        imageUrl: source.imageUrl,
        imagePublicId: source.imagePublicId,
      };
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {initial ? t("duplicateTitle") : t("new")}
      </h1>
      <ProductForm initial={initial} categories={allCategories} />
    </div>
  );
}
