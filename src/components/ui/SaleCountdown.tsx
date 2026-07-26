"use client";

/**
 * SaleCountdown — live "ends in 2d 04:31:07" ticker for a scheduled sale.
 *
 * The deadline is the sale category's endsAt, passed in as an ISO string so
 * the server never has to render a time that's already stale.
 *
 * Two details worth keeping:
 *  - The first render must match the server's HTML or React throws a
 *    hydration error, so we render nothing until mounted and then fill in.
 *    The banner around it stays put either way, so nothing jumps.
 *  - When it reaches zero we call router.refresh(). The category has just
 *    left its schedule window, so the server re-renders without the sale and
 *    the whole page (prices, badges, this banner) corrects itself — no stale
 *    discount left on screen for whoever had the tab open.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
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

  const { days, hours, minutes, seconds } = parts(remaining);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <span className="inline-flex items-baseline gap-1.5 text-sm font-medium">
      {t("saleEndsIn")}
      {/* Digits stay LTR even in Hebrew, and tabular figures stop the
          seconds column from twitching the layout every tick */}
      <span
        dir="ltr"
        className="font-bold tabular-nums"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {days > 0 && `${t("daysShort", { days })} `}
        {clock}
      </span>
    </span>
  );
}
