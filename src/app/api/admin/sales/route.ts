/**
 * /api/admin/sales — bulk sale controls for the sales overview page.
 *
 * POST { action: "endProduct", id }   → clear one product's own sale
 * POST { action: "endAllProducts" }   → clear every individually-set sale
 * POST { action: "endCategory", id }  → stop a category's sale
 *
 * Ending a product sale means untick + drop its sale price. Ending a
 * category sale means unticking the category — its products keep their own
 * sale price if they had one, and simply stop inheriting if they didn't.
 * Nothing here ever rewrites a product's regular price, so "end sale" can
 * never lose the original number.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "";
    const id = typeof body.id === "number" ? body.id : null;

    switch (action) {
      case "endProduct": {
        if (id == null) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await db
          .update(products)
          .set({ onSale: false, salePrice: null })
          .where(eq(products.id, id));
        return NextResponse.json({ ok: true });
      }

      case "endAllProducts": {
        // Only products carrying their own sale price — products that are
        // merely inheriting from a category are left alone, since ending
        // those is the category's job.
        const affected = await db
          .update(products)
          .set({ onSale: false, salePrice: null })
          .where(isNotNull(products.salePrice))
          .returning({ id: products.id });
        return NextResponse.json({ ok: true, count: affected.length });
      }

      case "endCategory": {
        if (id == null) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await db
          .update(categories)
          .set({ isSaleCategory: false })
          .where(eq(categories.id, id));
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin/sales POST]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
