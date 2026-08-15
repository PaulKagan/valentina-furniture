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
 * aiming a click isn't fighting a moving target). Slide changes "push" —
 * the incoming slide slides in from one side and shoves the outgoing one
 * off the other side (real translateX motion), not a cross-fade — a
 * cross-dissolve read as things "appearing on top of each other."
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretLeftIcon as ChevronLeft, CaretRightIcon as ChevronRight } from "@phosphor-icons/react/ssr";
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
const SLIDE_MS = 450;

/** One slide's content — image, scrim, badge, name, countdown pill. */
function Slide({ tile, x, active }: { tile: PromotedTile; x: number; active: boolean }) {
  const t = useTranslations("home");
  const img = tile.img;
  return (
    <Link
      href={tile.href}
      className="group absolute inset-0 flex items-end"
      style={{
        transform: `translateX(${x}%)`,
        transition: `transform ${SLIDE_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
        // The outgoing slide shouldn't intercept clicks meant for the incoming one
        pointerEvents: active ? "auto" : "none",
      }}
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
          dir={tile.percent > 0 ? "ltr" : undefined}
        >
          {tile.percent > 0 ? `🔥 -${tile.percent}%` : t("promotedBadge")}
        </span>
        <span
          className="text-xl sm:text-2xl font-bold"
          style={{
            fontFamily: "var(--font-display)",
            color: img ? "oklch(0.98 0 0)" : "var(--ink)",
          }}
        >
          {tile.name}
        </span>
        {/* Ticking clock — only for a sale with an actual end date. A real
            block (not an inline span) so the rounded pill is one solid
            box around the countdown tiles instead of fragmenting into a
            broken shape if the content wraps a line. flex-shrink-0 keeps
            it from getting squeezed narrower than its own content by the
            flex-wrap row above, and the padding is deliberately generous —
            it still read as cramped at smaller values. */}
        {tile.endsAt && (
          <div
            className="ms-auto inline-flex flex-shrink-0 px-5 py-3 rounded-full"
            style={{
              backgroundColor: "oklch(0.18 0.012 32 / 0.55)",
              color: "oklch(0.98 0 0)",
            }}
          >
            <SaleCountdown endsAt={tile.endsAt} />
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * The outgoing slide: mounts at x=0 (in place), pushed to ±100% on the next
 * frame (so the transition has a starting point to animate from), then
 * tells the parent to unmount it once the push has had time to finish.
 */
function PushOutSlide({ tile, dir, onDone }: { tile: PromotedTile; dir: 1 | -1; onDone: () => void }) {
  const [x, setX] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setX(-dir * 100));
    const timeout = setTimeout(onDone, SLIDE_MS + 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount (each outgoing tile gets a fresh instance via `key`)
  }, []);

  return <Slide tile={tile} x={x} active={false} />;
}

/** The incoming slide: starts pushed off to the side it enters from, then slides to x=0. */
function PushInSlide({ tile, dir }: { tile: PromotedTile; dir: 1 | -1 }) {
  const [x, setX] = useState(dir * 100);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setX(0));
    return () => cancelAnimationFrame(raf);
  }, []);

  return <Slide tile={tile} x={x} active />;
}

export default function PromotedCarousel({ tiles }: { tiles: PromotedTile[] }) {
  const t = useTranslations("home");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // The previous slide stays mounted (sliding out via PushOutSlide) for one
  // transition's worth of time after the index changes, pushed out by the
  // incoming slide rather than just disappearing.
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

  function goTo(next: number, direction: 1 | -1) {
    if (next === index) return;
    setDir(direction);
    setPrevIndex(index);
    setIndex(next);
  }

  /** Prev/next always physically left/right, like a photo carousel — not
      flipped by page direction, so "next" is always the same gesture. */
  function step(delta: 1 | -1) {
    goTo((index + delta + tiles.length) % tiles.length, delta);
  }

  // Depends on `index` on purpose: a manual click (arrow/dot) should reset
  // the auto-advance countdown, not fire again a moment later — restarting
  // this interval on every index change achieves that for free, and since
  // ticks are already exactly AUTO_ADVANCE_MS apart, restarting on the
  // interval's own tick changes nothing.
  useEffect(() => {
    if (tiles.length <= 1 || paused) return;
    const id = setInterval(() => step(1), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step/goTo close over index/tiles, redeclared each render
  }, [tiles.length, paused, index]);

  if (tiles.length === 0) return null;
  const multi = tiles.length > 1;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        // Shorter than the original 16/7 — part of fitting the hero +
        // carousel into a laptop's viewport height without scrolling
        className="relative rounded-2xl overflow-hidden aspect-[21/8]"
        style={{ backgroundColor: "var(--surface-elevated)" }}
      >
        {prevIndex !== null && prevIndex !== index && (
          <PushOutSlide key={tiles[prevIndex].id} tile={tiles[prevIndex]} dir={dir} onDone={() => setPrevIndex(null)} />
        )}
        {prevIndex !== null && prevIndex !== index ? (
          <PushInSlide key={tiles[index].id} tile={tiles[index]} dir={dir} />
        ) : (
          <Slide tile={tiles[index]} x={0} active />
        )}

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
      </div>

      {multi && (
        <div className="flex items-center justify-center gap-2 mt-3" role="tablist" aria-label={t("carouselNav")}>
          {tiles.map((tile, i) => (
            <button
              key={tile.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={t("carouselSlide", { name: tile.name })}
              onClick={() => goTo(i, i > index ? 1 : -1)}
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
