import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isLocale } from "@/lib/i18n";
import { createRequestId } from "@/lib/observability";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get("x-request-id") ?? createRequestId();

  function withCommonHeaders(response: NextResponse) {
    response.headers.set("x-request-id", requestId);
    response.headers.set("x-content-type-options", "nosniff");
    response.headers.set("x-frame-options", "DENY");
    response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
    return response;
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return withCommonHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/api")) {
    return withCommonHeaders(NextResponse.next());
  }

  const maybeLocale = pathname.split("/")[1];
  if (isLocale(maybeLocale)) {
    return withCommonHeaders(NextResponse.next());
  }

  const url = request.nextUrl.clone();
  url.pathname = `/tr${pathname}`;
  return withCommonHeaders(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
