"use client";

/**
 * Admin sidebar nav links — a client component only so it can read the
 * current path and highlight which section she's in. Every admin page looks
 * fairly similar at a glance, so without this it's easy to lose track of
 * where you are.
 */
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

export default function AdminNav({
  links,
  onNavigate,
}: {
  links: { href: string; label: string }[];
  /** Closes the mobile drawer — no-op on desktop where there's no drawer. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[oklch(0.974_0_0)]"
            style={{
              color: active ? "var(--primary)" : "var(--ink)",
              backgroundColor: active ? "oklch(0.974 0.004 32)" : undefined,
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
