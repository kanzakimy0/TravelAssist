import type { AuthErrorCode, AuthFailure } from "./contracts";

export class AuthConfigurationError extends Error {
  constructor() {
    super("Authentication configuration is missing or invalid.");
  }
}

/** Never forward provider messages, credentials, request payloads or raw exceptions. */
export function authFailure(
  error: unknown,
  fallback: AuthErrorCode = "auth_unavailable",
): AuthFailure {
  if (error instanceof AuthConfigurationError)
    return { ok: false, code: "configuration_error" };
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  const status =
    error && typeof error === "object" && "status" in error
      ? error.status
      : undefined;
  if (typeof status === "number" && status >= 500)
    return { ok: false, code: "auth_unavailable" };
  if (
    status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "over_sms_send_rate_limit"
  )
    return { ok: false, code: "rate_limited" };
  if (code === "weak_password") return { ok: false, code: "weak_password" };
  if (code === "invalid_credentials")
    return { ok: false, code: "invalid_credentials" };
  if (code === "otp_expired") return { ok: false, code: "invalid_otp" };
  if (
    code === "user_not_found" ||
    code === "session_not_found" ||
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "bad_jwt" ||
    code === "session_expired"
  )
    return { ok: false, code: "unauthenticated" };
  return { ok: false, code: fallback };
}
