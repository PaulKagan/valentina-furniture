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

/** The uploaded photo's own pixel size — needed to turn a 0-100 focal
 * percent into the absolute pixels Cloudinary's g_xy_center gravity
 * actually wants. Missing (legacy rows saved before this existed) falls
 * back to g_auto rather than guessing. */
export type Dimensions = { width: number; height: number } | null | undefined;

/**
 * A focal-point coordinate (0-100 integer), or null if unset/unparseable —
 * used when parsing a focal point out of an admin request body, before it
 * ever reaches imageUrl() above. Shared by the category and product routes.
 */
export function focalRaw(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

/**
 * Both-or-neither focal point: a partial pair (one set, one missing) is
 * treated as unset rather than guessing at the other half.
 */
export function focalPair(xRaw: unknown, yRaw: unknown): { focalX: number | null; focalY: number | null } {
  const focalX = focalRaw(xRaw);
  const focalY = focalRaw(yRaw);
  return focalX != null && focalY != null ? { focalX, focalY } : { focalX: null, focalY: null };
}

type Preset = "card" | "detail" | "tile" | "thumb" | "gallery";

// width × aspect for each layout slot — one source of truth for uniform sizing
const PRESETS: Record<Preset, { w: number; ar: string }> = {
  card: { w: 800, ar: "4:3" }, // product grid cards
  detail: { w: 1200, ar: "1:1" }, // product page hero (legacy single-image contexts)
  tile: { w: 800, ar: "16:9" }, // homepage category tiles
  thumb: { w: 200, ar: "1:1" }, // cart rows / admin lists / gallery thumbnails
  gallery: { w: 1200, ar: "" }, // product gallery main viewer — no forced ratio
};

function transformFor(preset: Preset, focal: Focal, dimensions: Dimensions): string {
  const { w, ar } = PRESETS[preset];

  if (preset === "gallery") {
    // c_limit: fit within w×w, never upscale, never crop — the photo keeps
    // its own shape. There's no "cut off the top of the chair" risk here
    // because nothing is forced into a fixed box.
    return `c_limit,w_${w},h_${w},f_auto,q_auto`;
  }

  // Cloudinary's custom-focus gravity (g_xy_center) takes x/y as absolute
  // pixels of the ORIGINAL image — not a fraction, not a percent (confirmed
  // the hard way: a fraction like x_0.71 doesn't error, it silently produces
  // a nonsensical crop request). So the stored 0-100 percent only converts
  // correctly if we know the photo's real pixel size — without that, fall
  // back to g_auto instead of sending Cloudinary a broken transform.
  const gravity =
    focal && dimensions && Number.isFinite(focal.x) && Number.isFinite(focal.y)
      ? `g_xy_center,x_${toPixel(focal.x, dimensions.width)},y_${toPixel(focal.y, dimensions.height)}`
      : "g_auto";
  return `c_fill,${gravity},ar_${ar},w_${w},f_auto,q_auto`;
}

function toPixel(percent: number, size: number): number {
  return Math.round((Math.max(0, Math.min(100, percent)) / 100) * size);
}

export function imageUrl(url: string | null | undefined, preset: Preset, focal?: Focal, dimensions?: Dimensions): string | null {
  if (!url) return null;
  // Only transform Cloudinary delivery URLs: .../upload/<rest>
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || idx === -1) return url;

  const transform = transformFor(preset, focal, dimensions);
  return url.slice(0, idx + marker.length) + transform + "/" + url.slice(idx + marker.length);
}
