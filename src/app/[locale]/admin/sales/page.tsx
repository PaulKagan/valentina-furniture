/**
 * Admin → Sales. One screen that answers "what is discounted right now?"
 *
 * Two tables, because the two kinds of sale are ended in different places:
 *   1. Sale categories — the discount lives on the category. Ending it here
 *      unticks the category and every product under it returns to full price.
 *   2. Discounted products — split into products with their own sale price
 *      (she set them individually) and products that are only inheriting.
 *      Only the first kind can be ended per-product; the rest say where
 *      their discount comes from, and link to that category.
 *
 * Prices shown are the ones the storefront charges — same effectivePrice()
 * the cards and the order endpoint use, so this page can't disagree with
 * what a customer sees.
 */
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { getTranslations } from "next-intl/server";
import EndSaleButton from "@/components/admin/EndSaleButton";
import SalesTables from "@/components/admin/SalesTables";
import {
  categoryDiscount,
  effectivePrice,
  discountPercent,
  saleSource,
  isOnSale,
} from "@/lib/pricing";
import { isCategoryActive } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.sales" });

  const [allProducts, allCategories] = await Promise.all([
    db.select().from(products),
    db.select().from(categories),
  ]);

  // Only categories the storefront currently honours grant a discount —
  // matching getActiveCategories() so this page shows live truth, not intent.
  const now = new Date();
  const activeCats = allCategories.filter((c) => isCategoryActive(c, now));
  const discountFor = (categoryId: number | null) => categoryDiscount(categoryId, activeCats);

  const saleCategories = allCategories.filter((c) => c.isSaleCategory && c.discountPercent > 0);
  const catName = new Map(allCategories.map((c) => [c.id, c.name]));

  // Every product the store is currently showing at a discount
  const discounted = allProducts
    .map((p) => {
      const inherited = discountFor(p.categoryId);
      return {
        product: p,
        inherited,
        percent: discountPercent(p, inherited),
        price: effectivePrice(p, inherited),
        // Her own sale price beats any inherited percentage (lib/pricing)
        own: !!p.salePrice,
        source: p.salePrice ? null : saleSource(p.categoryId, activeCats),
      };
    })
    .filter((r) => isOnSale(r.product, r.inherited))
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));

  const individualCount = discounted.filter((r) => r.own).length;

  // Pre-formatted, plain-serializable rows for the client component —
  // locale-formatted strings computed once here rather than re-derived per render.
  const saleCategoryRows = saleCategories.map((c) => ({
    id: c.id,
    name: c.name,
    parentName: c.parentId != null ? catName.get(c.parentId) ?? null : null,
    discountPercent: c.discountPercent,
    live: activeCats.some((a) => a.id === c.id),
    endsAtLabel: c.endsAt ? c.endsAt.toLocaleString("he-IL") : "—",
  }));
  const discountedRows = discounted.map((r) => ({
    productId: r.product.id,
    name: r.product.name,
    wasLabel: `₪${parseFloat(r.product.price).toLocaleString("he-IL")}`,
    nowLabel: `₪${r.price.toLocaleString("he-IL")}`,
    percent: r.percent ?? 0,
    own: r.own,
    originLabel: r.own ? t("originIndividual") : t("originCategory", { category: r.source?.name ?? "—" }),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          {t("title")}
        </h1>
        {individualCount > 0 && (
          <EndSaleButton
            emphasis
            action="endAllProducts"
            label={t("endAllIndividual", { count: individualCount })}
            confirmText={t("endAllConfirm", { count: individualCount })}
          />
        )}
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        {t("subtitle")}
      </p>

      <SalesTables saleCategories={saleCategoryRows} discounted={discountedRows} />
    </div>
  );
}
