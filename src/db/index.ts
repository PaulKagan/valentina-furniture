/**
 * Database client — single shared Drizzle instance.
 *
 * Why the singleton pattern: Next.js in development re-imports modules on every
 * hot reload, which would open a new postgres connection each time and exhaust
 * the Neon free-tier connection limit fast. Storing on `global` keeps one
 * connection alive across reloads in dev. In production each Vercel function
 * instance gets its own process, so `global` is naturally isolated.
 *
 * We chose Drizzle + postgres.js over Prisma because Prisma requires downloading
 * a native binary engine at install time, which failed in this environment.
 * Drizzle is pure TypeScript — no binaries, smaller bundle, same query safety.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = global as unknown as { conn: postgres.Sql };

// Neon (and every hosted PG) requires TLS; a local postgres usually has no
// certificate, so requiring SSL there fails to connect. Decide from the host.
const url = process.env.DATABASE_URL!;
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

const conn =
  globalForDb.conn ?? postgres(url, isLocal ? {} : { ssl: "require" });
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
