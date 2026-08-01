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
 *   - Rate-limited per IP — a scripted flood of fake orders would otherwise
 *     spam Valentina's Gmail (used for order notifications) fast enough to
 *     get the account throttled, breaking real order emails too
 *
 * Production (production-mindset):
 *   - DB errors caught and logged — customer gets a clear error, not a 500 stack trace
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { sendOrderToStore, sendOrderToCustomer } from "@/lib/email";
import { parseOrderItemsInput, repriceOrderItems } from "@/lib/orders";
import { allow, clientIp } from "@/lib/rate-limit";

// Input length caps — prevents absurdly long strings in the DB
const LIMITS = {
  name: 120,
  phone: 30,
  address: 300,
  floor: 60,
  notes: 1000,
};

export async function POST(req: NextRequest) {
  // A real customer never places 10 orders a minute — this only ever
  // blocks scripted abuse.
  if (!allow(`orders:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, phone, email, address, floor, notes, items } = body as Record<string, unknown>;

  // Required field presence check — floor is required so delivery
  // cost/feasibility (elevator, stairs) is never a surprise after the sale
  if (
    typeof name !== "string" || !name.trim() ||
    typeof phone !== "string" || !phone.trim() ||
    typeof address !== "string" || !address.trim() ||
    typeof floor !== "string" || !floor.trim() ||
    !Array.isArray(items) || items.length === 0
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Length caps
  if (
    name.length > LIMITS.name ||
    phone.length > LIMITS.phone ||
    address.length > LIMITS.address ||
    floor.length > LIMITS.floor
  ) {
    return NextResponse.json({ error: "Input too long" }, { status: 400 });
  }

  // Cap items array to prevent abuse
  if (items.length > 50) {
    return NextResponse.json({ error: "Too many items" }, { status: 400 });
  }

  // Optional email — only stored when it looks like an address
  const customerEmail =
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? email.trim().slice(0, 200)
      : null;

  // Security: the client sends only {productId, quantity}. Names, prices,
  // and the total come from the DB — a tampered request can't set its own
  // prices or corrupt the revenue numbers in the dashboard.
  const wanted = parseOrderItemsInput(items);
  if (!wanted) return NextResponse.json({ error: "Invalid items" }, { status: 400 });

  try {
    const priced = await repriceOrderItems(wanted);
    if ("error" in priced) return NextResponse.json({ error: priced.error }, { status: 400 });
    const { items: verifiedItems, total } = priced;

    const [order] = await db
      .insert(orders)
      .values({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: customerEmail,
        customerAddress: address.trim(),
        customerFloor: floor.trim(),
        notes: typeof notes === "string" ? notes.trim().slice(0, LIMITS.notes) : null,
        items: JSON.stringify(verifiedItems),
        total: total.toFixed(2),
      })
      .returning({ id: orders.id });

    // Notify the store (and the customer, if they left an email).
    // Deliberately not awaited-into-the-response path beyond this point:
    // a mail failure is logged and recoverable via "resend" in admin —
    // it must never turn a saved order into an error for the customer.
    const emailData = {
      id: order.id,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail,
      customerAddress: address.trim(),
      customerFloor: floor.trim(),
      items: verifiedItems,
      total: total.toFixed(2),
      notes: typeof notes === "string" ? notes.trim() : null,
      createdAt: new Date(),
    };
    await Promise.allSettled([sendOrderToStore(emailData), sendOrderToCustomer(emailData)]);

    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (err) {
    console.error("[orders] DB insert failed:", err);
    return NextResponse.json({ error: "Could not save order — please try again" }, { status: 500 });
  }
}
