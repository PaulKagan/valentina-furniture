/**
 * GET /api/health — lightweight liveness check.
 *
 * Vercel and uptime monitors can ping this to confirm the app is running.
 * Returns 200 with a timestamp. Does NOT check the DB — that would make
 * a DB outage look like an app outage to the monitor.
 */
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
