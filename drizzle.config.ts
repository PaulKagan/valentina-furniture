/**
 * drizzle-kit config (used by `npm run db:push` / `db:generate` / `db:migrate`).
 *
 * drizzle-kit is a standalone CLI, not part of the Next.js runtime, so it
 * does NOT pick up .env.local automatically the way the app does. We load
 * it explicitly here — otherwise the CLI fails with
 * "Either connection url or host, database are required".
 */
import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// .env.local first (personal machine), then .env as a fallback
config({ path: ".env.local" });
config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Create a .env.local file in the project root with:\n" +
      '  DATABASE_URL="postgresql://...your Neon connection string..."'
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
