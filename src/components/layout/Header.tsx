"use client";

import Link from "next/link";
import { ShoppingCart, Phone, Menu, X } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function Header() {
  const { count } = useCart();
  const t = useTranslations("header");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/products", label: t("nav.allProducts") },
    { href: "/products?category=sofas", label: t("nav.sofas") },
    { href: "/products?category=tables", label: t("nav.tables") },
    { href: "/products?category=bedroom", label: t("nav.bedroom") },
    { href: "/products?category=storage", label: t("nav.storage") },
  ];

  return (
    <header
      className="sticky top-0 z-[200] bg-white/95 backdrop-blur-sm border-b"
      style={{ borderColor: "var(--border)" }}
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
            style={{ color: "var(--primary)", fontFamily: "var(--font-playfair)" }}
          >
            ולנטינה
          </span>
          <span className="block text-xs" style={{ color: "var(--muted)" }}>
            {t("logoSub")}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors hover:text-[oklch(0.52_0.14_32)]"
              style={{ color: "var(--ink)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="relative p-2 rounded-lg transition-colors hover:bg-[oklch(0.974_0_0)]"
            aria-label={t("cartLabel", { count })}
          >
            <ShoppingCart size={22} style={{ color: "var(--ink)" }} />
            {count > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
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
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav
          className="md:hidden border-t px-4 py-4 flex flex-col gap-3"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-base font-medium py-2"
              style={{ color: "var(--ink)" }}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
