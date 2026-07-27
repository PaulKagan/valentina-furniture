"use client";

/**
 * FocalPointPicker — click the image once to say "this is the important
 * part." Used wherever a photo gets forced into a fixed-ratio crop (product
 * cards, category tiles) so the automatic crop can center on what actually
 * matters instead of guessing.
 *
 * Stores a plain 0-100 percent position (top-left origin) — the conversion
 * to whatever format Cloudinary's gravity transform needs happens in
 * lib/images.ts, not here. This component only knows about percentages and
 * pixels on screen.
 */
import { useRef } from "react";
import Image from "next/image";

export type FocalPoint = { x: number; y: number };

export default function FocalPointPicker({
  src,
  value,
  onChange,
  label,
  hint,
  resetLabel,
}: {
  src: string;
  value: FocalPoint | null;
  onChange: (point: FocalPoint | null) => void;
  label: string;
  hint: string;
  resetLabel: string;
}) {
  const imgRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onChange({ x: Math.round(x), y: Math.round(y) });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
          {label}
        </span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs underline"
            style={{ color: "var(--muted)" }}
          >
            {resetLabel}
          </button>
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {hint}
      </p>
      <div
        ref={imgRef}
        onClick={handleClick}
        className="relative w-full max-w-xs aspect-[4/3] rounded-lg overflow-hidden cursor-crosshair border"
        style={{ borderColor: "var(--border)" }}
      >
        <Image src={src} alt="" fill className="object-cover" sizes="320px" />
        {value && (
          <span
            className="absolute w-5 h-5 rounded-full border-2 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${value.x}%`,
              top: `${value.y}%`,
              borderColor: "white",
              backgroundColor: "var(--primary)",
              boxShadow: "0 0 0 1.5px var(--primary)",
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
