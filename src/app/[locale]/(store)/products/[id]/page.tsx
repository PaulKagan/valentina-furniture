/**
 * Product detail page — /products/[id]
 *
 * Renders a single product with image, price, description, and add-to-cart.
 * Name/description are localized (fallback to whichever language is filled).
 * The image uses the square Cloudinary preset so every product page looks
 * identical regardless of the uploaded photo's dimensions.
 * generateMetadata gives each product its own <title> and OG tags so
 * sharing a product link on WhatsApp shows a proper preview.
 * Product JSON-LD tells Google the price and availability for rich results.
 */
import type { Metadata } from "next";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import AddToCartButton from "@/components/ui/AddToCartButton";
import { productJsonLd } from "@/lib/jsonld";
import { getTranslations } from "next-intl/server";
import {
  localizedName,
  localizedDescription,
  getActiveCategories,
  descendantIds,
} from "@/lib/catalog";
import { imageUrl } from "@/lib/images";
import { colorByKey, colorLabel } from "@/lib/colors";
import { pickSimilar } from "@/lib/similar";
import ProductStrip from "@/components/ui/ProductStrip";

type Props = { params: Promise<{ id: string; locale: string }> };

async function getProduct(id: string) {
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return undefined;
  return db
    .select()
    .from(products)
    .where(eq(products.id, numId))
    .then((r) => r[0]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const product = await getProduct(id);

  if (!product) {
    const t = await getTranslations({ locale, namespace: "productDetail" });
    return { title: t("notFound") };
  }

  const name = localizedName(product, locale);
  const description = localizedDescription(product, locale);
  const path = `/products/${product.id}`;
  const prefix: Record<string, string> = { he: "", en: "/en", ru: "/ru" };
  return {
    title: name,
    description: description ?? `${name} — ₪${product.price}`,
    alternates: {
      canonical: `${prefix[locale] ?? ""}${path}`,
      languages: { he: path, en: `/en${path}`, ru: `/ru${path}`, "x-default": path },
    },
    openGraph: {
      title: name,
      description: description ?? undefined,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "productDetail" });

  const product = await getProduct(id);
  if (!product) notFound();

  const price = parseFloat(product.price);
  const name = localizedName(product, locale);
  const description = localizedDescription(product, locale);
  const img = imageUrl(product.imageUrl, "detail");

  // "You might also like" — same branch / colors / price bracket.
  // Hidden-category products are excluded so nothing leaks into the store.
  const activeCats = await getActiveCategories();
  const activeIds = new Set(activeCats.map((c) => c.id));
  const pool = (await db.select().from(products)).filter(
    (p) => p.categoryId == null || activeIds.has(p.categoryId)
  );
  const branchRoot = product.categoryId != null
    ? activeCats.find((c) => c.id === product.categoryId)?.parentId ?? product.categoryId
    : null;
  const similar = pickSimilar(
    pool,
    {
      id: product.id,
      categoryId: product.categoryId,
      branchIds: branchRoot != null ? descendantIds(branchRoot, activeCats) : [],
      colors: product.colors,
      price,
      widthCm: product.widthCm,
    },
    4
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/products"
        className="inline-block text-sm mb-8 hover:opacity-70 transition-opacity"
        style={{ color: "var(--muted)" }}
      >
        {t("backToProducts")}
      </Link>

      {/* Product structured data — Google shows price in search results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* ── Product image — square crop, identical on every product ── */}
        <div
          className="aspect-square relative rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--surface)" }}
        >
          {img ? (
            <Image
              src={img}
              alt={name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <Image
              src="/placeholder-product.svg"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
        </div>

        {/* ── Product info ── */}
        <div className="flex flex-col gap-6">
          <div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
            >
              {name}
            </h1>
            <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
              ₪{price.toLocaleString()}
            </p>
          </div>

          {description && (
            <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
              {description}
            </p>
          )}

          {/* Dimensions */}
          {(product.widthCm || product.depthCm || product.heightCm) && (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                {t("dimensionsLabel")}
              </span>
              <p className="text-sm" style={{ color: "var(--muted)" }} dir="ltr">
                {[
                  product.widthCm && `${t("width")} ${product.widthCm}`,
                  product.depthCm && `${t("depth")} ${product.depthCm}`,
                  product.heightCm && `${t("height")} ${product.heightCm}`,
                ]
                  .filter(Boolean)
                  .join(" × ")}{" "}
                {t("cm")}
              </p>
            </div>
          )}

          {/* Available colors — swatch chips from the fixed palette */}
          {product.colors.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                {t("colorsLabel")}
              </span>
              <ul className="flex flex-wrap gap-2">
                {product.colors.map((key) => {
                  const c = colorByKey(key);
                  if (!c) return null;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      <span
                        className="w-4 h-4 rounded-full border inline-block"
                        style={{ backgroundColor: c.swatch, borderColor: "var(--border)" }}
                        aria-hidden="true"
                      />
                      {colorLabel(key, locale)}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {product.inStock ? (
            <AddToCartButton
              product={{ id: product.id, name, price, imageUrl: product.imageUrl }}
            />
          ) : (
            <div
              className="px-6 py-3 rounded-lg text-center font-semibold"
              style={{ backgroundColor: "var(--surface)", color: "var(--muted)" }}
            >
              {t("outOfStock")}
            </div>
          )}
        </div>
      </div>

      {/* Similar items */}
      <ProductStrip title={t("similarTitle")} items={similar} />
    </div>
  );
}
