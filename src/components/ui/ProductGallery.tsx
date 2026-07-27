"use client";

/**
 * ProductGallery — main photo + thumbnail strip, KSP/standard-e-commerce
 * style: click a thumbnail, the main image swaps instantly. No slide, no
 * fade — a gallery isn't a carousel, and the swap should feel immediate,
 * not like something is "playing."
 *
 * The main image is never cropped (lib/images "gallery" preset — c_limit,
 * keeps the photo's own shape) since this is a single large viewer, not a
 * repeated grid that needs uniform tiles. Thumbnails stay small uniform
 * crops — cropping a 64px thumbnail loses nothing worth protecting.
 */
import { useState } from "react";
import FallbackImage from "./FallbackImage";
import { imageUrl } from "@/lib/images";

export type GalleryPhoto = { url: string; publicId: string | null };

export default function ProductGallery({
  photos,
  alt,
}: {
  photos: GalleryPhoto[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const current = photos[Math.min(active, photos.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <FallbackImage
          src={imageUrl(current?.url ?? null, "gallery") ?? ""}
          alt={alt}
          fill
          priority
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={alt}>
          {photos.map((p, i) => (
            <button
              key={p.publicId ?? p.url ?? i}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors"
              style={{ borderColor: i === active ? "var(--primary)" : "var(--border)" }}
            >
              <FallbackImage src={imageUrl(p.url, "thumb") ?? ""} alt="" fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
