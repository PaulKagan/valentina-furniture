"use client";

/**
 * Header — sticky top navigation.
 *
 * Nav items come from the DB (active categories, promoted pinned first),
 * built server-side in the store layout and passed in as props. Categories
 * with children get a dropdown:
 *   - desktop: opens on hover AND on keyboard focus, closes on Escape
 *   - mobile: the burger menu expands them inline as an accordion
 * Third-level items are listed under their parent inside the same panel —
 * a furniture catalog is 3 deep at most, so nested flyouts would be more
 * fiddle than help.
 */
import { Link } from "@/i18n/navigation";
import { ShoppingCart, Phone, Menu, X, ChevronDown } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { useTranslations } from "next-intl";
import { useState, useRef, Suspense } from "react";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";
import HeaderSearch from "@/components/layout/HeaderSearch";

/** A nav entry. `sale` is the discount percent it grants (0 = not a sale). */
export type NavItem = { href: string; label: string; sale: number };
export type NavCategory = NavItem & {
  promoted: boolean;
  children: (NavItem & { children: NavItem[] })[];
};

/** 🔥 -20% — the same mark the product cards carry, so the two read as one thing. */
function SaleMark({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return (
    <span className="font-bold" style={{ color: "var(--primary)" }} dir="ltr">
      🔥 -{percent}%
    </span>
  );
}

export default function Header({ navCategories }: { navCategories: NavCategory[] }) {
  const { count } = useCart();
  const t = useTranslations("header");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  // Small close delay so moving the pointer from the trigger into the panel
  // doesn't dismiss it through the gap
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allProducts: NavCategory = {
    href: "/products",
    label: t("nav.allProducts"),
    sale: 0,
    promoted: false,
    children: [],
  };
  const allCategories: NavCategory = {
    href: "/categories",
    label: t("nav.allCategories"),
    sale: 0,
    promoted: false,
    children: [],
  };
  const navLinks = [allProducts, allCategories, ...navCategories];

  function openNow(href: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenDropdown(href);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenDropdown(null), 150);
  }

  return (
    <header
      className="sticky top-0 z-[200] bg-white/95 backdrop-blur-sm border-b"
      style={{ borderColor: "var(--border)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpenDropdown(null);
      }}
    >
      {/* Top bar — WhatsApp CTA */}
      <div
        className="text-center text-sm py-1.5 font-medium"
        style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
      >
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "972501234567"}`}
          className="flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Phone size={14} />
          <span>{t("whatsappCta")}</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <span
            className="font-serif text-2xl font-bold tracking-tight"
            style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}
          >
            {t("brandShort")}
          </span>
          <span className="block text-xs" style={{ color: "var(--muted)" }}>
            {t("logoSub")}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => {
            const hasChildren = l.children.length > 0;
            const isOpen = openDropdown === l.href;
            return (
              <div
                key={l.href}
                className="relative"
                onMouseEnter={() => hasChildren && openNow(l.href)}
                onMouseLeave={closeSoon}
              >
                <Link
                  href={l.href}
                  className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-[oklch(0.52_0.14_32)] py-2"
                  style={{ color: l.promoted || l.sale > 0 ? "var(--primary)" : "var(--ink)" }}
                  onFocus={() => hasChildren && openNow(l.href)}
                  aria-expanded={hasChildren ? isOpen : undefined}
                >
                  {l.label}
                  <SaleMark percent={l.sale} />
                  {hasChildren && (
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className="transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                    />
                  )}
                </Link>

                {hasChildren && isOpen && (
                  <div
                    className="absolute top-full start-0 pt-1 z-[210]"
                    onMouseEnter={() => openNow(l.href)}
                    onMouseLeave={closeSoon}
                  >
                    <div
                      className="min-w-[220px] rounded-xl border shadow-lg py-2 fade-up"
                      style={{
                        backgroundColor: "var(--bg)",
                        borderColor: "var(--border)",
                        "--delay": "0ms",
                      } as React.CSSProperties}
                    >
                      {l.children.map((child) => (
                        <div key={child.href}>
                          <Link
                            href={child.href}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors hover:bg-[oklch(0.974_0_0)]"
                            style={{ color: "var(--ink)" }}
                            onClick={() => setOpenDropdown(null)}
                          >
                            {child.label}
                            <SaleMark percent={child.sale} />
                          </Link>
                          {/* Third level, indented under its parent */}
                          {child.children.map((grand) => (
                            <Link
                              key={grand.href}
                              href={grand.href}
                              className="flex items-center gap-1.5 px-4 py-1.5 ps-8 text-sm transition-colors hover:bg-[oklch(0.974_0_0)]"
                              style={{ color: "var(--muted)" }}
                              onClick={() => setOpenDropdown(null)}
                            >
                              {grand.label}
                              <SaleMark percent={grand.sale} />
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* useSearchParams inside these needs a Suspense boundary */}
          <Suspense fallback={<div className="w-9 h-9" />}>
            <HeaderSearch variant="desktop" />
          </Suspense>
          <Suspense fallback={null}>
            <LocaleSwitcher />
          </Suspense>

          <Link
            href="/cart"
            className="relative p-2 rounded-lg transition-colors hover:bg-[oklch(0.974_0_0)]"
            aria-label={t("cartLabel", { count })}
          >
            <ShoppingCart size={22} style={{ color: "var(--ink)" }} />
            {count > 0 && (
              <span
                className="absolute -top-1 -end-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t("menuLabel")}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav — subcategories expand inline */}
      {menuOpen && (
        <nav
          className="md:hidden border-t px-4 py-3 flex flex-col"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          <div className="pb-3 mb-1 border-b" style={{ borderColor: "var(--border)" }}>
            <Suspense fallback={<div className="h-9" />}>
              <HeaderSearch variant="mobile" onNavigate={() => setMenuOpen(false)} />
            </Suspense>
          </div>
          {navLinks.map((l) => {
            const hasChildren = l.children.length > 0;
            const isExpanded = expandedMobile === l.href;
            return (
              <div key={l.href} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center">
                  <Link
                    href={l.href}
                    className="flex-1 flex items-center gap-1.5 text-base font-medium py-3"
                    style={{ color: l.promoted || l.sale > 0 ? "var(--primary)" : "var(--ink)" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                    <SaleMark percent={l.sale} />
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => setExpandedMobile(isExpanded ? null : l.href)}
                      className="p-3"
                      aria-label={l.label}
                      aria-expanded={isExpanded}
                      style={{ color: "var(--muted)" }}
                    >
                      <ChevronDown
                        size={18}
                        className="transition-transform"
                        style={{ transform: isExpanded ? "rotate(180deg)" : undefined }}
                      />
                    </button>
                  )}
                </div>

                {hasChildren && isExpanded && (
                  <div className="pb-2 ps-3 flex flex-col">
                    {l.children.map((child) => (
                      <div key={child.href}>
                        <Link
                          href={child.href}
                          className="flex items-center gap-1.5 py-2 text-sm font-medium"
                          style={{ color: "var(--ink)" }}
                          onClick={() => setMenuOpen(false)}
                        >
                          {child.label}
                          <SaleMark percent={child.sale} />
                        </Link>
                        {child.children.map((grand) => (
                          <Link
                            key={grand.href}
                            href={grand.href}
                            className="flex items-center gap-1.5 py-1.5 ps-4 text-sm"
                            style={{ color: "var(--muted)" }}
                            onClick={() => setMenuOpen(false)}
                          >
                            {grand.label}
                            <SaleMark percent={grand.sale} />
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </header>
  );
}
