"use client";

/**
 * Footer address — click reveals Waze / Google Maps as separate links,
 * since neither OS reliably offers a native "choose your maps app" prompt
 * for a plain URL (only Android's geo: scheme does, and iOS has nothing
 * equivalent) — so the choice is made explicit in the UI instead.
 */
import { useEffect, useRef, useState } from "react";

export default function AddressPicker({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const encoded = encodeURIComponent(address);
  const apps = [
    { label: "Waze", href: `https://waze.com/ul?q=${encoded}&navigate=yes` },
    { label: "Google Maps", href: `https://www.google.com/maps/search/?api=1&query=${encoded}` },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:text-[oklch(0.52_0.14_32)] text-start"
        aria-expanded={open}
      >
        {address}
      </button>
      {open && (
        <div
          className="absolute top-full start-0 mt-1 z-20 min-w-[160px] rounded-xl border shadow-lg py-1 fade-up"
          style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
        >
          {apps.map((app) => (
            <a
              key={app.label}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm whitespace-nowrap transition-colors hover:bg-[oklch(0.974_0_0)]"
              style={{ color: "var(--ink)" }}
            >
              {app.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
