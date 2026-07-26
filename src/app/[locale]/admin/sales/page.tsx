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
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import EndSaleButton from "@/components/admin/EndSaleButton";
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

  const cellHead = "px-4 py-3 text-start font-medium";
  const tableWrap = "rounded-xl border overflow-x-auto mb-10";
  const tableStyle = { borderColor: "var(--border)", backgroundColor: "var(--bg)" };

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

      {/* ── Sale categories ── */}
      <h2 className="font-bold mb-3" style={{ color: "var(--ink)" }}>
        {t("categoriesTitle")}
      </h2>
      <div className={tableWrap} style={tableStyle}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {[t("category"), t("discount"), t("status"), t("endsAt"), t("actions")].map((h) => (
                <th key={h} className={cellHead} style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {saleCategories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  {t("noSaleCategories")}
                </td>
              </tr>
            )}
            {saleCategories.map((c) => {
              const live = activeCats.some((a) => a.id === c.id);
              return (
                <tr key={c.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
                    {c.name}
                    {c.parentId != null && (
                      <span className="text-xs ms-2" style={{ color: "var(--muted)" }}>
                        ← {catName.get(c.parentId)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }} dir="ltr">
                    -{c.discountPercent}%
                  </td>
                  <td className="px-4 py-3" style={{ color: live ? "var(--ink)" : "var(--muted)" }}>
                    {live ? t("statusLive") : t("statusInactive")}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }} dir="ltr">
                    {c.endsAt ? c.endsAt.toLocaleString("he-IL") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href="/admin/categories"
                        className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                        style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                      >
                        {t("edit")}
                      </Link>
                      <EndSaleButton
                        action="endCategory"
                        id={c.id}
                        label={t("endSale")}
                        confirmText={t("endCategoryConfirm", { name: c.name })}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Discounted products ── */}
      <h2 className="font-bold mb-3" style={{ color: "var(--ink)" }}>
        {t("productsTitle", { count: discounted.length })}
      </h2>
      <div className={tableWrap} style={tableStyle}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {[t("product"), t("was"), t("now"), t("discount"), t("origin"), t("actions")].map((h) => (
                <th key={h} className={cellHead} style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {discounted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  {t("noDiscounted")}
                </td>
              </tr>
            )}
            {discounted.map((r) => (
              <tr key={r.product.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{r.product.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                  <s>₪{parseFloat(r.product.price).toLocaleString("he-IL")}</s>
                </td>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }}>
                  ₪{r.price.toLocaleString("he-IL")}
                </td>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }} dir="ltr">
                  -{r.percent}%
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                  {r.own ? t("originIndividual") : t("originCategory", { category: r.source?.name ?? "—" })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/products/${r.product.id}/edit`}
                      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      {t("edit")}
                    </Link>
                    {/* Inherited discounts have no per-product switch — they
                        end with the category, which is the row above. */}
                    {r.own && (
                      <EndSaleButton
                        action="endProduct"
                        id={r.product.id}
                        label={t("endSale")}
                        confirmText={t("endProductConfirm", { name: r.product.name })}
                      />
                    )}
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
