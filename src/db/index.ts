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

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!, { ssl: "require" });
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
