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

## ✅ Bulk Excel upload — done, confirmed working

- Tested end-to-end by Paul: template → fill in rows + image filenames →
  select the Excel + matching photos on the import page → preview →
  commit. Works as designed.

## ✅ Email — done, confirmed working

- `GMAIL_USER` + `GMAIL_APP_PASSWORD` set locally and tested with a real
  order — store notification and customer confirmation both arrive.
  **Still needs the same two vars set in Vercel's env vars** before this
  works on the deployed site too (local `.env.local` and Vercel are
  separate — confirmed that's why the first local test came up empty).

## 🔴 GitHub Actions secret — deferred until after deploy

- **Add `DATABASE_URL` as a GitHub Actions secret** so the nightly automated
  backup (`.github/workflows/nightly-backup.yml`) can actually run.
  1. github.com/PaulKagan/valentina-furniture → **Settings → Secrets and
     variables → Actions → New repository secret**
  2. Name: `DATABASE_URL` — value: the same Postgres connection string used
     everywhere else
  3. Go to the **Actions** tab → "Nightly database backup" → **Run workflow**
     (manual trigger) to confirm it goes green before relying on the
     schedule
  - Harmless to leave for now — the workflow only actually runs once
    merged to the default branch (currently dormant on this feature
    branch), and the in-admin "Backup now" button + Neon's own
    point-in-time recovery already cover the meantime.

## 🔴 Deployment — decided: dedicated server, not Vercel

- **Decided:** going straight to a dedicated server rather than Vercel —
  Vercel could have done a clean custom domain with zero "vercel" branding
  too (that concern is resolved either way), but Paul wants the dedicated
  route from the start instead of a later migration.
- Still open, needs Paul's input before this can be scoped concretely:
  which hosting provider (DigitalOcean/Hetzner/Linode/AWS Lightsail/etc.),
  and whether the database stays on Neon or also moves to a self-hosted
  Postgres.
- Once a provider's picked, the checklist is:
  1. Provision an Ubuntu server, install Node.js, clone the repo
  2. Set every env var from `.env.example` in a `.env` file on the server
     (notably `AUTH_SECRET` — generate with `npx auth secret`)
  3. `npm run build` then run it under **process supervision** — `pm2`
     (`pm2 start npm -- start`, `pm2 save`, `pm2 startup`) or a `systemd`
     service, so it restarts itself if it crashes or the server reboots
     (Vercel does this automatically; a plain server doesn't)
  4. **Reverse proxy + SSL** — nginx or Caddy in front of the Node process,
     pointing the real domain at it with a Let's Encrypt certificate
     (Vercel also handles this automatically; a dedicated server needs it
     set up by hand)
  5. Point the domain's DNS (A record) at the server's IP
  6. **Uptime monitor on `/api/health`** — no platform-level auto-restart
     safety net on a plain server, so a real outage should page someone
     instead of waiting for a customer complaint:
     - Sign up free at [uptimerobot.com](https://uptimerobot.com) (manual,
       needs an email — an agent can't create the account)
     - **Add New Monitor** → HTTP(s) → `https://<real-domain>/api/health`
       → 5 minute interval, plus an alert contact
  7. Write down where `ADMIN_PASSWORD`/`.env` actually lives on the server
     — there's no in-app password recovery, so losing it means editing
     that file by hand
- Production build already verified clean (`npm run build`), `db:push`
  already run for the schema as it stands.

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
