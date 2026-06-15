import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight demo auth gate. Login sets a `ruminate_auth` cookie; protected
 * routes redirect to /login without it. Swap the cookie check for a real JWT /
 * session verification when wiring production auth.
 */
export function middleware(req: NextRequest) {
  const authed = req.cookies.has("ruminate_role") || req.cookies.get("ruminate_auth")?.value === "1";
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/herd/:path*", "/cows/:path*", "/alerts/:path*", "/model/:path*", "/farm/:path*"],
};
