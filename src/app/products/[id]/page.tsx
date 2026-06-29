import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import AddToCartButton from "@/components/ui/AddToCartButton";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.select().from(products).where(eq(products.id, parseInt(id))).then((r) => r[0]);

  if (!product) notFound();

  const price = parseFloat(product.price);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="aspect-square relative rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">🪑</div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
              {product.name}
            </h1>
            <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
              ₪{price.toLocaleString("he-IL")}
            </p>
          </div>

          {product.description && (
            <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
              {product.description}
            </p>
          )}

          {product.inStock ? (
            <AddToCartButton product={{ id: product.id, name: product.name, price, imageUrl: product.imageUrl }} />
          ) : (
            <div className="px-6 py-3 rounded-lg text-center font-semibold" style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}>
              אזל מהמלאי — צרו קשר לבדיקת זמינות
            </div>
          )}

          <div className="text-sm p-4 rounded-lg" style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}>
            ✅ משלוח והרכבה עד הבית
            <br />
            ✅ אחריות יצרן
            <br />
            ✅ אפשרות להחזרה תוך 14 יום
          </div>
        </div>
      </div>
    </div>
  );
}
