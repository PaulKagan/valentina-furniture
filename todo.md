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

## 🟡 Nice to have — not urgent

- Uptime monitor on `/api/health` (e.g. UptimeRobot, free tier) so a real
  outage is caught by a notification instead of a customer complaint.
- Write down where `ADMIN_PASSWORD` actually lives (Vercel env vars) —
  there's no in-app password recovery, so losing it means going into the
  Vercel dashboard by hand.
