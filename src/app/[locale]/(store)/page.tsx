/**
 * Homepage — the storefront's entry point.
 *
 * Sections: Hero → Categories → Featured products → Trust strip.
 * Strings come from next-intl so this page renders in Hebrew, English, or Russian.
 * SEO: LocalBusiness JSON-LD embedded for Google rich results.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import ProductCard from "@/components/ui/ProductCard";
import { localBusinessJsonLd } from "@/lib/jsonld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    openGraph: { locale },
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

async function getCategories() {
  try {
    return await db.select().from(categories);
  } catch {
    return [];
  }
}

// Emoji stand-ins until the store has real category images
const CATEGORY_ICONS: Record<string, string> = {
  sofas: "🛋️",
  tables: "🪑",
  bedroom: "🛏️",
  storage: "🗄️",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const [featuredProducts, allCategories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

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
              style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
            >
              {t("heroTitle")}
              <br />
              <em style={{ color: "var(--primary)", fontStyle: "italic" }}>{t("heroTitleEm")}</em>
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
          className="absolute bottom-0 right-0 h-1 w-1/3"
          style={{ backgroundColor: "var(--primary)", opacity: 0.3 }}
        />
      </section>

      {/* ── Categories ── */}
      {allCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
          >
            {t("categoriesTitle")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-colors hover:border-[oklch(0.52_0.14_32)]"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-3xl">{CATEGORY_ICONS[cat.slug] ?? "🪵"}</span>
                <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured products ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
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
              <ProductCard key={p.id} product={p} index={i} />
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
                  style={{ color: "var(--primary)", fontFamily: "var(--font-playfair)" }}
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
