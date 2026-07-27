"use client";

/**
 * ProductFilters — search + category + stock filter + sort for the admin
 * products list. URL-driven (same pattern as OrderFilters) so a filtered
 * view can be bookmarked or refreshed.
 */
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export type SortOption = "name" | "priceAsc" | "priceDesc" | "outOfStockFirst";

export default function ProductFilters({ categories }: { categories: { id: number; name: string }[] }) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const stock = searchParams.get("stock") ?? "";
  const sort = (searchParams.get("sort") as SortOption) || "name";
  const [q, setQ] = useState(urlQ);
  const [prevQ, setPrevQ] = useState(urlQ);
  if (prevQ !== urlQ) {
    setPrevQ(urlQ);
    setQ(urlQ);
  }

  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete("show"); // any filter change resets pagination
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <input
        type="search"
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-10 px-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-56"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setParams({ q: q || null })}
        onKeyDown={(e) => e.key === "Enter" && setParams({ q: q || null })}
      />
      <select
        aria-label={t("category")}
        value={category}
        onChange={(e) => setParams({ category: e.target.value || null })}
        className="h-10 px-3 rounded-lg border outline-none text-sm"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
      >
        <option value="">{t("allCategories")}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label={t("inStock")}
        value={stock}
        onChange={(e) => setParams({ stock: e.target.value || null })}
        className="h-10 px-3 rounded-lg border outline-none text-sm"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
      >
        <option value="">{t("stockAll")}</option>
        <option value="in">{t("stockIn")}</option>
        <option value="out">{t("stockOut")}</option>
      </select>
      <select
        aria-label={t("sortLabel")}
        value={sort}
        onChange={(e) => setParams({ sort: e.target.value === "name" ? null : e.target.value })}
        className="h-10 px-3 rounded-lg border outline-none text-sm"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
      >
        <option value="name">{t("sortName")}</option>
        <option value="priceAsc">{t("sortPriceAsc")}</option>
        <option value="priceDesc">{t("sortPriceDesc")}</option>
        <option value="outOfStockFirst">{t("sortOutOfStockFirst")}</option>
      </select>
    </div>
  );
}
