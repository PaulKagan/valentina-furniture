/**
 * Admin layout — sidebar shell for authenticated admin pages.
 * Shows nothing but the login form if the session is missing (the login page
 * passes through without the sidebar — avoids redundant auth checks).
 * Translations come from next-intl server side (getTranslations).
 */
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import AdminShell from "@/components/admin/AdminShell";

// Admin only ships Hebrew + Russian copy (see proxy.ts) — English is
// intentionally not offered here even though the storefront has it.
const ADMIN_LOCALES = ["he", "ru"] as const;

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
    <AdminShell
      brand={tBrand("adminBrand")}
      links={[
        { href: "/admin/dashboard", label: t("dashboard") },
        { href: "/admin/categories", label: t("categories") },
        { href: "/admin/products", label: t("products") },
        { href: "/admin/sales", label: t("sales") },
        { href: "/admin/orders", label: t("orders") },
        { href: "/admin/backup", label: t("backup") },
      ]}
      backToStoreLabel={t("backToStore")}
      menuLabel={t("menuLabel")}
      adminLocales={ADMIN_LOCALES}
    >
      {children}
    </AdminShell>
  );
}
