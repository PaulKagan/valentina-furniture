# Setup guide — from zero to a working site

Two phases: **run it on your machine** (30 min, free), then **put it online** (20 min, free).
Do them in order — the same accounts are used for both.

---

## Phase 0 — Accounts to open (all free, no credit card)

| Service | What it does | Sign up with |
|---|---|---|
| **Neon** | PostgreSQL database (products, categories, orders) | [neon.tech](https://neon.tech) — sign in with GitHub |
| **Cloudinary** | Stores and optimizes product photos | [cloudinary.com](https://cloudinary.com) |
| **Vercel** | Hosts the site | [vercel.com](https://vercel.com) — sign in with GitHub |

Gmail is optional and comes last (order notification emails).

---

## Phase 1 — Run it on your machine

### 1. Install the tools (one time)

- **Node.js 20 or newer** — [nodejs.org](https://nodejs.org) (LTS version)
- **Git** — [git-scm.com](https://git-scm.com)
- **VS Code** — [code.visualstudio.com](https://code.visualstudio.com)

Check they work — open a terminal and run:

```bash
node --version    # should print v20.x or higher
git --version
```

### 2. Get the code

Pick a folder for your projects (e.g. `Documents`), then:

```bash
cd ~/Documents
git clone https://github.com/PaulKagan/valentina-furniture.git
cd valentina-furniture
git checkout claude/customer-website-project-tjl4dd
npm install
```

**In VS Code**: File → Open Folder → select the `valentina-furniture` folder
(the one containing `package.json`). That's the folder to open — not its parent,
not `src`. Its built-in terminal (Ctrl+`) is where you run all the commands below.

### 3. Create the database (Neon)

1. Log in to [neon.tech](https://neon.tech) → **New Project**
2. Name: `valentina-furniture`, region: **Europe (Frankfurt)** — closest to Israel
3. After it's created, copy the **connection string** shown on the dashboard.
   It looks like:
   `postgresql://user:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### 4. Create the image account (Cloudinary)

1. Log in to [cloudinary.com](https://cloudinary.com) → the **Dashboard** shows:
   - Cloud Name
   - API Key
   - API Secret (click to reveal)
2. Keep that tab open, you'll paste all three next.

### 5. Create your local settings file

In the project root (next to `package.json`), create a file named **`.env.local`**
— in VS Code: right-click the file list → New File → `.env.local`.

Paste this and fill in your values:

```env
DATABASE_URL="<the Neon connection string from step 3>"

AUTH_SECRET="<see below>"
AUTH_TRUST_HOST="true"

ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="pick-any-password-for-now"

CLOUDINARY_CLOUD_NAME="<from Cloudinary>"
CLOUDINARY_API_KEY="<from Cloudinary>"
CLOUDINARY_API_SECRET="<from Cloudinary>"

NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_WHATSAPP="972501234567"
NEXT_PUBLIC_PHONE="050-123-4567"
NEXT_PUBLIC_ADDRESS="רחוב הרצל 1, תל אביב"
```

For `AUTH_SECRET`, run this and paste the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env.local` is git-ignored — your secrets never reach GitHub.

### 6. Create the database tables

```bash
npm run db:push
```

Should end with `Changes applied`. This creates the products, categories and
orders tables in Neon.

### 7. Start it

```bash
npm run dev
```

Open **http://localhost:3000** — the store (empty, no products yet).
Open **http://localhost:3000/admin/login** — log in with the `ADMIN_EMAIL` and
`ADMIN_PASSWORD` you set in step 5.

### 8. First test run

1. **Categories** → create `סלון`, then use the **+** on it to add `ספות` under it
2. **Products** → new product, fill name + price, upload a photo, pick colors and sizes
3. Go back to the store — the product appears, the category is in the menu
4. Add it to the cart, place an order at checkout
5. **Orders** in admin → open the order → try Print, editing quantities, status

To stop the server: `Ctrl+C` in the terminal.

---

## Phase 2 — Put it online (Vercel)

### 1. Merge to main

Vercel deploys the `main` branch. Right now the code is on a feature branch:

```bash
git checkout main
git merge claude/customer-website-project-tjl4dd
git push
```

### 2. Import into Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project**
2. Pick `valentina-furniture` from your GitHub repos → **Import**
3. Framework is detected automatically (Next.js). **Don't click Deploy yet.**
4. Expand **Environment Variables** and add every line from your `.env.local`,
   with two changes:
   - `NEXT_PUBLIC_SITE_URL` → your real address (e.g. `https://valentina-furniture.vercel.app`,
     or the custom domain once you add one)
   - `ADMIN_PASSWORD` → a strong password, and see the security note below
   - Skip `AUTH_TRUST_HOST` (Vercel handles it)
5. **Deploy**. Two minutes later you get a live URL.

### 3. Use the same database?

Yes — the same `DATABASE_URL` works for local and production. That means
products you added locally are already there. If you'd rather keep testing
separate, create a second Neon project and use that connection string locally.

### 4. Custom domain (when she has one)

Buy a domain anywhere (Namecheap, GoDaddy, .il registrars). Then in Vercel:
Project → **Settings → Domains → Add** and follow the DNS records it shows.
HTTPS is automatic. Afterwards, update `NEXT_PUBLIC_SITE_URL` to the real
domain and redeploy — that value feeds the sitemap and SEO tags.

### 5. Ongoing changes

Every `git push` to `main` redeploys automatically. To pull down changes made
elsewhere:

```bash
git pull
npm install     # only if dependencies changed
```

---

## Phase 3 — Order emails (optional, do it last)

On the Google account that should send and receive order mail:

1. Turn on **2-Step Verification** (Google Account → Security)
2. Google Account → Security → **App passwords** → create one → copy the
   16-character password
3. Add to Vercel's environment variables (and `.env.local` if you want it
   locally too):

```env
GMAIL_USER="valentina@gmail.com"
GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"
ORDER_NOTIFY_EMAIL="valentina@gmail.com"
```

4. Redeploy. From then on every order emails her, and customers who leave an
   email get a confirmation. Without these variables the site works normally
   and simply doesn't send.

---

## Before handing it to Valentina

- [ ] `ADMIN_PASSWORD` stored as a **bcrypt hash**, not plain text. Generate:
      `node -e "console.log(require('bcryptjs').hashSync('herPassword',12))"`
      and put the `$2a$...` output in `ADMIN_PASSWORD` (the login code detects
      the hash format automatically).
- [ ] Real phone, WhatsApp number and address in the `NEXT_PUBLIC_*` variables
- [ ] Real opening hours — `messages/he.json` → `footer.hoursValue`
- [ ] Accessibility statement contact details — `messages/he.json` → `a11y.statement`
- [ ] Delete the test products and orders you created

---

## If something breaks

| Symptom | Fix |
|---|---|
| `npm install` fails with `ERESOLVE` | Pull latest (a `.npmrc` in the repo fixes it), or run `npm install --legacy-peer-deps` |
| `Cannot find module` after pulling | `npm install` |
| Database connection errors | Check `DATABASE_URL` has no line breaks and ends with `?sslmode=require` |
| Login always fails | `AUTH_SECRET` missing, or `ADMIN_EMAIL` doesn't match exactly |
| Images won't upload | Cloudinary key/secret wrong — check for extra spaces |
| Port 3000 in use | `npm run dev -- -p 3001` |
| Changes not showing on the live site | Check the deploy finished in Vercel → Deployments |
