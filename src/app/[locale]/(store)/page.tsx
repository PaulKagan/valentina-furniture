/**
 * Homepage — the storefront's entry point.
 *
 * Sections: Hero → Promoted category banners → Categories → Featured → Trust strip.
 * Promoted categories get large image tiles right under the hero; the rest
 * show in the compact category grid. Strings come from next-intl.
 * SEO: LocalBusiness JSON-LD embedded for Google rich results.
 */
import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import ProductCard from "@/components/ui/ProductCard";
import { localBusinessJsonLd } from "@/lib/jsonld";
import { getActiveCategories, buildTree, localizedName, descendantIds } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const prefix: Record<string, string> = { he: "", en: "/en", ru: "/ru" };
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    openGraph: { locale },
    // hreflang alternates — Google serves the right language per searcher
    alternates: {
      canonical: prefix[locale] || "/",
      languages: { he: "/", en: "/en", ru: "/ru", "x-default": "/" },
    },
  };
}

async function getFeaturedProducts() {
  try {
    return await db
      .select()
      .from(products)
      .where(eq(products.featured, true))
      .limit(8)
      .orderBy(desc(products.createdAt));
  } catch {
    return []; // graceful degradation — page still renders without DB
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const [allFeatured, activeCategories] = await Promise.all([
    getFeaturedProducts(),
    getActiveCategories(),
  ]);

  // Hide featured products whose category is hidden/expired
  const activeIds = new Set(activeCategories.map((c) => c.id));
  const featuredProducts = allFeatured.filter(
    (p) => p.categoryId == null || activeIds.has(p.categoryId)
  );

  const roots = buildTree(activeCategories);
  const promoted = roots.filter((c) => c.promoted);
  const regular = roots.filter((c) => !c.promoted);

  // Sale badge on featured cards when their category branch is promoted
  const promotedBranchIds = new Set<number>();
  for (const c of activeCategories) {
    if (c.promoted) for (const id of descendantIds(c.id, activeCategories)) promotedBranchIds.add(id);
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
      />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "var(--surface-elevated)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
          <div
            className="max-w-2xl fade-up"
            style={{ "--delay": "0ms" } as React.CSSProperties}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--primary)" }}>
              {t("heroTag")}
            </p>
            <h1
              className="text-4xl md:text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              {t("heroTitle")}
              <br />
              <em
                style={{
                  color: "var(--primary)",
                  // Hebrew has no true italics — the browser would fake a slant,
                  // which looks like a rendering fault. Emphasis comes from
                  // color alone in RTL; Latin keeps its real italic.
                  fontStyle: locale === "he" ? "normal" : "italic",
                }}
              >
                {t("heroTitleEm")}
              </em>
            </h1>
            <p
              className="text-lg mb-8 leading-relaxed"
              style={{ color: "var(--muted)", maxWidth: "52ch" }}
            >
              {t("heroDesc")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 active:scale-[0.97]"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
              >
                {t("heroCta")}
              </Link>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "972501234567"}`}
                className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm border-2 transition-colors hover:opacity-90"
                style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              >
                {t("heroWhatsapp")}
              </a>
            </div>
          </div>
        </div>
        <div
          className="absolute bottom-0 end-0 h-1 w-1/3"
          style={{ backgroundColor: "var(--primary)", opacity: 0.3 }}
        />
      </section>

      {/* ── Promoted categories — large image banners ── */}
      {promoted.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
          <div className={`grid gap-4 ${promoted.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {promoted.map((cat) => {
              const img = imageUrl(cat.imageUrl, "tile");
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="group relative rounded-2xl overflow-hidden aspect-[16/7] flex items-end"
                  style={{ backgroundColor: "var(--surface-elevated)" }}
                >
                  <Image
                    src={img ?? "/placeholder-product.svg"}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  />
                  {/* Legibility scrim — only over an actual photo */}
                  {img && (
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, oklch(0.18 0.012 32 / 0.65), transparent 55%)" }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative p-5 sm:p-6 flex items-center gap-3">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
                    >
                      {t("promotedBadge")}
                    </span>
                    <span
                      className="text-xl sm:text-2xl font-bold"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: img ? "oklch(0.98 0 0)" : "var(--ink)",
                      }}
                    >
                      {localizedName(cat, locale)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Categories ── */}
      {regular.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            {t("categoriesTitle")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {regular.map((cat) => {
              const img = imageUrl(cat.imageUrl, "card");
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="group flex flex-col rounded-xl border-2 overflow-hidden transition-colors hover:border-[oklch(0.52_0.14_32)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="block aspect-[4/3] relative" style={{ backgroundColor: "var(--surface)" }}>
                    <Image
                      src={img ?? "/placeholder-product.svg"}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      style={{ transitionTimingFunction: "var(--ease-out)" }}
                    />
                  </span>
                  <span className="p-4 font-semibold text-sm" style={{ color: "var(--ink)" }}>
                    {localizedName(cat, locale)}
                    {cat.children.length > 0 && (
                      <span className="block text-xs font-normal mt-0.5" style={{ color: "var(--muted)" }}>
                        {cat.children
                          .slice(0, 3)
                          .map((ch) => localizedName(ch, locale))
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured products ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
          >
            {t("featuredTitle")}
          </h2>
          <Link href="/products" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            {t("featuredAll")}
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted)" }}>
            <p className="text-lg">{t("noProducts")}</p>
            <p className="text-sm mt-2">{t("noProductsContact")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                onSale={p.categoryId != null && promotedBranchIds.has(p.categoryId)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Trust strip ── */}
      <section className="py-12" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: t("trust.yearsValue"), label: t("trust.years") },
              { value: t("trust.customersValue"), label: t("trust.customers") },
              { value: t("trust.serviceValue"), label: t("trust.service") },
              { value: t("trust.warrantyValue"), label: t("trust.warranty") },
            ].map((item) => (
              <div key={item.label}>
                <dt
                  className="text-2xl font-bold mb-1"
                  style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}
                >
                  {item.value}
                </dt>
                <dd className="text-sm" style={{ color: "var(--muted)" }}>
                  {item.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
