/**
 * Catalog helpers — category tree logic and localized name resolution.
 *
 * Everything storefront-facing goes through getActiveCategories() so
 * hidden / expired temporary categories never leak into nav, filters,
 * or the homepage. Admin uses the raw table.
 */
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

// Localization helpers live in i18n-fields.ts (client-safe, no DB import);
// re-exported here so server code can import everything from one place.
export { localizedName, localizedDescription } from "./i18n-fields";

export type Category = InferSelectModel<typeof categories>;
export type Product = InferSelectModel<typeof products>;

export type CategoryNode = Category & { children: CategoryNode[] };

/* ── Active-category filtering (storefront) ─────────────────────── */

/** A category is active when visible and inside its schedule window (if any). */
export function isCategoryActive(cat: Category, now = new Date()): boolean {
  if (!cat.visible) return false;
  if (cat.startsAt && now < cat.startsAt) return false;
  if (cat.endsAt && now > cat.endsAt) return false;
  return true;
}

/**
 * All categories that the store should show right now.
 * A child of an inactive parent is also dropped (whole subtree hides).
 */
export async function getActiveCategories(): Promise<Category[]> {
  let all: Category[];
  try {
    all = await db.select().from(categories);
  } catch {
    return []; // graceful degradation — store renders without DB
  }
  const now = new Date();
  const active = new Map(all.filter((c) => isCategoryActive(c, now)).map((c) => [c.id, c]));

  // Drop orphans of inactive ancestors — walk up until root or a missing parent
  const result: Category[] = [];
  for (const cat of active.values()) {
    let cur: Category | undefined = cat;
    let ok = true;
    while (cur?.parentId != null) {
      cur = active.get(cur.parentId);
      if (!cur) {
        ok = false;
        break;
      }
    }
    if (ok) result.push(cat);
  }
  return result;
}

/* ── Tree building & traversal ──────────────────────────────────── */

/**
 * Build a nested tree from a flat list. Siblings sort by:
 * promoted first, then sortOrder, then name — so promotion pins
 * a category to the front of nav/menus automatically.
 */
export function buildTree(flat: Category[]): CategoryNode[] {
  const nodes = new Map<number, CategoryNode>(flat.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId != null ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortSiblings = (list: CategoryNode[]) => {
    list.sort(
      (a, b) =>
        Number(b.promoted) - Number(a.promoted) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name, "he")
    );
    list.forEach((n) => sortSiblings(n.children));
  };
  sortSiblings(roots);
  return roots;
}

/** IDs of a category and every descendant — used to filter products by a branch. */
export function descendantIds(rootId: number, flat: Category[]): number[] {
  const childrenOf = new Map<number, number[]>();
  for (const c of flat) {
    if (c.parentId != null) {
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c.id);
      childrenOf.set(c.parentId, list);
    }
  }
  const ids: number[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    ids.push(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return ids;
}

/** Breadcrumb trail from root to the given category (inclusive). */
export function categoryPath(cat: Category, flat: Category[]): Category[] {
  const byId = new Map(flat.map((c) => [c.id, c]));
  const path: Category[] = [cat];
  let cur = cat;
  // Guard against accidental cycles — never loop more than the list length
  for (let i = 0; cur.parentId != null && i < flat.length; i++) {
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    path.unshift(parent);
    cur = parent;
  }
  return path;
}

/**
 * Would setting `parentId` on category `id` create a cycle?
 * Used by the admin API to reject invalid parent choices.
 */
export function wouldCreateCycle(id: number, parentId: number | null, flat: Category[]): boolean {
  if (parentId == null) return false;
  if (parentId === id) return true;
  const byId = new Map(flat.map((c) => [c.id, c]));
  let cur = byId.get(parentId);
  for (let i = 0; cur && i < flat.length; i++) {
    if (cur.id === id) return true;
    cur = cur.parentId != null ? byId.get(cur.parentId) : undefined;
  }
  return false;
}

