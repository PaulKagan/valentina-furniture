import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();
  const [product] = await db.select().from(products).where(eq(products.id, numId));
  if (!product) notFound();

  const t = await getTranslations({ locale, namespace: "admin.products" });
  const allCategories = await db.select().from(categories);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("editTitle")}
      </h1>
      <ProductForm
        initial={{
          id: product.id,
          name: product.name,
          nameEn: product.nameEn ?? "",
          nameRu: product.nameRu ?? "",
          description: product.description ?? "",
          descriptionEn: product.descriptionEn ?? "",
          descriptionRu: product.descriptionRu ?? "",
          price: product.price,
          onSale: product.onSale,
          salePrice: product.salePrice ?? "",
          categoryId: product.categoryId,
          colors: product.colors,
          widthCm: product.widthCm?.toString() ?? "",
          depthCm: product.depthCm?.toString() ?? "",
          heightCm: product.heightCm?.toString() ?? "",
          inStock: product.inStock,
          featured: product.featured,
          imageUrl: product.imageUrl,
          imagePublicId: product.imagePublicId,
        }}
        categories={allCategories}
      />
    </div>
  );
}
