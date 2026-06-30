import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product] = await db.select().from(products).where(eq(products.id, parseInt(id)));
  if (!product) notFound();

  const allCategories = await db.select().from(categories);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        עריכת מוצר
      </h1>
      <ProductForm
        initial={{
          id: product.id,
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          categoryId: product.categoryId,
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
