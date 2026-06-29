import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ponytail: singleton pattern for serverless — reuse across hot reloads in dev
const globalForDb = global as unknown as { conn: postgres.Sql };

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!, { ssl: "require" });
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
