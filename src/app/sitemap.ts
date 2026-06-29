/**
 * Auto-generated sitemap — submitted to Google via robots.txt.
 * Includes all public pages + every product page.
 * Product pages are the highest priority: Google needs to index them
 * so customers can find specific products via search.
 */
import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products } from "@/db/schema";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Static store pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, priority: 1.0, changeFrequency: "weekly" },
    { url: `${base}/products`, priority: 0.9, changeFrequency: "daily" },
  ];

  // One entry per product so Google can deep-link to individual items
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const allProducts = await db.select({ id: products.id, updatedAt: products.createdAt }).from(products);
    productRoutes = allProducts.map((p) => ({
      url: `${base}/products/${p.id}`,
      lastModified: p.updatedAt,
      priority: 0.8,
      changeFrequency: "weekly" as const,
    }));
  } catch {
    // DB unavailable during build — skip product routes, static routes still ship
  }

  return [...staticRoutes, ...productRoutes];
}
