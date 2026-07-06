/**
 * Auto-generated sitemap — submitted to Google via robots.txt.
 * Every public page in all three languages (he at root, /en, /ru),
 * including active category listings and every product page.
 * Each entry carries hreflang alternates so Google serves the right
 * language to the right searcher.
 */
import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getActiveCategories } from "@/lib/catalog";

const LOCALE_PREFIX: Record<string, string> = { he: "", en: "/en", ru: "/ru" };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  /** One sitemap entry per locale for a path, with hreflang alternates. */
  const localized = (
    path: string,
    opts: { priority: number; changeFrequency: "daily" | "weekly"; lastModified?: Date }
  ): MetadataRoute.Sitemap => {
    const languages = Object.fromEntries(
      Object.entries(LOCALE_PREFIX).map(([loc, prefix]) => [loc, `${base}${prefix}${path}`])
    );
    return Object.values(LOCALE_PREFIX).map((prefix) => ({
      url: `${base}${prefix}${path}`,
      alternates: { languages },
      ...opts,
    }));
  };

  const routes: MetadataRoute.Sitemap = [
    ...localized("", { priority: 1.0, changeFrequency: "weekly" }),
    ...localized("/products", { priority: 0.9, changeFrequency: "daily" }),
  ];

  try {
    // Active category listings — hidden/expired categories stay out of the index
    const cats = await getActiveCategories();
    for (const c of cats) {
      routes.push(...localized(`/products?category=${c.slug}`, { priority: 0.7, changeFrequency: "daily" }));
    }

    // One entry per product so Google can deep-link to individual items
    const allProducts = await db.select({ id: products.id, updatedAt: products.createdAt }).from(products);
    for (const p of allProducts) {
      routes.push(
        ...localized(`/products/${p.id}`, { priority: 0.8, changeFrequency: "weekly", lastModified: p.updatedAt })
      );
    }
  } catch {
    // DB unavailable during build — static routes still ship
  }

  return routes;
}
