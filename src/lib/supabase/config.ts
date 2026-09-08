import { AuthConfigurationError } from "../auth/errors";

export function publicSupabaseConfig() {
  // Direct references are required for Next.js public build-time substitution.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    const parsed = new URL(url ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (!local && parsed.protocol !== "https:") ||
      (local && !["https:", "http:"].includes(parsed.protocol)) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/" ||
      !key ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
    )
      throw new AuthConfigurationError();
    return { url: parsed.origin, key };
  } catch {
    throw new AuthConfigurationError();
  }
}

/** Browser-readable SDK cookies support refresh; no custom token storage. */
export function sessionCookieOptions(secure: boolean) {
  return { path: "/", sameSite: "lax" as const, secure, httpOnly: false };
}
