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
import { localizedName, localizedDescription } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";

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
  return {
    title: name,
    description: description ?? `${name} — ₪${product.price}`,
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
            <div className="w-full h-full flex items-center justify-center text-8xl">🪑</div>
          )}
        </div>

        {/* ── Product info ── */}
        <div className="flex flex-col gap-6">
          <div>
            <h1
              className="text-3xl font-bold mb-3"
              style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}
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
    </div>
  );
}
