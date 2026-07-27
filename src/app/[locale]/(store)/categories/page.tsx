/**
 * /categories — the full category directory.
 *
 * The homepage only shows a handful of top-level tiles (same pattern as
 * "featured products" only showing 8); this is the "see everything"
 * counterpart, same relationship /products has to the featured grid.
 * Every root category gets a tile, and its full subcategory list underneath
 * (not truncated to 3 like the homepage teaser) so this page actually works
 * as a directory, not just a bigger version of the homepage section.
 */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import FallbackImage from "@/components/ui/FallbackImage";
import { getActiveCategories, buildTree, localizedName } from "@/lib/catalog";
import { imageUrl } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "categories" });
  const prefix: Record<string, string> = { he: "", en: "/en", ru: "/ru" };
  return {
    title: t("title"),
    alternates: {
      canonical: `${prefix[locale] ?? ""}/categories`,
      languages: { he: "/categories", en: "/en/categories", ru: "/ru/categories", "x-default": "/categories" },
    },
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "categories" });

  const active = await getActiveCategories();
  const roots = buildTree(active);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
        {t("title")}
      </h1>

      {roots.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("empty")}</p>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {roots.map((cat) => {
            const img = imageUrl(
              cat.imageUrl,
              "card",
              cat.focalX != null && cat.focalY != null ? { x: cat.focalX, y: cat.focalY } : null
            );
            return (
              <div
                key={cat.id}
                className="flex flex-col rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
              >
                <Link href={`/products?category=${cat.slug}`} className="group block aspect-[4/3] relative" style={{ backgroundColor: "var(--surface)" }}>
                  <FallbackImage
                    src={img ?? ""}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  />
                </Link>
                <div className="p-4 flex flex-col gap-2">
                  <Link href={`/products?category=${cat.slug}`} className="font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--ink)" }}>
                    {localizedName(cat, locale)}
                  </Link>
                  {cat.children.length > 0 && (
                    <ul className="flex flex-wrap gap-x-2 gap-y-1">
                      {cat.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/products?category=${child.slug}`}
                            className="text-xs hover:opacity-70 transition-opacity"
                            style={{ color: "var(--muted)" }}
                          >
                            {localizedName(child, locale)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
