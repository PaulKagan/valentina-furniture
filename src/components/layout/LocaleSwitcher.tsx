"use client";

/**
 * LocaleSwitcher — swaps the current page between he/en/ru.
 * Uses the locale-aware router so the path is re-prefixed correctly
 * (/products ↔ /en/products ↔ /ru/products).
 */
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { he: "עב", en: "EN", ru: "RU" };

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTo(next: string) {
    const qs = searchParams.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: next });
  }

  return (
    <div
      className="flex items-center rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border)" }}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className="px-2 py-1 text-xs font-semibold transition-colors"
          style={{
            backgroundColor: l === locale ? "var(--primary)" : "transparent",
            color: l === locale ? "var(--primary-fg)" : "var(--muted)",
          }}
          aria-current={l === locale ? "true" : undefined}
          lang={l}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
