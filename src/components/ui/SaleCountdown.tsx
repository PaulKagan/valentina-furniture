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
 * Flip mechanic: each tile keeps the settled value on screen and, on
 * change, layers a "flying out" copy of the old value over a "flying in"
 * copy of the new one (CSS 3D rotateX, see globals.css) for one CSS
 * animation duration, then drops back to a single static span. Simpler
 * and more predictable than juggling continuous animation state.
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

const FLIP_MS = 470; // must stay under the 1000ms tick, or a fast tick could overlap animations

function timeParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** One flip tile: a settled value, or a brief out/in transition between two. */
function FlipTile({ value, label, pad = true }: { value: number; label: string; pad?: boolean }) {
  // Days is deliberately NOT zero-padded and has no digit ceiling — a sale
  // scheduled 150 days out must widen the tile, never clip inside it.
  const display = pad ? String(value).padStart(2, "0") : String(value);
  const [shown, setShown] = useState(display);
  const [outgoing, setOutgoing] = useState<string | null>(null);

  // Detected and applied during render (React's documented pattern for
  // "state changed because a prop changed") rather than in an effect —
  // starting the flip is synchronous with the new value arriving, no
  // extra render pass needed for that part.
  if (display !== shown) {
    setOutgoing(shown);
    setShown(display);
  }

  // The timer is the one genuinely external thing here (clearing the
  // outgoing tile once its CSS animation has finished), so it's the only
  // part that belongs in an effect.
  useEffect(() => {
    if (outgoing === null) return;
    const id = setTimeout(() => setOutgoing(null), FLIP_MS);
    return () => clearTimeout(id);
  }, [outgoing]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative min-w-9 sm:min-w-10 px-1 h-8 sm:h-9 rounded-md overflow-hidden font-bold tabular-nums text-base sm:text-lg flex items-center justify-center"
        style={{
          backgroundColor: "color-mix(in oklab, currentColor 16%, transparent)",
          perspective: "200px",
        }}
        dir="ltr"
      >
        {outgoing !== null && (
          <span className="absolute inset-0 flex items-center justify-center flip-digit-out" aria-hidden="true">
            {outgoing}
          </span>
        )}
        <span className={outgoing !== null ? "flip-digit-in" : undefined}>{shown}</span>
      </div>
      <span className="text-[10px] sm:text-xs font-medium opacity-80">{label}</span>
    </div>
  );
}

export default function SaleCountdown({ endsAt }: { endsAt: string }) {
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

  return (
    <div className="inline-flex items-end gap-2.5 sm:gap-3">
      <span className="text-xs sm:text-sm font-medium self-center opacity-90">{t("saleEndsIn")}</span>
      {days > 0 && <FlipTile value={days} label={t("unitDays")} pad={false} />}
      <FlipTile value={hours} label={t("unitHours")} />
      <FlipTile value={minutes} label={t("unitMinutes")} />
      <FlipTile value={seconds} label={t("unitSeconds")} />
    </div>
  );
}
