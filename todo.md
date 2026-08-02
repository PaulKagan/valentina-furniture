# TODO — valentina-furniture

## 🔴 Infrastructure — do this before Valentina starts adding products

- **Add `DATABASE_URL` as a GitHub Actions secret** so the nightly automated
  backup (`.github/workflows/nightly-backup.yml`) can actually run.
  1. github.com/PaulKagan/valentina-furniture → **Settings → Secrets and
     variables → Actions → New repository secret**
  2. Name: `DATABASE_URL` — value: the same connection string that's in
     Vercel's environment variables
  3. Go to the **Actions** tab → "Nightly database backup" → **Run workflow**
     (manual trigger) to confirm it goes green before relying on the
     schedule
  - Until this is done, the workflow will fail loudly every night (visible
    as a red X in the Actions tab, and GitHub emails the repo owner on
    failed scheduled runs by default) rather than silently doing nothing.

## 🔴 Email isn't actually sending yet

- **Code is complete and already wired up** (`lib/email.ts`, called from
  `/api/orders` on every new order, plus a working "resend" button in
  admin) — this is a config gap, not a missing feature. Nothing sends
  until `GMAIL_USER` + `GMAIL_APP_PASSWORD` are real:
  1. On Valentina's Google account: turn on 2-Step Verification, then
     Google Account → Security → App passwords → create one
  2. Set `GMAIL_USER` (her Gmail address) and `GMAIL_APP_PASSWORD` (the
     generated app password, not her real password) in Vercel's env vars
  3. Optionally set `ORDER_NOTIFY_EMAIL` if store notifications should go
     somewhere other than `GMAIL_USER`
  4. Place a real test order (with a customer email filled in) and
     confirm both the store notification and the customer confirmation
     actually arrive
  - Until this is set, orders still save fine — emails just silently log
    a skip warning server-side, invisible to the customer.

## 🔴 GitHub Actions secret still pending

- **Add `DATABASE_URL` as a GitHub Actions secret** so the nightly automated
  backup (`.github/workflows/nightly-backup.yml`) can actually run.
  1. github.com/PaulKagan/valentina-furniture → **Settings → Secrets and
     variables → Actions → New repository secret**
  2. Name: `DATABASE_URL` — value: the same connection string that's in
     Vercel's environment variables
  3. Go to the **Actions** tab → "Nightly database backup" → **Run workflow**
     (manual trigger) to confirm it goes green before relying on the
     schedule
  - Until this is done, the workflow will fail loudly every night (visible
    as a red X in the Actions tab, and GitHub emails the repo owner on
    failed scheduled runs by default) rather than silently doing nothing.

## 🔴 Vercel deployment (confirmed as the interim host)

- Decided: **Vercel now**, while Valentina tests/plays with the site.
  Migration to a regular server/hosting happens later, once testing is
  done — the 🟠 section below applies at *that* point, not now.
- **Set every env var from `.env.example`** in Vercel → Project Settings →
  Environment Variables. Notably `AUTH_SECRET` (NextAuth v5 requires it in
  production — generate with `npx auth secret`) is easy to miss.
- Production build verified clean (`npm run build`) — no blockers found.
- `db:push` already run — the `terms_accepted_at` column exists.

## 🟠 Infrastructure — do when migrating off Vercel to a regular server

- **Uptime monitor on `/api/health`** — a real outage should page someone,
  not wait for a customer complaint. Matters once hosting is a regular
  server (no platform-level auto-restart safety net if the Node process
  dies — Vercel has this built in, which is exactly why this waits).
  1. Sign up free at [uptimerobot.com](https://uptimerobot.com) (needs an
     email — this is a manual step, an agent can't create the account)
  2. **Add New Monitor** → HTTP(s) → URL: `https://<her-real-domain>/api/health`
     → check interval 5 minutes
  3. Add an alert contact (email, or the free SMS/Telegram options) so a
     failure actually notifies someone
- **Process supervision on the server** — `next start` needs something to
  restart it if it crashes or the server reboots. Use `pm2` (`pm2 start
  npm -- start`, `pm2 save`, `pm2 startup`) or a `systemd` service — either
  is fine, just needs to exist before this is the production site.
- Write down where `ADMIN_PASSWORD` actually lives (whichever server's env
  vars / `.env` file end up hosting it) — there's no in-app password
  recovery, so losing it means editing that file by hand.

## 🔵 Final deliverable — once the site itself is done

- **Hebrew user guide PDF for Valentina.** Comprehensive, non-technical —
  no dev/code talk, just "click here to do X" walkthroughs with screenshots
  for everything in `/admin`: adding/editing products (incl. multi-category
  assignment, colors, sale price), managing categories (incl. the new "add
  existing products" picker, sale categories, scheduling), viewing/editing
  orders, running the sales page, bulk Excel import/export, and logging in.
  Wait until the feature set is actually final before writing this — no
  point documenting something that's still going to change.

## 🟡 Nice to have — not urgent

- **[NEEDS DECISION]** Payment reference at checkout (card brand + last 4
  digits only — never the full number or CVV). Built once, then fully
  removed (commit `b9f624e`) pending Valentina actually weighing in on
  it, since it's a security/liability question that's hers to decide,
  not just a feature toggle. Commit `76039c7` has the complete working
  version with clear "re-enable together" comments if she opts in.
- **Decided: no sub-category landing page.** Clicking a subcategory keeps
  jumping straight to the filtered `/products?category=` view, as today.
- **Done: multi-category products.** A product can now belong to more than
  one category (e.g. a wardrobe tagged under both "Bedroom" and
  "Storage") — `products.additionalCategoryIds` is a plain integer array
  alongside the existing primary `categoryId` (matches the codebase's
  existing convention of array columns over join tables, same as
  `colors`/`galleryUrls`). Shown in every category it's assigned to, never
  duplicated ("no copy") — storefront listings, product detail page,
  homepage, similar-items, admin sales page, admin products list, and
  checkout/order pricing all check primary + additional. Best discount
  wins across every assigned category; a product's own sale price always
  wins over any inherited one, no matter what. Excel export/import round
  trips the extra categories (new "קטגוריות נוספות" column, `;`-separated
  paths). Admin can also add existing products to a category in bulk from
  the category edit panel ("Add existing products" button → search +
  checkbox picker). Category delete strips its id from every product's
  `additionalCategoryIds`, same as it already did for the primary one.
  **Still needs `npm run db:push`** for the new
  `additionalCategoryIds` column before this works against the real DB.
- **Decided: no photo filtering by color.** Gallery photos stay attached
  to the product as a whole.
