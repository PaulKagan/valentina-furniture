# Architecture guide

A map of how this app fits together — for whoever opens this codebase next
(including future-you, six months from now, having forgotten all of this).
For "how do I run it locally / put it online," see **SETUP.md** instead.
For what's actually done vs. still open, see **todo.md**.

---

## Stack, in one line each

- **Next.js 16 (App Router)** — pages + API routes in one project, deployed to Vercel.
- **PostgreSQL via Neon**, accessed with **Drizzle ORM** — schema lives in `src/db/schema.ts`, applied with `npm run db:push` (no migration files; see that file's own comment for why).
- **next-intl** — Hebrew (default, RTL), English, Russian. Admin is Hebrew + Russian only (no English admin — see `src/middleware.ts`).
- **NextAuth v5** — single hardcoded admin account via env vars, JWT sessions, no user table (`src/lib/auth.ts` explains why).
- **Cloudinary** — all product/category photos: upload, storage, and on-the-fly resizing/cropping via URL transforms.
- **Tailwind CSS v4** — CSS custom properties as design tokens (`var(--primary)`, `var(--ink)`, etc. — see `globals.css`), logical properties (`ms-auto`, `start`/`end`) so layout auto-flips for RTL.
- **Nodemailer over Gmail SMTP** — order notification emails, optional (site works without it).

---

## Folder map

```
src/
  app/
    [locale]/
      (store)/        ← customer-facing pages: home, /products, /categories,
                          /cart, /checkout, /order-confirmed, product detail
      admin/           ← admin panel: dashboard, categories, products, orders,
                          sales overview, backup, login
    api/
      admin/           ← admin CRUD endpoints (all require an admin session)
      orders/          ← POST — customer places an order (checkout)
      auth/[...nextauth] ← NextAuth's own handler
      upload/          ← Cloudinary upload proxy (admin only)
      health/          ← used by uptime monitoring + local dev checks
      # Note: there's no public GET /api/categories or /api/products — the
      # storefront reads the DB directly in server components via
      # lib/catalog.ts (getActiveCategories) rather than round-tripping
      # through an API route it doesn't need.
  components/
    admin/             ← admin-only UI (ProductForm, CategoryManager, OrderDetail…)
    cart/              ← CartContext (localStorage-backed client cart)
    layout/            ← Header, Footer, LocaleSwitcher
    ui/                ← storefront-facing shared components (ProductCard,
                          SaleCountdown, ProductGallery, FocalPointPicker…)
  db/
    schema.ts          ← the three tables: categories, products, orders
    seed.ts            ← demo data generator (`npm run db:seed -- --force`)
  lib/                 ← business logic, one file per concern (see below)
  i18n/                ← next-intl config + locale-aware Link/useRouter
  middleware.ts        ← locale routing + admin auth guard (runs on every request)
messages/
  he.json, en.json, ru.json  ← all UI strings, one namespace per file section
```

### `src/lib/` — what each file owns

| File | Owns |
|---|---|
| `pricing.ts` | What a product costs — sale price vs. inherited category discount, rounding to shop-friendly numbers. **Client-safe** (no DB import) — every price display and every server-side charge goes through this, so a price can never be shown one way and charged another. |
| `catalog.ts` | Category tree logic — active/hidden/scheduled filtering, tree building, cycle detection, breadcrumbs, the discount-lookup cache. |
| `orders.ts` | Validating and re-pricing a customer's cart against the DB. The client only ever sends `{productId, quantity}` — every price in a saved order is looked up server-side here, so a tampered request can't set its own prices. Shared by checkout and the admin order editor, so they can never compute a total differently. |
| `images.ts` | Builds Cloudinary transform URLs (crop preset + focal point) — the one place that decides how a photo gets resized for a card vs. a tile vs. the gallery viewer. Also owns focal-point request parsing (`focalRaw`/`focalPair`). |
| `colors.ts` | The fixed color palette (closed list, not free text — see file comment for why). |
| `excel.ts` | The bulk import/export spreadsheet format — template, parser, and writer all read from one shared column definition so they can't drift apart. |
| `email.ts` | Order notification emails via Gmail SMTP. |
| `auth.ts` | NextAuth config — single admin account, bcrypt-or-plaintext password detection. |
| `cloudinary.ts` | Cloudinary SDK config (env vars → client). |
| `i18n-fields.ts` | Localized-name/description fallback logic — client-safe, split out of `catalog.ts` so client components can use it without pulling in the Postgres driver. |
| `jsonld.ts` | Structured data for Google (product rich results, business info). |
| `order-items.ts` | Safe parsing of the `orders.items` JSON column — degrades to an empty list instead of crashing on a corrupted row. |
| `pagination.ts` | Shared page-size constant (kept out of client components — see file comment for a subtle NaN bug this avoids). |
| `rate-limit.ts` | In-memory per-IP rate limiting for login attempts and order submission (ceiling: per-process, resets on deploy — fine for one store's real traffic). |
| `similar.ts` | "Similar items" scoring on the product page — simple weighted rules, not ML. |

---

## The data model, conceptually

**Categories** form a tree (`parentId`, unlimited depth). A category can be:
- **hidden** (`visible: false`) — vanishes from the whole store, subtree included
- **scheduled** (`startsAt`/`endsAt`) — active only inside that window (for a holiday sale that should end itself)
- **promoted** — gets a homepage tile + pinned first in nav (placement only, not a discount)
- **a sale category** (`isSaleCategory` + `discountPercent`) — every product inside it (including sub-categories) is treated as on-sale and inherits that percentage, *unless* the product has its own `salePrice`. The percentage is never copied onto the product row — it's resolved live from the category at read time (`lib/pricing.ts`), so editing the percentage instantly updates every product's price, and an expired scheduled sale category stops discounting on its own with zero cleanup.

**Products** belong to at most one category. Pricing precedence (see `pricing.ts` header comment): a product's own `salePrice` wins if set; otherwise the nearest sale-category ancestor's percentage applies; otherwise full price.

**Images**: every product/category has one primary photo (`imageUrl`/`imagePublicId`) plus an optional **focal point** (`focalX`/`focalY`, 0–100) — a point she clicks once in admin (`FocalPointPicker.tsx`) that tells Cloudinary which part of the photo to keep when cropping to a fixed aspect ratio. Null means "no preference," falling back to Cloudinary's automatic subject detection. Products additionally have a **gallery** (`galleryUrls`/`galleryPublicIds`, parallel arrays, same index = same photo) — shown as a static thumbnail strip on the product page (`ProductGallery.tsx`), deliberately no animation, unlike the homepage's promoted-category carousel which does animate.

**Orders**: `items` is a JSON string (not a real table) — a deliberate ceiling documented in `schema.ts`: fine while "what did this order contain" is the only question ever asked of it; would need to become a real `order_items` table if a per-item sales report is ever wanted.

---

## Request flow — customer places an order

1. Cart lives in `localStorage` via `CartContext` (client-only, no server state).
2. Checkout POSTs `{name, phone, address, items: [{productId, quantity}]}` to `/api/orders`.
3. `lib/orders.ts` validates the shape (`parseOrderItemsInput`) and re-prices every line from the DB (`repriceOrderItems`) — the client's own price, if it sent one, is ignored entirely.
4. Order is saved, then `lib/email.ts` fires the store notification (and a customer confirmation, if an email was given) — best-effort, a mail failure never turns a saved order into an error for the customer.

The admin order editor (`/admin/orders/[id]`) re-uses the exact same `lib/orders.ts` functions when quantities are edited, so the two surfaces can never disagree on a price.

---

## i18n notes

- Hebrew is the default locale and has no URL prefix (`/products`); English and Russian are prefixed (`/en/products`, `/ru/products`).
- RTL is Hebrew-only — layout uses logical CSS properties (`ms-`, `me-`, `start`/`end`, `insetInlineEnd`) instead of `left`/`right` so it flips automatically; a few spots use Tailwind's `rtl:` variant directly (e.g. mirroring arrow icons — see `BackLink.tsx`, `ProductForm.tsx`'s reorder buttons).
- All admin strings live under Hebrew + Russian only in `messages/*.json` — there's no English admin UI by design (see `middleware.ts`).
- Name/description fields fall back language-by-language: if only Russian was filled in, Russian shows to every visitor regardless of their chosen locale (`lib/i18n-fields.ts`).

---

## Things that look like bugs but aren't

- **`orders.items` is a JSON string column, not a joined table.** Intentional — see schema.ts comment.
- **No English admin panel.** Intentional — `/en/admin/*` redirects to `/admin/*`.
- **Rate limiting resets on every deploy / cold start.** Intentional — it's in-memory, sized for stopping a lazy script against one small store, not a distributed attacker.
- **A sale category's discount is never written onto the product row** — always resolved live. If a product's price looks wrong, check its category's `discountPercent` and schedule window before assuming the product row is broken.

---

## Where to look first for common changes

| Want to change... | Start here |
|---|---|
| How a price is calculated / displayed | `lib/pricing.ts` |
| What happens on checkout | `src/app/api/orders/route.ts` + `lib/orders.ts` |
| The Excel column format | `lib/excel.ts` |
| How photos get cropped | `lib/images.ts` |
| Site text in any language | `messages/he.json` / `en.json` / `ru.json` |
| Admin login / who can access `/admin` | `lib/auth.ts` + `src/middleware.ts` |
| The category tree / nav dropdown | `lib/catalog.ts` + `components/layout/Header.tsx` |
| Homepage layout | `src/app/[locale]/(store)/page.tsx` |
