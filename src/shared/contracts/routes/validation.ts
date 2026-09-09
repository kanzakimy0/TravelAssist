import {
  ROUTE_CONTRACT_VERSION,
  type Coordinates,
  type RouteAlternative,
  type RouteError,
  type RouteRequest,
  type RouteResponse,
} from "./index";

export interface RouteValidationResult {
  valid: boolean;
  issues: readonly string[];
}

const REQUEST_KEYS = new Set([
  "version",
  "requestId",
  "origin",
  "destination",
  "waypoints",
  "modeFamily",
  "requestedModes",
  "timeIntent",
  "locale",
  "timezone",
  "alternatives",
  "preferences",
]);
const RESPONSE_KEYS = new Set([
  "version",
  "requestId",
  "alternatives",
  "source",
]);
const PRIVATE_KEYS =
  /^(raw|payload|providerPayload|accessKey|secret|token|serializeData)$/i;
const ROUTE_MODES = new Set([
  "walk",
  "rail",
  "subway",
  "bus",
  "tram",
  "ferry",
  "flight",
  "transfer",
  "wait",
  "other",
]);
const MODE_FAMILIES = new Set([
  "transit",
  "walking",
  "driving",
  "cycling",
  "mixed",
]);
const ALTERNATIVE_PREFERENCES = new Set([
  "balanced",
  "fastest",
  "fewest_transfers",
  "lowest_fare",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walkPrivateKeys(value: unknown, path: string, issues: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkPrivateKeys(item, `${path}[${index}]`, issues),
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_KEYS.test(key))
      issues.push(`${path}.${key} is private provider data`);
    walkPrivateKeys(child, `${path}.${key}`, issues);
  }
}

function unknownTopLevelKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  issues: string[],
) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`unknown top-level field: ${key}`);
  }
}

function validCoordinates(value: unknown): value is Coordinates {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1]) &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function validatePlace(value: unknown, path: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`${path} must be an object`);
    return;
  }
  const coordinates = value.coordinates;
  if (coordinates !== null && !validCoordinates(coordinates))
    issues.push(`${path}.coordinates is invalid`);
  const hasReference =
    typeof value.referenceId === "string" && value.referenceId.length > 0;
  const hasName =
    typeof value.displayName === "string" && value.displayName.length > 0;
  if (
    value.referenceId !== null &&
    (typeof value.referenceId !== "string" ||
      value.referenceId.length === 0 ||
      value.referenceId.length > 160)
  )
    issues.push(`${path}.referenceId is invalid`);
  if (
    value.displayName !== null &&
    (typeof value.displayName !== "string" || value.displayName.length > 160)
  )
    issues.push(`${path}.displayName is invalid`);
  if (!hasReference && !hasName && coordinates === null)
    issues.push(`${path} needs a reference, name, or coordinates`);
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function localMinuteParts(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function nonNegativeIntegerOrNull(
  value: unknown,
  path: string,
  issues: string[],
) {
  if (value !== null && (!Number.isInteger(value) || (value as number) < 0))
    issues.push(`${path} must be a non-negative integer or null`);
}

function validateGeometry(value: unknown, path: string, issues: string[]) {
  if (value === null) return;
  if (
    !isRecord(value) ||
    value.type !== "LineString" ||
    !Array.isArray(value.coordinates)
  ) {
    issues.push(`${path} must be a GeoJSON LineString or null`);
    return;
  }
  if (
    value.coordinates.length < 2 ||
    !value.coordinates.every(validCoordinates)
  )
    issues.push(
      `${path}.coordinates must contain at least two valid positions`,
    );
}

function validateMoney(value: unknown, path: string, issues: string[]) {
  if (value === null) return;
  if (!isRecord(value)) return issues.push(`${path} must be money or null`);
  if (!Number.isInteger(value.amountMinor) || Number(value.amountMinor) < 0)
    issues.push(`${path}.amountMinor must be a non-negative integer`);
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency))
    issues.push(`${path}.currency must be ISO 4217 uppercase`);
}

function validateTimeline(
  departure: unknown,
  arrival: unknown,
  path: string,
  issues: string[],
) {
  for (const [name, value] of [
    ["departure", departure],
    ["arrival", arrival],
  ] as const) {
    if (value === null) continue;
    if (
      !isRecord(value) ||
      !validInstant(value.instant) ||
      !validTimezone(value.timezone)
    )
      issues.push(`${path}.${name} is invalid`);
  }
  if (
    isRecord(departure) &&
    isRecord(arrival) &&
    validInstant(departure.instant) &&
    validInstant(arrival.instant) &&
    Date.parse(arrival.instant) < Date.parse(departure.instant)
  )
    issues.push(`${path} has reversed times`);
}

export function validateRouteRequest(value: unknown): RouteValidationResult {
  const issues: string[] = [];
  if (!isRecord(value))
    return { valid: false, issues: ["request must be an object"] };
  unknownTopLevelKeys(value, REQUEST_KEYS, issues);
  walkPrivateKeys(value, "request", issues);
  if (value.version !== ROUTE_CONTRACT_VERSION)
    issues.push("unsupported contract version");
  if (
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    value.requestId.length > 128
  )
    issues.push("requestId is required");
  validatePlace(value.origin, "origin", issues);
  validatePlace(value.destination, "destination", issues);
  if (!Array.isArray(value.waypoints))
    issues.push("waypoints must be an array");
  else if (value.waypoints.length > 8)
    issues.push("waypoints must contain at most 8 places");
  else
    value.waypoints.forEach((place, index) =>
      validatePlace(place, `waypoints[${index}]`, issues),
    );
  if (!MODE_FAMILIES.has(String(value.modeFamily)))
    issues.push("modeFamily is invalid");
  if (!Array.isArray(value.requestedModes) || value.requestedModes.length === 0)
    issues.push("requestedModes must not be empty");
  else {
    if (value.requestedModes.length > ROUTE_MODES.size)
      issues.push("requestedModes contains too many entries");
    if (!value.requestedModes.every((mode) => ROUTE_MODES.has(String(mode))))
      issues.push("requestedModes contains an unsupported value");
    if (new Set(value.requestedModes).size !== value.requestedModes.length)
      issues.push("requestedModes must not contain duplicates");
  }
  if (!isRecord(value.timeIntent)) issues.push("timeIntent must be an object");
  else {
    if (!["departure_at", "arrival_by"].includes(String(value.timeIntent.kind)))
      issues.push("timeIntent.kind is invalid");
    if (!validInstant(value.timeIntent.instant))
      issues.push("timeIntent.instant is invalid");
    if (!validTimezone(value.timeIntent.timezone))
      issues.push("timeIntent.timezone is invalid");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value.timeIntent.localDate)))
      issues.push("timeIntent.localDate must be YYYY-MM-DD");
    if (!/^\d{2}:\d{2}$/.test(String(value.timeIntent.localTime)))
      issues.push("timeIntent.localTime must be HH:mm");
    if (
      validInstant(value.timeIntent.instant) &&
      validTimezone(value.timeIntent.timezone) &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(value.timeIntent.localDate)) &&
      /^\d{2}:\d{2}$/.test(String(value.timeIntent.localTime))
    ) {
      const local = localMinuteParts(
        value.timeIntent.instant,
        value.timeIntent.timezone,
      );
      if (
        local.date !== value.timeIntent.localDate ||
        local.time !== value.timeIntent.localTime
      )
        issues.push("timeIntent local fields do not match its instant");
    }
  }
  if (!validTimezone(value.timezone)) issues.push("timezone is invalid");
  else if (
    isRecord(value.timeIntent) &&
    value.timeIntent.timezone !== value.timezone
  )
    issues.push("timezone must match timeIntent.timezone");
  if (
    value.locale !== null &&
    (typeof value.locale !== "string" || value.locale.length > 35)
  )
    issues.push("locale is invalid");
  if (!isRecord(value.alternatives))
    issues.push("alternatives must be an object");
  else {
    if (
      !Number.isInteger(value.alternatives.max) ||
      Number(value.alternatives.max) < 1 ||
      Number(value.alternatives.max) > 20
    )
      issues.push("alternatives.max must be between 1 and 20");
    if (!ALTERNATIVE_PREFERENCES.has(String(value.alternatives.preference)))
      issues.push("alternatives.preference is invalid");
  }
  if (!isRecord(value.preferences))
    issues.push("preferences must be an object");
  else {
    const walking = value.preferences.maxWalkingMeters;
    if (
      walking !== null &&
      (!Number.isInteger(walking) ||
        Number(walking) < 0 ||
        Number(walking) > 100000)
    )
      issues.push("preferences.maxWalkingMeters is invalid");
    const accessibility = value.preferences.accessibility;
    if (accessibility !== null && !isRecord(accessibility))
      issues.push("preferences.accessibility must be an object or null");
    else if (isRecord(accessibility))
      for (const key of ["wheelchair", "avoidStairs"])
        if (
          accessibility[key] !== null &&
          typeof accessibility[key] !== "boolean"
        )
          issues.push(`preferences.accessibility.${key} is invalid`);
  }
  return { valid: issues.length === 0, issues };
}

function validateAlternative(
  value: RouteAlternative,
  path: string,
  issues: string[],
) {
  nonNegativeIntegerOrNull(
    value.durationSeconds,
    `${path}.durationSeconds`,
    issues,
  );
  nonNegativeIntegerOrNull(
    value.distanceMeters,
    `${path}.distanceMeters`,
    issues,
  );
  validateMoney(value.fare, `${path}.fare`, issues);
  validateGeometry(value.geometry, `${path}.geometry`, issues);
  validateTimeline(value.departure, value.arrival, path, issues);

  if (
    !Array.isArray(value.legs) ||
    !Array.isArray(value.segments) ||
    !Array.isArray(value.steps)
  ) {
    issues.push(`${path} must contain legs, segments, and steps arrays`);
    return;
  }
  const legIds = new Set<string>();
  const segmentIds = new Set<string>();
  const stepIds = new Set<string>();
  for (const leg of value.legs) {
    if (legIds.has(leg.id))
      issues.push(`${path} has duplicate leg id ${leg.id}`);
    legIds.add(leg.id);
    nonNegativeIntegerOrNull(
      leg.durationSeconds,
      `${path}.leg.durationSeconds`,
      issues,
    );
    nonNegativeIntegerOrNull(
      leg.distanceMeters,
      `${path}.leg.distanceMeters`,
      issues,
    );
    validateTimeline(leg.departure, leg.arrival, `${path}.leg`, issues);
    validateGeometry(leg.geometry, `${path}.leg.geometry`, issues);
  }
  for (const segment of value.segments) {
    if (segmentIds.has(segment.id))
      issues.push(`${path} has duplicate segment id ${segment.id}`);
    segmentIds.add(segment.id);
    nonNegativeIntegerOrNull(
      segment.durationSeconds,
      `${path}.segment.durationSeconds`,
      issues,
    );
    nonNegativeIntegerOrNull(
      segment.distanceMeters,
      `${path}.segment.distanceMeters`,
      issues,
    );
    validateTimeline(
      segment.departure,
      segment.arrival,
      `${path}.segment`,
      issues,
    );
    validateGeometry(segment.geometry, `${path}.segment.geometry`, issues);
  }
  for (const step of value.steps) {
    if (stepIds.has(step.id))
      issues.push(`${path} has duplicate step id ${step.id}`);
    stepIds.add(step.id);
    nonNegativeIntegerOrNull(
      step.durationSeconds,
      `${path}.step.durationSeconds`,
      issues,
    );
    nonNegativeIntegerOrNull(
      step.distanceMeters,
      `${path}.step.distanceMeters`,
      issues,
    );
    validateGeometry(step.geometry, `${path}.step.geometry`, issues);
  }
  for (const leg of value.legs)
    for (const id of leg.segmentIds)
      if (!segmentIds.has(id))
        issues.push(`${path} has dangling segment reference ${id}`);
  for (const segment of value.segments)
    for (const id of segment.stepIds)
      if (!stepIds.has(id))
        issues.push(`${path} has dangling step reference ${id}`);
}

export function validateRouteResponse(value: unknown): RouteValidationResult {
  const issues: string[] = [];
  if (!isRecord(value))
    return { valid: false, issues: ["response must be an object"] };
  unknownTopLevelKeys(value, RESPONSE_KEYS, issues);
  walkPrivateKeys(value, "response", issues);
  if (value.version !== ROUTE_CONTRACT_VERSION)
    issues.push("unsupported contract version");
  if (!Array.isArray(value.alternatives))
    issues.push("alternatives must be an array");
  else {
    const ids = new Set<string>();
    for (const [index, alternative] of value.alternatives.entries()) {
      if (!isRecord(alternative)) {
        issues.push(`alternatives[${index}] must be an object`);
        continue;
      }
      const typed = alternative as unknown as RouteAlternative;
      if (ids.has(typed.id)) issues.push(`duplicate route id ${typed.id}`);
      ids.add(typed.id);
      validateAlternative(typed, `alternatives[${index}]`, issues);
    }
  }
  if (!isRecord(value.source) || !validInstant(value.source.fetchedAt))
    issues.push("source.fetchedAt is invalid");
  return { valid: issues.length === 0, issues };
}

export function validateRouteError(value: unknown): RouteValidationResult {
  const issues: string[] = [];
  if (!isRecord(value))
    return { valid: false, issues: ["error must be an object"] };
  walkPrivateKeys(value, "error", issues);
  const codes: RouteError["code"][] = [
    "invalid_request",
    "unsupported_mode",
    "no_route",
    "provider_unavailable",
    "provider_timeout",
    "provider_rate_limited",
    "provider_auth",
    "provider_contract_error",
    "normalization_error",
    "unknown",
  ];
  if (!codes.includes(value.code as RouteError["code"]))
    issues.push("unknown error code");
  if (typeof value.retryable !== "boolean")
    issues.push("retryable must be boolean");
  return { valid: issues.length === 0, issues };
}

export function assertRouteRequest(
  value: unknown,
): asserts value is RouteRequest {
  const result = validateRouteRequest(value);
  if (!result.valid) throw new TypeError(result.issues.join("; "));
}

export function assertRouteResponse(
  value: unknown,
): asserts value is RouteResponse {
  const result = validateRouteResponse(value);
  if (!result.valid) throw new TypeError(result.issues.join("; "));
}
