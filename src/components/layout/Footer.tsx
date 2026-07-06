/**
 * Footer — brand blurb, contact details, quick links.
 * Contact info comes from env (NEXT_PUBLIC_PHONE / NEXT_PUBLIC_ADDRESS)
 * so Valentina's real details are set at deploy time, not hardcoded.
 */
import { Link } from "@/i18n/navigation";
import { Phone, MapPin, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");
  const phone = process.env.NEXT_PUBLIC_PHONE ?? "050-123-4567";
  const address = process.env.NEXT_PUBLIC_ADDRESS ?? "רחוב הרצל 1, תל אביב";

  return (
    <footer
      className="mt-16 border-t pt-12 pb-8"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
        {/* Brand */}
        <div>
          <p
            className="font-serif text-2xl font-bold mb-2"
            style={{ color: "var(--primary)", fontFamily: "var(--font-playfair)" }}
          >
            ולנטינה בן עמי
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {t("tagline")}
          </p>
        </div>

        {/* Contact */}
        <div>
          <p className="font-semibold mb-4" style={{ color: "var(--ink)" }}>
            {t("contactTitle")}
          </p>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            <li className="flex items-center gap-2">
              <Phone size={15} style={{ color: "var(--primary)" }} />
              <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="hover:text-[oklch(0.52_0.14_32)]" dir="ltr">
                {phone}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
              <span>{address}</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
              <span>{t("hoursValue")}</span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <p className="font-semibold mb-4" style={{ color: "var(--ink)" }}>
            {t("navTitle")}
          </p>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            {[
              { href: "/products", label: t("nav.products") },
              { href: "/cart", label: t("nav.cart") },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-[oklch(0.52_0.14_32)] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t text-center text-xs"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        {t("copyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
