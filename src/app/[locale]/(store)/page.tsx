/**
 * Homepage — the storefront's entry point.
 *
 * Sections: Hero → Promoted category banners → Categories → Featured → Trust strip.
 * Promoted categories get large image tiles right under the hero; the rest
 * show in the compact category grid. Strings come from next-intl.
 * SEO: LocalBusiness JSON-LD embedded for Google rich results.
 */
import type { Metadata } from "next";
import FallbackImage from "@/components/ui/FallbackImage";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import ProductCard from "@/components/ui/ProductCard";
import { localBusinessJsonLd, jsonLdScript } from "@/lib/jsonld";
import { getActiveCategories, buildTree, localizedName } from "@/lib/catalog";
import { categoryDiscount, saleSource } from "@/lib/pricing";
import PromotedCarousel, { type PromotedTile } from "@/components/ui/PromotedCarousel";
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

  // Inherited sale discounts for the featured grid
  const discountFor = (categoryId: number | null) =>
    categoryId == null ? 0 : categoryDiscount(categoryId, activeCategories);

  // Big tiles: promoted categories, plus any that are running a sale — a live
  // discount earns the same real estate as a hand-picked promotion.
  const promoted = roots.filter((c) => c.promoted || discountFor(c.id) > 0);
  const promotedIds = new Set(promoted.map((c) => c.id));
  const regular = roots.filter((c) => !promotedIds.has(c.id));

  const promotedTiles: PromotedTile[] = promoted.map((cat) => {
    const pct = discountFor(cat.id);
    const src = pct > 0 ? saleSource(cat.id, activeCategories) : null;
    return {
      id: cat.id,
      href: `/products?category=${cat.slug}`,
      name: localizedName(cat, locale),
      img: imageUrl(cat.imageUrl, "tile"),
      percent: pct,
      endsAt: src?.endsAt ? src.endsAt.toISOString() : null,
    };
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessJsonLd()) }}
      />

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: "var(--surface-elevated)" }}
      >
        {/* Soft warm gradient wash behind the silhouette — pure CSS, no
            image asset. Blurred radial blobs in the brand color, kept
            subtle (low opacity) so it reads as depth, not a spotlight. */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 85% 40%, oklch(0.72 0.11 40 / 0.35), transparent 70%), " +
              "radial-gradient(ellipse 45% 55% at 95% 75%, oklch(0.52 0.14 32 / 0.18), transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        {/* Decorative armchair line-art filling the empty side opposite the
            text — always the "end" logical side (right in LTR, left in
            RTL), since the text block itself always starts from "start".
            Purely decorative: aria-hidden, no pointer events, hidden on
            narrow screens where there's no spare room for it anyway. */}
        <svg
          viewBox="0 0 400 400"
          aria-hidden="true"
          className="hidden md:block absolute pointer-events-none"
          style={{
            insetInlineEnd: "-40px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(38vw, 420px)",
            height: "auto",
            opacity: 0.5,
            color: "var(--border)",
          }}
        >
          <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
            {/* backrest */}
            <path d="M120 70a30 30 0 0 1 30-30h100a30 30 0 0 1 30 30v150H120z" />
            {/* seat cushion */}
            <path d="M90 220h220v55a15 15 0 0 1-15 15H105a15 15 0 0 1-15-15z" />
            {/* left armrest */}
            <path d="M65 160a25 25 0 0 1 25-25h5v130h-10a20 20 0 0 1-20-20z" />
            {/* right armrest */}
            <path d="M335 160a25 25 0 0 1-25-25h-5v130h10a20 20 0 0 0 20-20z" />
            {/* legs */}
            <path d="M120 290v40M280 290v40" />
          </g>
        </svg>

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

      {/* ── Promoted categories — carousel of large image banners ── */}
      {promotedTiles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
          <PromotedCarousel tiles={promotedTiles} />
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
                    <FallbackImage
                      src={img ?? ""}
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
          // lg:3 before xl:4 — jumping straight from 2 to 4 columns at 1024px
          // left almost no breathing room per card at common laptop widths
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} discount={discountFor(p.categoryId)} />
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
