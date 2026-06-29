import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSignOut from "@/components/admin/AdminSignOut";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // login page renders without the shell
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--surface)" }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-l flex flex-col py-6 px-4 gap-1" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
        <p className="font-bold text-sm mb-6 px-2" style={{ color: "var(--primary)", fontFamily: "var(--font-playfair)" }}>
          ולנטינה — ניהול
        </p>
        {[
          { href: "/admin/dashboard", label: "סקירה כללית" },
          { href: "/admin/products", label: "מוצרים" },
          { href: "/admin/orders", label: "הזמנות" },
          { href: "/", label: "← לחנות" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[oklch(0.974_0_0)]"
            style={{ color: "var(--ink)" }}
          >
            {l.label}
          </Link>
        ))}
        <div className="mt-auto">
          <AdminSignOut />
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
