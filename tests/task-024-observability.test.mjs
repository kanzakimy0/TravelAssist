import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { task024FixtureMatrix } from "./fixtures/task-024-performance-fixtures.mjs";

await import("./register-route-ts.mjs");
const {
  createErrorObservation,
  createMetricObservation,
  diagnosticShape,
  routeTemplateFromPath,
  validateObservationEvent,
} = await import("../src/observability/contract.ts");
const { clearLocalObservationBuffer, installClientObservability } = await import(
  "../src/observability/client.ts"
);
const { ObservationQueue } = await import("../src/observability/queue.ts");
const { createServerObservationReporter } = await import(
  "../src/observability/server.ts"
);

const event = (code = "test_error") =>
  createErrorObservation({
    source: "browser_runtime",
    route: "/planner?token=must-not-survive#private",
    code,
    error: new Error("Authorization=secret@example.test"),
    environment: "test",
    release: "abcdef0",
  });

test("allowlist contract rejects unknown fields and full URLs", () => {
  const safe = event();
  assert.equal(validateObservationEvent(safe), true);
  assert.equal(safe.routeTemplate, "/planner");
  assert.doesNotMatch(
    JSON.stringify(safe),
    /secret|example|token|Authorization/i,
  );
  assert.equal(
    validateObservationEvent({ ...safe, message: "private" }),
    false,
  );
  assert.equal(
    validateObservationEvent({ ...safe, routeTemplate: "/planner?secret=yes" }),
    false,
  );
  assert.equal(
    routeTemplateFromPath("https://travel.test/start?email=a@b.test"),
    "/start",
  );
  assert.equal(
    routeTemplateFromPath("/personal-center/trips/private-trip-id"),
    "/personal-center/[segment]",
  );
});

test("nested diagnostics are reduced to shape and never retain canaries", () => {
  const canary = {
    authorization: "Bearer private-canary",
    profile: { email: "person@example.test", coordinates: [35.6, 139.7] },
    itinerary: ["private trip note"],
  };
  const shape = diagnosticShape(canary);
  assert.deepEqual(shape, { kind: "object", keys: 3 });
  assert.doesNotMatch(JSON.stringify(shape), /private|example|35\.6|139\.7/);
  const errorShape = diagnosticShape(
    Object.assign(new Error("private-canary"), { digest: "safe-digest" }),
  );
  assert.deepEqual(errorShape, {
    kind: "error",
    name: "Error",
    digest: "safe-digest",
  });
});

test("metric events keep only supported metric values", () => {
  const metric = createMetricObservation({
    route: "/start?profile=private",
    name: "LCP",
    value: 1234.56789,
    rating: "good",
    environment: "production",
  });
  assert.ok(metric);
  assert.equal(metric.metricValue, 1234.568);
  assert.equal(metric.routeTemplate, "/start");
  assert.equal(createMetricObservation({ name: "TBT", value: 10 }), null);
});

test("queue deduplicates, caps capacity and batches delivery", async () => {
  const batches = [];
  let now = 1_000;
  const queue = new ObservationQueue({
    sink: (batch) => batches.push(batch),
    capacity: 2,
    maxBatch: 1,
    now: () => now,
    random: () => 0,
  });
  assert.equal(queue.enqueue(event("one")), true);
  assert.equal(queue.enqueue(event("one")), false);
  assert.equal(queue.snapshot().deduplicated, 1);
  now += 61_000;
  assert.equal(queue.enqueue(event("one")), true);
  assert.equal(queue.enqueue(event("two")), false);
  assert.equal(queue.snapshot().dropped, 1);
  await queue.flush();
  assert.equal(batches.length, 2);
  assert.equal(queue.snapshot().delivered, 2);
});

test("sampling can disable collection without calling a sink", async () => {
  let calls = 0;
  const queue = new ObservationQueue({
    sink: () => {
      calls += 1;
    },
    sampleRate: 0,
    random: () => 0.5,
  });
  assert.equal(queue.enqueue(event()), false);
  await queue.flush();
  assert.equal(calls, 0);
  assert.equal(queue.snapshot().sampledOut, 1);
});

test("sink rejection and timeout are bounded and never recurse", async () => {
  let rejectedCalls = 0;
  const rejecting = new ObservationQueue({
    sink: () => {
      rejectedCalls += 1;
      throw new Error("private sink failure");
    },
    maxRetries: 2,
    delay: async () => {},
  });
  rejecting.enqueue(event());
  await rejecting.flush();
  assert.equal(rejectedCalls, 3);
  assert.equal(rejecting.snapshot().sinkFailures, 3);
  assert.equal(rejecting.snapshot().dropped, 1);

  const timeout = new ObservationQueue({
    sink: () => new Promise(() => {}),
    maxRetries: 0,
    sinkTimeoutMs: 10,
  });
  timeout.enqueue(event("timeout"));
  await timeout.flush();
  assert.equal(timeout.snapshot().sinkFailures, 1);
  assert.equal(timeout.snapshot().queued, 0);
});

class FakeTarget {
  location = { pathname: "/planner" };
  listeners = new Map();
  addEventListener(type, listener) {
    const current = this.listeners.get(type) ?? new Set();
    current.add(listener);
    this.listeners.set(type, current);
  }
  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }
  dispatch(type, value) {
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === "function") listener(value);
      else listener.handleEvent(value);
    }
  }
  count(type) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

test("client listeners mount once per installation and clean up", async () => {
  const target = new FakeTarget();
  const delivered = [];
  const installation = installClientObservability(target, {
    sink: (batch) => delivered.push(...batch),
    environment: "test",
  });
  assert.equal(target.count("error"), 1);
  assert.equal(target.count("unhandledrejection"), 1);
  target.dispatch("error", { error: new Error("private browser message") });
  target.dispatch("unhandledrejection", {
    reason: new DOMException("expected", "AbortError"),
  });
  await installation.flush();
  assert.equal(delivered.length, 2);
  assert.equal(delivered[1].category, "cancelled");
  assert.equal(delivered[1].severity, "info");
  assert.doesNotMatch(
    JSON.stringify(delivered),
    /private browser|\"message\"|\"stack\"/,
  );
  installation.cleanup();
  assert.equal(target.count("error"), 0);
  assert.equal(target.count("unhandledrejection"), 0);
});

test("server reporter sends only controlled events to injected sink", async () => {
  const delivered = [];
  const reporter = createServerObservationReporter({
    sink: (batch) => delivered.push(...batch),
    environment: { NODE_ENV: "test", RELEASE_SHA: "abcdef0" },
  });
  await reporter.reportRequestError({
    error: new Error("postgres://user:password@private.example/trip"),
    routeTemplate: "/api/routes/calculate?token=secret",
  });
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].routeTemplate, "/api/routes/calculate");
  assert.doesNotMatch(
    JSON.stringify(delivered),
    /password|private|token|postgres/i,
  );
});

test("runtime wiring has no external collector and fault route fails closed", async () => {
  const [instrumentation, client, route, layout] = await Promise.all([
    readFile("src/instrumentation.ts", "utf8"),
    readFile("src/instrumentation-client.ts", "utf8"),
    readFile("src/app/api/observability-test-error/route.ts", "utf8"),
    readFile("src/app/layout.tsx", "utf8"),
  ]);
  assert.match(instrumentation, /Instrumentation\.onRequestError/);
  assert.doesNotMatch(
    instrumentation + client,
    /fetch\(|sendBeacon|https?:\/\//,
  );
  assert.match(route, /TASK_024_FAULT_INJECTION !== "1"/);
  assert.match(route, /notFound\(\)/);
  assert.doesNotMatch(layout, /^"use client"/m);
  assert.match(layout, /<WebVitalsObserver \/>/);
  clearLocalObservationBuffer();
});

test("isolated synthetic scale fixtures cover 1/3/7 days and 10/50/200 nodes", () => {
  assert.deepEqual(
    task024FixtureMatrix.map((fixture) => [
      fixture.days.length,
      fixture.nodes.length,
    ]),
    [
      [1, 10],
      [3, 50],
      [7, 200],
    ],
  );
  assert.ok(task024FixtureMatrix.every((fixture) => fixture.synthetic));
  assert.ok(
    task024FixtureMatrix.every(
      (fixture) =>
        fixture.days.flatMap((day) => day.nodeIds).length ===
        fixture.nodes.length,
    ),
  );
});
