/**
 * Product detail page — /products/[id]
 *
 * Renders a single product with image, price, description, and add-to-cart.
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
import Link from "next/link";
import AddToCartButton from "@/components/ui/AddToCartButton";
import { productJsonLd } from "@/lib/jsonld";
import { getTranslations } from "next-intl/server";

type Props = { params: Promise<{ id: string; locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, locale } = await params;
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, parseInt(id)))
    .then((r) => r[0]);

  if (!product) {
    const t = await getTranslations({ locale, namespace: "productDetail" });
    return { title: t("notFound") };
  }

  return {
    title: product.name,
    description: product.description ?? `${product.name} — ₪${product.price}`,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "productDetail" });

  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, parseInt(id)))
    .then((r) => r[0]);

  if (!product) notFound();

  const price = parseFloat(product.price);

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
        {/* ── Product image ── */}
        <div
          className="aspect-square relative rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--surface)" }}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
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
              {product.name}
            </h1>
            <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
              ₪{price.toLocaleString()}
            </p>
          </div>

          {product.description && (
            <p className="leading-relaxed" style={{ color: "var(--muted)" }}>
              {product.description}
            </p>
          )}

          {product.inStock ? (
            <AddToCartButton
              product={{ id: product.id, name: product.name, price, imageUrl: product.imageUrl }}
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
