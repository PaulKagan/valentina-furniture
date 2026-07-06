/**
 * Pure localization helpers — safe to import from client components
 * (no DB imports here; lib/catalog.ts pulls in the postgres driver
 * and must stay server-only).
 *
 * Fallback rule: show the requested language if filled, otherwise any
 * language that was filled — if Valentina writes only Russian, Russian
 * shows everywhere.
 */

export function localizedName(
  row: { name: string; nameEn: string | null; nameRu: string | null },
  locale: string
): string {
  const byLocale: Record<string, string | null> = {
    he: row.name,
    en: row.nameEn,
    ru: row.nameRu,
  };
  return byLocale[locale] || row.name || row.nameEn || row.nameRu || "";
}

export function localizedDescription(
  row: { description: string | null; descriptionEn: string | null; descriptionRu: string | null },
  locale: string
): string | null {
  const byLocale: Record<string, string | null> = {
    he: row.description,
    en: row.descriptionEn,
    ru: row.descriptionRu,
  };
  return byLocale[locale] || row.description || row.descriptionEn || row.descriptionRu || null;
}
