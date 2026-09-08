import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthFailure, AuthResult, AuthSuccess } from "./contracts";
import { createAuthCore } from "./core";
import { authFailure } from "./errors";
import { safeReturnTo } from "./policy";
import { authSiteOrigin } from "./site";
import { getCurrentAuthUser } from "./server-user";
import {
  callbackFailureLocation,
  wantsCallbackPage,
} from "./callback-navigation";
import {
  createRequestSupabase,
  PRIVATE_AUTH_HEADERS,
} from "../supabase/request";

const INTENT_COOKIE = "ta-auth-return-to";
const operations = {
  signup: "signUp",
  signin: "signIn",
  "phone-otp": "requestPhoneOtp",
  "verify-phone-otp": "verifyPhoneOtp",
  "email-otp": "requestEmailOtp",
  "verify-email-otp": "verifyEmailOtp",
  signout: "signOut",
  recovery: "requestRecovery",
  password: "updatePassword",
  oauth: "startOAuth",
} as const;

function resultResponse(result: AuthResult<unknown>) {
  const status = result.ok
    ? 200
    : result.code === "configuration_error" ||
        result.code === "auth_unavailable"
      ? 503
      : result.code === "rate_limited"
        ? 429
        : result.code === "forbidden"
          ? 403
          : [
                "unauthenticated",
                "invalid_credentials",
                "invalid_otp",
                "callback_failed",
              ].includes(result.code)
            ? 401
            : 400;
  return NextResponse.json(result, { status, headers: PRIVATE_AUTH_HEADERS });
}

async function readInput(
  request: NextRequest,
): Promise<Record<string, unknown> | null> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        return null;
      }
      parts.push(part.value);
    }
    const value: unknown = JSON.parse(Buffer.concat(parts).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export async function handleAuthPost(request: NextRequest, operation: string) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  try {
    const origin = authSiteOrigin();
    // JSON + exact trusted Origin blocks login/logout/password CSRF.
    if (request.headers.get("origin") !== origin)
      return resultResponse({ ok: false, code: "forbidden" });
    if (!Object.hasOwn(operations, operation))
      return NextResponse.json(
        { ok: false, code: "invalid_input" },
        { status: 404, headers: PRIVATE_AUTH_HEADERS },
      );
    const input = await readInput(request);
    if (!input) return resultResponse({ ok: false, code: "invalid_input" });
    const context = createRequestSupabase(
      request,
      origin.startsWith("https:"),
      operation === "signup",
    );
    finish = context.finish;
    const callback = new URL("/auth/callback", origin);
    if (operation === "signup") {
      // Routing hints, not authentication proof. Each email retains its intent
      // instead of sharing the mutable recovery/OAuth return-to cookie.
      callback.searchParams.set("flow", "signup");
      callback.searchParams.set("returnTo", safeReturnTo(input.returnTo));
    }
    const core = createAuthCore(context.client, callback.href);
    const method = operations[operation as keyof typeof operations];
    const result: AuthResult<AuthSuccess> = await core[method](input);
    if (result.ok && result.data.url) {
      // The SDK's authorize URL must still belong to the configured Auth origin.
      const { publicSupabaseConfig } = await import("../supabase/config");
      if (new URL(result.data.url).origin !== publicSupabaseConfig().url)
        return finish(
          resultResponse({ ok: false, code: "provider_unavailable" }),
        );
    }
    const response = resultResponse(result);
    if (result.ok && ["oauth", "recovery"].includes(operation)) {
      response.cookies.set(INTENT_COOKIE, safeReturnTo(input.returnTo), {
        path: "/auth",
        httpOnly: true,
        sameSite: "lax",
        secure: origin.startsWith("https:"),
        maxAge: 600,
      });
    }
    if (result.ok && operation === "signout")
      response.cookies.set(INTENT_COOKIE, "", { path: "/auth", maxAge: 0 });
    return finish(response);
  } catch (error) {
    const response = resultResponse(authFailure(error));
    return finish ? finish(response) : response;
  }
}

export async function handleAuthCallback(request: NextRequest) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  const flowId = request.nextUrl.searchParams.get("sb_flow_id") ?? undefined;
  const signupFlow =
    request.nextUrl.searchParams.get("flow") === "signup" &&
    flowId !== undefined;
  const intent = signupFlow
    ? safeReturnTo(request.nextUrl.searchParams.get("returnTo"))
    : request.cookies.get(INTENT_COOKIE)?.value;
  const failureResponse = (result: AuthFailure) =>
    wantsCallbackPage(request.headers.get("accept"))
      ? new NextResponse(null, {
          status: 303,
          headers: {
            ...PRIVATE_AUTH_HEADERS,
            Vary: "Accept",
            Location: callbackFailureLocation(
              intent,
              request.nextUrl.searchParams.get("error_code"),
              signupFlow ? "signup" : undefined,
            ),
          },
        })
      : resultResponse(result);
  try {
    const origin = authSiteOrigin();
    const context = createRequestSupabase(request, origin.startsWith("https:"));
    finish = context.finish;
    const core = createAuthCore(context.client, origin + "/auth/callback");
    const result: AuthResult<AuthSuccess> = request.nextUrl.searchParams.has(
      "error",
    )
      ? { ok: false, code: "callback_failed" }
      : await core.completeCallback(
          request.nextUrl.searchParams.get("code"),
          intent,
          flowId,
        );
    // Relative Location avoids trusting a Host header for post-login navigation.
    const response = result.ok
      ? new NextResponse(null, {
          status: 303,
          headers: { Location: safeReturnTo(result.data.returnTo) },
        })
      : failureResponse(result);
    if (!signupFlow)
      response.cookies.set(INTENT_COOKIE, "", { path: "/auth", maxAge: 0 });
    return finish(response);
  } catch (error) {
    const response = failureResponse(authFailure(error));
    if (!signupFlow)
      response.cookies.set(INTENT_COOKIE, "", { path: "/auth", maxAge: 0 });
    return finish ? finish(response) : response;
  }
}

export async function handleAuthSession(request: NextRequest) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  try {
    const origin = authSiteOrigin();
    const context = createRequestSupabase(request, origin.startsWith("https:"));
    finish = context.finish;
    const result = await getCurrentAuthUser(context.client);
    return finish(
      resultResponse(
        result.ok
          ? {
              ok: true,
              data: result.data
                ? { status: "authenticated", userId: result.data.userId }
                : { status: "unauthenticated" },
            }
          : result,
      ),
    );
  } catch (error) {
    const result: AuthFailure = authFailure(error);
    const response = resultResponse(result);
    return finish ? finish(response) : response;
  }
}
