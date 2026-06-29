/**
 * Store layout — wraps all public-facing pages (homepage, products, cart, checkout).
 * Adds the sticky Header and Footer. Admin routes use their own layout and never see these.
 */
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
