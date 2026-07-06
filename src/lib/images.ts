/**
 * Image URL helpers — uniform product images regardless of upload resolution.
 *
 * Cloudinary delivery URLs accept on-the-fly transformations. We inject
 * `c_fill,g_auto` so every image is center-cropped (subject-aware) to the
 * exact aspect ratio the layout needs — cards always 4:3, detail always
 * square — no matter what size/shape photo Valentina uploads.
 * f_auto/q_auto serve modern formats (AVIF/WebP) at tuned quality.
 *
 * Non-Cloudinary URLs (or null) pass through untouched so the UI can
 * still show its placeholder.
 */

type Preset = "card" | "detail" | "tile" | "thumb";

// width × aspect for each layout slot — one source of truth for uniform sizing
const PRESETS: Record<Preset, { w: number; ar: string }> = {
  card: { w: 800, ar: "4:3" }, // product grid cards
  detail: { w: 1200, ar: "1:1" }, // product page hero
  tile: { w: 800, ar: "16:9" }, // homepage category tiles
  thumb: { w: 200, ar: "1:1" }, // cart rows / admin lists
};

export function imageUrl(url: string | null | undefined, preset: Preset): string | null {
  if (!url) return null;
  // Only transform Cloudinary delivery URLs: .../upload/<rest>
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || idx === -1) return url;

  const { w, ar } = PRESETS[preset];
  const transform = `c_fill,g_auto,ar_${ar},w_${w},f_auto,q_auto`;
  return url.slice(0, idx + marker.length) + transform + "/" + url.slice(idx + marker.length);
}
