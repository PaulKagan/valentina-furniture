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
  // Promotion: homepage tile + pinned first in nav. Purely placement —
  // it does NOT discount anything (that's isSaleCategory below).
  promoted: boolean("promoted").default(false).notNull(),
  // Sale category: products assigned to it are marked on sale automatically
  // and inherit discountPercent unless they carry their own sale price.
  isSaleCategory: boolean("is_sale_category").default(false).notNull(),
  discountPercent: integer("discount_percent").default(0).notNull(),
  // Manual sort within siblings (lower = first); promoted categories sort before the rest in nav
  sortOrder: integer("sort_order").default(0).notNull(),
  // Optional tile image (Cloudinary) shown on the homepage category tile
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  // The uploaded photo's own pixel size — Cloudinary's g_xy_center gravity
  // needs the focal point converted to absolute pixels, not a fraction, so
  // this is what that conversion is done against. Null for rows saved
  // before this existed; those just fall back to g_auto until re-uploaded.
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  // Where the important part of the tile image is (0-100, percent from the
  // top-left) — she clicks the photo once in admin to set it. Null means
  // "no preference", and every crop falls back to Cloudinary's automatic
  // subject detection (g_auto) instead.
  focalX: integer("focal_x"),
  focalY: integer("focal_y"),
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
  // Sale flag — the single thing that decides whether a product shows the
  // 🔥 badge and a struck-through price. Ticked by hand in admin, or set
  // automatically when the product is put in a sale category.
  onSale: boolean("on_sale").default(false).notNull(),
  // Discounted price. Only honoured while onSale is true. When absent, the
  // product falls back to its category's discountPercent.
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  // Same idea as categories.imageWidth/Height — needed to convert the focal
  // point below into the absolute pixels Cloudinary's gravity actually wants.
  imageWidth: integer("image_width"),
  imageHeight: integer("image_height"),
  // Same idea as categories.focalX/Y — click-to-set focal point for the
  // primary photo, used by every fixed-ratio crop (card, tile, thumb).
  focalX: integer("focal_x"),
  focalY: integer("focal_y"),
  // Extra gallery photos beyond the primary. Same index in both arrays =
  // same photo. The gallery's main viewer never crops (shows the whole
  // photo), so these don't carry their own focal point — only the small
  // thumbnail strip crops, and it just uses g_auto.
  galleryUrls: text("gallery_urls").array().default([]).notNull(),
  galleryPublicIds: text("gallery_public_ids").array().default([]).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  // Palette keys from lib/colors.ts (e.g. ["gray","beige"]) — drives the store color filter
  colors: text("colors").array().default([]).notNull(),
  // Dimensions in cm — furniture shoppers filter by "does it fit my wall"
  widthCm: integer("width_cm"),
  depthCm: integer("depth_cm"),
  heightCm: integer("height_cm"),
  inStock: boolean("in_stock").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  // Optional — when given, the customer gets an order confirmation email
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address").notNull(),
  // Nullable in the DB (existing orders predate this field) but required by
  // checkout/API validation for every new order — floor/access conditions
  // directly affect delivery cost and feasibility (see /delivery).
  customerFloor: text("customer_floor"),
  // JSON string: [{productId, name, price, quantity}]. Ceiling: fine while
  // "what did this order contain" is the only question asked of it. If a
  // "top-selling product" or per-item report is ever needed, this needs to
  // become a real order_items table — a JSON blob can't be queried/joined.
  items: text("items").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  notes: text("notes"), // customer's note from checkout
  adminNote: text("admin_note"), // internal, never shown to the customer
  // Audit trail for the required delivery/order terms checkbox — proof of
  // when acceptance happened, not just that it did. Nullable: existing
  // orders predate this field.
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // Payment reference ONLY — brand + last 4 digits, never the full card
  // number or CVV (neither is ever collected, let alone stored). This is
  // exactly what appears on a receipt/statement, not regulated cardholder
  // data, and is enough for the store to reference the right card on a
  // refund without holding anything sensitive.
  cardType: text("card_type"),
  cardLast4: text("card_last4"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
