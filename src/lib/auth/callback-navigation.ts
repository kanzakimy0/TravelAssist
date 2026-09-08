import { safeReturnTo } from "./policy";

/** Presentation only: never authorize a session from callback query parameters. */
export function callbackFailureLocation(
  intent: unknown,
  providerCode: unknown,
  flowHint?: "signup",
) {
  const destination = new URL(safeReturnTo(intent), "https://return.invalid");
  const flow =
    flowHint === "signup"
      ? "signup"
      : destination.pathname === "/reset-password"
        ? "recovery"
        : destination.pathname === "/register"
          ? "signup"
          : "unknown";
  const returnTo =
    flow === "signup"
      ? safeReturnTo(destination.searchParams.get("returnTo"))
      : flow === "recovery"
        ? "/"
        : safeReturnTo(intent);
  const query = new URLSearchParams({
    reason: providerCode === "otp_expired" ? "expired" : "failed",
    flow,
    returnTo,
  });
  // An explicit empty fragment also prevents inheriting provider error fragments.
  return `/auth-link-error?${query}#`;
}

export function wantsCallbackPage(accept: string | null) {
  return !!accept?.split(",").some((part) => {
    const [type, ...parameters] = part.trim().toLowerCase().split(";");
    return (
      type === "text/html" &&
      !parameters.some((parameter) => /^\s*q=0(?:\.0*)?\s*$/.test(parameter))
    );
  });
}
