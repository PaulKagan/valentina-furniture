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

(nothing right now)
