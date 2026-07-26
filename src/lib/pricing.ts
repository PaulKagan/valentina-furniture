/**
 * Product pricing — one place that decides what a product actually costs.
 *
 * A product has a list price and an optional sale price. Every surface that
 * touches money (cards, detail page, cart, order creation, filters, sorting)
 * must agree, so they all call effectivePrice() rather than reading .price
 * directly. Client-safe: no DB imports.
 */

export type Priced = { price: string; salePrice: string | null };

/** True when the sale price is set and genuinely cheaper than the list price. */
export function isOnSale(p: Priced): boolean {
  if (!p.salePrice) return false;
  const sale = parseFloat(p.salePrice);
  const list = parseFloat(p.price);
  return Number.isFinite(sale) && sale > 0 && sale < list;
}

/** What the customer pays. */
export function effectivePrice(p: Priced): number {
  return isOnSale(p) ? parseFloat(p.salePrice!) : parseFloat(p.price);
}

/** The struck-through price, or null when not on sale. */
export function listPrice(p: Priced): number | null {
  return isOnSale(p) ? parseFloat(p.price) : null;
}

/** Whole-percent discount (e.g. 25 for "-25%"), or null when not on sale. */
export function discountPercent(p: Priced): number | null {
  if (!isOnSale(p)) return null;
  const list = parseFloat(p.price);
  const sale = parseFloat(p.salePrice!);
  const pct = Math.round((1 - sale / list) * 100);
  return pct > 0 ? pct : null;
}
