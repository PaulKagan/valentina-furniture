import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, address, notes, items, total } = body;

  if (!name || !phone || !address || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [order] = await db
    .insert(orders)
    .values({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerAddress: address.trim(),
      notes: notes?.trim() || null,
      items: JSON.stringify(items),
      total: String(total),
    })
    .returning({ id: orders.id });

  return NextResponse.json({ id: order.id }, { status: 201 });
}
