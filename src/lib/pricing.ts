/**
 * Product pricing — one place that decides what a product actually costs.
 *
 * The model, in the store owner's words: a product is either on sale or it
 * isn't. `onSale` is the switch. What it costs when on sale comes from,
 * in order of precedence:
 *
 *   1. its own salePrice, if she typed one   → exact control
 *   2. its category's discountPercent        → inherited, computed live
 *
 * Inherited discounts are NEVER written to the product row. They're derived
 * at read time, so changing a category's percentage updates every product
 * instantly, and when a scheduled sale category expires its discounts
 * disappear on their own — no stale prices to clean up.
 *
 * Every surface that touches money (cards, detail page, cart, order
 * creation, admin order edits, filters, sorting, structured data) calls
 * effectivePrice() rather than reading .price, so a discount can never be
 * displayed in one place and charged differently in another.
 *
 * Client-safe: no DB imports.
 */

export type Priced = {
  price: string;
  salePrice: string | null;
  onSale: boolean;
};

/** Minimal category shape needed to resolve an inherited discount. */
export type DiscountCategory = {
  id: number;
  parentId: number | null;
  isSaleCategory: boolean;
  discountPercent: number;
};

/**
 * Percent discount a category branch grants, walking up from the product's
 * own category. The NEAREST sale ancestor wins: if Living Room is 10% and
 * Sofas inside it is 20%, a sofa gets 20% — the more specific rule is
 * always the one that was meant.
 * Returns 0 when nothing in the chain is a sale category.
 */
export function saleSource<T extends DiscountCategory>(
  categoryId: number | null,
  categories: T[]
): T | null {
  if (categoryId == null) return null;
  const byId = new Map(categories.map((c) => [c.id, c]));
  let cur = byId.get(categoryId);
  // Bounded loop — a cycle in the tree can never hang the page
  for (let i = 0; cur && i <= categories.length; i++) {
    if (cur.isSaleCategory && cur.discountPercent > 0) return cur;
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return null;
}

/** Just the percentage from saleSource(), clamped. 0 when nothing applies. */
export function categoryDiscount(
  categoryId: number | null,
  categories: DiscountCategory[]
): number {
  const src = saleSource(categoryId, categories);
  return src ? Math.min(Math.round(src.discountPercent), 95) : 0;
}

/**
 * A product can sit in several categories at once (primary + additional —
 * see products.additionalCategoryIds). Whichever one grants the best
 * discount wins; a product's own salePrice still beats all of them
 * (isOnSale/effectivePrice check that first, before any discount passed
 * in here is even consulted).
 */
export function productSaleSource<T extends DiscountCategory>(
  categoryIds: (number | null | undefined)[],
  categories: T[]
): T | null {
  let best: T | null = null;
  for (const id of categoryIds) {
    if (id == null) continue;
    const src = saleSource(id, categories);
    if (src && (!best || src.discountPercent > best.discountPercent)) best = src;
  }
  return best;
}

/** Just the percentage from productSaleSource(), clamped. 0 when nothing applies. */
export function productDiscount(
  categoryIds: (number | null | undefined)[],
  categories: DiscountCategory[]
): number {
  const src = productSaleSource(categoryIds, categories);
  return src ? Math.min(Math.round(src.discountPercent), 95) : 0;
}

/**
 * Apply a percentage and round to something a shop would actually print.
 * 20% off ₪4,990 → ₪3,992 is nobody's price tag; we land on ₪3,990.
 * Cheap items round to the nearest ₪1 so a ₪49 item doesn't collapse to ₪40.
 */
export function applyDiscount(price: number, percent: number): number {
  const raw = price * (1 - percent / 100);
  if (raw <= 0) return 0;
  const step = raw >= 200 ? 10 : 1;
  return Math.max(step, Math.round(raw / step) * step);
}

/** True when this product should read as discounted anywhere in the store. */
export function isOnSale(p: Priced, discount = 0): boolean {
  if (!p.onSale) return false;
  const list = parseFloat(p.price);
  if (!Number.isFinite(list) || list <= 0) return false;
  if (p.salePrice) {
    const sale = parseFloat(p.salePrice);
    return Number.isFinite(sale) && sale > 0 && sale < list;
  }
  return discount > 0;
}

/**
 * What the customer pays.
 * `discount` is the inherited category percentage — pass 0 (or omit) when
 * the caller has no category context; the product's own sale price still
 * applies.
 */
export function effectivePrice(p: Priced, discount = 0): number {
  const list = parseFloat(p.price);
  if (!isOnSale(p, discount)) return list;
  if (p.salePrice) return parseFloat(p.salePrice);
  return applyDiscount(list, discount);
}

/** The struck-through price, or null when not on sale. */
export function listPrice(p: Priced, discount = 0): number | null {
  return isOnSale(p, discount) ? parseFloat(p.price) : null;
}

/**
 * Whole-number discount for display (e.g. 21 for "-21%"). Never fractional —
 * rounding the price means the true percentage is rarely exact, and
 * "-21.49%" on a price tag looks like a bug.
 */
export function discountPercent(p: Priced, discount = 0): number | null {
  if (!isOnSale(p, discount)) return null;
  const list = parseFloat(p.price);
  const sale = effectivePrice(p, discount);
  const pct = Math.round((1 - sale / list) * 100);
  return pct > 0 ? pct : null;
}

/**
 * Is the displayed percentage exact, or a rounded approximation?
 * Used by the admin form to show "~21%" instead of implying precision.
 */
export function isApproximatePercent(p: Priced, discount = 0): boolean {
  if (!isOnSale(p, discount)) return false;
  const list = parseFloat(p.price);
  const sale = effectivePrice(p, discount);
  const exact = (1 - sale / list) * 100;
  return Math.abs(exact - Math.round(exact)) > 0.01;
}
