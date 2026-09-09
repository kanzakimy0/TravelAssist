import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { requireAuthUser } from "../../lib/auth/server-user";
import { authSiteOrigin } from "../../lib/auth/site";
import { createRequestSupabase } from "../../lib/supabase/request";
import type {
  RouteRequest,
  RouteResponse,
  RouteResult,
} from "../../shared/contracts/routes";
import { validateRouteRequest } from "../../shared/contracts/routes/validation";
import { isPlannerVerifiedStation } from "../../shared/routing/planner-verified-stations";
import {
  plannerRouteGatewayEnabled,
  readEkiworldConfiguration,
} from "./config";
import { EkiworldTransitAdapter } from "./providers/ekiworld";
import { createRoutingService } from "./service";
import { routeError } from "./types";

const MAX_BODY_BYTES = 16_384;
const MAX_CONCURRENT_REQUESTS = 2;
const PRIVATE_ROUTE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

type Finish = (response: NextResponse) => NextResponse;
type Authorization = { authorized: boolean; finish: Finish };
type Calculate = (
  request: RouteRequest,
  signal: AbortSignal,
) => Promise<RouteResult<RouteResponse>>;

export interface PlannerRouteHandlerDependencies {
  environment?: Readonly<Record<string, string | undefined>>;
  authorize?: (request: NextRequest) => Promise<Authorization>;
  calculate?: Calculate;
  maxConcurrentRequests?: number;
}

function safeError(
  code: Parameters<typeof routeError>[0],
  message: string,
  reason: string,
  retryable = false,
): RouteResult<never> {
  return {
    ok: false,
    error: routeError(code, {
      retryable,
      category: code === "invalid_request" ? "request" : "availability",
      message,
      metadata: { reason },
    }),
  };
}

function json(result: RouteResult<RouteResponse>, status: number) {
  return NextResponse.json(result, { status, headers: PRIVATE_ROUTE_HEADERS });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES)
    throw new RangeError("request_too_large");
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new TypeError("content_type");
  const reader = request.body?.getReader();
  if (!reader) throw new TypeError("body_missing");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RangeError("request_too_large");
    }
    chunks.push(chunk.value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new TypeError("invalid_json");
  }
}

function verifiedStationIssues(request: RouteRequest) {
  const issues: string[] = [];
  const places = [request.origin, ...request.waypoints, request.destination];
  for (const [index, place] of places.entries()) {
    const path =
      index === 0
        ? "origin"
        : index === places.length - 1
          ? "destination"
          : `waypoints[${index - 1}]`;
    const reference = place.referenceId?.trim();
    const name = place.displayName?.trim();
    if (!reference && !name)
      issues.push(`${path} requires a verified station name or reference`);
    if (reference && (!/^\d{1,16}$/.test(reference) || /^jp-/i.test(reference)))
      issues.push(`${path}.referenceId is not an Ekiworld station reference`);
    if (name && name.length > 80)
      issues.push(`${path}.displayName is too long`);
    if (!reference && !name && place.coordinates)
      issues.push(`${path} coordinate-only station lookup is not supported`);
    if (place.coordinates?.[0] === 0 && place.coordinates?.[1] === 0)
      issues.push(`${path} cannot use (0,0) as a station`);
    if (
      (reference || name) &&
      !isPlannerVerifiedStation({
        referenceId: reference ?? null,
        displayName: name ?? null,
      })
    )
      issues.push(`${path} is outside the verified Planner station registry`);
  }
  if (
    request.timezone !== "Asia/Tokyo" ||
    request.timeIntent.timezone !== "Asia/Tokyo"
  )
    issues.push("Planner evaluation routing requires Asia/Tokyo");
  return issues;
}

async function defaultAuthorize(request: NextRequest): Promise<Authorization> {
  const origin = authSiteOrigin();
  const context = createRequestSupabase(request, origin.startsWith("https:"));
  if (request.headers.get("origin") !== origin)
    return { authorized: false, finish: context.finish };
  const user = await requireAuthUser(context.client);
  return { authorized: user.ok, finish: context.finish };
}

function defaultCalculate(
  environment: Readonly<Record<string, string | undefined>>,
): Calculate | null {
  const configuration = readEkiworldConfiguration(environment);
  if (!configuration.ok) return null;
  const service = createRoutingService({
    provider: new EkiworldTransitAdapter({
      configuration: configuration.value,
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
  });
  return (request, signal) => service.calculate(request, signal);
}

export function createPlannerRouteHandler(
  dependencies: PlannerRouteHandlerDependencies = {},
) {
  const environment = dependencies.environment ?? process.env;
  const limit = Math.max(
    1,
    Math.min(dependencies.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS, 4),
  );
  let active = 0;
  return async function handle(request: NextRequest) {
    if (!plannerRouteGatewayEnabled(environment))
      return json(
        safeError(
          "provider_unavailable",
          "Development route preview is disabled.",
          "feature_disabled",
        ),
        503,
      );
    if (active >= limit)
      return json(
        safeError(
          "provider_rate_limited",
          "Too many route previews are already running.",
          "concurrency_limit",
          true,
        ),
        429,
      );
    let authorization: Authorization;
    try {
      authorization = await (dependencies.authorize ?? defaultAuthorize)(
        request,
      );
    } catch {
      return json(
        safeError(
          "provider_unavailable",
          "Route preview authorization is unavailable.",
          "authorization_unavailable",
        ),
        503,
      );
    }
    if (!authorization.authorized)
      return authorization.finish(
        json(
          safeError(
            "provider_unavailable",
            "Sign in is required for development route preview.",
            "unauthorized",
          ),
          401,
        ),
      );
    let value: unknown;
    try {
      value = await readBoundedJson(request);
    } catch (error) {
      return authorization.finish(
        json(
          safeError(
            "invalid_request",
            "The route request body is invalid.",
            error instanceof RangeError ? "body_too_large" : "invalid_body",
          ),
          error instanceof RangeError ? 413 : 400,
        ),
      );
    }
    const validation = validateRouteRequest(value);
    if (!validation.valid)
      return authorization.finish(
        json(
          safeError(
            "invalid_request",
            "The route request is invalid.",
            "contract_validation",
          ),
          400,
        ),
      );
    const canonical = value as RouteRequest;
    if (verifiedStationIssues(canonical).length)
      return authorization.finish(
        json(
          safeError(
            "invalid_request",
            "The route endpoints are not verified station references.",
            "station_identity",
          ),
          400,
        ),
      );
    const calculate = dependencies.calculate ?? defaultCalculate(environment);
    if (!calculate)
      return authorization.finish(
        json(
          safeError(
            "provider_unavailable",
            "The route provider is not configured on the server.",
            "provider_not_configured",
          ),
          503,
        ),
      );
    active += 1;
    try {
      const result = await calculate(canonical, request.signal);
      const status = result.ok
        ? 200
        : result.error.code === "no_route"
          ? 404
          : result.error.code === "provider_rate_limited"
            ? 429
            : result.error.code === "invalid_request" ||
                result.error.code === "unsupported_mode"
              ? 400
              : 503;
      return authorization.finish(json(result, status));
    } finally {
      active -= 1;
    }
  };
}

export const handlePlannerRouteCalculation = createPlannerRouteHandler();
