/** Small, dependency-free JSON contract parser. No coercion or input echoing. */
export type Parser<T> = (input: unknown, path: string) => T;
export type Parsed<P> = P extends Parser<infer T> ? T : never;
export type ContractResult<T> =
  { ok: true; value: T } | { ok: false; issue: { path: string; code: string } };

class InvalidContract extends Error {
  readonly path: string;
  readonly code: string;
  constructor(path: string, code: string) {
    super(code);
    this.path = path;
    this.code = code;
  }
}

export function invalid(path: string, code: string): never {
  throw new InvalidContract(path, code);
}

export function parse<T>(parser: Parser<T>, input: unknown): ContractResult<T> {
  try {
    return { ok: true, value: parser(input, "$") };
  } catch (error) {
    if (error instanceof InvalidContract) {
      return { ok: false, issue: { path: error.path, code: error.code } };
    }
    // Non-JSON inputs, getters and proxies must not escape the trust boundary.
    return { ok: false, issue: { path: "$", code: "INVALID_JSON_VALUE" } };
  }
}

export const text =
  (max = 200, min = 1): Parser<string> =>
  (value, path) => {
    if (
      typeof value !== "string" ||
      value.length > max ||
      value.trim().length < min
    )
      invalid(path, "INVALID_STRING");
    return value;
  };
export const integer =
  (min = 0, max = Number.MAX_SAFE_INTEGER): Parser<number> =>
  (value, path) => {
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    )
      invalid(path, "INVALID_INTEGER");
    return value;
  };
export const boolean: Parser<boolean> = (value, path) => {
  if (typeof value !== "boolean") invalid(path, "INVALID_BOOLEAN");
  return value;
};
export const nullable =
  <T>(parser: Parser<T>): Parser<T | null> =>
  (value, path) =>
    value === null ? null : parser(value, path);
export const oneOf =
  <const T extends readonly string[]>(values: T): Parser<T[number]> =>
  (value, path) => {
    if (typeof value !== "string" || !values.includes(value))
      invalid(path, "UNSUPPORTED_VALUE");
    return value;
  };
export const list =
  <T>(parser: Parser<T>, max = 1000): Parser<T[]> =>
  (value, path) => {
    if (!Array.isArray(value) || value.length > max)
      invalid(path, "INVALID_ARRAY");
    return Array.from(value, (item, index) =>
      parser(item, `${path}[${index}]`),
    );
  };
export function object<S extends Record<string, Parser<unknown>>>(
  shape: S,
): Parser<{ [K in keyof S]: Parsed<S[K]> }> {
  return (value, path) => {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      invalid(path, "INVALID_OBJECT");
    const input = value as Record<string, unknown>;
    const keys = Object.keys(input);
    // Fail closed; don't propagate credentials or silently lose unknown fields on save.
    if (keys.some((key) => !Object.hasOwn(shape, key)))
      invalid(path, "UNKNOWN_FIELD");
    const result: Record<string, unknown> = {};
    for (const [key, parser] of Object.entries(shape)) {
      if (!Object.hasOwn(input, key))
        invalid(`${path}.${key}`, "MISSING_FIELD");
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor))
        invalid(path, "INVALID_JSON_VALUE");
      result[key] = parser(descriptor.value, `${path}.${key}`);
    }
    return result as { [K in keyof S]: Parsed<S[K]> };
  };
}
export const refine =
  <T>(parser: Parser<T>, check: (value: T, path: string) => void): Parser<T> =>
  (input, path) => {
    const value = parser(input, path);
    check(value, path);
    return value;
  };
export const code = refine(text(64), (value, path) => {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) invalid(path, "INVALID_CODE");
});
export const localDate = refine(text(10), (value, path) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    invalid(path, "INVALID_LOCAL_DATE");
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    invalid(path, "INVALID_LOCAL_DATE");
});
export const timeZone = refine(text(100), (value, path) => {
  if (value !== "UTC" && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(value))
    invalid(path, "INVALID_TIMEZONE");
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
  } catch {
    invalid(path, "INVALID_TIMEZONE");
  }
});
export const instant = refine(text(35), (value, path) => {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(
      value,
    )
  )
    invalid(path, "INVALID_INSTANT");
  localDate(value.slice(0, 10), path);
  if (/[+-]14:(?!00)/.test(value) || !Number.isFinite(Date.parse(value)))
    invalid(path, "INVALID_INSTANT");
});
export const coordinates = object({
  longitude: refine(
    (value, path) => {
      if (typeof value !== "number" || !Number.isFinite(value))
        invalid(path, "INVALID_COORDINATE");
      return value;
    },
    (value, path) => {
      if (value < -180 || value > 180) invalid(path, "INVALID_LONGITUDE");
    },
  ),
  latitude: refine(
    (value, path) => {
      if (typeof value !== "number" || !Number.isFinite(value))
        invalid(path, "INVALID_COORDINATE");
      return value;
    },
    (value, path) => {
      if (value < -90 || value > 90) invalid(path, "INVALID_LATITUDE");
    },
  ),
});
export function uniqueIds(items: { id: string }[], path: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length)
    invalid(path, "DUPLICATE_ID");
}
