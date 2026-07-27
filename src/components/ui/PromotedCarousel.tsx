"use client";

/**
 * PromotedCarousel — the big image tiles under the hero.
 *
 * Was a static 1-or-2-column grid; with more than one or two promoted
 * categories that stopped scaling (three+ tiles either got cramped into a
 * row or wrapped awkwardly). One slide at a time reads as more premium
 * regardless of count, and degrades cleanly to a single static tile with
 * no dots when there's only one promoted category.
 *
 * Auto-advances every 6s, pauses on hover (so reading the countdown or
 * aiming a click isn't fighting a moving target), and each slide switch
 * reuses the existing `.fade-up` entrance animation (globals.css) rather
 * than inventing a new transition.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FallbackImage from "./FallbackImage";
import SaleCountdown from "./SaleCountdown";

export type PromotedTile = {
  id: number;
  href: string;
  name: string;
  img: string | null;
  /** Real discount percent this tile's category grants (0 = none — promoted only) */
  percent: number;
  /** ISO string, only when the discount comes from a dated sale category */
  endsAt: string | null;
};

const AUTO_ADVANCE_MS = 6000;

export default function PromotedCarousel({ tiles }: { tiles: PromotedTile[] }) {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (tiles.length <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % tiles.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [tiles.length, paused]);

  if (tiles.length === 0) return null;
  const active = tiles[index % tiles.length];
  const img = active.img;
  const multi = tiles.length > 1;

  /** Prev/next always physically left/right, like a photo carousel — not
      flipped by page direction, so "next" is always the same gesture. */
  function step(delta: number) {
    setIndex((i) => (i + delta + tiles.length) % tiles.length);
  }

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <Link
        key={active.id}
        href={active.href}
        className="group relative block rounded-2xl overflow-hidden aspect-[16/7] flex items-end fade-up"
        style={{ backgroundColor: "var(--surface-elevated)" }}
      >
        <FallbackImage
          src={img ?? ""}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          style={{ transitionTimingFunction: "var(--ease-out)" }}
        />
        {/* Legibility scrim — only over an actual photo */}
        {img && (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, oklch(0.18 0.012 32 / 0.65), transparent 55%)" }}
            aria-hidden="true"
          />
        )}
        <div className="relative p-5 sm:p-6 flex flex-wrap items-center gap-x-3 gap-y-2 w-full">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-fg)" }}
            dir={active.percent > 0 ? "ltr" : undefined}
          >
            {active.percent > 0 ? `🔥 -${active.percent}%` : t("promotedBadge")}
          </span>
          <span
            className="text-xl sm:text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: img ? "oklch(0.98 0 0)" : "var(--ink)",
            }}
          >
            {active.name}
          </span>
          {/* Ticking clock — only for a sale with an actual end date. A real
              block (not an inline span) so the rounded pill is one solid
              box around the countdown tiles instead of fragmenting into a
              broken shape if the content wraps a line. flex-shrink-0 keeps
              it from getting squeezed narrower than its own content by the
              flex-wrap row above. */}
          {active.endsAt && (
            // Wider padding — was tight enough that the tiles nearly
            // touched the pill's own rounded edge
            <div
              className="ms-auto inline-flex flex-shrink-0 px-4 py-2 rounded-full"
              style={{
                backgroundColor: "oklch(0.18 0.012 32 / 0.55)",
                color: "oklch(0.98 0 0)",
              }}
            >
              <SaleCountdown endsAt={active.endsAt} />
            </div>
          )}
        </div>
      </Link>

      {multi && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t("carouselPrev")}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
            style={{ backgroundColor: "oklch(0.18 0.012 32 / 0.5)", color: "oklch(0.98 0 0)" }}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t("carouselNext")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:opacity-90"
            style={{ backgroundColor: "oklch(0.18 0.012 32 / 0.5)", color: "oklch(0.98 0 0)" }}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </>
      )}

      {multi && (
        <div className="flex items-center justify-center gap-2 mt-3" role="tablist" aria-label={t("carouselNav")}>
          {tiles.map((tile, i) => (
            <button
              key={tile.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t("carouselSlide", { name: tile.name })}
              onClick={() => setIndex(i)}
              className="rounded-full transition-all"
              style={{
                width: i === index ? "20px" : "8px",
                height: "8px",
                backgroundColor: i === index ? "var(--primary)" : "var(--border)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
