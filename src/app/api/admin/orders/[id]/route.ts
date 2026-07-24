/**
 * /api/admin/orders/[id] — admin control over a single order.
 *
 * PATCH  — update status, admin note, customer details, or the items
 *          themselves. Item edits re-price from the DB and recompute the
 *          total server-side (same rule as checkout: never trust client
 *          prices).
 * DELETE — remove the order.
 *
 * Resending emails lives at ./resend.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderStatusEnum, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};

  // Status
  if (body.status !== undefined) {
    if (!orderStatusEnum.enumValues.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  // Customer details + internal note
  const text = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : undefined;
  const name = text(body.customerName, 120);
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    patch.customerName = name;
  }
  const phone = text(body.customerPhone, 30);
  if (phone !== undefined) {
    if (!phone) return NextResponse.json({ error: "Phone required" }, { status: 400 });
    patch.customerPhone = phone;
  }
  const address = text(body.customerAddress, 300);
  if (address !== undefined) {
    if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
    patch.customerAddress = address;
  }
  if (body.customerEmail !== undefined) {
    const email = text(body.customerEmail, 200) ?? "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    patch.customerEmail = email || null;
  }
  if (body.adminNote !== undefined) patch.adminNote = text(body.adminNote, 2000) || null;
  if (body.notes !== undefined) patch.notes = text(body.notes, 1000) || null;

  // Items — re-priced from the DB, total recomputed here
  if (body.items !== undefined) {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
    }
    const wanted: { productId: number; quantity: number }[] = [];
    for (const item of body.items) {
      const productId = item?.productId;
      const quantity = item?.quantity;
      if (
        typeof productId !== "number" || !Number.isInteger(productId) ||
        typeof quantity !== "number" || !Number.isInteger(quantity) ||
        quantity < 1 || quantity > 99
      ) {
        return NextResponse.json({ error: "Invalid items" }, { status: 400 });
      }
      wanted.push({ productId, quantity });
    }

    const rows = await db
      .select({ id: products.id, name: products.name, price: products.price })
      .from(products)
      .where(inArray(products.id, wanted.map((w) => w.productId)));
    const byId = new Map(rows.map((p) => [p.id, p]));

    const verified: { productId: number; name: string; price: number; quantity: number }[] = [];
    let total = 0;
    for (const w of wanted) {
      const p = byId.get(w.productId);
      if (!p) return NextResponse.json({ error: "Unknown product" }, { status: 400 });
      const price = parseFloat(p.price);
      verified.push({ productId: p.id, name: p.name, price, quantity: w.quantity });
      total += price * w.quantity;
    }
    patch.items = JSON.stringify(verified);
    patch.total = total.toFixed(2);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const [updated] = await db.update(orders).set(patch).where(eq(orders.id, numId)).returning();
    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/orders PATCH]", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await db.delete(orders).where(eq(orders.id, numId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/orders DELETE]", err);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
