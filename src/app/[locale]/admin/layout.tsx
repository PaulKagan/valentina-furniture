/**
 * Admin layout — sidebar shell for authenticated admin pages.
 * Shows nothing but the login form if the session is missing (the login page
 * passes through without the sidebar — avoids redundant auth checks).
 * Translations come from next-intl server side (getTranslations).
 */
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import AdminSignOut from "@/components/admin/AdminSignOut";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();

  // Login page renders without the shell
  if (!session) {
    return <>{children}</>;
  }

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.nav" });
  const tBrand = await getTranslations({ locale, namespace: "brand" });

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--surface)" }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-e flex flex-col py-6 px-4 gap-1" style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}>
        <p className="font-bold text-sm mb-6 px-2" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
          {tBrand("adminBrand")}
        </p>
        {[
          { href: "/admin/dashboard", label: t("dashboard") },
          { href: "/admin/categories", label: t("categories") },
          { href: "/admin/products", label: t("products") },
          { href: "/admin/orders", label: t("orders") },
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
        <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <Link href="/" className="block px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[oklch(0.974_0_0)]" style={{ color: "var(--muted)" }}>
            ← {t("backToStore")}
          </Link>
          <AdminSignOut />
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
