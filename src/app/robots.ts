/**
 * Robots.txt — tells search engine crawlers what to index.
 * /admin is excluded: no login pages in Google's index.
 * /api is excluded: raw API responses are not indexable content.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
