import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  publicConditionalApplicability,
  publicStructuralResult,
  queryGraph,
  auditGraph,
} from "../tools/transport/task-086-model.mjs";
import { assertPublicStructuralConsumption } from "../tools/transport/task-086-stage.mjs";
const read = (f) => JSON.parse(fs.readFileSync(f, "utf8")),
  rows = (f) =>
    fs.readFileSync(f, "utf8").trim().split(/\r?\n/).map(JSON.parse);
function fixture() {
  const r = read(
      new URL(
        "./fixtures/task-086-onboard-request/actual-subgraph.json",
        import.meta.url,
      ),
    ),
    sources = new Map(r.sources.map((s) => [s.sourceId, s])),
    evidence = new Map(r.evidence.map((e) => [e.evidenceId, e]));
  const v = {
    sources,
    evidence,
    nodes: new Map(r.nodes.map((n) => [n.nodeId, n])),
    patternById: new Map(r.patterns.map((p) => [p.servicePatternId, p])),
    dynamicODById: new Map(),
    nativeFacilityByAnchor: new Map(
      r.nativeFacilities.map((n) => [n.identityAnchor, n]),
    ),
  };
  const airport = r.nodes.find((n) => n.canonicalNameJa === "新島空港"),
    health = r.nodes.find((n) => n.canonicalNameJa === "さわやか健康センター"),
    anchor = r.nodes.find((n) => n.canonicalNameJa === "調布飛行場");
  const inventory = [
    {
      requirementId: "health",
      nodeId: health.nodeId,
      kind: "public_pickup_facility",
      tier: "T3",
    },
    {
      requirementId: "airport",
      nodeId: airport.nodeId,
      kind: "airport",
      tier: "T3",
    },
  ];
  const deficits = [
    {
      deficitId: "connect:health",
      requirementId: "health",
      class: "MISSING_INTERMEDIATE_NODE",
    },
    {
      deficitId: "mode:airport",
      requirementId: "airport",
      class: "AIRPORT_SURFACE_GAP",
    },
    { deficitId: "global:source", class: "SOURCE_LICENSE_GAP" },
  ];
  return {
    r,
    v,
    airport,
    health,
    anchor,
    inventory,
    deficits,
    context: { ...r.context, odValidationContext: v },
    assess() {
      return publicConditionalApplicability({
        nodes: r.nodes,
        edges: r.edges,
        inventory,
        anchorNodeId: anchor.nodeId,
        deficits,
        contexts: [this.context],
        validationContext: v,
      });
    },
  };
}
test("real-source public onboard view is neutral service-access, default FAIL retained, global remains OPEN", () => {
  const f = fixture(),
    a = f.assess();
  assert.deepEqual(
    a.assessments.map((x) => x.status),
    [
      "STRUCTURALLY_CONNECTED_WITH_PUBLIC_SERVICE_ACCESS_CONDITIONS",
      "STRUCTURALLY_CONNECTED_WITH_PUBLIC_SERVICE_ACCESS_CONDITIONS",
      "OPEN",
    ],
  );
  for (const x of a.assessments) assert.equal(x.defaultStatus, "FAIL");
  assert.deepEqual(
    a.originalCheckIdsPreserved,
    f.deficits.map((x) => x.deficitId),
  );
  assert.equal(queryGraph(f.r.edges, f.anchor.nodeId, f.health.nodeId), null);
  assert.equal(a.assessments[0].advanceReservationImplied, false);
});
test("actual audit and independent stage consumption use same neutral classification", () => {
  const f = fixture(),
    a = auditGraph({
      nodes: f.r.nodes,
      patterns: f.r.patterns,
      transfers: [],
      edges: f.r.edges,
      inventory: f.inventory,
      anchorNodeId: f.anchor.nodeId,
      discoveryGaps: [f.deficits[2]],
      validationContext: f.v,
      conditionalAccessContexts: [f.context],
    });
  assert.equal(
    a.structuralChecks.find((x) => x.checkId === "connect:health").status,
    "PASS_WITH_PUBLIC_SERVICE_ACCESS_CONDITIONS",
  );
  assert.ok(a.defaultDiagnostics);
  assertPublicStructuralConsumption(
    a.conditionalApplicability,
    a.structuralChecks,
    a.deficits,
  );
  assert.ok(a.deficits.some((x) => x.deficitId === "global:source"));
});
for (const [name, change] of [
  [
    "driver request removed",
    (f) => delete f.context.onboardIntents.at(-1).driverRequestMethod,
  ],
  [
    "excursion substituted",
    (f) => f.context.onboardIntents.forEach((i) => (i.purpose = "EXCURSION")),
  ],
  [
    "luggage disallowed",
    (f) => f.context.onboardIntents.forEach((i) => (i.carriesSurfboard = true)),
  ],
  ["reviewed day expired", (f) => (f.context.travelDate = "2026-10-05")],
  [
    "ordinary purpose not explicit",
    (f) =>
      f.context.onboardIntents.forEach(
        (i) => (i.purposeExplicitlyDeclared = false),
      ),
  ],
])
  test(name + " reopens same original check IDs", () => {
    const f = fixture();
    change(f);
    const a = f.assess();
    assert.equal(a.assessments[0].status, "OPEN");
    assert.equal(a.assessments[1].status, "OPEN");
    assert.deepEqual(
      a.originalCheckIdsPreserved,
      f.deficits.map((x) => x.deficitId),
    );
  });
test("withdrawn condition evidence fails authoritative assessment rather than claiming usable path", () => {
  const f = fixture();
  f.v.evidence.delete(f.r.facts[0].accessContract.sourceEvidenceRefs[0]);
  assert.throws(() => f.assess());
});
test("stage rejects relabeling onboard evidence as advance reservation", () => {
  const f = fixture(),
    a = f.assess(),
    checks = a.assessments.map((x) => ({
      checkId: x.checkId,
      status: publicStructuralResult(x.status),
      defaultDiagnostic: "FAIL",
      witnessBindingSha256: a.validationBindingSha256,
    }));
  checks[0].status = "PASS_WITH_PUBLIC_RESERVATION_CONDITIONS";
  assert.throws(
    () => assertPublicStructuralConsumption(a, checks, [f.deficits[2]]),
    /REGISTRY_CHANGED/,
  );
});
test("unknown conditional classification fails closed", () =>
  assert.throws(
    () => publicStructuralResult("PASS_BECAUSE_PUBLIC"),
    /UNKNOWN_PUBLIC_STRUCTURAL_STATUS/,
  ));
test("direct actual query rejects native registry stripped without relying on stage wrapper", () => {
  const f = fixture();
  f.v.nativeFacilityByAnchor.clear();
  assert.equal(
    queryGraph(f.r.edges, f.anchor.nodeId, f.health.nodeId, f.context),
    null,
  );
});
test("direct actual query rejects changed native facility coordinates", () => {
  const f = fixture();
  f.health.latitude += 0.001;
  assert.equal(
    queryGraph(f.r.edges, f.anchor.nodeId, f.health.nodeId, f.context),
    null,
  );
});
test("direct actual query rejects revoked native raw persistence permission", () => {
  const f = fixture();
  const e = f.v.evidence.get(f.health.evidenceRefs[0]);
  f.v.sources.get(e.sourceId).persistenceAllowed = false;
  assert.equal(
    queryGraph(f.r.edges, f.anchor.nodeId, f.health.nodeId, f.context),
    null,
  );
});

test("changed native coordinates fail authoritative structural replay before any success report", () => {
  const f = fixture();
  f.health.latitude += 0.001;
  assert.throws(() => f.assess(), /ONBOARD_NODE_ADMISSION_INVALID/);
  assert.deepEqual(
    f.deficits.map((x) => x.deficitId),
    ["connect:health", "mode:airport", "global:source"],
  );
});
