import "server-only";
import { AuthConfigurationError } from "./errors";

/** Canonical deployment origin, never derived from untrusted Host/Forwarded headers. */
export function authSiteOrigin() {
  try {
    const url = new URL(process.env.AUTH_SITE_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    )
      throw new AuthConfigurationError();
    return url.origin;
  } catch {
    throw new AuthConfigurationError();
  }
}
