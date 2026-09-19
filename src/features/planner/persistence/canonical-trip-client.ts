import {
  parseTripPlanSnapshot,
  type TripPlanSnapshotV1,
} from "../../../shared/contracts/trips";

export type PlannerCanonicalClientErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_UNAVAILABLE"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_CANONICAL_TRIP"
  | "CANONICAL_TRIP_NOT_FOUND"
  | "STALE_CANONICAL_REVISION"
  | "CANONICAL_TRIP_UNAVAILABLE";

export class PlannerCanonicalClientError extends Error {
  readonly code: PlannerCanonicalClientErrorCode;
  constructor(code: PlannerCanonicalClientErrorCode) {
    super(code);
    this.code = code;
  }
}
export type PlannerCanonicalTransport = typeof fetch;
export type PlannerCanonicalResource = {
  snapshot: TripPlanSnapshotV1;
  revision: number;
};
function endpoint(id: string) {
  return `/api/planner/trips/${encodeURIComponent(id)}`;
}
function errorCode(value: unknown): PlannerCanonicalClientErrorCode {
  const code =
    value && typeof value === "object" && "error" in value
      ? (value as { error?: { code?: unknown } }).error?.code
      : undefined;
  return typeof code === "string" &&
    [
      "AUTH_REQUIRED",
      "AUTH_UNAVAILABLE",
      "FORBIDDEN",
      "INVALID_REQUEST",
      "PAYLOAD_TOO_LARGE",
      "INVALID_CANONICAL_TRIP",
      "CANONICAL_TRIP_NOT_FOUND",
      "STALE_CANONICAL_REVISION",
      "CANONICAL_TRIP_UNAVAILABLE",
    ].includes(code)
    ? (code as PlannerCanonicalClientErrorCode)
    : "CANONICAL_TRIP_UNAVAILABLE";
}
async function request(
  transport: PlannerCanonicalTransport,
  id: string,
  method: "GET" | "PUT",
  snapshot?: TripPlanSnapshotV1,
): Promise<PlannerCanonicalResource> {
  let response: Response;
  try {
    response = await transport(endpoint(id), {
      method,
      cache: "no-store",
      ...(snapshot
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ schemaVersion: "1.0", snapshot }),
          }
        : {}),
    });
  } catch {
    throw new PlannerCanonicalClientError("CANONICAL_TRIP_UNAVAILABLE");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PlannerCanonicalClientError("CANONICAL_TRIP_UNAVAILABLE");
  }
  if (!response.ok) throw new PlannerCanonicalClientError(errorCode(body));
  const data =
    body && typeof body === "object" && "data" in body
      ? (body as { data?: unknown }).data
      : undefined;
  const parsed = parseTripPlanSnapshot(data);
  if (
    !parsed.ok ||
    response.headers.get("etag") !== `\"${parsed.value.trip.revision}\"`
  )
    throw new PlannerCanonicalClientError("CANONICAL_TRIP_UNAVAILABLE");
  return { snapshot: parsed.value, revision: parsed.value.trip.revision };
}

export function plannerCanonicalClient(
  transport: PlannerCanonicalTransport = fetch,
) {
  return {
    read: (id: string) => request(transport, id, "GET"),
    save: (id: string, snapshot: TripPlanSnapshotV1) =>
      request(transport, id, "PUT", snapshot),
  };
}
