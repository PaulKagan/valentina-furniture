/**
 * POST /api/orders — save a new customer order.
 *
 * Called from the checkout page after the customer fills in their details.
 * No payment is processed — the store calls to confirm manually.
 *
 * Security (security-review):
 *   - Field length limits prevent oversized inputs hitting the DB
 *   - Items array capped at 50 to prevent abuse
 *   - All fields trimmed before storage
 *
 * Production (production-mindset):
 *   - DB errors caught and logged — customer gets a clear error, not a 500 stack trace
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { inArray } from "drizzle-orm";

// Input length caps — prevents absurdly long strings in the DB
const LIMITS = {
  name: 120,
  phone: 30,
  address: 300,
  notes: 1000,
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, address, notes, items } = body as Record<string, unknown>;

  // Required field presence check
  if (
    typeof name !== "string" || !name.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof address !== "string" || !address.trim() ||
    !Array.isArray(items) || items.length === 0
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Length caps
  if (name.length > LIMITS.name || phone.length > LIMITS.phone || address.length > LIMITS.address) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  // Cap items array to prevent abuse
  if (items.length > 50) {
    return NextResponse.json({ error: "Too many items" }, { status: 400 });
  }

  // Security: the client sends only {productId, quantity}. Names, prices,
  // and the total come from the DB — a tampered request can't set its own
  // prices or corrupt the revenue numbers in the dashboard.
  const wanted: { productId: number; quantity: number }[] = [];
  for (const item of items) {
    const productId = (item as Record<string, unknown>)?.productId;
    const quantity = (item as Record<string, unknown>)?.quantity;
    if (
      typeof productId !== "number" || !Number.isInteger(productId) ||
      typeof quantity !== "number" || !Number.isInteger(quantity) ||
      quantity < 1 || quantity > 99
    ) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }
    wanted.push({ productId, quantity });
  }

  try {
    const dbProducts = await db
      .select({ id: products.id, name: products.name, price: products.price, inStock: products.inStock })
      .from(products)
      .where(inArray(products.id, wanted.map((w) => w.productId)));
    const byId = new Map(dbProducts.map((p) => [p.id, p]));

    const verifiedItems: { productId: number; name: string; price: number; quantity: number }[] = [];
    let total = 0;
    for (const w of wanted) {
      const p = byId.get(w.productId);
      if (!p) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
      const price = parseFloat(p.price);
      verifiedItems.push({ productId: p.id, name: p.name, price, quantity: w.quantity });
      total += price * w.quantity;
    }

    const [order] = await db
      .insert(orders)
      .values({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        notes: typeof notes === "string" ? notes.trim().slice(0, LIMITS.notes) : null,
        items: JSON.stringify(verifiedItems),
        total: total.toFixed(2),
      })
      .returning({ id: orders.id });

    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (err) {
    console.error("[orders] DB insert failed:", err);
    return NextResponse.json({ error: "Could not save order — please try again" }, { status: 500 });
  }
}
