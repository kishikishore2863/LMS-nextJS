import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/server/auth/auth.config";
import { ROLE_HOME, canAccessPath } from "@/server/auth/roles";

const { auth } = NextAuth(authConfig);

/** Layer 1 of RBAC: block the wrong route group by role before any page renders. */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  if (!user?.role) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  if (pathname === "/") return NextResponse.redirect(new URL(ROLE_HOME[user.role], req.url));
  if (!canAccessPath(user.role, pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[user.role], req.url));
  }
});

export const config = { matcher: ["/", "/admin/:path*", "/manager/:path*", "/learner/:path*"] };
