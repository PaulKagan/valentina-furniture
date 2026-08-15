/**
 * Proxy — runs before every matched request (formerly "Middleware";
 * Next.js 16 renamed the file convention, same behavior).
 *
 * Three responsibilities:
 *   1. Locale routing via next-intl (detects browser language, redirects
 *      un-prefixed routes to the correct locale, sets the locale cookie).
 *   2. Admin auth guard — /admin and /ru/admin require a session.
 *      /en/admin is blocked (admin supports only Hebrew and Russian).
 *   3. Maintenance mode — MAINTENANCE_MODE=true takes the storefront dark
 *      with a static page while /admin stays reachable, for deploys or DB
 *      changes on a plain server with no zero-downtime deploy built in.
 *
 * Combining next-intl + NextAuth:
 *   - Auth wraps the handler so req.auth is available on every request.
 *   - Inside, we first handle /en/admin redirects and admin auth, then
 *     delegate to next-intl's createMiddleware (its own export name,
 *     unrelated to the Next.js file-convention rename) for locale routing.
 */
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// next-intl handles locale detection and prefix routing for store pages
const handleI18nRouting = createMiddleware(routing);

const MAINTENANCE_COPY: Record<string, { title: string; message: string }> = {
  he: { title: "האתר בתחזוקה", message: "אנחנו מבצעים כרגע עדכון קצר ונחזור בקרוב." },
  en: { title: "Site under maintenance", message: "We're making a quick update — back shortly." },
  ru: { title: "Сайт на обслуживании", message: "Мы проводим короткое обновление — скоро вернёмся." },
};

/**
 * Static HTML, bypassing page rendering entirely — deliberately not routed
 * through next-intl/React below, so it still works even if the thing being
 * "maintained" is the app's own build or DB connection. Locale is read
 * straight off the URL prefix rather than the full i18n machinery.
 */
function maintenanceResponse(pathname: string): NextResponse {
  const locale = pathname.startsWith("/en") ? "en" : pathname.startsWith("/ru") ? "ru" : "he";
  const dir = locale === "he" ? "rtl" : "ltr";
  const { title, message } = MAINTENANCE_COPY[locale];
  const html = `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f5f2;font-family:system-ui,-apple-system,sans-serif;">
  <div style="text-align:center;padding:2rem;max-width:28rem;">
    <div style="font-size:2.5rem;margin-bottom:1rem;" aria-hidden="true">🛠️</div>
    <h1 style="color:#2b2320;margin:0 0 .5rem;font-size:1.25rem;">${title}</h1>
    <p style="color:#6b615c;margin:0;">${message}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "3600" },
  });
}

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

  if (process.env.MAINTENANCE_MODE === "true" && !isAdminRoute) {
    return maintenanceResponse(pathname);
  }

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
  // Match all routes except Next.js internals, static files, API routes,
  // and SEO files (sitemap.xml / robots.txt must not get locale-rewritten)
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
