/**
 * PUT /api/admin/categories/[id]/products — bulk-assign existing products
 * to this category as an ADDITIONAL category (never touches anyone's
 * primary categoryId).
 *
 * Body: { productIds: number[] } — the full desired set of non-primary
 * members. Products already primary here are always members and can't be
 * removed through this endpoint (their primary category is unaffected but
 * changing it is a per-product edit, not a bulk one).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const MAX_ADDITIONAL_CATEGORIES = 20; // must match /api/admin/products

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const categoryId = parseInt(idParam, 10);
  if (isNaN(categoryId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const body = await req.json();
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.filter((v: unknown): v is number => typeof v === "number" && Number.isInteger(v))
      : null;
    if (!productIds) return NextResponse.json({ error: "productIds must be an array" }, { status: 400 });

    const desired = new Set(productIds);
    const all = await db.select().from(products);

    const toAdd: number[] = [];
    const toRemove: number[] = [];
    for (const p of all) {
      if (p.categoryId === categoryId) continue; // primary here — not this endpoint's concern
      const has = p.additionalCategoryIds.includes(categoryId);
      const wants = desired.has(p.id);
      if (wants && !has && p.additionalCategoryIds.length < MAX_ADDITIONAL_CATEGORIES) toAdd.push(p.id);
      else if (!wants && has) toRemove.push(p.id);
    }

    await Promise.all([
      ...toAdd.map((id) =>
        db
          .update(products)
          .set({ additionalCategoryIds: sql`array_append(${products.additionalCategoryIds}, ${categoryId})` })
          .where(eq(products.id, id))
      ),
      ...toRemove.map((id) =>
        db
          .update(products)
          .set({ additionalCategoryIds: sql`array_remove(${products.additionalCategoryIds}, ${categoryId})` })
          .where(eq(products.id, id))
      ),
    ]);

    return NextResponse.json({ added: toAdd.length, removed: toRemove.length });
  } catch (err) {
    console.error("[admin/categories/[id]/products PUT]", err);
    return NextResponse.json({ error: "Failed to update products" }, { status: 500 });
  }
}
