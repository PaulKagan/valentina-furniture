/**
 * Locale layout — the real root for every page in this app.
 *
 * Responsibilities:
 *   1. Renders <html lang dir> — Hebrew is RTL, English + Russian are LTR.
 *   2. Loads fonts (Heebo for Hebrew/Latin UI, Playfair Display for headings).
 *   3. Provides next-intl messages to client components via NextIntlClientProvider.
 *   4. Wraps children in CartProvider so cart state is available across all store pages.
 *
 * All store and admin routes nest under this layout.
 */
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Heebo, Playfair_Display } from "next/font/google";
import { routing } from "@/i18n/routing";
import { CartProvider } from "@/components/cart/CartContext";
import type { Locale } from "@/i18n/routing";
import "../globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// Only Hebrew is RTL; English and Russian are LTR
const RTL_LOCALES: Locale[] = ["he"];

// metadataBase makes relative OG image / canonical URLs resolve to the real domain
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const dir = RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${heebo.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <CartProvider>{children}</CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
