/**
 * Next.js middleware — runs on the Edge before every matched request.
 *
 * Only applies to /admin routes (see config.matcher below).
 * If the user is not logged in and tries to access any admin page
 * other than the login page itself, they get redirected to /admin/login.
 *
 * The login page is explicitly excluded from the auth check — otherwise
 * the redirect would loop: /admin/login → redirect to /admin/login → ...
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isLoginPage && !req.auth) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
});

// Only run this middleware on admin routes — keeps it fast for the public store
export const config = { matcher: ["/admin/:path*"] };
