/** Same policy for explicit registration and password update; no strength score. */
export function validPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 8 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

export function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export function validPhone(value: unknown): value is string {
  return typeof value === "string" && /^\+[1-9][0-9]{7,14}$/.test(value);
}

export function validOtp(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]{6}$/.test(value);
}

export const DEFAULT_RETURN_TO = "/";

/** Validate every decoding layer, but return the original valid path/query intent. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048)
    return DEFAULT_RETURN_TO;
  let decoded = value;
  for (let depth = 0; depth < 8; depth++) {
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      /[\\\u0000-\u0020\u007f]/.test(decoded)
    )
      return DEFAULT_RETURN_TO;
    try {
      const parsed = new URL(decoded, "https://return.invalid");
      if (
        parsed.origin !== "https://return.invalid" ||
        parsed.pathname.startsWith("//")
      )
        return DEFAULT_RETURN_TO;
      const next = decodeURIComponent(decoded);
      if (next === decoded) return value;
      decoded = next;
    } catch {
      return DEFAULT_RETURN_TO;
    }
  }
  return DEFAULT_RETURN_TO;
}
