/**
 * Middleware — runs on the Edge before every matched request.
 *
 * Two responsibilities:
 *   1. Locale routing via next-intl (detects browser language, redirects
 *      un-prefixed routes to the correct locale, sets the locale cookie).
 *   2. Admin auth guard — /admin and /ru/admin require a session.
 *      /en/admin is blocked (admin supports only Hebrew and Russian).
 *
 * Combining next-intl + NextAuth:
 *   - Auth wraps the handler so req.auth is available on every request.
 *   - Inside, we first handle /en/admin redirects and admin auth, then
 *     delegate to next-intl's createMiddleware for locale routing.
 */
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// next-intl handles locale detection and prefix routing for store pages
const handleI18nRouting = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Block /en/admin — admin is available only in Hebrew (default) and Russian
  if (pathname.startsWith("/en/admin")) {
    const rest = pathname.replace(/^\/en\/admin/, "") || "/";
    return NextResponse.redirect(new URL("/admin" + rest, req.url));
  }

  // Admin auth check — covers /admin/* and /ru/admin/*
  const isAdminRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/ru/admin");

  if (isAdminRoute) {
    // /admin/login and /ru/admin/login are always accessible (no redirect loop)
    const isLoginPage =
      pathname === "/admin/login" || pathname === "/ru/admin/login";

    if (!isLoginPage && !req.auth) {
      // Redirect to the login page in the same locale
      const loginPath = pathname.startsWith("/ru/") ? "/ru/admin/login" : "/admin/login";
      return NextResponse.redirect(new URL(loginPath, req.url));
    }

    // Admin routes don't need locale-prefix logic — fall through to next-intl
    // which will still set the locale cookie correctly
  }

  return handleI18nRouting(req as NextRequest);
});

export const config = {
  // Match all routes except Next.js internals, static files, and API routes
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
