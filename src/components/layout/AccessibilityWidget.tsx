"use client";

/**
 * Accessibility widget — required by Israeli law (IS 5568 / WCAG 2.0 AA).
 *
 * Floating button that opens an adjustments panel:
 *   font size ±, high contrast, grayscale, highlighted links,
 *   readable font, stop animations, reset.
 * Choices apply as classes/vars on <html> (styles in globals.css) and
 * persist in localStorage across visits.
 * Fully keyboard operable: the panel is a dialog, Esc closes it.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Accessibility, X } from "lucide-react";
import { Link } from "@/i18n/navigation";

type A11ySettings = {
  fontScale: number; // 1 = default, up to 1.5
  contrast: boolean;
  grayscale: boolean;
  links: boolean;
  readableFont: boolean;
  noMotion: boolean;
};

const DEFAULTS: A11ySettings = {
  fontScale: 1,
  contrast: false,
  grayscale: false,
  links: false,
  readableFont: false,
  noMotion: false,
};

const STORAGE_KEY = "a11y-settings";

function apply(s: A11ySettings) {
  const root = document.documentElement;
  root.style.fontSize = s.fontScale === 1 ? "" : `${s.fontScale * 100}%`;
  root.classList.toggle("a11y-contrast", s.contrast);
  root.classList.toggle("a11y-grayscale", s.grayscale);
  root.classList.toggle("a11y-links", s.links);
  root.classList.toggle("a11y-readable", s.readableFont);
  root.classList.toggle("a11y-no-motion", s.noMotion);
}

export default function AccessibilityWidget() {
  const t = useTranslations("a11y");
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load persisted settings once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = { ...DEFAULTS, ...JSON.parse(saved) };
        setSettings(s);
        apply(s);
      }
    } catch {
      /* corrupted storage — stay on defaults */
    }
  }, []);

  function update(patch: Partial<A11ySettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode — settings just won't persist */
    }
  }

  // Esc closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggles: { key: keyof A11ySettings; label: string }[] = [
    { key: "contrast", label: t("contrast") },
    { key: "grayscale", label: t("grayscale") },
    { key: "links", label: t("links") },
    { key: "readableFont", label: t("readableFont") },
    { key: "noMotion", label: t("noMotion") },
  ];

  return (
    <>
      {/* Floating trigger — fixed bottom corner, above everything */}
      <button
        type="button"
        data-a11y-widget
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={t("openLabel")}
        className="fixed bottom-4 start-4 z-[300] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-[0.95]"
        style={{ backgroundColor: "oklch(0.35 0.12 255)", color: "white" }}
      >
        <Accessibility size={26} aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={panelRef}
          data-a11y-widget
          role="dialog"
          aria-label={t("title")}
          className="fixed bottom-20 start-4 z-[300] w-72 max-h-[70vh] overflow-y-auto rounded-2xl border shadow-xl p-4 flex flex-col gap-3"
          style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm" style={{ color: "var(--ink)" }}>
              {t("title")}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="p-1 rounded hover:bg-[oklch(0.974_0_0)]"
              style={{ color: "var(--muted)" }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Font size */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm" style={{ color: "var(--ink)" }}>{t("fontSize")}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => update({ fontScale: Math.max(1, +(settings.fontScale - 0.1).toFixed(1)) })}
                aria-label={t("fontSmaller")}
                className="w-8 h-8 rounded-lg border font-bold"
                style={{ borderColor: "var(--border)", color: "var(--ink)" }}
              >
                א-
              </button>
              <span className="text-xs w-10 text-center" style={{ color: "var(--muted)" }}>
                {Math.round(settings.fontScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => update({ fontScale: Math.min(1.5, +(settings.fontScale + 0.1).toFixed(1)) })}
                aria-label={t("fontBigger")}
                className="w-8 h-8 rounded-lg border font-bold"
                style={{ borderColor: "var(--border)", color: "var(--ink)" }}
              >
                א+
              </button>
            </div>
          </div>

          {toggles.map((tg) => (
            <label key={tg.key} className="flex items-center justify-between text-sm cursor-pointer" style={{ color: "var(--ink)" }}>
              {tg.label}
              <input
                type="checkbox"
                checked={settings[tg.key] as boolean}
                onChange={(e) => update({ [tg.key]: e.target.checked })}
              />
            </label>
          ))}

          <button
            type="button"
            onClick={() => update({ ...DEFAULTS })}
            className="mt-1 py-2 rounded-lg text-sm font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            {t("reset")}
          </button>

          <Link
            href="/accessibility"
            className="text-xs underline text-center"
            style={{ color: "var(--muted)" }}
            onClick={() => setOpen(false)}
          >
            {t("statementLink")}
          </Link>
        </div>
      )}
    </>
  );
}
