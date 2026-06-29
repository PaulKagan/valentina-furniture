/**
 * /api/admin/products — CRUD for products.
 *
 * All verbs check the session first (security-review: auth before any DB op).
 * Errors are caught and logged — the admin sees a message, not a raw stack trace.
 *
 * GET    → list all products
 * POST   → create product
 * PUT    → update product (requires id in body)
 * DELETE → delete product (requires id in body)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Auth guard — call at the top of every handler */
async function requireAdmin() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null; // null = allowed
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const all = await db.select().from(products);
    return NextResponse.json(all);
  } catch (err) {
    console.error("[admin/products GET]", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const [product] = await db.insert(products).values(body).returning();
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[admin/products POST]", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/products PUT]", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(products).where(eq(products.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/products DELETE]", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
