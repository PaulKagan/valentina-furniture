/**
 * /api/admin/products — CRUD for products.
 *
 * All verbs check the session first (security-review: auth before any DB op).
 * Payloads are validated field-by-field — never insert a raw request body
 * (security-review: mass-assignment protection).
 * Errors are caught and logged — the admin sees a message, not a raw stack trace.
 *
 * GET    → list all products
 * POST   → create product
 * PUT    → update product (requires id in body)
 * DELETE → delete product (requires id in body; removes Cloudinary image too)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteImage } from "@/lib/cloudinary";

/** Auth guard — call at the top of every handler */
async function requireAdmin() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null; // null = allowed
}

/** Validate + coerce a product payload. Returns {data} or {error}. */
function parseProductBody(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Name is required" };

  const price = typeof body.price === "string" || typeof body.price === "number" ? String(body.price) : "";
  const priceNum = parseFloat(price);
  if (!price || isNaN(priceNum) || priceNum < 0) return { error: "Valid price is required" };

  const optText = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    data: {
      name,
      nameEn: optText(body.nameEn),
      nameRu: optText(body.nameRu),
      description: optText(body.description),
      descriptionEn: optText(body.descriptionEn),
      descriptionRu: optText(body.descriptionRu),
      price: priceNum.toFixed(2),
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      imagePublicId: typeof body.imagePublicId === "string" ? body.imagePublicId : null,
      categoryId: typeof body.categoryId === "number" ? body.categoryId : null,
      inStock: body.inStock !== false,
      featured: body.featured === true,
    },
  };
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
    const parsed = parseProductBody(await req.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (parsed.data.categoryId != null) {
      const [cat] = await db.select().from(categories).where(eq(categories.id, parsed.data.categoryId));
      if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const [product] = await db.insert(products).values(parsed.data).returning();
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
    const id = typeof body.id === "number" ? body.id : null;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const parsed = parseProductBody(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (parsed.data.categoryId != null) {
      const [cat] = await db.select().from(categories).where(eq(categories.id, parsed.data.categoryId));
      if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const [updated] = await db.update(products).set(parsed.data).where(eq(products.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
    if (typeof id !== "number") return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const [target] = await db.select().from(products).where(eq(products.id, id));
    await db.delete(products).where(eq(products.id, id));

    // Clean up the product image on Cloudinary (best-effort)
    if (target?.imagePublicId) {
      deleteImage(target.imagePublicId).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/products DELETE]", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
