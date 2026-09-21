import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { parseTripPlanSnapshot } from "../../shared/contracts/trips";
import {
  verifiedPrivateRequest,
  PRIVATE_API_HEADERS,
  readPrivateJson,
} from "../private-http";
import { createTripRepository } from "../trips/repository";
import { TripPersistenceError } from "../trips/projection";

export type PlannerCanonicalErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_UNAVAILABLE"
  | "FORBIDDEN"
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_CANONICAL_TRIP"
  | "CANONICAL_TRIP_NOT_FOUND"
  | "STALE_CANONICAL_REVISION"
  | "CANONICAL_TRIP_UNAVAILABLE";

export const plannerCanonicalStatuses: Record<
  PlannerCanonicalErrorCode,
  number
> = {
  AUTH_REQUIRED: 401,
  AUTH_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  INVALID_CANONICAL_TRIP: 400,
  CANONICAL_TRIP_NOT_FOUND: 404,
  STALE_CANONICAL_REVISION: 409,
  CANONICAL_TRIP_UNAVAILABLE: 503,
};

class PlannerCanonicalHttpError extends Error {
  readonly code: PlannerCanonicalErrorCode;
  constructor(code: PlannerCanonicalErrorCode) {
    super(code);
    this.code = code;
  }
}
function fail(code: PlannerCanonicalErrorCode): never {
  throw new PlannerCanonicalHttpError(code);
}
function exactSaveRequest(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return fail("INVALID_REQUEST");
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).length !== 2 ||
    value.schemaVersion !== "1.0" ||
    !Object.hasOwn(value, "snapshot")
  )
    return fail("INVALID_REQUEST");
  const parsed = parseTripPlanSnapshot(value.snapshot);
  if (!parsed.ok) return fail("INVALID_CANONICAL_TRIP");
  return parsed.value;
}
function mapTripError(error: unknown): PlannerCanonicalErrorCode {
  if (error instanceof PlannerCanonicalHttpError) return error.code;
  if (!(error instanceof TripPersistenceError))
    return "CANONICAL_TRIP_UNAVAILABLE";
  if (error.code === "UNAUTHENTICATED") return "AUTH_REQUIRED";
  if (error.code === "NOT_FOUND") return "CANONICAL_TRIP_NOT_FOUND";
  if (error.code === "STALE_TRIP" || error.code === "STALE_PLAN")
    return "STALE_CANONICAL_REVISION";
  if (error.code === "INVALID_CONTRACT" || error.code === "UUID_REQUIRED")
    return "INVALID_CANONICAL_TRIP";
  return "CANONICAL_TRIP_UNAVAILABLE";
}

/**
 * The Planner's only Canonical HTTP boundary. It delegates all ownership,
 * RLS, transaction and CAS behaviour to the accepted WBS 8.5 repository.
 */
export async function handlePlannerCanonicalTrip(
  request: NextRequest,
  id: string,
  action: "read" | "save",
) {
  let finish: ((response: NextResponse) => NextResponse) | undefined;
  const respond = (body: unknown, status: number, revision?: number) => {
    let response = NextResponse.json(body, { status });
    if (finish) response = finish(response);
    for (const [key, value] of Object.entries(PRIVATE_API_HEADERS))
      response.headers.set(key, value);
    if (revision !== undefined) response.headers.set("ETag", `\"${revision}\"`);
    return response;
  };
  try {
    const body =
      action === "save"
        ? await readPrivateJson(
            request,
            (code) => new PlannerCanonicalHttpError(code),
            4 * 1024 * 1024 + 1024,
          )
        : undefined;
    const authenticated = await verifiedPrivateRequest(
      request,
      action === "save",
      (code) => new PlannerCanonicalHttpError(code),
      (next) => {
        finish = next;
      },
    );
    const repository = createTripRepository(authenticated.client);
    if (action === "read") {
      const snapshot = await repository.read(id);
      const parsed = parseTripPlanSnapshot(snapshot);
      if (!parsed.ok) return fail("CANONICAL_TRIP_UNAVAILABLE");
      return respond(
        { ok: true, data: parsed.value },
        200,
        parsed.value.trip.revision,
      );
    }
    const snapshot = exactSaveRequest(body);
    if (snapshot.trip.id !== id) return fail("INVALID_CANONICAL_TRIP");
    const saved = await repository.replace(snapshot);
    const parsed = parseTripPlanSnapshot(saved);
    if (!parsed.ok) return fail("CANONICAL_TRIP_UNAVAILABLE");
    return respond(
      { ok: true, data: parsed.value },
      200,
      parsed.value.trip.revision,
    );
  } catch (error) {
    const code = mapTripError(error);
    return respond(
      { ok: false, error: { code } },
      plannerCanonicalStatuses[code],
    );
  }
}
