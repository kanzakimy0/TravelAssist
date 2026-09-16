import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import "./register-route-ts.mjs";
// Also works with the repository's plain node --test quality gate.
const { validate, preview, createRuleEngine, evaluationLoadModel } =
  await import("../src/server/engine/index.ts");
const { parseTripPlanSnapshot } =
  await import("../src/shared/contracts/trips/index.ts");
const { parseChangeSet, OPERATIONS } =
  await import("../src/server/engine/input.ts");
const { scenario, addItem, route, opening, time } =
  await import("./fixtures/engine-feasibility.mjs");

const run = (s, fn = validate) => fn(s.snapshot, s.change, s.context);
const has = (r, code) => r.issues.some((i) => i.code === code);
const assessment = (r, dimension, kind = "item") =>
  r.assessment.assessments.find(
    (a) => a.dimension === dimension && a.scope.kind === kind,
  );
const load = (r) => assessment(r, "physical_load").impacts[0].value;
const freeze = (v) => {
  if (v && typeof v === "object") {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};

test("A: 30min below minimum60 remains unreasonable despite perfect matching and low load", () => {
  const s = scenario(30),
    r = run(s);
  assert.equal(r.outcome, "blocked");
  assert.ok(has(r, "DURATION_TOO_SHORT"));
  assert.equal(assessment(r, "duration").reasonableness, "unreasonable");
  assert.deepEqual(assessment(r, "duration").duration.evaluatedMinutes, 30);
  assert.equal(load(r), 3);
  s.context.profiles[0].matchingScore = 0;
  const low = run(s);
  assert.equal(low.outcome, r.outcome);
  assert.equal(load(low), load(r));
});
for (const duration of [60, 75, 89])
  for (const severity of ["warning", "confirmation"]) {
    test(`B: ${duration} compressed uses policy ${severity}`, () => {
      const s = scenario(duration);
      s.context.policy.compressed = severity;
      const r = run(s);
      assert.ok(has(r, "COMPRESSED_VISIT"));
      assert.equal(
        r.outcome,
        severity === "warning" ? "accepted" : "needsConfirmation",
      );
      assert.equal(
        r.assessment.status,
        severity === "warning" ? "warning" : "needsConfirmation",
      );
      assert.equal(
        r.confirmationRequirements.length,
        severity === "warning" ? 0 : 2,
      );
    });
  }
test("soft minimum is confirmable but never silently accepted", () => {
  const s = scenario(30);
  s.context.policy.minimum = "confirmation";
  const r = run(s);
  assert.equal(r.outcome, "needsConfirmation");
  assert.ok(
    r.confirmationRequirements.some((q) => q.code === "DURATION_TOO_SHORT"),
  );
});
test("C: 90min passes duration and independently evaluated day/itinerary", () => {
  const r = run(scenario());
  assert.equal(r.outcome, "accepted");
  assert.equal(r.assessment.reasonableness, "reasonable");
  assert.deepEqual(assessment(r, "duration").reasonCodes, [
    "DURATION_RULE_PASSED",
  ]);
  for (const [dim, kind] of [
    ["day_capacity", "day"],
    ["fatigue", "day"],
    ["itinerary_reasonableness", "itinerary"],
  ])
    assert.equal(assessment(r, dim, kind).status, "accepted");
  assert.ok(r.assessment.coverage.every((c) => c.state === "evaluated"));
});
test("D: duration/context load model changes impact and retains version/unit", () => {
  const a = run(scenario(30)),
    b = run(scenario(90));
  assert.equal(load(a), 3);
  assert.equal(load(b), 9);
  const s = scenario();
  s.context.days[0].context.stairsFactor = 2;
  const c = run(s);
  assert.equal(load(c), 18);
  assert.equal(assessment(c, "physical_load").impacts[0].modelVersion, "1");
  assert.equal(
    assessment(c, "physical_load").impacts[0].unit,
    "evaluation-load-v1",
  );
  assert.notEqual(load(b), 7);
});
test("E: item durations pass while day load exceeds capacity", () => {
  const s = scenario();
  addItem(s);
  s.context.days[0].loadLimit = 12;
  const r = run(s);
  assert.ok(
    r.assessment.assessments
      .filter((a) => a.dimension === "duration")
      .every((a) => a.status === "accepted"),
  );
  assert.ok(has(r, "DAY_OVERLOADED"));
  assert.equal(assessment(r, "fatigue", "day").reasonableness, "unreasonable");
});
test("day time capacity includes explicit buffers", () => {
  const s = scenario();
  addItem(s, 12);
  s.context.days[0].window = { start: time(10, 10), end: time(10, 13) };
  const r = run(s);
  assert.ok(
    r.issues.some(
      (i) => i.code === "DAY_OVERLOADED" && i.details.requiredMinutes === 190,
    ),
  );
});
test("F: locally acceptable days can exceed cross-day recovery budget", () => {
  const s = scenario(90, 3);
  s.context.days.forEach((d) => (d.recoveryBefore = 0));
  s.context.policy.itinerary.maxCarryLoad = 20;
  const r = run(s);
  assert.ok(
    r.assessment.assessments
      .filter((a) => a.scope.kind === "day")
      .every((a) => a.status === "accepted"),
  );
  assert.ok(has(r, "ITINERARY_UNREASONABLE"));
  assert.equal(
    assessment(r, "itinerary_reasonableness", "itinerary").reasonableness,
    "unreasonable",
  );
  s.context.days.forEach((d) => (d.recoveryBefore = 12));
  assert.equal(run(s).outcome, "accepted");
});
test("consecutive high-load days are checked separately from total carry", () => {
  const s = scenario(90, 3);
  s.context.policy.itinerary.highLoadThreshold = 8;
  s.context.policy.itinerary.maxCarryLoad = 1000;
  assert.ok(has(run(s), "ITINERARY_UNREASONABLE"));
});
test("G: route-sensitive missing facts block without invented transfer time", () => {
  const s = scenario();
  addItem(s);
  s.context.policy.requireRoutes = true;
  const r = run(s);
  assert.ok(has(r, "PROVIDER_FACT_MISSING"));
  assert.equal(r.outcome, "blocked");
  assert.equal(assessment(r, "duration").status, "accepted");
  assert.equal(assessment(r, "fatigue", "day").impacts[0].value, null);
});
test("known public RouteResponse contributes transfer duration/load once", () => {
  const s = scenario();
  const next = addItem(s);
  const first = s.snapshot.plans[0].days[0].items[0];
  route(s, first, next, 20, "walk");
  const r = run(s);
  assert.equal(r.outcome, "accepted");
  assert.equal(assessment(r, "fatigue", "day").impacts[0].value, 18.333333);
  assert.ok(run(s, preview).preview.impact.routeFactsUsed.length === 1);
});
for (const mode of [
  "expired",
  "future",
  "missing-ref",
  "low-confidence",
  "wrong-subject",
  "unknown-duration",
  "wrong-endpoint",
]) {
  test(`route evidence ${mode} never becomes all-clear`, () => {
    const s = scenario();
    const next = addItem(s);
    const binding = route(s, s.snapshot.plans[0].days[0].items[0], next);
    if (mode === "expired") binding.fact.expiresAt = s.context.evaluationTime;
    if (mode === "future") binding.fact.observedAt = "2027-04-02T00:00:00Z";
    if (mode === "low-confidence") binding.fact.confidence = 0.1;
    if (mode === "wrong-subject") binding.fact.subjectRef = next.id;
    if (mode === "unknown-duration")
      binding.response.alternatives[0].durationSeconds = null;
    if (mode === "wrong-endpoint")
      binding.response.alternatives[0].legs[0].destination.referenceId =
        "wrong";
    s.change.factRefs =
      mode === "missing-ref" ? [] : [structuredClone(binding.fact)];
    const r = run(s);
    assert.notEqual(r.outcome, "accepted");
    if (mode === "expired") assert.ok(has(r, "ROUTE_FACT_EXPIRED"));
  });
}
test("insufficient transfer window emits hard/soft conflict", () => {
  const s = scenario();
  const next = addItem(s, 12);
  route(s, s.snapshot.plans[0].days[0].items[0], next, 40);
  assert.ok(has(run(s), "SOFT_TIME_CONFLICT"));
  s.context.protectedItemIds = [next.id];
  assert.ok(has(run(s), "HARD_TIME_CONFLICT"));
});
test("opening-hours hard conflict is independent of duration pass", () => {
  const s = scenario();
  opening(s, [{ start: time(10, 12), end: time(10, 17) }]);
  const r = run(s);
  assert.equal(assessment(r, "duration").status, "accepted");
  assert.ok(has(r, "HARD_TIME_CONFLICT"));
});
test("explicit meal/rest policy checks covered minutes, not presence", () => {
  const s = scenario();
  s.context.days[0].mealRestWindows = [
    {
      kind: "meal",
      window: { start: time(10, 12), end: time(10, 14) },
      minimumMinutes: 30,
    },
  ];
  assert.ok(has(run(s), "DAY_OVERLOADED"));
  const meal = addItem(s, 12, 60);
  meal.kind = "meal";
  assert.ok(!run(s).issues.some((i) => i.details.constraint === "meal_window"));
});
test("overlapping item schedules use existing soft/hard codes", () => {
  const s = scenario();
  const next = addItem(s, 11);
  assert.ok(has(run(s), "SOFT_TIME_CONFLICT"));
  next.lockLevel = "system_hard_lock";
  assert.ok(has(run(s), "HARD_TIME_CONFLICT"));
});
test("cross-midnight overlap fails even when days have independent IDs", () => {
  const s = scenario(90, 2),
    first = s.snapshot.plans[0].days[0].items[0];
  first.schedule.end = time(11, 11);
  s.context.days[0].window.end = time(11, 12);
  assert.ok(
    run(s).issues.some(
      (i) =>
        i.code === "HARD_TIME_CONFLICT" &&
        i.details.constraint === "cross_day_overlap",
    ),
  );
});
for (const kind of [
  "schedule",
  "profile",
  "profile-conflict",
  "profile-expired",
  "day-context",
  "model",
  "model-version",
  "recovery",
]) {
  test(`H: missing/unknown ${kind} produces coverage gap, never zero/all-clear`, () => {
    const s = scenario();
    if (kind === "schedule")
      s.snapshot.plans[0].days[0].items[0].schedule = null;
    if (kind === "profile") s.context.profiles = [];
    if (kind === "profile-conflict") s.context.profiles[0].minimumMinutes = 120;
    if (kind === "profile-expired")
      s.context.profiles[0].expiresAt = s.context.evaluationTime;
    if (kind === "day-context") s.context.days[0].context = null;
    if (kind === "model") s.context.policy.model = null;
    if (kind === "model-version") s.context.policy.model.version = "unknown";
    if (kind === "recovery") s.context.days[0].recoveryBefore = null;
    const r = run(s);
    assert.notEqual(r.outcome, "accepted");
    assert.equal(r.assessment.reasonableness, "undetermined");
    assert.ok(r.assessment.coverage.some((c) => c.state !== "evaluated"));
    if (kind !== "recovery") assert.equal(load(r), null);
  });
}
test("UPDATE_DURATION and other reserved operations stay unsupported", () => {
  for (const op of ["UPDATE_DURATION", "REPLAN_DAY", "LINK_BOOKING"]) {
    const s = scenario();
    s.change.operations = [
      { operationId: "op", op, reason: null, targetRef: "item-0" },
    ];
    const r = run(s);
    assert.equal(r.outcome, "unsupported");
    assert.ok(has(r, "OPERATION_UNSUPPORTED"));
    assert.equal(r.preview, null);
  }
});
test("UPDATE_TIME previews detached canonical plan; no revision, clock, audit or input writes", () => {
  const s = scenario(),
    original = structuredClone(s);
  s.change.operations = [
    {
      operationId: "op",
      op: "UPDATE_TIME",
      reason: null,
      itemId: "item-0",
      schedule: {
        ...s.snapshot.plans[0].days[0].items[0].schedule,
        end: time(10, 10, 30),
      },
    },
  ];
  const copy = structuredClone(s);
  freeze(s);
  const r = run(s, preview);
  assert.ok(has(r, "DURATION_TOO_SHORT"));
  assert.deepEqual(s, copy);
  assert.equal(r.resultingVersion, null);
  assert.equal(r.transaction.status, "not_started");
  assert.equal(r.replay.duplicate, false);
  assert.equal(parseTripPlanSnapshot(r.preview.after).ok, true);
  assert.deepEqual(r.preview.before, original.snapshot);
  assert.equal(r.preview.after.plans[0].revision, 3);
  assert.equal("duration" in r.preview.after.plans[0].days[0].items[0], false);
});
test("REORDER_ITEMS preserves full permutation/identity and checks chronological order", () => {
  const s = scenario();
  const next = addItem(s);
  s.change.operations = [
    {
      operationId: "reorder",
      op: "REORDER_ITEMS",
      reason: null,
      dayId: "day-0",
      orderedItemIds: [next.id, "item-0"],
    },
  ];
  assert.ok(has(run(s), "SOFT_TIME_CONFLICT"));
  s.change.operations[0].orderedItemIds = ["item-0", "item-0"];
  assert.ok(has(run(s), "INPUT_INVALID"));
});
test("same input+versions gives deterministic replay, including different object key order", () => {
  const s = scenario();
  const expected = JSON.stringify(run(s, preview));
  for (let i = 0; i < 20; i++)
    assert.equal(JSON.stringify(run(structuredClone(s), preview)), expected);
  const reorder = (v) =>
    Array.isArray(v)
      ? v.map(reorder)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .reverse()
              .map(([k, x]) => [k, reorder(x)]),
          )
        : v;
  assert.equal(JSON.stringify(run(reorder(s), preview)), expected);
  assert.deepEqual(run(s).assessment, run(s, preview).assessment);
});
test("rule/profile/context change invalidates preview fingerprint without changing plan revision", () => {
  const s = scenario(),
    a = run(s, preview);
  for (const mutate of [
    (x) => (x.context.profiles[0].version = "2"),
    (x) => (x.context.policy.version = "2"),
    (x) => (x.context.evaluationTime = "2027-04-01T01:00:00Z"),
    (x) => (x.context.days[0].context.slopeFactor = 2),
  ]) {
    const b = structuredClone(s);
    mutate(b);
    assert.notEqual(run(b, preview).preview.previewHash, a.preview.previewHash);
  }
});
test("model registry supports versioned pure adapters and fails closed for invalid outputs", () => {
  const s = scenario(),
    different = {
      ...evaluationLoadModel,
      version: "2",
      evaluate: (i) => evaluationLoadModel.evaluate(i) * 2,
    };
  s.context.policy.model.version = "2";
  assert.equal(load(run(s, createRuleEngine([different]).validate)), 18);
  const invalid = { ...different, evaluate: () => NaN };
  const r = run(s, createRuleEngine([invalid]).validate);
  assert.equal(r.outcome, "unsupported");
  assert.equal(load(r), null);
});
for (const mode of [
  "wrong-actor",
  "cannot-read",
  "wrong-trip",
  "stale-trip",
  "stale-plan",
  "unknown-kind",
  "unknown-lock",
]) {
  test(`security/version gate: ${mode}`, () => {
    const s = scenario();
    if (mode === "wrong-actor") s.change.source.actorRef = "fake";
    if (mode === "cannot-read") s.context.access.canRead = false;
    if (mode === "wrong-trip") s.context.access.tripId = "fake";
    if (mode === "stale-trip") s.change.baseVersion.tripRevision--;
    if (mode === "stale-plan") s.change.baseVersion.planRevision--;
    if (mode === "unknown-kind")
      s.snapshot.plans[0].days[0].items[0].kind = "future_kind";
    if (mode === "unknown-lock")
      s.snapshot.plans[0].days[0].items[0].lockLevel = "future_lock";
    const r = run(s);
    assert.notEqual(r.outcome, "accepted");
    assert.equal(r.assessment, undefined);
    assert.equal(r.preview, null);
  });
}
test("locked/booking-protected mutations cannot be hidden in preview", () => {
  const s = scenario();
  s.change.operations = [
    {
      operationId: "op",
      op: "UPDATE_TIME",
      reason: null,
      itemId: "item-0",
      schedule: s.snapshot.plans[0].days[0].items[0].schedule,
    },
  ];
  s.snapshot.plans[0].days[0].items[0].lockLevel = "system_hard_lock";
  assert.ok(has(run(s), "SYSTEM_HARD_LOCKED"));
  s.snapshot.plans[0].days[0].items[0].lockLevel = "booking_lock";
  assert.equal(run(s).outcome, "unsupported");
  s.snapshot.plans[0].days[0].items[0].lockLevel = "user_lock";
  assert.equal(run(s).outcome, "needsConfirmation");
});
for (const mode of [
  "43-fields",
  "private-duration",
  "duplicate-operation",
  "unknown-operation",
  "invalid-zone",
  "cycle",
  "getter",
  "nan",
  "sparse",
]) {
  test(`malformed input ${mode} fails closed without input/secret echo`, () => {
    const s = scenario();
    const op = {
      operationId: "op",
      op: "UPDATE_TIME",
      reason: null,
      itemId: "item-0",
      schedule: structuredClone(s.snapshot.plans[0].days[0].items[0].schedule),
    };
    s.change.operations = [op];
    if (mode === "43-fields") s.change.features43 = { secret: "DO-NOT-ECHO" };
    if (mode === "private-duration") op.duration = 30;
    if (mode === "duplicate-operation")
      s.change.operations.push(structuredClone(op));
    if (mode === "unknown-operation") op.op = "purchase_ticket";
    if (mode === "invalid-zone") op.schedule.startTimezone = "UTC";
    if (mode === "cycle") s.context.self = s.context;
    if (mode === "getter")
      Object.defineProperty(s.change, "secret", {
        enumerable: true,
        get() {
          throw Error("DO-NOT-ECHO");
        },
      });
    if (mode === "nan") s.context.profiles[0].walking = NaN;
    if (mode === "sparse") s.change.operations = new Array(2);
    const r = run(s);
    assert.notEqual(r.outcome, "accepted");
    assert.equal(r.preview, null);
    assert.ok(!JSON.stringify(r).includes("DO-NOT-ECHO"));
  });
}
test("runtime contract type declarations match all original document declarations", () => {
  const doc = readFileSync(
    new URL(
      "../docs/architecture/travelassist-engine-contract.md",
      import.meta.url,
    ),
    "utf8",
  );
  const runtime = readFileSync(
    new URL("../src/shared/contracts/engine/index.ts", import.meta.url),
    "utf8",
  );
  const blocks = [
    ...doc.matchAll(/\x60\x60\x60ts\r?\n([\s\S]*?)\r?\n\x60\x60\x60/g),
  ].map((m) => m[1]);
  const defs = (source) =>
    ts
      .createSourceFile("contract.ts", source, ts.ScriptTarget.Latest, true)
      .statements.filter(ts.isTypeAliasDeclaration);
  const printer = ts.createPrinter({ removeComments: true });
  const normal = (d) =>
    printer
      .printNode(ts.EmitHint.Unspecified, d, d.getSourceFile())
      .replace(/export /g, "")
      .replace(/\s+/g, "");
  const actual = new Map(defs(runtime).map((d) => [d.name.text, normal(d)]));
  let checked = 0;
  for (const block of blocks)
    for (const d of defs(block)) {
      assert.equal(actual.get(d.name.text), normal(d));
      checked++;
    }
  assert.ok(checked >= 18);
  for (const op of OPERATIONS) assert.ok(runtime.includes('"' + op + '"'));
});
test("result fixture obeys envelope, refs, coverage, status and canonical snapshot contract", () => {
  for (const minutes of [30, 75, 90]) {
    const r = run(scenario(minutes), preview);
    assert.deepEqual(
      Object.keys(r).sort(),
      [
        "engineContractVersion",
        "requestKind",
        "outcome",
        "changeSetId",
        "idempotencyKey",
        "payloadHash",
        "observedVersion",
        "resultingVersion",
        "issues",
        "assessment",
        "confirmationRequirements",
        "preview",
        "replay",
        "transaction",
      ].sort(),
    );
    assert.equal(r.assessment.amendment, "4.20.1");
    assert.deepEqual(r.assessment.observedVersion, r.observedVersion);
    const ids = new Set(r.assessment.assessments.map((a) => a.assessmentId));
    assert.equal(ids.size, r.assessment.assessments.length);
    for (const a of r.assessment.assessments) {
      for (const i of a.issueIndexes) {
        assert.ok(r.issues[i]);
        assert.ok(a.reasonCodes.includes(r.issues[i].code));
      }
      for (const id of a.relatedAssessmentIds) assert.ok(ids.has(id));
      if (a.status !== "accepted") assert.ok(a.issueIndexes.length);
    }
    for (const c of r.assessment.coverage)
      for (const id of c.assessmentIds) assert.ok(ids.has(id));
    assert.equal(parseChangeSet(scenario(minutes).change).ok, true);
    assert.equal(parseTripPlanSnapshot(r.preview.after).ok, true);
  }
});
test("public engine exposes no apply/rollback runtime and source has no side effects", () => {
  const engine = createRuleEngine();
  assert.deepEqual(Object.keys(engine).sort(), ["preview", "validate"]);
  for (const name of [
    "index",
    "rules",
    "context",
    "registry",
    "report",
    "json",
    "input",
  ]) {
    const source = readFileSync(
      new URL("../src/server/engine/" + name + ".ts", import.meta.url),
      "utf8",
    );
    assert.ok(
      !/\bfetch\s*\(|Date\.now|Math\.random|node:fs|node:https|localStorage|Mapbox|\.transaction\(/.test(
        source,
      ),
      name,
    );
  }
});

test("itinerary propagates item/cross-day failures without upgrading warning or confirmation", () => {
  const short = run(scenario(30));
  assert.equal(
    assessment(short, "itinerary_reasonableness", "itinerary").status,
    "blocked",
  );
  const compressed = run(scenario(75));
  assert.equal(
    assessment(compressed, "itinerary_reasonableness", "itinerary").status,
    "warning",
  );
  assert.equal(compressed.outcome, "accepted");
  const s = scenario();
  addItem(s, 11);
  assert.equal(run(s).outcome, "needsConfirmation");
});
test("missing prior load is not a fabricated zero-fatigue start", () => {
  const s = scenario();
  s.context.priorLoad = null;
  const r = run(s);
  assert.equal(r.assessment.reasonableness, "undetermined");
  assert.equal(
    assessment(r, "itinerary_reasonableness", "itinerary").impacts[0].value,
    null,
  );
  s.context.priorLoad = 30;
  assert.ok(has(run(s), "ITINERARY_UNREASONABLE"));
});
test("unknown duration uses unknown evidence basis", () => {
  const s = scenario();
  s.snapshot.plans[0].days[0].items[0].schedule = null;
  const r = run(s);
  assert.equal(
    assessment(r, "physical_load").impacts[0].durationBasis,
    "unknown",
  );
});
test("provider evidence with unknown source/mode or wrong fact kind fails closed", () => {
  for (const kind of ["freshness", "entitlement", "mode", "kind", "segments"]) {
    const s = scenario();
    const next = addItem(s);
    const binding = route(s, s.snapshot.plans[0].days[0].items[0], next);
    if (kind === "freshness") binding.response.source.freshness = "invented";
    if (kind === "entitlement")
      binding.response.source.entitlement = "invented";
    if (kind === "mode")
      binding.response.alternatives[0].segments[0].mode = "other";
    if (kind === "kind") binding.fact.factKind = "booking";
    if (kind === "segments") binding.response.alternatives[0].segments = [];
    s.change.factRefs = [structuredClone(binding.fact)];
    assert.notEqual(run(s).outcome, "accepted", kind);
  }
});
test("model registry rejects missing unit and replay does not depend on registry order", () => {
  assert.throws(
    () => createRuleEngine([{ ...evaluationLoadModel, unit: "" }]),
    /INVALID_MODEL_METADATA/,
  );
  const other = {
    ...evaluationLoadModel,
    ref: "other-versioned-model",
    version: "2",
  };
  const s = scenario();
  assert.deepEqual(
    run(s, createRuleEngine([other, evaluationLoadModel]).preview),
    run(s, createRuleEngine([evaluationLoadModel, other]).preview),
  );
});
test("all physical impact evidence includes its actual rule and profile source", () => {
  const r = run(scenario()),
    a = assessment(r, "physical_load");
  assert.ok(
    a.sourceRefs.some(
      (s) =>
        s.kind === "rule" && s.ref === a.ruleRef && s.version === a.ruleVersion,
    ),
  );
  assert.ok(a.impacts[0].sourceRefs.some((s) => s.kind === "profile"));
});
test("fixture type drift cannot add independent duration to canonical item", () => {
  const s = scenario();
  s.snapshot.plans[0].days[0].items[0].duration = 90;
  assert.equal(run(s).outcome, "blocked");
  assert.equal(run(s).assessment, undefined);
});
test("two-layer stale revisions do not reveal a candidate preview", () => {
  const s = scenario();
  s.change.baseVersion.planRevision = 999;
  const r = run(s, preview);
  assert.ok(has(r, "BASE_VERSION_STALE"));
  assert.equal(r.preview, null);
  assert.equal(r.resultingVersion, null);
});
test("fixed model inputs are immutable and a mutating model returns unsupported", () => {
  const model = {
    ...evaluationLoadModel,
    evaluate: (i) => {
      i.context.slopeFactor = 100;
      return 1;
    },
  };
  const s = scenario(),
    copy = structuredClone(s);
  const r = run(s, createRuleEngine([model]).validate);
  assert.equal(r.outcome, "unsupported");
  assert.deepEqual(s, copy);
});
test("empty plans and excessive operation payloads fail closed", () => {
  const s = scenario();
  s.snapshot.plans[0].days[0].items = [];
  assert.equal(run(s).outcome, "blocked");
  const t = scenario();
  t.change.operations = Array.from({ length: 101 }, (_, i) => ({
    operationId: "op" + i,
    op: "UPDATE_DURATION",
    reason: null,
    targetRef: "item-0",
  }));
  assert.notEqual(run(t).outcome, "accepted");
});

test("AI/system candidates cannot bypass the unresolved confirmation policy", () => {
  for (const kind of ["ai", "system", "provider_event"]) {
    const s = scenario();
    s.change.source.kind = kind;
    const r = run(s);
    assert.equal(r.outcome, "unsupported");
    assert.equal(r.preview, null);
  }
});
test("booking-protected conflicts remain visible while unavailable booking rules are unsupported", () => {
  const s = scenario();
  const next = addItem(s, 11);
  next.booking = {
    status: "confirmed",
    referenceId: "trusted-ref",
    verifiedAt: "2027-03-31T00:00:00Z",
  };
  const r = run(s);
  assert.equal(r.outcome, "unsupported");
  assert.ok(has(r, "HARD_TIME_CONFLICT"));
  assert.ok(r.issues.some((i) => i.category === "booking"));
});
test("unknown booking status cannot be called fully feasible", () => {
  const s = scenario();
  s.snapshot.plans[0].days[0].items[0].booking.status = "unknown";
  assert.equal(run(s).outcome, "unsupported");
});
test("zero environment factor cannot fabricate zero actual load", () => {
  const s = scenario();
  s.context.days[0].context.environmentFactor = 0;
  assert.notEqual(run(s).outcome, "accepted");
});

test("legacy Preview impact includes both endpoints of a transfer conflict", () => {
  const s = scenario();
  const next = addItem(s, 12),
    first = s.snapshot.plans[0].days[0].items[0];
  route(s, first, next, 40);
  const r = run(s, preview);
  assert.ok(r.preview.impact.scheduleConflicts.includes(first.id));
  assert.ok(r.preview.impact.scheduleConflicts.includes(next.id));
});
