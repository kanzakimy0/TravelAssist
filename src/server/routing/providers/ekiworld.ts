import "server-only";

import { createHash } from "node:crypto";

import {
  ROUTE_CONTRACT_VERSION,
  type RouteAlternative,
  type RouteInstant,
  type RouteMode,
  type RouteMoney,
  type RouteRequest,
  type RouteResponse,
  type RouteResult,
  type RouteStop,
  type RouteTransitMetadata,
} from "../../../shared/contracts/routes";
import { EKIWORLD_ENDPOINT, type EkiworldConfiguration } from "../config";
import { routeError, type RoutingProvider } from "../types";

type UnknownRecord = Record<string, unknown>;

export interface EkiworldTransitAdapterOptions {
  configuration: EkiworldConfiguration;
  fetchImpl?: typeof fetch;
}

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function array(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  const object = record(value);
  if (!object) return null;
  return text(object.text) ?? text(object.Name);
}

function integer(value: unknown): number | null {
  const source = text(value);
  if (source === null || source.trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(source);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function fingerprint(...parts: unknown[]): string {
  return createHash("sha256")
    .update(parts.map((part) => String(part ?? "")).join("|"))
    .digest("hex")
    .slice(0, 16);
}

function stableId(prefix: string, ...parts: unknown[]): string {
  return `${prefix}-${fingerprint(...parts)}`;
}

function encodePair(name: string, value: string): string {
  if (name === "viaList")
    return `${encodeURIComponent(name)}=${value
      .split(":")
      .map((item) => encodeURIComponent(item))
      .join(":")}`;
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

function providerPlace(place: RouteRequest["origin"]): string | null {
  return place.displayName?.trim() || place.referenceId?.trim() || null;
}

function japaneseDateTime(instant: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
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
    date: `${get("year")}${get("month")}${get("day")}`,
    time: `${get("hour")}${get("minute")}`,
  };
}

function buildRequestUrl(
  request: RouteRequest,
  configuration: EkiworldConfiguration,
): RouteResult<string> {
  if (request.modeFamily !== "transit" && request.modeFamily !== "mixed") {
    return {
      ok: false,
      error: routeError("unsupported_mode", {
        retryable: false,
        category: "request",
        message:
          "The evaluation adapter supports Japanese public transit requests only.",
        metadata: { provider: "ekiworld", modeFamily: request.modeFamily },
      }),
    };
  }
  const unsupportedModes = request.requestedModes.filter(
    (mode) => mode === "flight",
  );
  if (unsupportedModes.length > 0) {
    return {
      ok: false,
      error: routeError("unsupported_mode", {
        retryable: false,
        category: "request",
        message: "The evaluation adapter cannot satisfy the requested modes.",
        metadata: { provider: "ekiworld", reason: "mode_not_supported" },
      }),
    };
  }
  if (
    request.preferences.maxWalkingMeters !== null ||
    request.preferences.accessibility?.wheelchair === true ||
    request.preferences.accessibility?.avoidStairs === true
  ) {
    return {
      ok: false,
      error: routeError("unsupported_mode", {
        retryable: false,
        category: "request",
        message:
          "The evaluation adapter cannot guarantee the requested route constraints.",
        metadata: { provider: "ekiworld", reason: "constraint_not_supported" },
      }),
    };
  }
  const places = [
    request.origin,
    ...request.waypoints,
    request.destination,
  ].map(providerPlace);
  if (places.some((place) => place === null)) {
    return {
      ok: false,
      error: routeError("invalid_request", {
        retryable: false,
        category: "request",
        message:
          "Ekiworld evaluation routing needs a station reference or display name.",
        metadata: { provider: "ekiworld", reason: "place_not_resolvable" },
      }),
    };
  }
  if (places.some((place) => /[:\u0000-\u001f\u007f]/.test(place ?? ""))) {
    return {
      ok: false,
      error: routeError("invalid_request", {
        retryable: false,
        category: "request",
        message: "A station name contains an unsupported delimiter.",
        metadata: { provider: "ekiworld", reason: "station_delimiter" },
      }),
    };
  }
  const local = japaneseDateTime(request.timeIntent.instant);
  const sort = {
    balanced: "ekispert",
    fastest: "time",
    fewest_transfers: "transfer",
    lowest_fare: "price",
  }[request.alternatives.preference];
  const pairs = [
    ["key", configuration.accessKey],
    ["viaList", places.join(":")],
    ["date", local.date],
    ["time", local.time],
    [
      "searchType",
      request.timeIntent.kind === "arrival_by" ? "arrival" : "departure",
    ],
    ["sort", sort],
    ["answerCount", String(request.alternatives.max)],
    ["resultDetail", "addCorporation"],
  ];
  return {
    ok: true,
    value: `${configuration.endpoint}?${pairs
      .map(([name, value]) => encodePair(name, value))
      .join("&")}`,
  };
}

function stopFromPoint(value: unknown): RouteStop {
  const point = record(value) ?? {};
  const station = record(point.Station);
  const longitude = Number(text(record(point.GeoPoint)?.longi_d));
  const latitude = Number(text(record(point.GeoPoint)?.lati_d));
  const coordinates =
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
      ? ([longitude, latitude] as const)
      : null;
  return {
    referenceId: text(station?.code) ?? text(point.index),
    name: text(station?.Name) ?? text(point.Name),
    coordinates,
    platform: null,
  };
}

function stateInstant(value: unknown): RouteInstant | null {
  const state = record(value);
  const instant = text(state?.Datetime);
  if (!instant || Number.isNaN(Date.parse(instant))) return null;
  return { instant, timezone: "Asia/Tokyo" };
}

function classifyMode(line: UnknownRecord): {
  mode: RouteMode;
  sourceMode: string | null;
} {
  const rawType = text(line.Type)?.toLowerCase() ?? null;
  const detail = text(record(line.Type)?.detail)?.toLowerCase() ?? "";
  const name = text(line.Name) ?? "";
  if (rawType === "walk") return { mode: "walk", sourceMode: rawType };
  if (rawType === "bus") return { mode: "bus", sourceMode: rawType };
  if (rawType === "ship" || rawType === "ferry")
    return { mode: "ferry", sourceMode: rawType };
  if (rawType === "plane" || rawType === "flight")
    return { mode: "flight", sourceMode: rawType };
  if (rawType === "tram" || rawType === "streetcar")
    return { mode: "tram", sourceMode: rawType };
  if (
    rawType === "train" &&
    (detail.includes("subway") || /地下鉄|メトロ/.test(name))
  )
    return { mode: "subway", sourceMode: rawType };
  if (rawType === "train") return { mode: "rail", sourceMode: rawType };
  return { mode: "other", sourceMode: rawType };
}

function fareFromCourse(course: UnknownRecord): RouteMoney | null {
  const prices = array(course.Price)
    .map(record)
    .filter((item): item is UnknownRecord => !!item);
  const selected = prices.filter((price) => text(price.selected) === "true");
  const fareSummary = prices.find(
    (price) => text(price.kind) === "FareSummary",
  );
  const chargeSummary = prices.find(
    (price) => text(price.kind) === "ChargeSummary",
  );
  const summaryParts = [fareSummary, chargeSummary]
    .map((price) => integer(price?.Oneway))
    .filter((amount): amount is number => amount !== null);
  const selectedParts = selected
    .filter((price) => ["Fare", "Charge"].includes(text(price.kind) ?? ""))
    .map((price) => integer(price.Oneway))
    .filter((amount): amount is number => amount !== null);
  const parts = summaryParts.length > 0 ? summaryParts : selectedParts;
  return parts.length === 0
    ? null
    : {
        amountMinor: parts.reduce((sum, amount) => sum + amount, 0),
        currency: "JPY",
      };
}

function transitMetadata(
  line: UnknownRecord,
  origin: RouteStop,
  destination: RouteStop,
  fare: RouteMoney | null,
): RouteTransitMetadata {
  const departureState = record(line.DepartureState);
  const arrivalState = record(line.ArrivalState);
  return {
    operatorName: text(record(line.Corporation)?.Name),
    lineName: text(line.Name),
    routeName: text(line.TypicalName) ?? text(line.Name),
    serviceName: text(line.TypicalName),
    trainNumber: text(line.Number) ?? text(line.trainID),
    originStop: origin,
    destinationStop: destination,
    departurePlatform: text(departureState?.no),
    arrivalPlatform: text(arrivalState?.no),
    stopCount: integer(line.stopStationCount),
    direction: text(line.Direction),
    destinationSign: text(line.Destination),
    fare,
    reservation: "unknown",
    seat: text(line.SeatName),
  };
}

function normalizeCourse(
  courseValue: unknown,
  index: number,
  request: RouteRequest,
): RouteAlternative | null {
  const course = record(courseValue);
  const route = record(course?.Route);
  if (!course || !route) return null;
  const points = array(route.Point).map(stopFromPoint);
  const lines = array(route.Line)
    .map(record)
    .filter((line): line is UnknownRecord => !!line);
  if (
    points.length < 2 ||
    lines.length === 0 ||
    points.length < lines.length + 1
  )
    return null;

  const fare = fareFromCourse(course);
  const segments = lines.map((line, lineIndex) => {
    const id = stableId("segment", request.requestId, index, lineIndex);
    const stepId = stableId("step", request.requestId, index, lineIndex);
    const origin = points[lineIndex];
    const destination = points[lineIndex + 1];
    const mode = classifyMode(line);
    const transit =
      mode.mode === "walk" || mode.mode === "wait"
        ? null
        : transitMetadata(line, origin, destination, fare);
    const lineMinutes = integer(line.timeOnBoard);
    const lineDistance = integer(line.distance);
    return {
      id,
      mode: mode.mode,
      sourceMode: mode.sourceMode,
      origin,
      destination,
      departure: stateInstant(line.DepartureState),
      arrival: stateInstant(line.ArrivalState),
      durationSeconds: lineMinutes === null ? null : lineMinutes * 60,
      distanceMeters: lineDistance === null ? null : lineDistance * 100,
      geometry: null,
      transit,
      stepIds: [stepId],
    };
  });
  const steps = segments.map((segment, stepIndex) => ({
    id: segment.stepIds[0],
    mode: segment.mode,
    sourceMode: segment.sourceMode,
    instruction: text(lines[stepIndex].Name),
    durationSeconds: segment.durationSeconds,
    distanceMeters: segment.distanceMeters,
    geometry: null,
    transit: segment.transit,
  }));
  const departure =
    segments.find((segment) => segment.departure)?.departure ?? null;
  const arrival =
    [...segments].reverse().find((segment) => segment.arrival)?.arrival ?? null;
  const totalMinutes = ["timeOnBoard", "timeOther", "timeWalk"]
    .map((field) => integer(route[field]))
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0);
  const durationSeconds =
    departure && arrival
      ? Math.max(
          0,
          Math.round(
            (Date.parse(arrival.instant) - Date.parse(departure.instant)) /
              1000,
          ),
        )
      : totalMinutes > 0
        ? totalMinutes * 60
        : null;
  const distance = integer(route.distance);
  const providerReferenceSource = text(course.SerializeData);
  const routeId = stableId(
    "route",
    request.requestId,
    index,
    points.map((point) => point.referenceId ?? point.name).join(":"),
  );

  return {
    id: routeId,
    providerReference: providerReferenceSource
      ? stableId("ekiworld-ref", providerReferenceSource)
      : null,
    summary: `${points[0].name ?? "Origin"} → ${points.at(-1)?.name ?? "Destination"}`,
    durationSeconds,
    distanceMeters: distance === null ? null : distance * 100,
    departure,
    arrival,
    fare,
    geometry: null,
    legs: [
      {
        id: stableId("leg", routeId, 0),
        origin: points[0],
        destination: points[points.length - 1],
        departure,
        arrival,
        durationSeconds,
        distanceMeters: distance === null ? null : distance * 100,
        geometry: null,
        segmentIds: segments.map((segment) => segment.id),
      },
    ],
    segments,
    steps,
    warnings: [],
    notices: [
      "Evaluation data: persistence, Mapbox overlay, and production display rights are not approved.",
    ],
  };
}

function providerErrorFromResult(
  resultSet: UnknownRecord,
): RouteResult<never> | null {
  const source = array(resultSet.Error)
    .map(record)
    .find((item) => item !== null);
  if (!source) return null;
  const providerCode = text(source.code) ?? text(source.Code) ?? "unknown";
  return {
    ok: false,
    error: routeError(
      /key|auth|access/i.test(providerCode)
        ? "provider_auth"
        : "provider_contract_error",
      {
        retryable: false,
        category: "provider",
        message: "The route provider rejected the request.",
        fingerprint: fingerprint("ekiworld", providerCode),
        metadata: { provider: "ekiworld", providerCode },
      },
    ),
  };
}

export function normalizeEkiworldResponse(
  payload: unknown,
  request: RouteRequest,
  fetchedAt: Date,
  entitlement: EkiworldConfiguration["entitlement"],
): RouteResult<RouteResponse> {
  const root = record(payload);
  const resultSet = record(root?.ResultSet);
  if (!resultSet) {
    return {
      ok: false,
      error: routeError("provider_contract_error", {
        retryable: false,
        category: "provider",
        message: "The route provider returned an unsupported response.",
        fingerprint: fingerprint("ekiworld", "missing_result_set"),
        metadata: { provider: "ekiworld", reason: "missing_result_set" },
      }),
    };
  }
  const providerError = providerErrorFromResult(resultSet);
  if (providerError) return providerError;
  const courses = array(resultSet.Course);
  if (courses.length === 0) {
    return {
      ok: false,
      error: routeError("no_route", {
        retryable: false,
        category: "no_result",
        message: "No public transit route was found.",
        metadata: { provider: "ekiworld" },
      }),
    };
  }
  const alternatives = courses
    .map((course, index) => normalizeCourse(course, index, request))
    .filter((course): course is RouteAlternative => course !== null);
  if (alternatives.length === 0) {
    return {
      ok: false,
      error: routeError("normalization_error", {
        retryable: false,
        category: "internal",
        message: "The provider response could not be normalized.",
        fingerprint: fingerprint(
          "ekiworld",
          text(resultSet.apiVersion),
          text(resultSet.engineVersion),
        ),
        metadata: { provider: "ekiworld", reason: "no_valid_course" },
      }),
    };
  }
  return {
    ok: true,
    value: {
      version: ROUTE_CONTRACT_VERSION,
      requestId: request.requestId,
      alternatives,
      source: {
        provider: "ekiworld",
        entitlement,
        fetchedAt: fetchedAt.toISOString(),
        freshness: "live",
        diagnosticFingerprint: fingerprint(
          "ekiworld",
          text(resultSet.apiVersion),
          text(resultSet.engineVersion),
        ),
      },
    },
  };
}

export class EkiworldTransitAdapter implements RoutingProvider {
  readonly id = "ekiworld";
  readonly #configuration: EkiworldConfiguration;
  readonly #fetch: typeof fetch;

  constructor(options: EkiworldTransitAdapterOptions) {
    if (options.configuration.endpoint !== EKIWORLD_ENDPOINT)
      throw new TypeError(
        "Ekiworld endpoint is fixed by the evaluated adapter contract.",
      );
    this.#configuration = options.configuration;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async calculate(
    request: RouteRequest,
    context: Parameters<RoutingProvider["calculate"]>[1],
  ): Promise<RouteResult<RouteResponse>> {
    const requestUrl = buildRequestUrl(request, this.#configuration);
    if (!requestUrl.ok) return requestUrl;
    let response: Response;
    try {
      response = await this.#fetch(requestUrl.value, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: context.signal,
      });
    } catch (error) {
      const aborted =
        context.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError");
      return {
        ok: false,
        error: routeError(
          aborted ? "provider_timeout" : "provider_unavailable",
          {
            retryable: true,
            category: "availability",
            message: aborted
              ? "The route provider timed out."
              : "The route provider is temporarily unavailable.",
            fingerprint: fingerprint("ekiworld", aborted ? "abort" : "network"),
            metadata: {
              provider: "ekiworld",
              reason: aborted ? "abort" : "network",
            },
          },
        ),
      };
    }
    if (!response.ok) {
      const status = response.status;
      const code =
        status === 401 || status === 403
          ? "provider_auth"
          : status === 429
            ? "provider_rate_limited"
            : status >= 500
              ? "provider_unavailable"
              : "provider_contract_error";
      return {
        ok: false,
        error: routeError(code, {
          retryable: status === 429 || status >= 500,
          category:
            status === 429 || status >= 500 ? "availability" : "provider",
          message: "The route provider request failed.",
          fingerprint: fingerprint("ekiworld", status),
          metadata: { provider: "ekiworld", httpStatus: status },
        }),
      };
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        ok: false,
        error: routeError("provider_contract_error", {
          retryable: false,
          category: "provider",
          message: "The route provider returned malformed JSON.",
          fingerprint: fingerprint("ekiworld", "invalid_json"),
          metadata: { provider: "ekiworld", reason: "invalid_json" },
        }),
      };
    }
    const normalized = normalizeEkiworldResponse(
      payload,
      request,
      context.now(),
      this.#configuration.entitlement,
    );
    if (!normalized.ok) return normalized;
    const requested = new Set(request.requestedModes);
    const alternatives = normalized.value.alternatives.filter((alternative) =>
      alternative.segments.every((segment) => requested.has(segment.mode)),
    );
    if (alternatives.length === 0) {
      return {
        ok: false,
        error: routeError("no_route", {
          retryable: false,
          category: "no_result",
          message: "No route satisfied the requested transport modes.",
          metadata: {
            provider: "ekiworld",
            reason: "requested_modes_not_satisfied",
          },
        }),
      };
    }
    return {
      ok: true,
      value: { ...normalized.value, alternatives },
    };
  }
}
