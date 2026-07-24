"use client";

/**
 * OrderFilters — search + status filter for the admin orders list.
 * URL-driven so a filtered view can be bookmarked or refreshed.
 */
import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const STATUSES = ["pending", "confirmed", "cancelled", "delivered"] as const;

export default function OrderFilters() {
  const t = useTranslations("admin.orders");
  const tStatus = useTranslations("admin.orders.statusValues");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
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
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <input
        type="search"
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="h-10 px-3 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm w-64"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setParams({ q: q || null })}
        onKeyDown={(e) => e.key === "Enter" && setParams({ q: q || null })}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParams({ status: null })}
          aria-pressed={!status}
          className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
          style={{
            borderColor: !status ? "var(--primary)" : "var(--border)",
            color: !status ? "var(--primary)" : "var(--muted)",
          }}
        >
          {t("allStatuses")}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setParams({ status: status === s ? null : s })}
            aria-pressed={status === s}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors"
            style={{
              borderColor: status === s ? "var(--primary)" : "var(--border)",
              color: status === s ? "var(--primary)" : "var(--muted)",
            }}
          >
            {tStatus(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
