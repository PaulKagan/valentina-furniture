/**
 * Shared pagination constants.
 *
 * Lives in its own module (not in the client LoadMore component): a value
 * imported from a "use client" module into a server component arrives as a
 * client reference, not the number — which silently made the page size
 * NaN and rendered zero products.
 */

/** Products per page in the store catalog. */
export const PAGE_SIZE = 24;

/** Rows per page in admin lists. */
export const ADMIN_PAGE_SIZE = 30;

/** Clamp a `?show=` param to a sane visible count. */
export function visibleCount(show: string | undefined, total: number, pageSize = PAGE_SIZE): number {
  const requested = show ? parseInt(show, 10) : pageSize;
  const safe = Number.isFinite(requested) ? requested : pageSize;
  return Math.min(Math.max(safe, pageSize), total);
}
