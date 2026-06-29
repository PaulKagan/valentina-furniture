import { db } from "@/db";
import { categories } from "@/db/schema";
import ProductForm from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const allCategories = await db.select().from(categories);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        מוצר חדש
      </h1>
      <ProductForm categories={allCategories} />
    </div>
  );
}
