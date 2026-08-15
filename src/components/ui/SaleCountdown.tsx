"use client";

/**
 * SaleCountdown — live split-flap style countdown to a sale category's
 * endsAt, e.g. [35][ימים]  [03][שעות]  [34][דקות]  [14][שניות]
 *
 * Why segmented tiles instead of one sentence: the earlier version stuffed
 * a Hebrew word and a number into one dir="ltr" span ("35 ימים 03:34:14").
 * Numbers are bidi-neutral, so mixing them with RTL text inside a forced-LTR
 * container let the bidi algorithm reorder them unpredictably — "35" would
 * visually detach from "ימים". Each tile here holds ONLY digits, so there's
 * no mixed-direction run left to scramble; the label sits outside it in
 * whatever direction the page already is.
 *
 * Colors use currentColor so the same component drops into a colored
 * banner, a dark photo scrim, or plain body text (its three call sites)
 * without a tone prop — the box tint is a color-mix off whatever text
 * color it inherits.
 *
 * The tile row is forced dir="ltr" independent of the page language —
 * countdowns are conventionally read left-to-right (days → seconds) even
 * on an RTL page, the same reason each tile's digits are dir="ltr" too.
 * Only the "ends in" label outside the tile group follows the page's own
 * direction.
 *
 * Two details worth keeping from the previous version:
 *  - Renders nothing until mounted, so the server's static HTML always
 *    matches the client's first paint (no hydration mismatch from a
 *    server-rendered "0 seconds" racing the client's real clock).
 *  - Calls router.refresh() once it hits zero so the whole page (prices,
 *    badges, this banner) redraws from the server the moment the sale
 *    category actually leaves its schedule window.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

function timeParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** One tile: a two-digit box (days excepted — see `pad`) with a label under it. */
function Tile({ value, label, pad = true, compact = false }: { value: number; label: string; pad?: boolean; compact?: boolean }) {
  // Days is deliberately NOT zero-padded and has no digit ceiling — a sale
  // scheduled 150 days out must widen the tile, never clip inside it.
  const display = pad ? String(value).padStart(2, "0") : String(value);

  return (
    // Mobile-only gap-0.5 in compact mode — the number box sat too far
    // above its own label; sm+ keeps the original, roomier gap-1.
    <div className={`flex flex-col items-center ${compact ? "gap-0.5 sm:gap-1" : "gap-1"}`}>
      <div
        className={
          compact
            ? "min-w-4 px-0.5 h-4 sm:min-w-6 sm:px-1 sm:h-6 rounded font-bold tabular-nums text-[9px] sm:text-xs flex items-center justify-center"
            : "min-w-10 sm:min-w-11 px-1.5 h-9 sm:h-10 rounded-md font-bold tabular-nums text-base sm:text-lg flex items-center justify-center"
        }
        style={{ backgroundColor: "color-mix(in oklab, currentColor 16%, transparent)" }}
        dir="ltr"
      >
        {display}
      </div>
      <span className={compact ? "text-[6px] sm:text-[8px] font-medium opacity-80" : "text-[10px] sm:text-xs font-medium opacity-80"}>{label}</span>
    </div>
  );
}

export default function SaleCountdown({ endsAt, compact = false }: { endsAt: string; compact?: boolean }) {
  const t = useTranslations("products");
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const deadline = new Date(endsAt).getTime();
    if (!Number.isFinite(deadline)) return;

    let done = false;
    const tick = () => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0 && !done) {
        done = true;
        router.refresh(); // sale is over — let the server redraw the truth
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, router]);

  if (remaining === null || remaining <= 0) return null;

  const { days, hours, minutes, seconds } = timeParts(remaining);

  const gap = compact ? "gap-1 sm:gap-1.5" : "gap-3 sm:gap-3.5";

  return (
    <div className={`inline-flex items-end ${gap}`}>
      <span className={compact ? "text-[9px] sm:text-[10px] font-medium self-center opacity-90" : "text-xs sm:text-sm font-medium self-center opacity-90"}>
        {t("saleEndsIn")}
      </span>
      {/* Forced LTR so the sequence always reads days → seconds left to
          right, regardless of the page's own direction */}
      <div dir="ltr" className={`inline-flex items-end ${gap}`}>
        {days > 0 && <Tile value={days} label={t("unitDays")} pad={false} compact={compact} />}
        <Tile value={hours} label={t("unitHours")} compact={compact} />
        <Tile value={minutes} label={t("unitMinutes")} compact={compact} />
        <Tile value={seconds} label={t("unitSeconds")} compact={compact} />
      </div>
    </div>
  );
}
