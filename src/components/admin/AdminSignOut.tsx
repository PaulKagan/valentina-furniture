"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    // callbackUrl relies on the server resolving its own absolute origin,
    // which next-auth gets wrong behind this reverse proxy (redirects to
    // localhost:3000). Clearing the session without a server redirect and
    // navigating client-side avoids that entirely — the browser resolves
    // the relative path against its own real origin instead.
    await signOut({ redirect: false });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full px-3 py-2 rounded-lg text-sm text-start transition-colors hover:bg-[oklch(0.974_0_0)]"
      style={{ color: "var(--muted)" }}
    >
      התנתק
    </button>
  );
}
