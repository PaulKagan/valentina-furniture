"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProductButton({ productId }: { productId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("למחוק מוצר זה?")) return;
    setLoading(true);
    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-1 rounded text-xs font-medium border transition-colors hover:bg-red-50 disabled:opacity-50"
      style={{ borderColor: "oklch(0.85 0.08 25)", color: "oklch(0.45 0.15 25)" }}
    >
      מחיקה
    </button>
  );
}
