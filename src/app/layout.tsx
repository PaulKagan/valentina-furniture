/**
 * Root layout — wraps every route in the app.
 * Loads fonts, sets <html dir="rtl"> for Hebrew, mounts CartProvider.
 * Header/Footer live in (store)/layout.tsx so the admin panel gets its own shell.
 */
import type { Metadata } from "next";
import { Heebo, Playfair_Display } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartContext";

// Heebo supports Hebrew + Latin — the primary UI font
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

// Playfair Display for headings — gives an elegant, boutique feel
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ולנטינה בן עמי | חנות ריהוט",
    template: "%s | ולנטינה בן עמי ריהוט",
  },
  description:
    "ריהוט איכותי לבית — ספות, שולחנות, ארוניות ועוד. חנות ריהוט ולנטינה בן עמי בתל אביב.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    siteName: "ולנטינה בן עמי ריהוט",
    locale: "he_IL",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
