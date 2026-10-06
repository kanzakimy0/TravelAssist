import { parseTripPlanSnapshot } from "../trips/index";
import {
  TripLibraryApiError,
  tripLibraryErrorStatuses,
  tripIfMatch,
  type TripLibraryErrorCode,
  type TripPersistenceHandleV1,
  type TripSavePlanRequestV1,
  type TripSavePlanResultV1,
} from "./index";
export type TripTransport = typeof fetch;
export function tripResourcePath(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new TripLibraryApiError("INVALID_REQUEST");
  return "/api/trip-library/" + id.toLowerCase();
}
/** Same-origin Cookie transport. Auth credentials remain in the existing HttpOnly session. */
export async function requestTripApi(
  path: string,
  method: string,
  body: unknown,
  revision: number | undefined,
  transport: TripTransport = fetch,
) {
  let response: Response;
  try {
    response = await transport(path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(revision === undefined
          ? {}
          : { "If-Match": tripIfMatch(revision) }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  }
  if (response.status === 204) return { data: null, etag: null };
  let parsed;
  try {
    parsed = await response.json();
  } catch {
    throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  }
  if (!response.ok || parsed?.ok !== true) {
    const code = parsed?.error?.code;
    throw new TripLibraryApiError(
      typeof code === "string" && Object.hasOwn(tripLibraryErrorStatuses, code)
        ? (code as TripLibraryErrorCode)
        : "TRIP_LIBRARY_UNAVAILABLE",
    );
  }
  return { data: parsed.data as unknown, etag: response.headers.get("etag") };
}
export async function saveTripPlan(
  handle: TripPersistenceHandleV1,
  request: TripSavePlanRequestV1,
  transport: TripTransport = fetch,
): Promise<TripSavePlanResultV1> {
  const plan = parseTripPlanSnapshot(request.planSnapshot);
  if (!plan.ok) throw new TripLibraryApiError("INVALID_TRIP_PLAN_INPUT");
  const result = await requestTripApi(
    tripResourcePath(handle.recordId) + "/save",
    "POST",
    { schemaVersion: "1.0", planSnapshot: plan.value },
    handle.storageRevision,
    transport,
  );
  const data = result.data as Record<string, unknown> | null;
  if (
    !data ||
    data.schemaVersion !== "1.0" ||
    data.id !== handle.recordId.toLowerCase() ||
    data.libraryState !== "saved" ||
    data.canonicalTripId !== plan.value.trip.id ||
    typeof data.storageRevision !== "number" ||
    result.etag !== tripIfMatch(data.storageRevision) ||
    typeof data.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(data.updatedAt))
  )
    throw new TripLibraryApiError("TRIP_LIBRARY_UNAVAILABLE");
  return {
    recordId: data.id as string,
    canonicalTripId: data.canonicalTripId as string,
    libraryState: "saved",
    storageRevision: data.storageRevision,
    updatedAt: data.updatedAt,
  };
}
