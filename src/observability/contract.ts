export const OBSERVATION_SCHEMA_VERSION = 1 as const;

export const observationTypes = ["error", "web_vital", "timing"] as const;
export const observationSources = [
  "browser_runtime",
  "next_web_vitals",
  "next_server",
  "planner_workspace",
] as const;
export const observationCategories = [
  "unexpected",
  "cancelled",
  "validation",
  "availability",
  "performance",
] as const;
export const observationSeverities = ["info", "warning", "error"] as const;

export type ObservationType = (typeof observationTypes)[number];
export type ObservationSource = (typeof observationSources)[number];
export type ObservationCategory = (typeof observationCategories)[number];
export type ObservationSeverity = (typeof observationSeverities)[number];

export interface ObservationEventV1 {
  schemaVersion: typeof OBSERVATION_SCHEMA_VERSION;
  type: ObservationType;
  source: ObservationSource;
  category: ObservationCategory;
  severity: ObservationSeverity;
  environment: "development" | "test" | "preview" | "production" | "unknown";
  release: string;
  routeTemplate: string;
  code: string;
  correlationId: string;
  fingerprint: string;
  count: number;
  durationBucket?: string;
  metricName?: "TTFB" | "FCP" | "LCP" | "FID" | "CLS" | "INP";
  metricValue?: number;
  metricRating?: "good" | "needs-improvement" | "poor" | "unknown";
}

const allowedKeys = new Set([
  "schemaVersion",
  "type",
  "source",
  "category",
  "severity",
  "environment",
  "release",
  "routeTemplate",
  "code",
  "correlationId",
  "fingerprint",
  "count",
  "durationBucket",
  "metricName",
  "metricValue",
  "metricRating",
]);
const safeText = /^[a-zA-Z0-9._:/\[\]-]{1,96}$/;

function oneOf<T extends readonly string[]>(value: unknown, values: T) {
  return typeof value === "string" && values.includes(value);
}

export function validateObservationEvent(
  value: unknown,
): value is ObservationEventV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  if (Object.keys(event).some((key) => !allowedKeys.has(key))) return false;
  if (event.schemaVersion !== OBSERVATION_SCHEMA_VERSION) return false;
  if (!oneOf(event.type, observationTypes)) return false;
  if (!oneOf(event.source, observationSources)) return false;
  if (!oneOf(event.category, observationCategories)) return false;
  if (!oneOf(event.severity, observationSeverities)) return false;
  if (
    !oneOf(event.environment, [
      "development",
      "test",
      "preview",
      "production",
      "unknown",
    ] as const)
  )
    return false;
  for (const key of [
    "release",
    "routeTemplate",
    "code",
    "correlationId",
    "fingerprint",
  ] as const)
    if (typeof event[key] !== "string" || !safeText.test(event[key]))
      return false;
  if (
    !Number.isInteger(event.count) ||
    (event.count as number) < 1 ||
    (event.count as number) > 999
  )
    return false;
  if (
    event.durationBucket !== undefined &&
    (typeof event.durationBucket !== "string" ||
      !safeText.test(event.durationBucket))
  )
    return false;
  if (
    event.metricName !== undefined &&
    !oneOf(event.metricName, [
      "TTFB",
      "FCP",
      "LCP",
      "FID",
      "CLS",
      "INP",
    ] as const)
  )
    return false;
  if (
    event.metricValue !== undefined &&
    (typeof event.metricValue !== "number" ||
      !Number.isFinite(event.metricValue) ||
      event.metricValue < 0 ||
      event.metricValue > 10_000_000)
  )
    return false;
  if (
    event.metricRating !== undefined &&
    !oneOf(event.metricRating, [
      "good",
      "needs-improvement",
      "poor",
      "unknown",
    ] as const)
  )
    return false;
  return true;
}

export function routeTemplateFromPath(path: string | undefined): string {
  if (!path) return "unknown";
  let pathname = path;
  try {
    pathname = new URL(path, "https://local.invalid").pathname;
  } catch {
    return "unknown";
  }
  if (pathname === "/") return "/";
  if (pathname === "/start") return "/start";
  if (pathname === "/planner") return "/planner";
  const personalRoutes = new Set([
    "/personal-center",
    "/personal-center/trips",
    "/personal-center/preferences",
    "/personal-center/companions",
    "/personal-center/account",
    "/personal-center/account/security",
    "/personal-center/account/privacy",
    "/personal-center/account/booking-sync",
  ]);
  if (personalRoutes.has(pathname)) return pathname;
  if (pathname.startsWith("/personal-center/"))
    return "/personal-center/[segment]";
  if (pathname.startsWith("/api/routes/calculate"))
    return "/api/routes/calculate";
  if (pathname.startsWith("/api/observability-test-error"))
    return "/api/observability-test-error";
  return "/[unclassified]";
}

export function safeEnvironment(
  value: string | undefined,
): ObservationEventV1["environment"] {
  if (value === "development" || value === "test" || value === "production")
    return value;
  if (value === "preview") return "preview";
  return "unknown";
}

export function safeRelease(value: string | undefined): string {
  const candidate = value?.trim();
  return candidate && /^[a-f0-9._-]{7,64}$/i.test(candidate)
    ? candidate
    : "unknown";
}

export function durationBucket(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "unknown";
  if (value < 100) return "lt-100ms";
  if (value < 500) return "100-499ms";
  if (value < 1_000) return "500-999ms";
  if (value < 2_500) return "1-2.49s";
  return "gte-2.5s";
}

function safeDigest(value: unknown): string {
  if (typeof value !== "string") return "none";
  return /^[a-zA-Z0-9._-]{1,64}$/.test(value) ? value : "withheld";
}

function fingerprint(input: string): string {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return `f-${(value >>> 0).toString(16).padStart(8, "0")}`;
}

function correlationId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID)
    return `c-${cryptoApi.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  return `c-${Math.random().toString(36).slice(2, 14).padEnd(12, "0")}`;
}

export function createErrorObservation(input: {
  source: ObservationSource;
  route?: string;
  code: string;
  error?: unknown;
  category?: ObservationCategory;
  severity?: ObservationSeverity;
  environment?: string;
  release?: string;
}): ObservationEventV1 {
  const candidate = input.error as { name?: unknown; digest?: unknown } | null;
  const name =
    candidate &&
    typeof candidate.name === "string" &&
    /^(?:Error|[A-Za-z]+(?:Error|Exception))$/.test(candidate.name)
      ? candidate.name
      : "UnknownError";
  const code = /^[a-z0-9._-]{1,64}$/.test(input.code)
    ? input.code
    : "unexpected_error";
  const routeTemplate = routeTemplateFromPath(input.route);
  const category = input.category ?? "unexpected";
  return {
    schemaVersion: OBSERVATION_SCHEMA_VERSION,
    type: "error",
    source: input.source,
    category,
    severity: input.severity ?? (category === "cancelled" ? "info" : "error"),
    environment: safeEnvironment(input.environment),
    release: safeRelease(input.release),
    routeTemplate,
    code,
    correlationId: correlationId(),
    fingerprint: fingerprint(
      `${input.source}:${routeTemplate}:${code}:${name}:${safeDigest(candidate?.digest)}`,
    ),
    count: 1,
  };
}

export function createMetricObservation(input: {
  route?: string;
  name: string;
  value: number;
  rating?: string;
  environment?: string;
  release?: string;
}): ObservationEventV1 | null {
  if (!["TTFB", "FCP", "LCP", "FID", "CLS", "INP"].includes(input.name))
    return null;
  const value = Math.max(0, Math.min(input.value, 10_000_000));
  const routeTemplate = routeTemplateFromPath(input.route);
  const metricName = input.name as ObservationEventV1["metricName"];
  const rating = ["good", "needs-improvement", "poor"].includes(
    input.rating ?? "",
  )
    ? (input.rating as ObservationEventV1["metricRating"])
    : "unknown";
  return {
    schemaVersion: OBSERVATION_SCHEMA_VERSION,
    type: "web_vital",
    source: "next_web_vitals",
    category: "performance",
    severity: rating === "poor" ? "warning" : "info",
    environment: safeEnvironment(input.environment),
    release: safeRelease(input.release),
    routeTemplate,
    code: `web_vital_${input.name.toLowerCase()}`,
    correlationId: correlationId(),
    fingerprint: fingerprint(`vital:${routeTemplate}:${input.name}`),
    count: 1,
    durationBucket: input.name === "CLS" ? undefined : durationBucket(value),
    metricName,
    metricValue: Math.round(value * 1000) / 1000,
    metricRating: rating,
  };
}

/** Unknown diagnostics are described, never serialized. */
export function diagnosticShape(value: unknown): unknown {
  if (value === null) return "null";
  if (Array.isArray(value))
    return { kind: "array", length: Math.min(value.length, 999) };
  if (value instanceof Error)
    return {
      kind: "error",
      name: /^(?:Error|[A-Za-z]+(?:Error|Exception))$/.test(value.name)
        ? value.name
        : "UnknownError",
      digest: safeDigest((value as Error & { digest?: unknown }).digest),
    };
  if (typeof value === "object")
    return { kind: "object", keys: Math.min(Object.keys(value).length, 999) };
  return { kind: typeof value };
}
