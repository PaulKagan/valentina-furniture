"use client";

/**
 * SalesTables — the two tables on admin/sales, split into their own client
 * component so a text search can filter both instantly (data's already
 * fully loaded server-side, so this is a plain in-memory filter — no
 * debounce needed, no round trip).
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import EndSaleButton from "./EndSaleButton";

export type SaleCategoryRow = {
  id: number;
  name: string;
  parentName: string | null;
  discountPercent: number;
  live: boolean;
  endsAtLabel: string;
};

export type DiscountedRow = {
  productId: number;
  name: string;
  wasLabel: string;
  nowLabel: string;
  percent: number;
  own: boolean;
  originLabel: string;
};

export default function SalesTables({
  saleCategories,
  discounted,
}: {
  saleCategories: SaleCategoryRow[];
  discounted: DiscountedRow[];
}) {
  const t = useTranslations("admin.sales");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const filteredCats = useMemo(
    () =>
      needle
        ? saleCategories.filter(
            (c) => c.name.toLowerCase().includes(needle) || (c.parentName ?? "").toLowerCase().includes(needle)
          )
        : saleCategories,
    [saleCategories, needle]
  );
  const filteredProducts = useMemo(
    () =>
      needle
        ? discounted.filter(
            (r) => r.name.toLowerCase().includes(needle) || r.originLabel.toLowerCase().includes(needle)
          )
        : discounted,
    [discounted, needle]
  );

  const cellHead = "px-4 py-3 text-start font-medium";
  const tableWrap = "rounded-xl border overflow-x-auto mb-10";
  const tableStyle = { borderColor: "var(--border)", backgroundColor: "var(--bg)" };

  return (
    <>
      <input
        type="search"
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-10 px-3 mb-6 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-64"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* ── Sale categories ── */}
      <h2 className="font-bold mb-3" style={{ color: "var(--ink)" }}>
        {t("categoriesTitle")}
      </h2>
      <div className={tableWrap} style={tableStyle}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {[t("category"), t("discount"), t("status"), t("endsAt"), t("actions")].map((h) => (
                <th key={h} className={cellHead} style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCats.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  {needle ? t("noResults") : t("noSaleCategories")}
                </td>
              </tr>
            )}
            {filteredCats.map((c) => (
              <tr key={c.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
                  {c.name}
                  {c.parentName && (
                    <span className="text-xs ms-2" style={{ color: "var(--muted)" }}>
                      ← {c.parentName}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }} dir="ltr">
                  -{c.discountPercent}%
                </td>
                <td className="px-4 py-3" style={{ color: c.live ? "var(--ink)" : "var(--muted)" }}>
                  {c.live ? t("statusLive") : t("statusInactive")}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }} dir="ltr">
                  {c.endsAtLabel}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href="/admin/categories"
                      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      {t("edit")}
                    </Link>
                    <EndSaleButton
                      action="endCategory"
                      id={c.id}
                      label={t("endSale")}
                      confirmText={t("endCategoryConfirm", { name: c.name })}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Discounted products ── */}
      <h2 className="font-bold mb-3" style={{ color: "var(--ink)" }}>
        {t("productsTitle", { count: discounted.length })}
      </h2>
      <div className={tableWrap} style={tableStyle}>
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "var(--surface)" }}>
            <tr>
              {[t("product"), t("was"), t("now"), t("discount"), t("origin"), t("actions")].map((h) => (
                <th key={h} className={cellHead} style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                  {needle ? t("noResults") : t("noDiscounted")}
                </td>
              </tr>
            )}
            {filteredProducts.map((r) => (
              <tr key={r.productId} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{r.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--muted)" }}>
                  <s>{r.wasLabel}</s>
                </td>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }}>
                  {r.nowLabel}
                </td>
                <td className="px-4 py-3 font-bold" style={{ color: "var(--primary)" }} dir="ltr">
                  -{r.percent}%
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                  {r.originLabel}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/products/${r.productId}/edit`}
                      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)]"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      {t("edit")}
                    </Link>
                    {/* Inherited discounts have no per-product switch — they
                        end with the category, which is the row above. */}
                    {r.own && (
                      <EndSaleButton
                        action="endProduct"
                        id={r.productId}
                        label={t("endSale")}
                        confirmText={t("endProductConfirm", { name: r.name })}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
