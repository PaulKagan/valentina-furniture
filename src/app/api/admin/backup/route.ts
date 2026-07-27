/**
 * /api/admin/backup — full-database export/restore as a single JSON file.
 *
 * Why this exists: Neon keeps its own point-in-time recovery, but that
 * protects against Neon disappearing, not against a bad Excel import or a
 * fat-fingered delete going unnoticed until the retention window has
 * rolled past it. This gives the store owner (or Paul) a file they can
 * grab themselves at any moment and hold onto indefinitely, independent
 * of any hosting provider's retention policy.
 *
 * GET  → download { version, exportedAt, categories, products, orders }
 * POST → wipe the database and reload it from an uploaded backup file.
 *        Destructive by design — the confirm:true flag exists so this can
 *        never fire from a stray request; the real "are you sure" lives in
 *        the admin UI.
 *
 * Restore runs as one transaction: if anything fails partway through, the
 * whole thing rolls back rather than leaving a half-restored catalog.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories, products, orders } from "@/db/schema";
import { sql } from "drizzle-orm";

const BACKUP_VERSION = 1;
const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB — a text-only catalog is tiny; generous headroom

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [allCategories, allProducts, allOrders] = await Promise.all([
      db.select().from(categories),
      db.select().from(products),
      db.select().from(orders),
    ]);

    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      categories: allCategories,
      products: allProducts,
      orders: allOrders,
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="valentina-backup-${date}.json"`,
      },
    });
  } catch (err) {
    console.error("[admin/backup GET]", err);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}

/** Timestamp fields arrive as ISO strings from JSON — convert back to Date for insert. */
function toDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Backup file too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(body) || body.confirm !== true) {
    return NextResponse.json({ error: "Missing confirmation" }, { status: 400 });
  }
  if (
    !Array.isArray(body.categories) ||
    !Array.isArray(body.products) ||
    !Array.isArray(body.orders)
  ) {
    return NextResponse.json({ error: "File is not a valid backup" }, { status: 400 });
  }

  const backupCategories = body.categories as Record<string, unknown>[];
  const backupProducts = body.products as Record<string, unknown>[];
  const backupOrders = body.orders as Record<string, unknown>[];

  try {
    await db.transaction(async (tx) => {
      // Single statement handles the categories self-reference and the
      // products/orders foreign keys regardless of table order.
      await tx.execute(sql`TRUNCATE TABLE categories, products, orders RESTART IDENTITY CASCADE`);

      if (backupCategories.length > 0) {
        // Insert every category with parentId cleared first — the tree may
        // not be in parent-before-child order in the file, and clearing the
        // self-reference sidesteps needing a topological sort entirely.
        await tx.insert(categories).values(
          backupCategories.map((c) => ({
            id: c.id as number,
            name: c.name as string,
            nameEn: (c.nameEn as string) ?? null,
            nameRu: (c.nameRu as string) ?? null,
            slug: c.slug as string,
            parentId: null,
            visible: c.visible !== false,
            startsAt: toDate(c.startsAt),
            endsAt: toDate(c.endsAt),
            promoted: c.promoted === true,
            isSaleCategory: c.isSaleCategory === true,
            discountPercent: typeof c.discountPercent === "number" ? c.discountPercent : 0,
            sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : 0,
            imageUrl: (c.imageUrl as string) ?? null,
            imagePublicId: (c.imagePublicId as string) ?? null,
          }))
        );

        // Second pass: restore the real parent links now that every row exists.
        for (const c of backupCategories) {
          if (c.parentId != null) {
            await tx
              .update(categories)
              .set({ parentId: c.parentId as number })
              .where(sql`${categories.id} = ${c.id as number}`);
          }
        }
      }

      if (backupProducts.length > 0) {
        await tx.insert(products).values(
          backupProducts.map((p) => ({
            id: p.id as number,
            name: p.name as string,
            nameEn: (p.nameEn as string) ?? null,
            nameRu: (p.nameRu as string) ?? null,
            description: (p.description as string) ?? null,
            descriptionEn: (p.descriptionEn as string) ?? null,
            descriptionRu: (p.descriptionRu as string) ?? null,
            price: String(p.price),
            onSale: p.onSale === true,
            salePrice: p.salePrice != null ? String(p.salePrice) : null,
            imageUrl: (p.imageUrl as string) ?? null,
            imagePublicId: (p.imagePublicId as string) ?? null,
            categoryId: (p.categoryId as number) ?? null,
            colors: Array.isArray(p.colors) ? (p.colors as string[]) : [],
            widthCm: (p.widthCm as number) ?? null,
            depthCm: (p.depthCm as number) ?? null,
            heightCm: (p.heightCm as number) ?? null,
            inStock: p.inStock !== false,
            featured: p.featured === true,
          }))
        );
      }

      if (backupOrders.length > 0) {
        await tx.insert(orders).values(
          backupOrders.map((o) => ({
            id: o.id as number,
            customerName: o.customerName as string,
            customerPhone: o.customerPhone as string,
            customerEmail: (o.customerEmail as string) ?? null,
            customerAddress: o.customerAddress as string,
            items: typeof o.items === "string" ? o.items : JSON.stringify(o.items ?? []),
            total: String(o.total),
            status: (o.status as "pending" | "confirmed" | "cancelled" | "delivered") ?? "pending",
            notes: (o.notes as string) ?? null,
            adminNote: (o.adminNote as string) ?? null,
          }))
        );
      }

      // Explicit ids were used above — bring the sequences back in sync so
      // the next INSERT without an id doesn't collide with a restored row.
      for (const table of ["categories", "products", "orders"] as const) {
        await tx.execute(
          sql.raw(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`
          )
        );
      }
    });

    return NextResponse.json({
      ok: true,
      restored: {
        categories: backupCategories.length,
        products: backupProducts.length,
        orders: backupOrders.length,
      },
    });
  } catch (err) {
    console.error("[admin/backup POST]", err);
    return NextResponse.json({ error: "Restore failed — nothing was changed" }, { status: 500 });
  }
}
