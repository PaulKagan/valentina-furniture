/**
 * Small request-body coercion helpers shared across the admin API routes.
 * Client-safe: no DB imports.
 */

/**
 * A focal-point coordinate (0-100 integer), or null if unset/unparseable.
 * Shared by categories and products — both store an optional manual crop
 * focus point that falls back to auto-detected gravity when unset.
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
