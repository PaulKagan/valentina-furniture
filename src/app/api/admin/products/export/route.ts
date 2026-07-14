/**
 * GET /api/admin/products/export — download the full catalog as Excel,
 * in the same format as the import template (round-trip: export → edit
 * prices in Excel → import back, matched by Hebrew product name).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { buildExport } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [allProducts, allCategories] = await Promise.all([
      db.select().from(products),
      db.select().from(categories),
    ]);
    const buffer = buildExport(allProducts, allCategories);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="valentina-products.xlsx"',
      },
    });
  } catch (err) {
    console.error("[products/export]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
