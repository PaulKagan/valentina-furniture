"use client";

/**
 * EndSaleButton — one "end this sale" control, used per row and for the
 * bulk action at the top of the sales page.
 *
 * Confirms first (ending a sale changes live prices), then refreshes the
 * server component so the table redraws from the database rather than from
 * an optimistic guess.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EndSaleButton({
  action,
  id,
  label,
  confirmText,
  emphasis = false,
}: {
  action: "endProduct" | "endAllProducts" | "endCategory";
  id?: number;
  label: string;
  confirmText: string;
  /** true = standalone button at the top of the page, false = inline in a row */
  emphasis?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch("/api/admin/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id != null ? { action, id } : { action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={
        emphasis
          ? "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-[oklch(0.974_0_0)] disabled:opacity-50"
          : "px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-[oklch(0.974_0_0)] disabled:opacity-50"
      }
      style={{ borderColor: "var(--border)", color: "oklch(0.5 0.15 25)" }}
    >
      {label}
    </button>
  );
}
