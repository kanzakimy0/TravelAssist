import { NextResponse, type NextRequest } from "next/server";
import {
  createRequestSupabase,
  PRIVATE_AUTH_HEADERS,
} from "./lib/supabase/request";
import { authSiteOrigin } from "./lib/auth/site";

/** Refresh only; no route is authorized/protected by this optimistic layer. */
export async function proxy(request: NextRequest) {
  // WBS-5.3 navigation intent only. Overwrite inbound values; final authorization is server-side.
  request.headers.set("x-travelassist-path", request.nextUrl.pathname + request.nextUrl.search);
  // Technical Auth routes own their cookie response and trusted verification.
  if (request.nextUrl.pathname.startsWith("/auth/")) return NextResponse.next();
  if (
    !request.cookies
      .getAll()
      .some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name))
  )
    return NextResponse.next({ request, headers: request.nextUrl.pathname.startsWith("/personal-center") ? PRIVATE_AUTH_HEADERS : undefined });
  try {
    const context = createRequestSupabase(
      request,
      authSiteOrigin().startsWith("https:"),
    );
    await context.client.auth.getClaims();
    return context.next();
  } catch {
    // Do not turn unrelated pages into login/configuration error pages.
    // Future protected resources MUST call requireAuthUser and fail closed.
    return NextResponse.next({ request, headers: PRIVATE_AUTH_HEADERS });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
