import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import "./register-route-ts.mjs";

const { routeRequestFixture } =
  await import("../src/shared/contracts/routes/fixtures.ts");
const { validateRouteResponse } =
  await import("../src/shared/contracts/routes/validation.ts");
const { EKIWORLD_ENDPOINT, readEkiworldConfiguration } =
  await import("../src/server/routing/config.ts");
const { EkiworldTransitAdapter } =
  await import("../src/server/routing/providers/ekiworld.ts");
const { createRoutingService } =
  await import("../src/server/routing/service.ts");

const providerFixture = JSON.parse(
  await readFile(
    new URL("./fixtures/ekiworld-course.json", import.meta.url),
    "utf8",
  ),
);
const configuration = {
  endpoint: EKIWORLD_ENDPOINT,
  accessKey: "synthetic-test-key",
  entitlement: "evaluation",
};
const context = {
  attempt: 0,
  signal: new AbortController().signal,
  now: () => new Date("2026-09-09T00:00:01.000Z"),
};

test("adapter maps the documented endpoint and request parameters without encoding separators", async () => {
  let requestedUrl = "";
  const adapter = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async (url, init) => {
      requestedUrl = String(url);
      assert.equal(init?.method, "GET");
      assert.equal(init?.headers.Accept, "application/json");
      assert.equal(init?.cache, "no-store");
      return Response.json(providerFixture);
    },
  });
  const result = await adapter.calculate(routeRequestFixture, context);
  assert.equal(result.ok, true);
  const url = new URL(requestedUrl);
  assert.equal(url.origin + url.pathname, EKIWORLD_ENDPOINT);
  assert.equal(url.searchParams.get("viaList"), "高円寺:新宿");
  assert.match(requestedUrl, /viaList=[^&]+:[^&]+/);
  assert.doesNotMatch(requestedUrl, /viaList=[^&]*%3A/i);
  assert.equal(url.searchParams.get("date"), "20260909");
  assert.equal(url.searchParams.get("time"), "0900");
  assert.equal(url.searchParams.get("searchType"), "departure");
  assert.equal(url.searchParams.get("sort"), "ekispert");
  assert.equal(url.searchParams.get("answerCount"), "3");
  assert.equal(url.searchParams.get("resultDetail"), "addCorporation");
});

test("adapter rejects delimiter injection and unsupported request constraints before fetch", async () => {
  let fetches = 0;
  const adapter = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () => {
      fetches += 1;
      return Response.json(providerFixture);
    },
  });

  const delimiter = structuredClone(routeRequestFixture);
  delimiter.origin.displayName = "東京:新宿";
  const delimiterResult = await adapter.calculate(delimiter, context);
  assert.equal(delimiterResult.ok, false);
  if (!delimiterResult.ok)
    assert.equal(delimiterResult.error.code, "invalid_request");

  const flight = structuredClone(routeRequestFixture);
  flight.requestedModes = ["flight"];
  const flightResult = await adapter.calculate(flight, context);
  assert.equal(flightResult.ok, false);
  if (!flightResult.ok)
    assert.equal(flightResult.error.code, "unsupported_mode");

  const constrained = structuredClone(routeRequestFixture);
  constrained.preferences.maxWalkingMeters = 100;
  const constrainedResult = await adapter.calculate(constrained, context);
  assert.equal(constrainedResult.ok, false);
  if (!constrainedResult.ok) {
    assert.equal(constrainedResult.error.code, "unsupported_mode");
    assert.equal(
      constrainedResult.error.metadata.reason,
      "constraint_not_supported",
    );
  }
  assert.equal(fetches, 0);
});

test("adapter does not return provider alternatives outside requested modes", async () => {
  const request = structuredClone(routeRequestFixture);
  request.requestedModes = ["rail"];
  const adapter = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () => Response.json(providerFixture),
  });
  const result = await adapter.calculate(request, context);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "no_route");
});

test("adapter normalizes mixed modes, units, fare, timezone and hides raw payload", async () => {
  const adapter = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () => Response.json(providerFixture),
  });
  const result = await adapter.calculate(routeRequestFixture, context);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(validateRouteResponse(result.value).valid, true);
  const route = result.value.alternatives[0];
  assert.deepEqual(
    route.segments.map((segment) => segment.mode),
    ["walk", "subway", "bus"],
  );
  assert.equal(route.distanceMeters, 15_600);
  assert.equal(route.durationSeconds, 2_100);
  assert.deepEqual(route.fare, { amountMinor: 410, currency: "JPY" });
  assert.equal(route.departure?.timezone, "Asia/Tokyo");
  assert.equal(route.arrival?.instant, "2026-09-10T00:20:00+09:00");
  assert.equal(route.geometry, null);
  const serialized = JSON.stringify(result.value);
  assert.doesNotMatch(
    serialized,
    /PRIVATE-FIXTURE-SERIALIZE-DATA|synthetic-test-key/,
  );
  assert.match(route.providerReference ?? "", /^ekiworld-ref-[a-f0-9]{16}$/);
});

test("object-shaped Course/Line/Point values and missing optional metadata remain safe", async () => {
  const single = structuredClone(providerFixture);
  single.ResultSet.Course = single.ResultSet.Course[0];
  const course = single.ResultSet.Course;
  course.Route.Line = course.Route.Line[0];
  course.Route.Point = course.Route.Point.slice(0, 2);
  delete course.Price;
  delete course.Route.Line.DepartureState.no;
  const adapter = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () => Response.json(single),
  });
  const result = await adapter.calculate(routeRequestFixture, context);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.alternatives[0].fare, null);
  assert.equal(result.value.alternatives[0].segments[0].transit, null);
});

test("future provider modes fall back to other without exposing raw fields", async () => {
  const future = structuredClone(providerFixture);
  const line = future.ResultSet.Course[0].Route.Line[1];
  line.Type = { text: "future-cable", detail: "future-mode" };
  line.ProviderPrivate = { payload: "must-not-leak" };
  const adapter = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () => Response.json(future),
  });
  const result = await adapter.calculate(routeRequestFixture, context);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.alternatives[0].segments[1].mode, "other");
  assert.equal(
    result.value.alternatives[0].segments[1].sourceMode,
    "future-cable",
  );
  assert.doesNotMatch(
    JSON.stringify(result.value),
    /must-not-leak|ProviderPrivate/,
  );
});

test("provider HTTP and payload errors map to stable safe errors", async () => {
  const cases = [
    [403, "provider_auth", false],
    [429, "provider_rate_limited", true],
    [503, "provider_unavailable", true],
    [400, "provider_contract_error", false],
  ];
  for (const [status, code, retryable] of cases) {
    const adapter = new EkiworldTransitAdapter({
      configuration,
      fetchImpl: async () => new Response("", { status }),
    });
    const result = await adapter.calculate(routeRequestFixture, context);
    assert.equal(result.ok, false);
    if (result.ok) continue;
    assert.equal(result.error.code, code);
    assert.equal(result.error.retryable, retryable);
    assert.doesNotMatch(JSON.stringify(result.error), /synthetic-test-key/);
  }

  const malformed = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () => new Response("{", { status: 200 }),
  });
  const malformedResult = await malformed.calculate(
    routeRequestFixture,
    context,
  );
  assert.equal(malformedResult.ok, false);
  if (!malformedResult.ok)
    assert.equal(malformedResult.error.code, "provider_contract_error");

  const providerError = new EkiworldTransitAdapter({
    configuration,
    fetchImpl: async () =>
      Response.json({
        ResultSet: { Error: { code: "invalid-key", Message: "private text" } },
      }),
  });
  const providerErrorResult = await providerError.calculate(
    routeRequestFixture,
    context,
  );
  assert.equal(providerErrorResult.ok, false);
  if (!providerErrorResult.ok) {
    assert.equal(providerErrorResult.error.code, "provider_auth");
    assert.doesNotMatch(
      JSON.stringify(providerErrorResult.error),
      /private text/,
    );
  }
});

test("service bounds retries to retryable failures and does not retry auth", async () => {
  let attempts = 0;
  const retrying = createRoutingService({
    provider: {
      id: "fixture",
      calculate: async () => {
        attempts += 1;
        return {
          ok: false,
          error: {
            code: "provider_rate_limited",
            retryable: true,
            category: "availability",
            message: "limited",
            diagnosticFingerprint: null,
            metadata: {},
          },
        };
      },
    },
    maxRetries: 2,
    retryDelayMs: 0,
  });
  const retryResult = await retrying.calculate(routeRequestFixture);
  assert.equal(retryResult.ok, false);
  assert.equal(attempts, 3);

  attempts = 0;
  const auth = createRoutingService({
    provider: {
      id: "fixture",
      calculate: async () => {
        attempts += 1;
        return {
          ok: false,
          error: {
            code: "provider_auth",
            retryable: false,
            category: "provider",
            message: "auth",
            diagnosticFingerprint: null,
            metadata: {},
          },
        };
      },
    },
    maxRetries: 2,
  });
  await auth.calculate(routeRequestFixture);
  assert.equal(attempts, 1);
});

test("service enforces timeout with AbortSignal", async () => {
  const service = createRoutingService({
    provider: {
      id: "slow",
      calculate: async () => new Promise(() => {}),
    },
    timeoutMs: 100,
    maxRetries: 0,
  });
  const result = await service.calculate(routeRequestFixture);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "provider_timeout");
});

test("production configuration fails closed for evaluation or unapproved production", () => {
  const evaluation = readEkiworldConfiguration({
    NODE_ENV: "production",
    ROUTING_PROVIDER_MODE: "evaluation",
    EKIWORLD_ACCESS_KEY: "synthetic-test-key",
  });
  assert.equal(evaluation.ok, false);

  const production = readEkiworldConfiguration({
    NODE_ENV: "production",
    ROUTING_PROVIDER_MODE: "production",
    EKIWORLD_ACCESS_KEY: "synthetic-test-key",
  });
  assert.equal(production.ok, false);

  const approved = readEkiworldConfiguration({
    NODE_ENV: "production",
    ROUTING_PROVIDER_MODE: "production",
    ROUTING_EKIWORLD_PRODUCTION_APPROVED: "true",
    EKIWORLD_ACCESS_KEY: "synthetic-test-key",
  });
  assert.equal(approved.ok, true);
});
