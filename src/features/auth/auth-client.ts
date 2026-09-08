import type {
  AuthErrorCode,
  AuthResult,
  AuthSuccess,
} from "../../lib/auth/contracts";
import { safeReturnTo } from "../../lib/auth/policy";
import { authErrorText } from "./auth-ui-model";

export type AuthOperation =
  | "signup"
  | "signin"
  | "phone-otp"
  | "verify-phone-otp"
  | "email-otp"
  | "verify-email-otp"
  | "signout"
  | "recovery"
  | "password"
  | "oauth";
const states: AuthSuccess["state"][] = [
  "signed_in",
  "verification_required",
  "otp_sent",
  "recovery_sent",
  "signed_out",
  "password_updated",
  "oauth_redirect",
];

/** Navigation hint only; the destination still verifies the user server-side. */
export async function authSessionStatus(): Promise<
  AuthResult<{ status: "authenticated" | "unauthenticated" }>
> {
  try {
    const response = await fetch("/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const value = await response.json();
    if (
      response.ok &&
      value?.ok === true &&
      ["authenticated", "unauthenticated"].includes(value.data?.status)
    )
      return { ok: true, data: { status: value.data.status } };
  } catch {
    // Do not expose network/SDK details or infer confirmation from a failure.
  }
  return { ok: false, code: "auth_unavailable" };
}

/** Only the existing bounded HTTP contract; no SDK/session/token state in UI. */
export async function authRequest(
  operation: AuthOperation,
  input: Record<string, unknown> = {},
): Promise<AuthResult<AuthSuccess>> {
  try {
    const response = await fetch(`/auth/${operation}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(20000),
    });
    const value = await response.json();
    if (!value?.ok) {
      const code: AuthErrorCode = Object.hasOwn(
        authErrorText,
        value?.code ?? "",
      )
        ? value.code
        : "auth_unavailable";
      return { ok: false, code };
    }
    if (!response.ok || !states.includes(value.data?.state))
      return { ok: false, code: "auth_unavailable" };
    // Explicit allowlist: even an unexpected upstream payload cannot put credentials into React state.
    return {
      ok: true,
      data: {
        state: value.data.state,
        returnTo: safeReturnTo(value.data.returnTo),
        ...(typeof value.data.url === "string" ? { url: value.data.url } : {}),
      },
    };
  } catch {
    return { ok: false, code: "auth_unavailable" };
  }
}
