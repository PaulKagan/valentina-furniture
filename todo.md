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

## 🔴 Content — do before launch

- **Replace the placeholder `/delivery` page copy** (`messages/*.json`
  `"delivery"` namespace) with the real delivery terms Paul provided
  (photos of the physical store's order-form terms). Draft Hebrew text
  presented in chat for approval — once approved, also add the delivery
  photos themselves somewhere on the page (or link to them) per Paul's
  request. Currently the page explicitly says "טיוטה ראשונית" (initial
  draft) — needs the real content before this goes live.

## 🔴 Vercel deployment

- **Set every env var from `.env.example`** in Vercel → Project Settings →
  Environment Variables. Notably `AUTH_SECRET` (NextAuth v5 requires it in
  production — generate with `npx auth secret`) isn't mentioned anywhere
  else in this file and is easy to miss.
- Production build verified clean (`npm run build`) — no blockers found.
- **Note the contradiction below**: the "Add `DATABASE_URL` as a GitHub
  Actions secret" item above already assumes Vercel ("the same connection
  string that's in Vercel's environment variables"), but the 🟠 section
  right below was written assuming a plain server instead ("hosting is a
  regular server rather than Vercel"). If Vercel is the real target, the
  pm2/systemd item there is unnecessary (Vercel restarts crashed functions
  automatically) — flagged for Paul to confirm rather than silently
  deleting someone else's prior planning note.

## 🟠 Infrastructure — do before going live on the real server

- **Uptime monitor on `/api/health`** — a real outage should page someone,
  not wait for a customer complaint. Matters more now that hosting is a
  regular server rather than Vercel (no platform-level auto-restart safety
  net if the Node process dies).
  1. Sign up free at [uptimerobot.com](https://uptimerobot.com) (needs an
     email — this is a manual step, an agent can't create the account)
  2. **Add New Monitor** → HTTP(s) → URL: `https://<her-real-domain>/api/health`
     → check interval 5 minutes
  3. Add an alert contact (email, or the free SMS/Telegram options) so a
     failure actually notifies someone
- **Process supervision on the server** — `next start` needs something to
  restart it if it crashes or the server reboots (Vercel did this
  automatically; a regular server doesn't). Use `pm2` (`pm2 start npm --
  start`, `pm2 save`, `pm2 startup`) or a `systemd` service — either is
  fine, just needs to exist before this is the production site.
- Write down where `ADMIN_PASSWORD` actually lives (whichever server's env
  vars / `.env` file end up hosting it) — there's no in-app password
  recovery, so losing it means editing that file by hand.

## 🟡 Nice to have — not urgent

- **[NEEDS DECISION]** Sub-category page (`/categories/[slug]`) — a landing
  page per root category listing its children + products, instead of
  clicking a subcategory jumping straight to the filtered `/products?category=`
  view like it does today. Only worth building if the category tree grows
  deep/wide enough that browsing beats filtering. Waiting on Valentina to
  say whether she wants this before planning/building it.
- **[NEEDS DECISION]** Products in a category that has sub-categories —
  undefined today. Two options: (a) a product only ever belongs to the
  most specific level (e.g. only "Double Beds", never also "Bedroom"), or
  (b) a parent category page aggregates every product from all its
  children too. Ask Valentina: if she uploads a sofa to "Living Room" but
  there's also a sub-category "Sofas" under it, should the sofa show up
  on both the "Living Room" page and the "Sofas" page, or only one?
- **[NEEDS DECISION]** Filter product gallery photos by color — clicking a
  color swatch on a product page would show only that color's photos.
  Technically possible but a real schema change: gallery images are
  currently attached to the product as a whole (`galleryUrls`), not to a
  specific color, so this needs a per-color image structure (e.g.
  `{color, url}[]` instead of a flat array), plus matching changes to the
  admin upload form (upload per color) and the Excel import. Worth
  asking Valentina how much effort she's actually willing to put into
  organizing photos by color per product — if most products won't have
  that level of organization, the feature stays half-empty.
