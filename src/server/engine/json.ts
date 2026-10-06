import { createHash } from "node:crypto";

/** Reject non-JSON input without invoking accessors; canonical key ordering for replay. */
export function canonicalJson(input: unknown): string {
  const active = new Set<object>();
  let count = 0;
  function visit(v: unknown, depth: number): unknown {
    if (++count > 100000 || depth > 30) throw Error("INPUT_LIMIT");
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw Error("INVALID_JSON");
      return v;
    }
    if (typeof v === "string") {
      if (v.length > 200000) throw Error("INPUT_LIMIT");
      return v;
    }
    if (typeof v !== "object" || active.has(v)) throw Error("INVALID_JSON");
    active.add(v);
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype)
      throw Error("INVALID_JSON");
    const keys = Object.keys(v);
    if (Reflect.ownKeys(v).length !== keys.length + (Array.isArray(v) ? 1 : 0))
      throw Error("INVALID_JSON");
    const result: Record<string, unknown> = {};
    for (const k of keys.sort()) {
      const d = Object.getOwnPropertyDescriptor(v, k);
      if (
        !d ||
        !("value" in d) ||
        ["__proto__", "constructor", "prototype"].includes(k)
      )
        throw Error("INVALID_JSON");
      result[k] = visit(d.value, depth + 1);
    }
    active.delete(v);
    if (Array.isArray(v)) {
      if (
        keys.length !== v.length ||
        keys.some((k) => !/^\d+$/.test(k) || Number(k) >= v.length)
      )
        throw Error("INVALID_JSON");
      return Array.from({ length: v.length }, (_, i) => result[String(i)]);
    }
    return result;
  }
  const serialized = JSON.stringify(visit(input, 0));
  if (serialized.length > 2_000_000) throw Error("INPUT_LIMIT");
  return serialized;
}
export const digest = (input: unknown) =>
  createHash("sha256").update(canonicalJson(input)).digest("hex");
export const detached = <T>(input: T): T =>
  JSON.parse(canonicalJson(input)) as T;
