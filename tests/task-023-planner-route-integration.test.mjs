import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { NextRequest } from "next/server.js";
import "./register-route-ts.mjs";

const { minimalRailRouteFixture } =
  await import("../src/shared/contracts/routes/fixtures.ts");
const {
  plannerRouteEndpoint,
  plannerRouteSnapshot,
  routeRequestFromSnapshot,
  routeResultCanApply,
} = await import("../src/features/planner/model/route-query.ts");
const { tripSnapshot } =
  await import("../src/features/planner/model/browser-trip.ts");
const { createPlannerRouteHandler } =
  await import("../src/server/routing/http.ts");

const enabledEnvironment = {
  NODE_ENV: "development",
  VERCEL_ENV: "development",
  ROUTING_PLANNER_QUERY_ENABLED: "true",
  ROUTING_PROVIDER_MODE: "evaluation",
};
const finish = (response) => response;
const authorized = async () => ({ authorized: true, finish });
const plannerSnapshotResult = plannerRouteSnapshot({
  planId: "classic",
  day: 1,
  segmentId: "1:skytree>ginza",
  originPlace: { name: "东京晴空塔" },
  destinationPlace: { name: "银座散步" },
  localDate: "2026-09-09",
  localTime: "15:30",
});
assert.equal(plannerSnapshotResult.ok, true);
if (!plannerSnapshotResult.ok)
  throw new Error("Verified Planner route fixture is unavailable.");
const plannerRequestFixture = routeRequestFromSnapshot(
  plannerSnapshotResult.value,
  1,
);
const request = (body, options = {}) =>
  new NextRequest("http://127.0.0.1:3000/api/routes/calculate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://127.0.0.1:3000",
      ...(options.headers ?? {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
    signal: options.signal,
  });

test("Planner projects only explicitly verified station identities", () => {
  const skytree = plannerRouteEndpoint({ name: "东京晴空塔" });
  const ginza = plannerRouteEndpoint({ name: "银座散步" });
  const asakusa = plannerRouteEndpoint({ name: "浅草寺" });
  const placeholder = plannerRouteEndpoint({
    name: "东京 · 酒店待选择",
    planningPlaceholder: true,
  });
  assert.equal(skytree.kind, "verified_station");
  assert.equal(ginza.kind, "verified_station");
  assert.equal(asakusa.kind, "unresolved");
  assert.equal(asakusa.reason, "ambiguous_station");
  assert.equal(placeholder.kind, "unresolved");
  assert.equal(placeholder.reason, "not_a_station");
  assert.doesNotMatch(JSON.stringify([skytree, ginza]), /place-|jp-/);
});

test("Planner request snapshot is plan/day/segment/date isolated and timezone deterministic", () => {
  const base = {
    planId: "classic",
    day: 1,
    segmentId: "1:skytree>ginza",
    originPlace: { name: "东京晴空塔" },
    destinationPlace: { name: "银座散步" },
    localDate: "2026-09-09",
    localTime: "15:30",
  };
  const snapshot = plannerRouteSnapshot(base);
  assert.equal(snapshot.ok, true);
  if (!snapshot.ok) return;
  const canonical = routeRequestFromSnapshot(snapshot.value, 7);
  assert.equal(canonical.timeIntent.instant, "2026-09-09T06:30:00.000Z");
  assert.equal(canonical.timeIntent.localDate, "2026-09-09");
  assert.equal(canonical.timezone, "Asia/Tokyo");
  assert.equal(canonical.origin.displayName, "とうきょうスカイツリー");
  assert.equal(canonical.destination.displayName, "銀座");

  const changedDay = plannerRouteSnapshot({ ...base, day: 2 });
  const changedPlan = plannerRouteSnapshot({ ...base, planId: "depth" });
  const changedDate = plannerRouteSnapshot({
    ...base,
    localDate: "2026-09-10",
  });
  assert.equal(
    changedDay.ok && changedDay.value.key !== snapshot.value.key,
    true,
  );
  assert.equal(
    changedPlan.ok && changedPlan.value.key !== snapshot.value.key,
    true,
  );
  assert.equal(
    changedDate.ok && changedDate.value.key !== snapshot.value.key,
    true,
  );
});

test("stale, out-of-order, cancelled and unmounted route results cannot apply", () => {
  const current = "plan-a:day-1:segment-1";
  assert.equal(
    routeResultCanApply({
      currentSnapshotKey: current,
      expectedSnapshotKey: current,
      currentSequence: 2,
      requestSequence: 2,
      aborted: false,
    }),
    true,
  );
  for (const candidate of [
    {
      currentSnapshotKey: "plan-b:day-1:segment-1",
      currentSequence: 2,
      requestSequence: 2,
      aborted: false,
    },
    {
      currentSnapshotKey: current,
      currentSequence: 3,
      requestSequence: 2,
      aborted: false,
    },
    {
      currentSnapshotKey: current,
      currentSequence: 2,
      requestSequence: 2,
      aborted: true,
    },
    {
      currentSnapshotKey: null,
      currentSequence: 2,
      requestSequence: 2,
      aborted: false,
    },
  ])
    assert.equal(
      routeResultCanApply({ ...candidate, expectedSnapshotKey: current }),
      false,
    );
});

test("route handler is off by default and production/preview issue zero provider calls", async () => {
  for (const environment of [
    {},
    { ...enabledEnvironment, NODE_ENV: "production" },
    { ...enabledEnvironment, VERCEL_ENV: "preview" },
  ]) {
    let calls = 0;
    const handler = createPlannerRouteHandler({
      environment,
      authorize: authorized,
      calculate: async () => {
        calls += 1;
        return { ok: true, value: minimalRailRouteFixture };
      },
    });
    const response = await handler(request(plannerRequestFixture));
    assert.equal(response.status, 503);
    assert.equal(calls, 0);
    assert.equal(
      (await response.json()).error.metadata.reason,
      "feature_disabled",
    );
  }
});

test("route handler requires trusted authorization and strict bounded canonical input", async () => {
  let calls = 0;
  const calculate = async () => {
    calls += 1;
    return { ok: true, value: minimalRailRouteFixture };
  };
  const denied = createPlannerRouteHandler({
    environment: enabledEnvironment,
    authorize: async () => ({ authorized: false, finish }),
    calculate,
  });
  assert.equal((await denied(request(plannerRequestFixture))).status, 401);

  const handler = createPlannerRouteHandler({
    environment: enabledEnvironment,
    authorize: authorized,
    calculate,
  });
  const internalPoi = structuredClone(plannerRequestFixture);
  internalPoi.origin.referenceId = "jp-tokyo-attraction-1";
  internalPoi.origin.displayName = null;
  assert.equal((await handler(request(internalPoi))).status, 400);

  const coordinateOnly = structuredClone(plannerRequestFixture);
  coordinateOnly.origin.referenceId = null;
  coordinateOnly.origin.displayName = null;
  coordinateOnly.origin.coordinates = [0, 0];
  assert.equal((await handler(request(coordinateOnly))).status, 400);

  const unverifiedName = structuredClone(plannerRequestFixture);
  unverifiedName.origin.displayName = "新宿";
  assert.equal((await handler(request(unverifiedName))).status, 400);

  const oversized = request("x".repeat(16_385), {
    headers: { "content-length": "16385" },
  });
  assert.equal((await handler(oversized)).status, 413);
  assert.equal(calls, 0);
});

test("route handler returns only normalized no-store results and maps stable failures", async () => {
  const success = createPlannerRouteHandler({
    environment: enabledEnvironment,
    authorize: authorized,
    calculate: async (canonical, signal) => {
      assert.equal(canonical.requestId, plannerRequestFixture.requestId);
      assert.equal(signal.aborted, false);
      return { ok: true, value: minimalRailRouteFixture };
    },
  });
  const response = await success(request(plannerRequestFixture));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.doesNotMatch(JSON.stringify(body), /accessKey|SerializeData|raw/);

  for (const [code, status] of [
    ["no_route", 404],
    ["provider_rate_limited", 429],
    ["provider_timeout", 503],
    ["unsupported_mode", 400],
  ]) {
    const failure = createPlannerRouteHandler({
      environment: enabledEnvironment,
      authorize: authorized,
      calculate: async () => ({
        ok: false,
        error: {
          code,
          retryable:
            code === "provider_rate_limited" || code === "provider_timeout",
          category: code === "no_route" ? "no_result" : "availability",
          message: "safe failure",
          diagnosticFingerprint: null,
          metadata: {},
        },
      }),
    });
    assert.equal(
      (await failure(request(plannerRequestFixture))).status,
      status,
    );
  }
});

test("route handler enforces per-process concurrency without queue fanout", async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const handler = createPlannerRouteHandler({
    environment: enabledEnvironment,
    authorize: authorized,
    maxConcurrentRequests: 1,
    calculate: async () => {
      await pending;
      return { ok: true, value: minimalRailRouteFixture };
    },
  });
  const first = handler(request(plannerRequestFixture));
  await new Promise((resolve) => setTimeout(resolve, 0));
  const second = await handler(request(plannerRequestFixture));
  assert.equal(second.status, 429);
  release();
  assert.equal((await first).status, 200);
});

test("route query state is session-only and browser save projection excludes it", () => {
  const queryFiles = [
    "src/features/planner/model/route-query.ts",
    "src/features/planner/components/planner-route-query.tsx",
  ].map((file) =>
    readFileSync(resolve(import.meta.dirname, "..", file), "utf8"),
  );
  assert.doesNotMatch(
    queryFiles.join("\n"),
    /localStorage|sessionStorage|indexedDB|serviceWorker|CacheStorage/,
  );
  const fakeTrip = {
    plans: [],
    settings: {},
    configuration: {},
    ui: { currentPlanId: "classic" },
    routeQueries: { secretProviderResult: minimalRailRouteFixture },
  };
  const snapshot = tripSnapshot(fakeTrip, {
    version: 1,
    items: [],
    completedIds: [],
    preparations: {},
  });
  assert.equal("routeQueries" in snapshot, false);
  assert.doesNotMatch(
    JSON.stringify(snapshot),
    /secretProviderResult|ekiworld/,
  );
});

test("route integration source exposes no public fixture bypass or provider secret", () => {
  const root = resolve(import.meta.dirname, "..");
  const route = readFileSync(
    resolve(root, "src/app/api/routes/calculate/route.ts"),
    "utf8",
  );
  const client = readFileSync(
    resolve(root, "src/features/planner/model/route-query.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    route + client,
    /EKIWORLD_ACCESS_KEY|fixtureMode|testBypass/,
  );
  assert.doesNotMatch(client, /api\.ekispert\.jp|ROUTING_PROVIDER_MODE/);
});
