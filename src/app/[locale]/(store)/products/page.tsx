/**
 * Products page — /products?category=<slug>
 *
 * Category browsing over the tree:
 *   - no category → top-level category chips + all products
 *   - category selected → breadcrumb trail, its subcategory chips, and
 *     products from the whole branch (category + all descendants)
 * Hidden/expired categories never appear (getActiveCategories).
 * Products in a promoted branch get the sale badge on their cards.
 */
import type { Metadata } from "next";
import { db } from "@/db";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import ProductCard from "@/components/ui/ProductCard";
import FilterBar from "@/components/ui/FilterBar";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  getActiveCategories,
  buildTree,
  descendantIds,
  categoryPath,
  localizedName,
  type Category,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    colors?: string;
    min?: string;
    max?: string;
    stock?: string;
    sort?: string;
  }>;
};

const LOCALE_PREFIX: Record<string, string> = { he: "", en: "/en", ru: "/ru" };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations({ locale, namespace: "products" });

  // Canonical keeps only the category — filter/sort variants (?colors=…&sort=…)
  // all point at the same page so they don't bloat Google's crawl
  const path = category ? `/products?category=${category}` : "/products";
  const alternates: Metadata["alternates"] = {
    canonical: `${LOCALE_PREFIX[locale] ?? ""}${path}`,
    languages: {
      he: path,
      en: `/en${path}`,
      ru: `/ru${path}`,
      "x-default": path,
    },
  };

  if (category) {
    const active = await getActiveCategories();
    const cat = active.find((c) => c.slug === category);
    if (cat) return { title: localizedName(cat, locale), alternates };
  }
  return { title: t("title"), alternates };
}

/** Chip link — active state uses the primary color, matching the design tokens. */
function Chip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors"
      style={{
        borderColor: active ? "var(--primary)" : "var(--border)",
        color: active ? "var(--primary)" : "var(--muted)",
        backgroundColor: active ? "oklch(0.974 0 0)" : "transparent",
      }}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { category, colors, min, max, stock, sort } = await searchParams;
  const t = await getTranslations({ locale, namespace: "products" });

  const active = await getActiveCategories();
  const activeCategory = category ? active.find((c) => c.slug === category) : undefined;

  // Products of the selected branch, or everything that isn't inside a
  // hidden/expired category (uncategorized products always show)
  let productList;
  if (activeCategory) {
    const branchIds = descendantIds(activeCategory.id, active);
    productList = await db.select().from(products).where(inArray(products.categoryId, branchIds));
  } else {
    const activeIds = new Set(active.map((c) => c.id));
    const all = await db.select().from(products);
    productList = all.filter((p) => p.categoryId == null || activeIds.has(p.categoryId));
  }

  // ── Filters (URL-driven, applied in memory — catalog is a few hundred rows) ──
  const wantedColors = (colors ?? "").split(",").filter(Boolean);
  const minPrice = min ? parseFloat(min) : null;
  const maxPrice = max ? parseFloat(max) : null;

  productList = productList.filter((p) => {
    const price = parseFloat(p.price);
    if (wantedColors.length > 0 && !wantedColors.some((c) => p.colors.includes(c))) return false;
    if (minPrice != null && !isNaN(minPrice) && price < minPrice) return false;
    if (maxPrice != null && !isNaN(maxPrice) && price > maxPrice) return false;
    if (stock === "1" && !p.inStock) return false;
    return true;
  });

  // ── Sort ──
  switch (sort) {
    case "price-asc":
      productList.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case "price-desc":
      productList.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case "name":
      productList.sort((a, b) => localizedName(a, locale).localeCompare(localizedName(b, locale), locale));
      break;
    default: // newest
      productList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Sale badge: product's category sits in a promoted branch
  const promotedBranchIds = new Set<number>();
  for (const c of active) {
    if (c.promoted) for (const id of descendantIds(c.id, active)) promotedBranchIds.add(id);
  }

  // Chips: top-level categories, or the selected category's children
  const roots = buildTree(active);
  const selectedNode = activeCategory
    ? (function find(list): (typeof roots)[number] | undefined {
        for (const n of list) {
          if (n.id === activeCategory.id) return n;
          const hit = find(n.children);
          if (hit) return hit;
        }
      })(roots)
    : undefined;
  const chips: Category[] = selectedNode ? selectedNode.children : roots;

  const trail = activeCategory ? categoryPath(activeCategory, active) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumbs — only when inside a category */}
      {activeCategory && (
        <nav aria-label="breadcrumb" className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/products" className="hover:text-[oklch(0.52_0.14_32)] transition-colors">
                {t("title")}
              </Link>
            </li>
            {trail.map((c, i) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span aria-hidden="true">/</span>
                {i === trail.length - 1 ? (
                  <span style={{ color: "var(--ink)" }} aria-current="page">
                    {localizedName(c, locale)}
                  </span>
                ) : (
                  <Link
                    href={`/products?category=${c.slug}`}
                    className="hover:text-[oklch(0.52_0.14_32)] transition-colors"
                  >
                    {localizedName(c, locale)}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        {activeCategory ? localizedName(activeCategory, locale) : t("title")}
        {activeCategory?.promoted && (
          <span
            className="inline-block align-middle ms-3 text-sm font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {t("saleBadge")}
          </span>
        )}
      </h1>

      {/* Category chips: top-level, or subcategories of the selection */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {!activeCategory && <Chip href="/products" label={t("filterAll")} active={true} />}
          {chips.map((cat) => (
            <Chip
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              label={localizedName(cat, locale)}
              active={false}
            />
          ))}
        </div>
      )}

      {/* Filter + sort bar (client, URL-driven; useSearchParams needs Suspense) */}
      <Suspense fallback={null}>
        <FilterBar resultCount={productList.length} />
      </Suspense>

      {productList.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--muted)" }}>
          <p className="text-lg">{t("noProducts")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {productList.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
              onSale={p.categoryId != null && promotedBranchIds.has(p.categoryId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
