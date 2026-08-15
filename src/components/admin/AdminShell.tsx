"use client";

/**
 * AdminShell — the sidebar/main shell, split out from layout.tsx (a server
 * component) purely so the mobile drawer's open/close state can live here.
 *
 * Desktop: sidebar always visible, exactly as before.
 * Mobile: sidebar becomes an off-canvas drawer behind a hamburger button in
 * a slim top bar — closes on backdrop click or picking a nav link.
 */
import { useState } from "react";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { ListIcon as Menu, XIcon as X } from "@phosphor-icons/react/ssr";
import AdminSignOut from "./AdminSignOut";
import AdminNav from "./AdminNav";
import LocaleSwitcher from "@/components/layout/LocaleSwitcher";

export default function AdminShell({
  brand,
  links,
  backToStoreLabel,
  menuLabel,
  adminLocales,
  children,
}: {
  brand: string;
  links: { href: string; label: string }[];
  backToStoreLabel: string;
  menuLabel: string;
  adminLocales: readonly string[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const sidebarContent = (onNavigate?: () => void) => (
    <>
      <p className="font-bold text-sm mb-3 px-2" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
        {brand}
      </p>
      <div className="mb-4 px-2">
        <Suspense fallback={null}>
          <LocaleSwitcher locales={adminLocales} />
        </Suspense>
      </div>
      <AdminNav links={links} onNavigate={onNavigate} />
      <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/"
          className="block px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[oklch(0.974_0_0)]"
          style={{ color: "var(--muted)" }}
        >
          ← {backToStoreLabel}
        </Link>
        <AdminSignOut />
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: "var(--surface)" }}>
      {/* Mobile top bar — desktop gets the full sidebar instead, no top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 h-14 flex-shrink-0 border-b sticky top-0 z-[250]"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        <p className="font-bold text-sm" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
          {brand}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={menuLabel}
          className="p-2 rounded-lg"
          style={{ color: "var(--ink)" }}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[300]">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "oklch(0.18 0.012 32 / 0.5)" }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="absolute inset-y-0 start-0 w-64 max-w-[80vw] border-e flex flex-col py-6 px-4 gap-1 overflow-y-auto"
            style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={menuLabel}
              className="self-end p-1.5 rounded-lg mb-2 -me-1"
              style={{ color: "var(--muted)" }}
            >
              <X size={20} aria-hidden="true" />
            </button>
            {sidebarContent(() => setOpen(false))}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-52 flex-shrink-0 border-e py-6 px-4 gap-1"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        {sidebarContent()}
      </aside>

      <main className="flex-1 p-4 sm:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
