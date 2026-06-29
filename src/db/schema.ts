/**
 * Database schema — all three tables for the furniture store.
 *
 * categories  — product groupings (ספות, שולחנות, etc.) managed in admin
 * products    — the store inventory; imagePublicId is kept so we can delete
 *               from Cloudinary if a product is removed
 * orders      — customer orders from checkout; no payment data stored here,
 *               the store calls the customer to confirm and arrange payment
 *
 * Run `npm run db:push` after changing this file to apply to the DB.
 */
import { pgTable, serial, text, integer, decimal, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "cancelled", "delivered"]);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  categoryId: integer("category_id").references(() => categories.id),
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
