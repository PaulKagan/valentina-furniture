"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  orderId: number;
  currentStatus: string;
  labels: Record<string, string>;
};

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "delivered"];

export default function OrderStatusSelect({ orderId, currentStatus, labels }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setLoading(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
    setLoading(false);
    router.refresh();
  }

  return (
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
  );
}
