/** Public, provider/React-independent result contract. Never expose SDK sessions. */
export type AuthErrorCode =
  | "invalid_input"
  | "weak_password"
  | "invalid_credentials"
  | "email_not_registered"
  | "invalid_otp"
  | "rate_limited"
  | "unauthenticated"
  | "auth_unavailable"
  | "configuration_error"
  | "callback_failed"
  | "provider_unavailable"
  | "forbidden";

export type AuthFailure = { ok: false; code: AuthErrorCode };
export type AuthResult<T> = { ok: true; data: T } | AuthFailure;

export type AuthSuccess = {
  state:
    | "signed_in"
    | "verification_required"
    | "otp_sent"
    | "recovery_sent"
    | "signed_out"
    | "password_updated"
    | "oauth_redirect";
  userId?: string;
  returnTo: string;
  url?: string;
};

export type CurrentAuthUser = { userId: string };
export type UserSessionPublicView =
  { status: "authenticated"; userId: string } | { status: "unauthenticated" };
export type OAuthProvider = "google" | "apple";
