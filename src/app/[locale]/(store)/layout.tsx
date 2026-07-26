/**
 * Store layout — wraps all public-facing pages (homepage, products, cart, checkout).
 * Fetches the active category tree once, localizes names, and feeds the
 * top-level categories to the Header nav (promoted pinned first).
 * Admin routes use their own layout and never see these.
 */
import Header, { type NavCategory } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AccessibilityWidget from "@/components/layout/AccessibilityWidget";
import { getActiveCategories, buildTree, localizedName } from "@/lib/catalog";

// Nav depends on live category data (visibility windows) — never prerender stale
export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const active = await getActiveCategories();
  const roots = buildTree(active);

  // Cap nav length — a furniture store nav shouldn't overflow the header.
  // Two levels of children ride along for the dropdown.
  const navCategories: NavCategory[] = roots.slice(0, 6).map((c) => ({
    href: `/products?category=${c.slug}`,
    label: localizedName(c, locale),
    promoted: c.promoted,
    children: c.children.map((child) => ({
      href: `/products?category=${child.slug}`,
      label: localizedName(child, locale),
      children: child.children.map((grand) => ({
        href: `/products?category=${grand.slug}`,
        label: localizedName(grand, locale),
      })),
    })),
  }));

  return (
    <>
      <Header navCategories={navCategories} />
      <main className="flex-1">{children}</main>
      <Footer />
      <AccessibilityWidget />
    </>
  );
}
