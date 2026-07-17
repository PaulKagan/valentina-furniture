/**
 * PATCH /api/admin/orders/[id] — update an order's status (admin only).
 * Status is validated against the enum so a bad payload gets a 400,
 * not a raw DB error.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { status } = await req.json().catch(() => ({}));
  if (!orderStatusEnum.enumValues.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, numId)).returning();
    if (!updated) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/orders PATCH]", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
