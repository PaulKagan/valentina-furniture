/**
 * Database schema — all three tables for the furniture store.
 *
 * categories  — hierarchical product groupings managed in admin.
 *               Supports: unlimited nesting (parentId), per-language names
 *               (Hebrew required, en/ru optional with fallback), manual
 *               visibility toggle, optional schedule window (startsAt/endsAt
 *               for temporary categories like a holiday sale), promotion
 *               (homepage tile + pinned first in nav + sale badge), manual
 *               ordering, and an optional tile image.
 * products    — the store inventory; imagePublicId is kept so we can delete
 *               from Cloudinary if a product is removed. Name/description
 *               have optional en/ru variants that fall back to Hebrew.
 * orders      — customer orders from checkout; no payment data stored here,
 *               the store calls the customer to confirm and arrange payment.
 *
 * Run `npm run db:push` after changing this file to apply to the DB.
 */
import {
  pgTable,
  serial,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "cancelled", "delivered"]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  // Localized names — `name` is Hebrew and required; en/ru fall back to it
  name: text("name").notNull(),
  nameEn: text("name_en"),
  nameRu: text("name_ru"),
  slug: text("slug").notNull().unique(),
  // Tree: null = top-level. Self-reference needs the AnyPgColumn cast (drizzle docs)
  parentId: integer("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
  // Manual show/hide — hidden categories (and their subtree) vanish from the store
  visible: boolean("visible").default(true).notNull(),
  // Optional schedule window for temporary categories (e.g. holiday sale).
  // Active when: visible AND (startsAt is null OR now >= startsAt) AND (endsAt is null OR now <= endsAt)
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  // Promotion: homepage tile, pinned first in nav, sale badge on its products
  promoted: boolean("promoted").default(false).notNull(),
  // Manual sort within siblings (lower = first); promoted categories sort before the rest in nav
  sortOrder: integer("sort_order").default(0).notNull(),
  // Optional tile image (Cloudinary) shown on the homepage category tile
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  // Localized name/description — Hebrew required, en/ru optional (fallback to Hebrew)
  name: text("name").notNull(),
  nameEn: text("name_en"),
  nameRu: text("name_ru"),
  description: text("description"),
  descriptionEn: text("description_en"),
  descriptionRu: text("description_ru"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  // Palette keys from lib/colors.ts (e.g. ["gray","beige"]) — drives the store color filter
  colors: text("colors").array().default([]).notNull(),
  inStock: boolean("in_stock").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  items: text("items").notNull(), // JSON string: [{productId, name, price, quantity}]
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
