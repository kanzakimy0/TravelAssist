import {
  ROUTE_CONTRACT_VERSION,
  type RouteError,
  type RouteRequest,
  type RouteResponse,
  type RouteMode,
} from "./index";

const stop = (
  id: string | null,
  name: string | null,
  coordinates: readonly [number, number] | null,
) => ({
  referenceId: id,
  name,
  coordinates,
  platform: null,
});

export const routeRequestFixture: RouteRequest = {
  version: ROUTE_CONTRACT_VERSION,
  requestId: "request-fixture-1",
  origin: {
    referenceId: "22671",
    displayName: "高円寺",
    coordinates: [139.653027, 35.70211],
  },
  destination: {
    referenceId: "22741",
    displayName: "新宿",
    coordinates: [139.703056, 35.6875],
  },
  waypoints: [],
  modeFamily: "transit",
  requestedModes: ["walk", "rail", "subway", "bus"],
  timeIntent: {
    kind: "departure_at",
    instant: "2026-09-09T00:00:00.000Z",
    timezone: "Asia/Tokyo",
    localDate: "2026-09-09",
    localTime: "09:00",
  },
  locale: "ja-JP",
  timezone: "Asia/Tokyo",
  alternatives: { max: 3, preference: "balanced" },
  preferences: {
    maxWalkingMeters: null,
    accessibility: { wheelchair: null, avoidStairs: null },
  },
};

function fixtureResponse(mode: RouteMode, fare: number | null): RouteResponse {
  const origin = stop("22671", "高円寺", [139.653027, 35.70211]);
  const destination = stop("22741", "新宿", [139.703056, 35.6875]);
  const departure = {
    instant: "2026-09-09T09:00:00+09:00",
    timezone: "Asia/Tokyo",
  };
  const arrival = {
    instant: "2026-09-09T09:07:00+09:00",
    timezone: "Asia/Tokyo",
  };
  const transit = {
    operatorName: "fixture rail",
    lineName: "fixture line",
    routeName: "fixture line",
    serviceName: "fixture service",
    trainNumber: "F-001",
    originStop: origin,
    destinationStop: destination,
    departurePlatform: null,
    arrivalPlatform: null,
    stopCount: 1,
    direction: "east",
    destinationSign: "新宿",
    fare: fare === null ? null : { amountMinor: fare, currency: "JPY" },
    reservation: "unknown" as const,
    seat: null,
  };
  return {
    version: ROUTE_CONTRACT_VERSION,
    requestId: routeRequestFixture.requestId,
    alternatives: [
      {
        id: "route-fixture-1",
        providerReference: null,
        summary: "高円寺 → 新宿",
        durationSeconds: 420,
        distanceMeters: 5800,
        departure,
        arrival,
        fare: fare === null ? null : { amountMinor: fare, currency: "JPY" },
        geometry: {
          type: "LineString",
          coordinates: [
            [139.653027, 35.70211],
            [139.703056, 35.6875],
          ],
        },
        legs: [
          {
            id: "leg-1",
            origin,
            destination,
            departure,
            arrival,
            durationSeconds: 420,
            distanceMeters: 5800,
            geometry: null,
            segmentIds: ["segment-1"],
          },
        ],
        segments: [
          {
            id: "segment-1",
            mode,
            sourceMode: mode,
            origin,
            destination,
            departure,
            arrival,
            durationSeconds: 420,
            distanceMeters: 5800,
            geometry: null,
            transit,
            stepIds: ["step-1"],
          },
        ],
        steps: [
          {
            id: "step-1",
            mode,
            sourceMode: mode,
            instruction: "新宿方面へ移動",
            durationSeconds: 420,
            distanceMeters: 5800,
            geometry: null,
            transit,
          },
        ],
        warnings: [],
        notices: [],
      },
    ],
    source: {
      provider: "fixture",
      entitlement: "evaluation",
      fetchedAt: "2026-09-09T00:00:01.000Z",
      freshness: "live",
      diagnosticFingerprint: null,
    },
  };
}

export const minimalRailRouteFixture = fixtureResponse("rail", 160);
export const fareUnknownRouteFixture = fixtureResponse("rail", null);
export const busRouteFixture = fixtureResponse("bus", 220);
export const futureUnknownModeFixture = fixtureResponse("other", null);

export const crossMidnightRouteFixture: RouteResponse = {
  ...fixtureResponse("rail", 500),
  alternatives: [
    {
      ...fixtureResponse("rail", 500).alternatives[0],
      id: "route-cross-midnight",
      departure: {
        instant: "2026-09-09T23:55:00+09:00",
        timezone: "Asia/Tokyo",
      },
      arrival: { instant: "2026-09-10T00:20:00+09:00", timezone: "Asia/Tokyo" },
      durationSeconds: 1500,
    },
  ],
};

export const timezoneBoundaryRouteFixture: RouteResponse = {
  ...crossMidnightRouteFixture,
  alternatives: [
    {
      ...crossMidnightRouteFixture.alternatives[0],
      id: "route-timezone-boundary",
      departure: { instant: "2026-09-09T15:55:00Z", timezone: "Asia/Tokyo" },
      arrival: { instant: "2026-09-09T16:20:00Z", timezone: "Asia/Tokyo" },
    },
  ],
};

export const multiAlternativeRouteFixture: RouteResponse = {
  ...minimalRailRouteFixture,
  alternatives: [
    minimalRailRouteFixture.alternatives[0],
    { ...busRouteFixture.alternatives[0], id: "route-fixture-2" },
  ],
};

export const mixedTransferRouteFixture: RouteResponse = (() => {
  const base = fixtureResponse("rail", 240);
  const route = base.alternatives[0];
  const walkStep = {
    ...route.steps[0],
    id: "step-walk",
    mode: "walk" as const,
    sourceMode: "walk",
    transit: null,
    durationSeconds: 180,
    distanceMeters: 220,
  };
  const subwayStep = {
    ...route.steps[0],
    id: "step-subway",
    mode: "subway" as const,
    sourceMode: "train",
  };
  return {
    ...base,
    alternatives: [
      {
        ...route,
        id: "route-mixed-transfer",
        summary: "徒歩 + 地下鉄",
        steps: [walkStep, subwayStep],
        segments: [
          {
            ...route.segments[0],
            id: "segment-walk",
            mode: "walk",
            transit: null,
            stepIds: ["step-walk"],
          },
          {
            ...route.segments[0],
            id: "segment-subway",
            mode: "subway",
            stepIds: ["step-subway"],
          },
        ],
        legs: [
          {
            ...route.legs[0],
            id: "leg-mixed",
            segmentIds: ["segment-walk", "segment-subway"],
          },
        ],
      },
    ],
  };
})();

export const routeErrorFixtures: Readonly<Record<string, RouteError>> = {
  timeout: {
    code: "provider_timeout",
    retryable: true,
    category: "availability",
    message: "Route provider timed out.",
    diagnosticFingerprint: "fixture-timeout",
    metadata: { provider: "fixture" },
  },
  noRoute: {
    code: "no_route",
    retryable: false,
    category: "no_result",
    message: "No route was found.",
    diagnosticFingerprint: null,
    metadata: { provider: "fixture" },
  },
};
