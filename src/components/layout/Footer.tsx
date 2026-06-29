import Link from "next/link";
import { Phone, MapPin, Clock } from "lucide-react";

export default function Footer() {
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
            ריהוט איכותי לבית — נמכור לכם לא רק רהיטים, אלא תחושת בית.
          </p>
        </div>

        {/* Contact */}
        <div>
          <p className="font-semibold mb-4" style={{ color: "var(--ink)" }}>
            צרו קשר
          </p>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            <li className="flex items-center gap-2">
              <Phone size={15} style={{ color: "var(--primary)" }} />
              <a href="tel:+972501234567" className="hover:text-[oklch(0.52_0.14_32)]">
                050-123-4567
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
              <span>רחוב הרצל 1, תל אביב</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
              <span>ראשון–חמישי 09:00–19:00 | שישי 09:00–14:00</span>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <p className="font-semibold mb-4" style={{ color: "var(--ink)" }}>
            ניווט
          </p>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            {[
              { href: "/products", label: "כל המוצרים" },
              { href: "/cart", label: "עגלת קניות" },
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
        © {new Date().getFullYear()} ולנטינה בן עמי ריהוט. כל הזכויות שמורות.
      </div>
    </footer>
  );
}
