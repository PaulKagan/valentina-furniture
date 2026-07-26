import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import Image from "next/image";
import { imageUrl } from "@/lib/images";
import { ADMIN_PAGE_SIZE, visibleCount } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const { locale } = await params;
  const { show } = await searchParams;
  const t = await getTranslations({ locale, namespace: "admin.products" });
  const all = await db.select().from(products);
  const allCategories = await db.select().from(categories);

  // Paginate — a few hundred products shouldn't all render at once
  const shown = visibleCount(show, all.length, ADMIN_PAGE_SIZE);
  const allProducts = all.slice(0, shown);
  const catMap = Object.fromEntries(allCategories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          {t("title")}
        </h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/products/export"
            download
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[oklch(0.974_0_0)]"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {t("export")}
          </a>
          <Link
            href="/admin/products/import"
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[oklch(0.974_0_0)]"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {t("import")}
          </Link>
          <Link
            href="/admin/products/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            + {t("new")}
          </Link>
        </div>
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {[t("image"), t("name"), t("category"), t("price"), t("inStock"), t("featured"), t("actions")].map((h) => (
                <th key={h} className="px-4 py-3 text-start font-medium" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center" style={{ color: "var(--muted)" }}>
                  {t("noProducts")}
                </td>
              </tr>
            )}
            {allProducts.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
                    {p.imageUrl ? (
                      <Image src={imageUrl(p.imageUrl, "thumb") ?? p.imageUrl} alt={p.name} width={48} height={48} className="object-cover w-full h-full" />
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
                      {t("edit")}
                    </Link>
                    <Link
                      href={`/admin/products/new?from=${p.id}`}
                      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    >
                      {t("duplicate")}
                    </Link>
                    <DeleteProductButton productId={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown < all.length && (
        <p className="mt-4 text-sm text-center" style={{ color: "var(--muted)" }}>
          <Link href={`/admin/products?show=${shown + ADMIN_PAGE_SIZE}`} className="underline" style={{ color: "var(--primary)" }}>
            {t("loadMore", { shown, total: all.length })}
          </Link>
        </p>
      )}
    </div>
  );
}
