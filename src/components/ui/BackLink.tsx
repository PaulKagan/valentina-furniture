"use client";

/**
 * "Back to products" that actually goes back — preserves whatever filters
 * the visitor had applied on /products instead of resetting to a plain
 * unfiltered link. Falls back to a plain /products navigation when there's
 * no in-site history to go back to (e.g. the product page was opened
 * directly, or in a new tab).
 */
import { useRouter } from "@/i18n/navigation";

export default function BackLink({ label }: { label: string }) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/products");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-block text-sm mb-8 hover:opacity-70 transition-opacity"
      style={{ color: "var(--muted)" }}
    >
      {label}
    </button>
  );
}
