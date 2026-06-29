/**
 * Homepage — the storefront's entry point.
 *
 * Sections (in order):
 *   1. Hero — brand statement + primary CTAs
 *   2. Categories — quick-jump to product sections
 *   3. Featured products — curated products marked `featured=true` in admin
 *   4. Trust strip — social proof numbers
 *
 * SEO: LocalBusiness JSON-LD embedded here so Google associates
 * the site with a physical furniture store in Tel Aviv.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import ProductCard from "@/components/ui/ProductCard";
import { localBusinessJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "ולנטינה בן עמי | חנות ריהוט בתל אביב",
  description:
    "ריהוט איכותי לבית — ספות, שולחנות, ארוניות ועוד. חנות ריהוט ולנטינה בן עמי בתל אביב. ייעוץ אישי, אחריות על כל המוצרים.",
  openGraph: {
    title: "ולנטינה בן עמי | חנות ריהוט",
    description: "ריהוט איכותי לבית עם ליווי אישי מהבחירה ועד הרכבה.",
  },
};

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

export default async function HomePage() {
  const [featuredProducts, allCategories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <>
      {/* Structured data for Google — LocalBusiness rich result */}
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
              ריהוט לבית הישראלי
            </p>
            <h1
              className="text-4xl md:text-[clamp(2.5rem,6vw,4.5rem)] font-bold mb-6"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
            >
              כשהבית מרגיש
              <br />
              <em style={{ color: "var(--primary)", fontStyle: "italic" }}>כמו בית</em>
            </h1>
            <p
              className="text-lg mb-8 leading-relaxed"
              style={{ color: "var(--muted)", maxWidth: "52ch" }}
            >
              ריהוט איכותי שנבחר בקפידה — לכל חדר, לכל סגנון.
              מספות מרווחות ועד ארוניות מעוצבות.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/products"
                className="btn-primary inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm transition-opacity"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
              >
                לקטלוג המוצרים
              </Link>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "972501234567"}`}
                className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-sm border-2 transition-colors"
                style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
              >
                ייעוץ חינם בוואטסאפ
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
            קטגוריות
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-colors"
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
            מוצרים נבחרים
          </h2>
          <Link href="/products" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
            לכל המוצרים ←
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="text-center py-20" style={{ color: "var(--muted)" }}>
            <p className="text-lg">בקרוב יתווספו מוצרים לחנות.</p>
            <p className="text-sm mt-2">צרו קשר ונשמח לעזור בבחירה.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Trust strip — social proof ── */}
      <section className="py-12" style={{ backgroundColor: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "15+", label: "שנות ניסיון" },
              { value: "2,000+", label: "לקוחות מרוצים" },
              { value: "ליווי אישי", label: "מהבחירה ועד הרכבה" },
              { value: "אחריות", label: "על כל המוצרים" },
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
