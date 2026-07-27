/**
 * Image URL helpers — uniform product images regardless of upload resolution.
 *
 * Cloudinary delivery URLs accept on-the-fly transformations. We inject
 * `c_fill` so cards/tiles/thumbs always render at the exact aspect ratio
 * the layout needs, no matter what size/shape photo Valentina uploads —
 * plus a gravity that decides WHICH part of the photo survives the crop:
 *
 *   - a focal point she clicked in admin (g_xy_center,x_,y_ — exact and
 *     predictable), or
 *   - `g_auto` (Cloudinary's subject-detection guess) when she hasn't set one
 *
 * The `gallery` preset is different on purpose: it's a single large viewer,
 * not a repeated grid, so it never crops — `c_limit` just caps the size and
 * preserves the photo's own shape. Cropping only earns its keep when many
 * photos have to line up into identical tiles.
 *
 * f_auto/q_auto serve modern formats (AVIF/WebP) at tuned quality.
 *
 * Non-Cloudinary URLs (or null) pass through untouched so the UI can
 * still show its placeholder.
 */

export type Focal = { x: number; y: number } | null | undefined;

type Preset = "card" | "detail" | "tile" | "thumb" | "gallery";

// width × aspect for each layout slot — one source of truth for uniform sizing
const PRESETS: Record<Preset, { w: number; ar: string }> = {
  card: { w: 800, ar: "4:3" }, // product grid cards
  detail: { w: 1200, ar: "1:1" }, // product page hero (legacy single-image contexts)
  tile: { w: 800, ar: "16:9" }, // homepage category tiles
  thumb: { w: 200, ar: "1:1" }, // cart rows / admin lists / gallery thumbnails
  gallery: { w: 1200, ar: "" }, // product gallery main viewer — no forced ratio
};

function transformFor(preset: Preset, focal: Focal): string {
  const { w, ar } = PRESETS[preset];

  if (preset === "gallery") {
    // c_limit: fit within w×w, never upscale, never crop — the photo keeps
    // its own shape. There's no "cut off the top of the chair" risk here
    // because nothing is forced into a fixed box.
    return `c_limit,w_${w},h_${w},f_auto,q_auto`;
  }

  // Cloudinary's custom-focus gravity (g_xy_center) takes x/y as fractions
  // (0.0-1.0) of the original image, not a pixel or percent value — the
  // stored focal point is 0-100 (easier to store/reason about), so it gets
  // divided down here right before it hits the URL.
  const gravity =
    focal && Number.isFinite(focal.x) && Number.isFinite(focal.y)
      ? `g_xy_center,x_${clampFraction(focal.x)},y_${clampFraction(focal.y)}`
      : "g_auto";
  return `c_fill,${gravity},ar_${ar},w_${w},f_auto,q_auto`;
}

function clampFraction(percent: number): number {
  return Math.round(Math.max(0, Math.min(100, percent))) / 100;
}

export function imageUrl(url: string | null | undefined, preset: Preset, focal?: Focal): string | null {
  if (!url) return null;
  // Only transform Cloudinary delivery URLs: .../upload/<rest>
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || idx === -1) return url;

  const transform = transformFor(preset, focal);
  return url.slice(0, idx + marker.length) + transform + "/" + url.slice(idx + marker.length);
}
