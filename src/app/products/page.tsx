import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProductCard from "@/components/ui/ProductCard";
import Link from "next/link";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const allCategories = await db.select().from(categories);

  const activeCategory = allCategories.find((c) => c.slug === category);

  const productList = await db
    .select()
    .from(products)
    .where(activeCategory ? eq(products.categoryId, activeCategory.id) : undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        {activeCategory ? activeCategory.name : "כל המוצרים"}
      </h1>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/products"
          className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors"
          style={{
            borderColor: !category ? "var(--primary)" : "var(--border)",
            color: !category ? "var(--primary)" : "var(--muted)",
            backgroundColor: !category ? "oklch(0.974 0 0)" : "transparent",
          }}
        >
          הכל
        </Link>
        {allCategories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors"
            style={{
              borderColor: category === cat.slug ? "var(--primary)" : "var(--border)",
              color: category === cat.slug ? "var(--primary)" : "var(--muted)",
              backgroundColor: category === cat.slug ? "oklch(0.974 0 0)" : "transparent",
            }}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {productList.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--muted)" }}>
          <p className="text-lg">לא נמצאו מוצרים בקטגוריה זו.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productList.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
