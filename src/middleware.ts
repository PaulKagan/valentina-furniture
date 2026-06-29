import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (isAdmin && !isLoginPage && !req.auth) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
});

export const config = { matcher: ["/admin/:path*"] };
