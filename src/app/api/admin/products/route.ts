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
import { colorByKey } from "@/lib/colors";
import { productDiscount } from "@/lib/pricing";
import { focalPair } from "@/lib/images";

const MAX_GALLERY = 8;
const MAX_ADDITIONAL_CATEGORIES = 20;

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
  /** Positive whole number or null — used for cm dimensions */
  const posInt = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  // The "on sale" checkbox is the switch; the sale price is optional even
  // when it's ticked, because the product may be inheriting its discount
  // from a sale category (see lib/pricing).
  const onSale = body.onSale === true;

  // Sale price: optional, must be a positive number below the list price.
  // Anything invalid is rejected rather than silently dropped — a wrong
  // discount is a pricing error, not a cosmetic one.
  let salePrice: string | null = null;
  if (onSale && body.salePrice != null && String(body.salePrice).trim() !== "") {
    const saleNum = parseFloat(String(body.salePrice));
    if (!Number.isFinite(saleNum) || saleNum <= 0) return { error: "Invalid sale price" };
    if (saleNum >= priceNum) return { error: "Sale price must be below the regular price" };
    salePrice = saleNum.toFixed(2);
  }

  // Focal point: 0-100 integers, or both null ("no preference" — every crop
  // falls back to auto-detection). Partial (one set, one missing) is treated
  // as unset rather than guessing at the other half.
  const { focalX, focalY } = focalPair(body.focalX, body.focalY);

  const categoryId = typeof body.categoryId === "number" ? body.categoryId : null;
  // Additional categories: valid positive ints, deduped, capped, and never
  // including the primary category (that would be a meaningless duplicate).
  const additionalCategoryIds = Array.isArray(body.additionalCategoryIds)
    ? [
        ...new Set(
          body.additionalCategoryIds.filter(
            (v): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v !== categoryId
          )
        ),
      ].slice(0, MAX_ADDITIONAL_CATEGORIES)
    : [];

  // Gallery: parallel arrays, same length, capped — a stray huge array from
  // a malformed request can't bloat the row or the Cloudinary cleanup loop
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_GALLERY) : [];
  let galleryUrls = strArray(body.galleryUrls);
  let galleryPublicIds = strArray(body.galleryPublicIds);
  // Keep them paired — an unequal pair means the client sent something
  // inconsistent, so trim both to the shorter length rather than guess.
  const galleryLen = Math.min(galleryUrls.length, galleryPublicIds.length);
  galleryUrls = galleryUrls.slice(0, galleryLen);
  galleryPublicIds = galleryPublicIds.slice(0, galleryLen);

  return {
    data: {
      name,
      nameEn: optText(body.nameEn),
      nameRu: optText(body.nameRu),
      description: optText(body.description),
      descriptionEn: optText(body.descriptionEn),
      descriptionRu: optText(body.descriptionRu),
      price: priceNum.toFixed(2),
      onSale,
      salePrice,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      imagePublicId: typeof body.imagePublicId === "string" ? body.imagePublicId : null,
      imageWidth: posInt(body.imageWidth),
      imageHeight: posInt(body.imageHeight),
      focalX,
      focalY,
      galleryUrls,
      galleryPublicIds,
      categoryId,
      additionalCategoryIds,
      // Only palette keys survive — unknown colors are dropped, not stored
      colors: Array.isArray(body.colors)
        ? body.colors.filter((c): c is string => typeof c === "string" && !!colorByKey(c))
        : [],
      widthCm: posInt(body.widthCm),
      depthCm: posInt(body.depthCm),
      heightCm: posInt(body.heightCm),
      inStock: body.inStock !== false,
      featured: body.featured === true,
    },
  };
}

/**
 * Validate every category the product is assigned to (primary + additional)
 * and decide whether it lands inside a sale branch. A product in ANY sale
 * category — primary or additional, doesn't matter which — gets its "on
 * sale" box ticked automatically; the owner's model is that a sale category
 * stamps every product it touches. It only ever ticks: unticking stays her
 * decision.
 * Returns the category-not-found error, or the resolved onSale flag.
 */
async function resolveCategorySale(
  categoryId: number | null,
  additionalCategoryIds: number[],
  onSale: boolean
): Promise<{ error: string } | { onSale: boolean }> {
  const allIds = [categoryId, ...additionalCategoryIds].filter((id): id is number => id != null);
  if (allIds.length === 0) return { onSale };
  const all = await db.select().from(categories);
  const knownIds = new Set(all.map((c) => c.id));
  if (!allIds.every((id) => knownIds.has(id))) return { error: "Category not found" };
  return { onSale: onSale || productDiscount(allIds, all) > 0 };
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

    const sale = await resolveCategorySale(parsed.data.categoryId, parsed.data.additionalCategoryIds, parsed.data.onSale);
    if ("error" in sale) return NextResponse.json({ error: sale.error }, { status: 400 });

    const [product] = await db.insert(products).values({ ...parsed.data, onSale: sale.onSale }).returning();
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

    const sale = await resolveCategorySale(parsed.data.categoryId, parsed.data.additionalCategoryIds, parsed.data.onSale);
    if ("error" in sale) return NextResponse.json({ error: sale.error }, { status: 400 });

    const [before] = await db.select().from(products).where(eq(products.id, id));

    const [updated] = await db
      .update(products)
      .set({ ...parsed.data, onSale: sale.onSale })
      .where(eq(products.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // Best-effort: delete any Cloudinary assets that dropped out of this
    // save (primary photo replaced, gallery photos removed) so storage
    // doesn't quietly accumulate orphaned uploads.
    if (before) {
      const keptIds = new Set([updated.imagePublicId, ...updated.galleryPublicIds].filter(Boolean));
      const droppedIds = [before.imagePublicId, ...before.galleryPublicIds].filter(
        (id): id is string => !!id && !keptIds.has(id)
      );
      for (const publicId of droppedIds) deleteImage(publicId).catch(() => {});
    }

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

    // Clean up every Cloudinary asset — primary photo and gallery — (best-effort)
    if (target) {
      for (const publicId of [target.imagePublicId, ...target.galleryPublicIds]) {
        if (publicId) deleteImage(publicId).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/products DELETE]", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
