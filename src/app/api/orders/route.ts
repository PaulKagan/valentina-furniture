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
import { orders } from "@/db/schema";

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

  const { name, phone, address, notes, items, total } = body as Record<string, unknown>;

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

  try {
    const [order] = await db
      .insert(orders)
      .values({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        notes: typeof notes === "string" ? notes.trim().slice(0, LIMITS.notes) : null,
        items: JSON.stringify(items),
        total: String(total),
      })
      .returning({ id: orders.id });

    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (err) {
    console.error("[orders] DB insert failed:", err);
    return NextResponse.json({ error: "Could not save order — please try again" }, { status: 500 });
  }
}
