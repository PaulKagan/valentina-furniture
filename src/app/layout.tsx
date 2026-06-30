/**
 * Root layout — required by Next.js App Router.
 * The actual html/body/lang/dir live in [locale]/layout.tsx
 * so that each locale can set its own direction and language attribute.
 * This file is a pass-through.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ponytail: no html/body here — [locale]/layout.tsx renders them with correct lang+dir
  return <>{children}</>;
}
