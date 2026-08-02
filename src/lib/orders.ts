/**
 * Order-item validation + server-side pricing.
 *
 * The client (checkout page, admin order editor) only ever sends
 * {productId, quantity} — never a price. Every price in a saved order comes
 * from the DB at the moment of parseOrderItemsInput()+repriceOrderItems(),
 * so a tampered request can't set its own numbers or corrupt the revenue
 * total. Shared by the customer checkout endpoint and the admin order editor
 * so the two can never compute a price differently.
 */
import { db } from "@/db";
import { products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { effectivePrice, productDiscount } from "./pricing";
import { getActiveCategories } from "./catalog";

export type OrderItemInput = { productId: number; quantity: number };
export type PricedOrderItem = { productId: number; name: string; price: number; quantity: number };

/**
 * Validate a raw items array from a request body: only {productId, quantity}
 * survives, each an integer with quantity in [1, 99]. Returns null on any
 * malformed entry — the caller turns that into a 400.
 */
export function parseOrderItemsInput(raw: unknown[]): OrderItemInput[] | null {
  const wanted: OrderItemInput[] = [];
  for (const item of raw) {
    const productId = (item as Record<string, unknown>)?.productId;
    const quantity = (item as Record<string, unknown>)?.quantity;
    if (
      typeof productId !== "number" || !Number.isInteger(productId) ||
      typeof quantity !== "number" || !Number.isInteger(quantity) ||
      quantity < 1 || quantity > 99
    ) {
      return null;
    }
    wanted.push({ productId, quantity });
  }
  return wanted;
}

/**
 * Re-price a validated item list against the DB — see file header for why
 * this never trusts a client-sent price.
 */
export async function repriceOrderItems(
  wanted: OrderItemInput[]
): Promise<{ items: PricedOrderItem[]; total: number } | { error: string }> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      salePrice: products.salePrice,
      onSale: products.onSale,
      categoryId: products.categoryId,
      additionalCategoryIds: products.additionalCategoryIds,
    })
    .from(products)
    .where(inArray(products.id, wanted.map((w) => w.productId)));
  const byId = new Map(rows.map((p) => [p.id, p]));
  const activeCategories = await getActiveCategories();

  const items: PricedOrderItem[] = [];
  let total = 0;
  for (const w of wanted) {
    const p = byId.get(w.productId);
    if (!p) return { error: "Unknown product" };
    // Best discount across every category this product is assigned to
    // (primary + additional) — not just the primary one.
    const discount = productDiscount([p.categoryId, ...p.additionalCategoryIds], activeCategories);
    const price = effectivePrice(p, discount);
    items.push({ productId: p.id, name: p.name, price, quantity: w.quantity });
    total += price * w.quantity;
  }
  return { items, total };
}
