/**
 * /admin/categories — category tree management (the admin's main tool).
 * Server component: fetches the flat list, hands it to the client manager.
 */
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getTranslations } from "next-intl/server";
import CategoryManager from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.categories" });
  const all = await db.select().from(categories);

  // Dates serialize to strings across the RSC boundary — normalize explicitly
  const initial = all.map((c) => ({
    ...c,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    createdAt: undefined,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--font-playfair)", color: "var(--ink)" }}>
        {t("title")}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {t("subtitle")}
      </p>
      <CategoryManager initial={initial} />
    </div>
  );
}
