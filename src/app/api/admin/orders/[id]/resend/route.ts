/**
 * POST /api/admin/orders/[id]/resend — manually re-send an order email.
 * Body: { to: "store" | "customer" }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendOrderToStore, sendOrderToCustomer, isEmailConfigured } from "@/lib/email";
import { parseOrderItems } from "@/lib/order-items";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "not-configured" }, { status: 503 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { to } = await req.json().catch(() => ({ to: "store" }));
  if (to !== "store" && to !== "customer") {
    return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, numId));
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (to === "customer" && !order.customerEmail) {
      return NextResponse.json({ error: "no-customer-email" }, { status: 400 });
    }

    const data = {
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerAddress: order.customerAddress,
      items: parseOrderItems(order.items),
      total: order.total,
      notes: order.notes,
      createdAt: order.createdAt,
    };

    const result = to === "store" ? await sendOrderToStore(data) : await sendOrderToCustomer(data);
    if (!result.sent) {
      return NextResponse.json({ error: result.error ?? result.skipped ?? "failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[orders/resend]", err);
    return NextResponse.json({ error: "Resend failed" }, { status: 500 });
  }
}
