/**
 * /api/admin/categories — CRUD for the category tree.
 *
 * All verbs check the session first (security-review: auth before any DB op).
 * Input is validated field-by-field — the client is the admin UI, but we
 * never trust the payload shape (security-review: server-side validation).
 *
 * Guards beyond plain CRUD:
 *   - slug: normalized, unique (409 on conflict)
 *   - parentId: must exist, and must not create a cycle (400)
 *   - DELETE: children get re-parented to the deleted node's parent, and
 *     products in the category are set to "no category" — nothing orphans.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { wouldCreateCycle, descendantIds } from "@/lib/catalog";
import { deleteImage } from "@/lib/cloudinary";
import { focalPair } from "@/lib/images";

async function requireAdmin() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

/** Positive whole number or null — used for the uploaded photo's pixel size. */
function posInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Normalize a slug: lowercase, spaces→dashes, strip anything not url-safe. */
function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9֐-׿Ѐ-ӿ-]/g, "") // allow hebrew/cyrillic slugs
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Validate + coerce a category payload. Returns {data} or {error}. */
function parseCategoryBody(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Name is required" };

  const slug = normalizeSlug(typeof body.slug === "string" && body.slug ? body.slug : name);
  if (!slug) return { error: "Slug is required" };

  const toDate = (v: unknown): Date | null => {
    if (!v || typeof v !== "string") return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const startsAt = toDate(body.startsAt);
  const endsAt = toDate(body.endsAt);
  if (startsAt && endsAt && endsAt < startsAt) return { error: "End date is before start date" };

  // Sale category: a whole-number percentage, clamped to 0–95. An empty or
  // unparseable field means "no discount" (0) — never null, so the pricing
  // helpers can do arithmetic on it without guarding every call site.
  const isSaleCategory = body.isSaleCategory === true;
  const rawPercent =
    typeof body.discountPercent === "number"
      ? body.discountPercent
      : parseFloat(String(body.discountPercent ?? ""));
  const discountPercent = Number.isFinite(rawPercent)
    ? Math.min(95, Math.max(0, Math.round(rawPercent)))
    : 0;
  if (isSaleCategory && discountPercent <= 0)
    return { error: "A sale category needs a discount above 0%" };

  // Focal point: 0-100 integers, or both null ("no preference" — falls
  // back to auto-detected crop gravity).
  const { focalX, focalY } = focalPair(body.focalX, body.focalY);

  return {
    data: {
      name,
      nameEn: typeof body.nameEn === "string" && body.nameEn.trim() ? body.nameEn.trim() : null,
      nameRu: typeof body.nameRu === "string" && body.nameRu.trim() ? body.nameRu.trim() : null,
      slug,
      parentId: typeof body.parentId === "number" ? body.parentId : null,
      visible: body.visible !== false,
      startsAt,
      endsAt,
      promoted: body.promoted === true,
      isSaleCategory,
      // Stored even when the box is unticked, so unticking and re-ticking
      // doesn't lose the number she typed
      discountPercent,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
      imagePublicId: typeof body.imagePublicId === "string" ? body.imagePublicId : null,
      imageWidth: posInt(body.imageWidth),
      imageHeight: posInt(body.imageHeight),
      focalX,
      focalY,
    },
  };
}

/**
 * Slug uniqueness + parent-exists checks shared by POST and PUT.
 * `excludeId` skips the category being edited when checking slug conflicts.
 */
function validateCategoryRefs(
  data: { slug: string; parentId: number | null },
  all: { id: number; slug: string }[],
  excludeId?: number
): { error: string; status: number } | null {
  if (all.some((c) => c.slug === data.slug && c.id !== excludeId))
    return { error: "Slug already exists", status: 409 };
  if (data.parentId != null && !all.some((c) => c.id === data.parentId))
    return { error: "Parent category not found", status: 400 };
  return null;
}

/**
 * Stamp every product in a branch as "on sale".
 *
 * The owner's mental model is that a sale category marks its products, not
 * that it silently computes over them — so the checkbox on each product row
 * really does get ticked. The *price* is still derived at read time from the
 * category percentage (see lib/pricing), so the stamp is a flag, never a
 * frozen number: change the percentage and every price follows.
 * Best-effort — a failure here must not fail the category save.
 */
async function stampBranchOnSale(categoryId: number) {
  try {
    const all = await db.select().from(categories);
    const ids = descendantIds(categoryId, all);
    if (ids.length === 0) return;
    await db.update(products).set({ onSale: true }).where(inArray(products.categoryId, ids));
  } catch (err) {
    console.error("[admin/categories stamp]", err);
  }
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const all = await db.select().from(categories);
    return NextResponse.json(all);
  } catch (err) {
    console.error("[admin/categories GET]", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const parsed = parseCategoryBody(await req.json());
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const all = await db.select().from(categories);
    const refError = validateCategoryRefs(parsed.data, all);
    if (refError) return NextResponse.json({ error: refError.error }, { status: refError.status });

    const [created] = await db.insert(categories).values(parsed.data).returning();
    if (created.isSaleCategory && created.discountPercent > 0) await stampBranchOnSale(created.id);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[admin/categories POST]", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const id = typeof body.id === "number" ? body.id : null;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const parsed = parseCategoryBody(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const all = await db.select().from(categories);
    if (!all.some((c) => c.id === id))
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const refError = validateCategoryRefs(parsed.data, all, id);
    if (refError) return NextResponse.json({ error: refError.error }, { status: refError.status });
    if (wouldCreateCycle(id, parsed.data.parentId, all))
      return NextResponse.json({ error: "Invalid parent — would create a cycle" }, { status: 400 });

    const [updated] = await db.update(categories).set(parsed.data).where(eq(categories.id, id)).returning();
    if (updated.isSaleCategory && updated.discountPercent > 0) await stampBranchOnSale(updated.id);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/categories PUT]", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await req.json();
    if (typeof id !== "number") return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const [target] = await db.select().from(categories).where(eq(categories.id, id));
    if (!target) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // Re-parent children to the deleted node's parent, detach products
    await db.update(categories).set({ parentId: target.parentId }).where(eq(categories.parentId, id));
    await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));

    // Clean up the tile image on Cloudinary (best-effort)
    if (target.imagePublicId) {
      deleteImage(target.imagePublicId).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/categories DELETE]", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
