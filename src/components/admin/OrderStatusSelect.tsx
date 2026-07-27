"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  orderId: number;
  currentStatus: string;
  labels: Record<string, string>;
};

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "delivered"];

export default function OrderStatusSelect({ orderId, currentStatus, labels }: Props) {
  const t = useTranslations("admin.orders");
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setLoading(true);
    setError(false);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setLoading(false);
    if (!res.ok) {
      // Don't update local state — the select stays on the status that's
      // actually saved, not the one the click attempted.
      setError(true);
      return;
    }
    setStatus(newStatus);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={loading}
        className="text-xs rounded-lg px-2 py-1.5 border outline-none"
        style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "var(--bg)" }}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
      {error && (
        <p role="status" className="text-xs" style={{ color: "oklch(0.45 0.15 25)" }}>
          {t("statusUpdateError")}
        </p>
      )}
    </div>
  );
}
