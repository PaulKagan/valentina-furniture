"use client";

/**
 * FilterBar — color / price / stock filters + sort for the products page.
 *
 * Fully URL-driven: every change updates the query string, the server
 * re-renders the filtered list. Shareable links, working back button,
 * zero client-side data fetching.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { COLORS, colorLabel } from "@/lib/colors";

export default function FilterBar({ resultCount }: { resultCount: number }) {
  const t = useTranslations("filters");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedColors = (searchParams.get("colors") ?? "").split(",").filter(Boolean);
  const sort = searchParams.get("sort") ?? "newest";
  const inStockOnly = searchParams.get("stock") === "1";

  // Price inputs are local state, applied on blur/Enter — typing shouldn't
  // trigger a navigation per keystroke. When the URL changes externally
  // (back button, clear), resync during render (React's sanctioned pattern).
  const urlMin = searchParams.get("min") ?? "";
  const urlMax = searchParams.get("max") ?? "";
  const urlW = searchParams.get("w") ?? "";
  const [minPrice, setMinPrice] = useState(urlMin);
  const [maxPrice, setMaxPrice] = useState(urlMax);
  const [maxWidth, setMaxWidth] = useState(urlW);
  const [prevUrl, setPrevUrl] = useState({ min: urlMin, max: urlMax, w: urlW });
  if (prevUrl.min !== urlMin || prevUrl.max !== urlMax || prevUrl.w !== urlW) {
    setPrevUrl({ min: urlMin, max: urlMax, w: urlW });
    setMinPrice(urlMin);
    setMaxPrice(urlMax);
    setMaxWidth(urlW);
  }

  function setParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace((qs ? `${pathname}?${qs}` : pathname) as never, { scroll: false });
  }

  function toggleColor(key: string) {
    const next = selectedColors.includes(key)
      ? selectedColors.filter((k) => k !== key)
      : [...selectedColors, key];
    setParams({ colors: next.join(",") || null });
  }

  const hasFilters =
    selectedColors.length > 0 || inStockOnly || !!urlMin || !!urlMax || !!urlW || sort !== "newest";

  const inputClass = "h-9 w-24 px-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm";
  const inputStyle = { borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" };

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl border mb-8"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg)" }}
    >
      {/* Colors */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium me-1" style={{ color: "var(--ink)" }}>
          {t("color")}
        </span>
        {COLORS.map((c) => {
          const selected = selectedColors.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleColor(c.key)}
              aria-pressed={selected}
              title={colorLabel(c.key, locale)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border-2 text-xs font-medium transition-colors"
              style={{
                borderColor: selected ? "var(--primary)" : "var(--border)",
                color: selected ? "var(--primary)" : "var(--muted)",
              }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border inline-block"
                style={{ backgroundColor: c.swatch, borderColor: "var(--border)" }}
                aria-hidden="true"
              />
              {colorLabel(c.key, locale)}
            </button>
          );
        })}
      </div>

      {/* Price + stock + sort */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("price")}</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t("min")}
            aria-label={t("minPrice")}
            className={inputClass}
            style={inputStyle}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={() => setParams({ min: minPrice || null })}
            onKeyDown={(e) => e.key === "Enter" && setParams({ min: minPrice || null })}
          />
          <span style={{ color: "var(--muted)" }}>–</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t("max")}
            aria-label={t("maxPrice")}
            className={inputClass}
            style={inputStyle}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={() => setParams({ max: maxPrice || null })}
            onKeyDown={(e) => e.key === "Enter" && setParams({ max: maxPrice || null })}
          />
        </div>

        {/* Max width — "will it fit my wall?" */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{t("maxWidth")}</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t("cmPlaceholder")}
            aria-label={t("maxWidth")}
            className={inputClass}
            style={inputStyle}
            value={maxWidth}
            onChange={(e) => setMaxWidth(e.target.value)}
            onBlur={() => setParams({ w: maxWidth || null })}
            onKeyDown={(e) => e.key === "Enter" && setParams({ w: maxWidth || null })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setParams({ stock: e.target.checked ? "1" : null })}
          />
          {t("inStockOnly")}
        </label>

        <label className="flex items-center gap-2 text-sm ms-auto" style={{ color: "var(--ink)" }}>
          {t("sortBy")}
          <select
            className="h-9 px-2 rounded-lg border text-sm outline-none"
            style={inputStyle}
            value={sort}
            onChange={(e) => setParams({ sort: e.target.value === "newest" ? null : e.target.value })}
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
            <option value="width-asc">{t("sortWidthAsc")}</option>
            <option value="width-desc">{t("sortWidthDesc")}</option>
            <option value="name">{t("sortName")}</option>
          </select>
        </label>
      </div>

      {/* Result count + clear */}
      <div className="flex items-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
        <span aria-live="polite">{t("resultCount", { count: resultCount })}</span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setParams({ colors: null, min: null, max: null, w: null, stock: null, sort: null })}
            className="underline"
            style={{ color: "var(--primary)" }}
          >
            {t("clear")}
          </button>
        )}
      </div>
    </div>
  );
}
