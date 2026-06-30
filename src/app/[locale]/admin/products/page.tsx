import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import Image from "next/image";

export default async function AdminProductsPage() {
  const allProducts = await db.select().from(products);
  const allCategories = await db.select().from(categories);
  const catMap = Object.fromEntries(allCategories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
          מוצרים
        </h1>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
        >
          + מוצר חדש
        </Link>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {["תמונה", "שם", "קטגוריה", "מחיר", "במלאי", "מומלץ", "פעולות"].map((h) => (
                <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allProducts.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt={p.name} width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🪑</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{p.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{p.categoryId ? catMap[p.categoryId] : "—"}</td>
                <td className="px-4 py-3" style={{ color: "var(--ink)" }}>₪{parseFloat(p.price).toLocaleString("he-IL")}</td>
                <td className="px-4 py-3">{p.inStock ? "✅" : "❌"}</td>
                <td className="px-4 py-3">{p.featured ? "⭐" : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      עריכה
                    </Link>
                    <DeleteProductButton productId={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
