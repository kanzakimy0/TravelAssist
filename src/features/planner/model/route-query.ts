import {
  ROUTE_CONTRACT_VERSION,
  type RoutePlaceRef,
  type RouteRequest,
  type RouteResult,
  type RouteResponse,
} from "../../../shared/contracts/routes";
import {
  validateRouteError,
  validateRouteResponse,
} from "../../../shared/contracts/routes/validation";
import { PLANNER_VERIFIED_STATIONS } from "../../../shared/routing/planner-verified-stations";
import type { PlannerPlace } from "./trip-model";

export const PLANNER_ROUTE_TIMEZONE = "Asia/Tokyo" as const;

export interface VerifiedPlannerStation {
  kind: "verified_station";
  provider: "ekiworld";
  referenceId: string | null;
  displayName: string;
  evidenceUrl: string;
}

export type PlannerRouteEndpoint =
  | VerifiedPlannerStation
  | {
      kind: "unresolved";
      reason: "ambiguous_station" | "not_a_station" | "missing_place";
      displayName: string;
    };

export interface PlannerRouteSnapshot {
  tripId: "browser-planner-fixture";
  planId: string;
  day: number;
  segmentId: string;
  origin: VerifiedPlannerStation;
  destination: VerifiedPlannerStation;
  localDate: string;
  localTime: string;
  mode: "transit";
  key: string;
}

export function plannerRouteEndpoint(
  place: Pick<PlannerPlace, "name" | "planningPlaceholder"> | undefined,
): PlannerRouteEndpoint {
  if (!place)
    return { kind: "unresolved", reason: "missing_place", displayName: "" };
  if (place.planningPlaceholder)
    return {
      kind: "unresolved",
      reason: "not_a_station",
      displayName: place.name,
    };
  const verified = PLANNER_VERIFIED_STATIONS[place.name];
  if (verified)
    return {
      kind: "verified_station",
      ...verified,
    };
  return {
    kind: "unresolved",
    reason: /浅草|机场|湖畔|酒店|午餐|旅馆|游船/.test(place.name)
      ? "ambiguous_station"
      : "not_a_station",
    displayName: place.name,
  };
}

function routePlace(endpoint: VerifiedPlannerStation): RoutePlaceRef {
  return {
    referenceId: endpoint.referenceId,
    displayName: endpoint.displayName,
    coordinates: null,
  };
}

export function plannerRouteSnapshot(input: {
  planId: string;
  day: number;
  segmentId: string;
  originPlace: PlannerPlace | undefined;
  destinationPlace: PlannerPlace | undefined;
  localDate: string;
  localTime: string;
}):
  | { ok: true; value: PlannerRouteSnapshot }
  | {
      ok: false;
      origin: PlannerRouteEndpoint;
      destination: PlannerRouteEndpoint;
    } {
  const origin = plannerRouteEndpoint(input.originPlace);
  const destination = plannerRouteEndpoint(input.destinationPlace);
  if (
    origin.kind !== "verified_station" ||
    destination.kind !== "verified_station"
  )
    return { ok: false, origin, destination };
  const key = JSON.stringify([
    "browser-planner-fixture",
    input.planId,
    input.day,
    input.segmentId,
    origin.displayName,
    origin.referenceId,
    destination.displayName,
    destination.referenceId,
    input.localDate,
    input.localTime,
    "transit",
  ]);
  return {
    ok: true,
    value: {
      tripId: "browser-planner-fixture",
      planId: input.planId,
      day: input.day,
      segmentId: input.segmentId,
      origin,
      destination,
      localDate: input.localDate,
      localTime: input.localTime,
      mode: "transit",
      key,
    },
  };
}

export function routeRequestFromSnapshot(
  snapshot: PlannerRouteSnapshot,
  sequence: number,
): RouteRequest {
  const instant = new Date(
    `${snapshot.localDate}T${snapshot.localTime}:00+09:00`,
  ).toISOString();
  return {
    version: ROUTE_CONTRACT_VERSION,
    requestId: `planner-${snapshot.planId}-${snapshot.day}-${sequence}`.slice(
      0,
      128,
    ),
    origin: routePlace(snapshot.origin),
    destination: routePlace(snapshot.destination),
    waypoints: [],
    modeFamily: "transit",
    requestedModes: ["walk", "rail", "subway", "bus", "other"],
    timeIntent: {
      kind: "departure_at",
      instant,
      timezone: PLANNER_ROUTE_TIMEZONE,
      localDate: snapshot.localDate,
      localTime: snapshot.localTime,
    },
    locale: "ja-JP",
    timezone: PLANNER_ROUTE_TIMEZONE,
    alternatives: { max: 3, preference: "balanced" },
    preferences: {
      maxWalkingMeters: null,
      accessibility: { wheelchair: null, avoidStairs: null },
    },
  };
}

export function routeResultCanApply(input: {
  currentSnapshotKey: string | null;
  expectedSnapshotKey: string;
  currentSequence: number;
  requestSequence: number;
  aborted: boolean;
}) {
  return (
    !input.aborted &&
    input.currentSequence === input.requestSequence &&
    input.currentSnapshotKey === input.expectedSnapshotKey
  );
}

export async function fetchPlannerRoute(
  request: RouteRequest,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<RouteResult<RouteResponse>> {
  const response = await fetchImpl("/api/routes/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(request),
    signal,
  });
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("ok" in result))
    throw new TypeError("Route endpoint returned an invalid envelope.");
  const typed = result as RouteResult<RouteResponse>;
  const validation = typed.ok
    ? validateRouteResponse(typed.value)
    : validateRouteError(typed.error);
  if (!validation.valid)
    throw new TypeError("Route endpoint returned an invalid canonical result.");
  return typed;
}

export function routeResultSummary(
  result: RouteResponse,
  selectedAlternativeId?: string | null,
) {
  const route =
    result.alternatives.find(
      (alternative) => alternative.id === selectedAlternativeId,
    ) ?? result.alternatives[0];
  if (!route) return null;
  return {
    duration:
      route.durationSeconds === null
        ? "耗时未知"
        : `${Math.round(route.durationSeconds / 60)} 分`,
    transfers: Math.max(
      0,
      route.segments.filter((segment) => segment.mode !== "walk").length - 1,
    ),
    distance:
      route.distanceMeters === null
        ? "距离未知"
        : `${(route.distanceMeters / 1000).toFixed(1)} km`,
    departure: route.departure?.instant ?? null,
    arrival: route.arrival?.instant ?? null,
    fare:
      route.fare === null
        ? "票价未知"
        : new Intl.NumberFormat("ja-JP", {
            style: "currency",
            currency: route.fare.currency,
            maximumFractionDigits: 0,
          }).format(route.fare.amountMinor),
    source: result.source.provider,
    entitlement: result.source.entitlement,
    queriedAt: result.source.fetchedAt,
    geometryAvailable: route.geometry !== null,
  };
}
