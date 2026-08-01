"use client";

/**
 * HeaderSearch — sitewide product search, reachable from every page.
 * Desktop: an icon that expands into an input. Mobile: always shown
 * inline inside the burger menu (there's room, and no icon-toggle fiddle).
 *
 * Debounced live search: typing navigates to /products?q=... after a
 * pause, merging with whatever other filters are already active if
 * she's already on /products. Enter commits immediately.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

const SEARCH_DEBOUNCE_MS = 500;

export default function HeaderSearch({ variant, onNavigate }: { variant: "desktop" | "mobile"; onNavigate?: () => void }) {
  const t = useTranslations("header");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(variant === "mobile");
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);

  function commit(v: string) {
    // Already browsing products? Keep the other filters. Coming from
    // anywhere else, a fresh search shouldn't inherit a stale filter set.
    const params = pathname === "/products" ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
    if (v.trim()) params.set("q", v.trim());
    else params.delete("q");
    const qs = params.toString();
    router.push((qs ? `/products?${qs}` : "/products") as never);
    onNavigate?.();
  }

  useEffect(() => {
    if (!touched) return;
    const timer = setTimeout(() => commit(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (variant === "desktop" && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg transition-colors hover:bg-[oklch(0.974_0_0)]"
        aria-label={t("searchLabel")}
      >
        <Search size={20} style={{ color: "var(--ink)" }} />
      </button>
    );
  }

  return (
    <div className={`relative flex items-center ${variant === "mobile" ? "w-full" : ""}`}>
      <Search size={16} className="absolute start-3 pointer-events-none" style={{ color: "var(--muted)" }} aria-hidden="true" />
      <input
        type="search"
        autoFocus={variant === "desktop"}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className={`h-9 ps-9 pe-8 rounded-lg border outline-none focus:border-[oklch(0.52_0.14_32)] text-sm ${
          variant === "mobile" ? "w-full" : "w-40 sm:w-56"
        }`}
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setTouched(true);
        }}
        onKeyDown={(e) => e.key === "Enter" && commit(value)}
      />
      {variant === "desktop" && (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setValue("");
            setTouched(false);
          }}
          className="absolute end-1.5 p-1 rounded"
          aria-label={t("closeSearch")}
        >
          <X size={14} style={{ color: "var(--muted)" }} />
        </button>
      )}
    </div>
  );
}
