"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function DeleteProductButton({ productId }: { productId: number }) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    if (!confirm(t("deleteConfirm"))) return;
    setLoading(true);
    setError(false);
    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-red-50 disabled:opacity-50"
        style={{ borderColor: "oklch(0.85 0.08 25)", color: "oklch(0.45 0.15 25)" }}
      >
        {t("delete")}
      </button>
      {error && (
        <p role="status" className="text-xs" style={{ color: "oklch(0.45 0.15 25)" }}>
          {t("deleteError")}
        </p>
      )}
    </div>
  );
}
