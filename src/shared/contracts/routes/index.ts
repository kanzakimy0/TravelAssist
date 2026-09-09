export const ROUTE_CONTRACT_VERSION = "1.0" as const;

export type RouteContractVersion = typeof ROUTE_CONTRACT_VERSION;
export type Coordinates = readonly [longitude: number, latitude: number];

export type RouteMode =
  | "walk"
  | "rail"
  | "subway"
  | "bus"
  | "tram"
  | "ferry"
  | "flight"
  | "transfer"
  | "wait"
  | "other";

export type RouteModeFamily =
  "transit" | "walking" | "driving" | "cycling" | "mixed";

export interface RoutePlaceRef {
  referenceId: string | null;
  displayName: string | null;
  coordinates: Coordinates | null;
}

export interface RouteTimeIntent {
  kind: "departure_at" | "arrival_by";
  instant: string;
  timezone: string;
  localDate: string;
  localTime: string;
}

export interface RouteRequest {
  version: RouteContractVersion;
  requestId: string;
  origin: RoutePlaceRef;
  destination: RoutePlaceRef;
  waypoints: readonly RoutePlaceRef[];
  modeFamily: RouteModeFamily;
  requestedModes: readonly RouteMode[];
  timeIntent: RouteTimeIntent;
  locale: string | null;
  timezone: string;
  alternatives: {
    max: number;
    preference: "balanced" | "fastest" | "fewest_transfers" | "lowest_fare";
  };
  preferences: {
    maxWalkingMeters: number | null;
    accessibility: {
      wheelchair: boolean | null;
      avoidStairs: boolean | null;
    } | null;
  };
}

export interface RouteInstant {
  instant: string;
  timezone: string;
}

export interface RouteMoney {
  amountMinor: number;
  currency: string;
}

export interface RouteLineString {
  type: "LineString";
  coordinates: readonly Coordinates[];
}

export interface RouteStop {
  referenceId: string | null;
  name: string | null;
  coordinates: Coordinates | null;
  platform: string | null;
}

export interface RouteTransitMetadata {
  operatorName: string | null;
  lineName: string | null;
  routeName: string | null;
  serviceName: string | null;
  trainNumber: string | null;
  originStop: RouteStop | null;
  destinationStop: RouteStop | null;
  departurePlatform: string | null;
  arrivalPlatform: string | null;
  stopCount: number | null;
  direction: string | null;
  destinationSign: string | null;
  fare: RouteMoney | null;
  reservation: "required" | "recommended" | "not_required" | "unknown";
  seat: string | null;
}

export interface RouteStep {
  id: string;
  mode: RouteMode;
  sourceMode: string | null;
  instruction: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  geometry: RouteLineString | null;
  transit: RouteTransitMetadata | null;
}

export interface RouteSegment {
  id: string;
  mode: RouteMode;
  sourceMode: string | null;
  origin: RouteStop | null;
  destination: RouteStop | null;
  departure: RouteInstant | null;
  arrival: RouteInstant | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  geometry: RouteLineString | null;
  transit: RouteTransitMetadata | null;
  stepIds: readonly string[];
}

export interface RouteLeg {
  id: string;
  origin: RouteStop;
  destination: RouteStop;
  departure: RouteInstant | null;
  arrival: RouteInstant | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  geometry: RouteLineString | null;
  segmentIds: readonly string[];
}

export interface RouteAlternative {
  id: string;
  providerReference: string | null;
  summary: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  departure: RouteInstant | null;
  arrival: RouteInstant | null;
  fare: RouteMoney | null;
  geometry: RouteLineString | null;
  legs: readonly RouteLeg[];
  segments: readonly RouteSegment[];
  steps: readonly RouteStep[];
  warnings: readonly string[];
  notices: readonly string[];
}

export interface RouteSourceMetadata {
  provider: string;
  entitlement: "evaluation" | "production";
  fetchedAt: string;
  freshness: "live" | "estimated" | "unknown";
  diagnosticFingerprint: string | null;
}

export interface RouteResponse {
  version: RouteContractVersion;
  requestId: string;
  alternatives: readonly RouteAlternative[];
  source: RouteSourceMetadata;
}

export type RouteErrorCode =
  | "invalid_request"
  | "unsupported_mode"
  | "no_route"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_auth"
  | "provider_contract_error"
  | "normalization_error"
  | "unknown";

export type RouteErrorCategory =
  "request" | "availability" | "no_result" | "provider" | "internal";

export interface RouteError {
  code: RouteErrorCode;
  retryable: boolean;
  category: RouteErrorCategory;
  message: string;
  diagnosticFingerprint: string | null;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
}

export type RouteResult<T = RouteResponse> =
  { ok: true; value: T } | { ok: false; error: RouteError };
