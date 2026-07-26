/**
 * ProductStrip — a titled row of product cards.
 * Used for "similar items" on the product page and for near-miss
 * suggestions under a filtered catalog. Renders nothing when empty.
 */
import ProductCard from "@/components/ui/ProductCard";
import type { InferSelectModel } from "drizzle-orm";
import type { products } from "@/db/schema";

type Product = InferSelectModel<typeof products>;

export default function ProductStrip({
  title,
  subtitle,
  items,
  discounts = {},
}: {
  title: string;
  subtitle?: string;
  items: Product[];
  /** productId → inherited category discount % */
  discounts?: Record<number, number>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t" style={{ borderColor: "var(--border)" }}>
      <h2
        className="text-2xl font-bold"
        style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {subtitle}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} discount={discounts[p.id] ?? 0} />
        ))}
      </div>
    </section>
  );
}
