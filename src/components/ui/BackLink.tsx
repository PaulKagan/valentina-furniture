"use client";

/**
 * A "back" link that actually goes back — preserves whatever filters/sort
 * the visitor had applied on the list page instead of resetting to a plain
 * unfiltered link. Falls back to `fallbackHref` when there's no in-site
 * history to go back to (e.g. the page was opened directly, or in a new tab).
 *
 * The arrow is a real icon (not a "←" character baked into the translation
 * string) so it flips direction for RTL, same pattern as the reorder
 * buttons in ProductForm.
 */
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export default function BackLink({
  label,
  fallbackHref,
  className = "inline-flex items-center gap-1 text-sm mb-8 hover:opacity-70 transition-opacity",
}: {
  label: string;
  fallbackHref: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className} style={{ color: "var(--muted)" }}>
      <ArrowLeft size={14} className="rtl:hidden" />
      <ArrowRight size={14} className="hidden rtl:block" />
      {label}
    </button>
  );
}
