"use client";

import { signOut } from "next-auth/react";

export default function AdminSignOut() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="w-full px-3 py-2 rounded-lg text-sm text-start transition-colors hover:bg-[oklch(0.974_0_0)]"
      style={{ color: "var(--muted)" }}
    >
      התנתק
    </button>
  );
}
