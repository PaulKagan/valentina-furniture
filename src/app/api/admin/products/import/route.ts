/**
 * POST /api/admin/products/import — bulk product import from Excel.
 *
 * multipart/form-data:
 *   excel  — the .xlsx file (required)
 *   mode   — "preview" (parse + validate only) or "commit" (write everything)
 *   images — zero or more image files; matched to rows by filename
 *
 * Preview returns per-row status so the admin sees exactly what will
 * happen before anything is written. Commit re-parses the same files
 * (stateless — nothing cached between the two calls) and then:
 *   - creates missing categories from the path (e.g. "סלון / ספות")
 *   - uploads matched images to Cloudinary
 *   - upserts products by Hebrew name (update if exists, insert if new)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseImport } from "@/lib/excel";
import { uploadImage } from "@/lib/cloudinary";

const MAX_EXCEL_BYTES = 5 * 1024 * 1024; // 5 MB — thousands of rows fit easily
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 2000;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Normalize a filename for matching: lowercase, no path. */
function normName(n: string): string {
  return n.trim().toLowerCase().split(/[\\/]/).pop() ?? "";
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9֐-׿Ѐ-ӿ-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "cat"
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const mode = form.get("mode") === "commit" ? "commit" : "preview";
    const excel = form.get("excel");
    if (!(excel instanceof File)) {
      return NextResponse.json({ error: "Missing Excel file" }, { status: 400 });
    }
    if (excel.size > MAX_EXCEL_BYTES) {
      return NextResponse.json({ error: "Excel file too large" }, { status: 413 });
    }

    // Collect uploaded image files by normalized name
    const imageFiles = new Map<string, File>();
    for (const entry of form.getAll("images")) {
      if (entry instanceof File && entry.name) {
        if (!ALLOWED_IMAGE_TYPES.includes(entry.type) || entry.size > MAX_IMAGE_BYTES) continue;
        imageFiles.set(normName(entry.name), entry);
      }
    }

    const rows = parseImport(Buffer.from(await excel.arrayBuffer()));
    if (rows.length === 0) {
      return NextResponse.json({ error: "empty" }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json({ error: "Too many rows" }, { status: 400 });
    }

    // Cross-file validation: image referenced but not provided; duplicate names in file
    const seenNames = new Set<string>();
    const existing = await db.select().from(products);
    const existingByName = new Map(existing.map((p) => [p.name, p]));

    for (const row of rows) {
      if (row.imageFile && !imageFiles.has(normName(row.imageFile))) {
        row.warnings.push(`imageNotProvided:${row.imageFile}`);
      }
      if (row.name) {
        if (seenNames.has(row.name)) row.errors.push("duplicateInFile");
        seenNames.add(row.name);
        if (existingByName.has(row.name)) row.warnings.push("willUpdate");
      }
    }

    if (mode === "preview") {
      return NextResponse.json({
        rows: rows.map(({ ...r }) => r),
        summary: {
          total: rows.length,
          valid: rows.filter((r) => r.errors.length === 0).length,
          invalid: rows.filter((r) => r.errors.length > 0).length,
          updates: rows.filter((r) => r.warnings.includes("willUpdate")).length,
          imagesProvided: imageFiles.size,
        },
      });
    }

    /* ── commit ── */
    const validRows = rows.filter((r) => r.errors.length === 0);

    // 1. Resolve/create categories from paths (cache per path prefix)
    const allCats = await db.select().from(categories);
    const catCache = new Map<string, number>(); // "סלון / ספות" -> id
    for (const c of allCats) {
      // seed cache with existing full paths
      const parts: string[] = [];
      let cur: typeof c | undefined = c;
      const byId = new Map(allCats.map((x) => [x.id, x]));
      for (let i = 0; cur && i < allCats.length; i++) {
        parts.unshift(cur.name);
        cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
      }
      catCache.set(parts.join(" / "), c.id);
    }
    const usedSlugs = new Set(allCats.map((c) => c.slug));

    async function resolveCategory(path: string[]): Promise<number | null> {
      if (path.length === 0) return null;
      let parentId: number | null = null;
      for (let depth = 0; depth < path.length; depth++) {
        const key = path.slice(0, depth + 1).join(" / ");
        const cached = catCache.get(key);
        if (cached != null) {
          parentId = cached;
          continue;
        }
        // Create the missing level
        let slug = slugify(path[depth]);
        while (usedSlugs.has(slug)) slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
        usedSlugs.add(slug);
        const inserted: { id: number }[] = await db
          .insert(categories)
          .values({ name: path[depth], slug, parentId })
          .returning({ id: categories.id });
        catCache.set(key, inserted[0].id);
        parentId = inserted[0].id;
      }
      return parentId;
    }

    // 2. Upload images (once per unique filename), then upsert products
    const uploadedByFile = new Map<string, { url: string; publicId: string }>();
    const results: { rowNumber: number; action: string; error?: string }[] = [];

    for (const row of validRows) {
      try {
        const categoryId = await resolveCategory(row.categoryPath);

        let imageUrl: string | null = null;
        let imagePublicId: string | null = null;
        const fileKey = row.imageFile ? normName(row.imageFile) : null;
        if (fileKey && imageFiles.has(fileKey)) {
          let uploaded = uploadedByFile.get(fileKey);
          if (!uploaded) {
            const file = imageFiles.get(fileKey)!;
            uploaded = await uploadImage(Buffer.from(await file.arrayBuffer()));
            uploadedByFile.set(fileKey, uploaded);
          }
          imageUrl = uploaded.url;
          imagePublicId = uploaded.publicId;
        }

        const data = {
          name: row.name,
          nameEn: row.nameEn,
          nameRu: row.nameRu,
          description: row.description,
          descriptionEn: row.descriptionEn,
          descriptionRu: row.descriptionRu,
          price: row.price,
          salePrice: row.salePrice,
          colors: row.colors,
          widthCm: row.widthCm,
          depthCm: row.depthCm,
          heightCm: row.heightCm,
          categoryId,
          inStock: row.inStock,
          featured: row.featured,
        };

        const prior = existingByName.get(row.name);
        if (prior) {
          // Update — keep the existing image if the row didn't bring a new one
          await db
            .update(products)
            .set(imageUrl ? { ...data, imageUrl, imagePublicId } : data)
            .where(eq(products.id, prior.id));
          results.push({ rowNumber: row.rowNumber, action: "updated" });
        } else {
          await db.insert(products).values({ ...data, imageUrl, imagePublicId });
          results.push({ rowNumber: row.rowNumber, action: "created" });
        }
      } catch (err) {
        console.error(`[products/import] row ${row.rowNumber}:`, err);
        results.push({ rowNumber: row.rowNumber, action: "failed", error: "rowFailed" });
      }
    }

    return NextResponse.json({
      results,
      summary: {
        created: results.filter((r) => r.action === "created").length,
        updated: results.filter((r) => r.action === "updated").length,
        failed: results.filter((r) => r.action === "failed").length,
        skipped: rows.length - validRows.length,
      },
    });
  } catch (err) {
    console.error("[products/import]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
