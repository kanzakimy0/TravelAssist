import "server-only";

import type {
  RouteError,
  RouteRequest,
  RouteResponse,
  RouteResult,
} from "../../shared/contracts/routes";

export interface RoutingProviderContext {
  signal: AbortSignal;
  attempt: number;
  now: () => Date;
}

export interface RoutingProvider {
  readonly id: string;
  calculate(
    request: RouteRequest,
    context: RoutingProviderContext,
  ): Promise<RouteResult<RouteResponse>>;
}

export interface RouteCachePolicy {
  persistence: "none";
  ttlSeconds: null;
  reason: string;
}

export interface RouteCacheCapability {
  policyFor(request: RouteRequest): RouteCachePolicy;
  canonicalKeyInputs(request: RouteRequest): Readonly<Record<string, unknown>>;
}

export const conservativeRouteCache: RouteCacheCapability = {
  policyFor: () => ({
    persistence: "none",
    ttlSeconds: null,
    reason:
      "Production retention rights and TTL are not contractually confirmed.",
  }),
  canonicalKeyInputs: (request) => ({
    version: request.version,
    origin: request.origin,
    destination: request.destination,
    waypoints: request.waypoints,
    modeFamily: request.modeFamily,
    requestedModes: [...request.requestedModes].sort(),
    timeIntent: request.timeIntent,
    alternatives: request.alternatives,
    preferences: request.preferences,
    locale: request.locale,
    timezone: request.timezone,
  }),
};

export function routeError(
  code: RouteError["code"],
  options: {
    retryable: boolean;
    category: RouteError["category"];
    message: string;
    fingerprint?: string | null;
    metadata?: RouteError["metadata"];
  },
): RouteError {
  return {
    code,
    retryable: options.retryable,
    category: options.category,
    message: options.message,
    diagnosticFingerprint: options.fingerprint ?? null,
    metadata: options.metadata ?? {},
  };
}
