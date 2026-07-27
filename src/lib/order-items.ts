/**
 * Safe parsing for `orders.items` — stored as a JSON string (see schema.ts).
 *
 * The column is always written by our own code (checkout, admin edits), so
 * malformed content should never happen — but "should never" isn't a
 * guarantee against a bad manual DB edit or a future migration mistake.
 * Every reader goes through here instead of a bare JSON.parse() so a
 * corrupted row degrades to an empty list instead of 500ing the page.
 *
 * Client-safe: no DB imports.
 */

export type OrderLineItem = { productId: number; name: string; price: number; quantity: number };

function isLineItem(v: unknown): v is OrderLineItem {
  const o = v as Record<string, unknown>;
  return (
    !!o &&
    typeof o.productId === "number" &&
    typeof o.name === "string" &&
    typeof o.price === "number" &&
    typeof o.quantity === "number"
  );
}

/** Parse `orders.items`; returns [] (and logs) instead of throwing on corrupt data. */
export function parseOrderItems(raw: string): OrderLineItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isLineItem)) return parsed;
    console.error("[order-items] stored JSON is not a valid item list:", raw);
    return [];
  } catch (err) {
    console.error("[order-items] failed to parse:", err);
    return [];
  }
}
