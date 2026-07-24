"use client";

/**
 * LoadMore — "show more products" control for the catalog.
 *
 * URL-driven like the filters: it bumps a `?show=` count, the server
 * renders that many products. This keeps the first paint small (24 cards
 * instead of hundreds) while staying crawlable and back-button friendly —
 * no client-side fetching or infinite-scroll trickery.
 */
import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PAGE_SIZE } from "@/lib/pagination";

export default function LoadMore({ shown, total }: { shown: number; total: number }) {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  if (shown >= total) return null;

  function showMore() {
    const next = new URLSearchParams(searchParams.toString());
    next.set("show", String(shown + PAGE_SIZE));
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}` as never, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col items-center gap-3 mt-10">
      <p className="text-sm" style={{ color: "var(--muted)" }} aria-live="polite">
        {t("showingCount", { shown, total })}
      </p>
      <button
        type="button"
        onClick={showMore}
        disabled={pending}
        className="px-6 py-3 rounded-lg font-semibold text-sm border-2 transition-opacity hover:opacity-80 disabled:opacity-50 active:scale-[0.97]"
        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
      >
        {pending ? t("loading") : t("loadMore")}
      </button>
    </div>
  );
}
