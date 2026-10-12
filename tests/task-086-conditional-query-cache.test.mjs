import test from "node:test";
import assert from "node:assert/strict";
import { createPublicConditionalApplicability } from "../tools/transport/task-086-public-conditional-applicability.mjs";
import * as candidate from "../tools/transport/task-086-model.mjs";
import { buildFixture } from "./fixtures/task-086-dynamic-od/fixture.mjs";
const F = buildFixture();
const baseline = {
  publicConditionalApplicability:
    createPublicConditionalApplicability(candidate),
};
function input(f) {
  return {
    nodes: [f.office, f.airport],
    edges: f.edges,
    inventory: [
      {
        requirementId: "office",
        nodeId: f.office.nodeId,
        tier: "T3",
        kind: "public_pickup_facility",
      },
      {
        requirementId: "airport",
        nodeId: f.airport.nodeId,
        tier: "T1",
        kind: "airport",
      },
    ],
    anchorNodeId: f.airport.nodeId,
    deficits: [
      {
        deficitId: "connect:office",
        class: "MISSING_INTERMEDIATE_NODE",
        requirementId: "office",
      },
      {
        deficitId: "mode:airport",
        class: "AIRPORT_SURFACE_GAP",
        requirementId: "airport",
      },
    ],
    contexts: [f.context, structuredClone(f.context)],
    validationContext: f.validation,
  };
}
test("entire structural report and each exact path match the original", () => {
  assert.deepEqual(
    candidate.publicConditionalApplicability(input(F)),
    baseline.publicConditionalApplicability(input(F)),
  );
});
test("same mutable evidence registry changed between calls invalidates prior success", () => {
  const f = structuredClone(F),
    args = input(f),
    old = candidate.publicConditionalApplicability(args);
  assert(old.assessments.some((x) => x.status !== "OPEN"));
  const od = [...f.validation.dynamicODById.values()][0],
    source = f.validation.sources.get(
      f.validation.evidence.get(od.parameterEvidenceRefs.minimumLeadMinutes)
        .sourceId,
    ),
    rights = source.rightsClass;
  source.rightsClass = "REVOKED";
  assert.throws(() => candidate.publicConditionalApplicability(args));
  assert.throws(() => baseline.publicConditionalApplicability(args));
  source.rightsClass = rights;
  assert.deepEqual(candidate.publicConditionalApplicability(args), old);
});
test("same mutable intent changed between calls reopens; restoring it recovers", () => {
  const f = structuredClone(F),
    args = input(f);
  args.contexts = [f.context];
  const old = candidate.publicConditionalApplicability(args),
    request = f.context.odReservationIntents[0].requestAt;
  f.context.odReservationIntents.forEach(
    (i) => (i.requestAt = "2026-10-04T09:31:00+09:00"),
  );
  const result = candidate.publicConditionalApplicability(args);
  assert(result.assessments.every((x) => x.status === "OPEN"));
  assert.deepEqual(result, baseline.publicConditionalApplicability(args));
  f.context.odReservationIntents.forEach((i) => (i.requestAt = request));
  assert.deepEqual(candidate.publicConditionalApplicability(args), old);
});
test("caller cannot seed a forged eligibility cache through the planning context", () => {
  const f = structuredClone(F);
  f.context.acceptedContracts = [];
  f.context.eligibilityCache = new Map(f.edges.map((e) => [e, true]));
  const args = input(f);
  assert(
    candidate
      .publicConditionalApplicability(args)
      .assessments.every((x) => x.status === "OPEN"),
  );
});
test("public query preserves all onboard restrictions and deterministic paths on cycles and ties", () => {
  const edges = [
    {
      edgeId: "01",
      fromTransportNodeId: "A",
      toTransportNodeId: "B",
      edgeKind: "service_segment",
      servicePatternRef: "P",
      segmentIndex: 0,
      boardAllowed: true,
      alightAllowed: false,
    },
    {
      edgeId: "02",
      fromTransportNodeId: "B",
      toTransportNodeId: "C",
      edgeKind: "service_segment",
      servicePatternRef: "P",
      segmentIndex: 1,
      boardAllowed: false,
      alightAllowed: true,
    },
    {
      edgeId: "03",
      fromTransportNodeId: "B",
      toTransportNodeId: "D",
      edgeKind: "service_segment",
      servicePatternRef: "Q",
      segmentIndex: 0,
      boardAllowed: true,
      alightAllowed: true,
    },
    {
      edgeId: "04",
      fromTransportNodeId: "C",
      toTransportNodeId: "D",
      edgeKind: "service_segment",
      servicePatternRef: "R",
      segmentIndex: 0,
      boardAllowed: true,
      alightAllowed: true,
    },
    {
      edgeId: "05",
      fromTransportNodeId: "D",
      toTransportNodeId: "A",
      edgeKind: "walk_transfer",
      boardAllowed: true,
      alightAllowed: true,
    },
    {
      edgeId: "06",
      fromTransportNodeId: "A",
      toTransportNodeId: "E",
      edgeKind: "walk_transfer",
      boardAllowed: true,
      alightAllowed: true,
    },
    {
      edgeId: "07",
      fromTransportNodeId: "E",
      toTransportNodeId: "D",
      edgeKind: "walk_transfer",
      boardAllowed: true,
      alightAllowed: true,
    },
  ];
  for (const order of [
    edges,
    [...edges].reverse(),
    [...edges.slice(3), ...edges.slice(0, 3)],
  ])
    for (const [from, to, expected] of [
      ["A", "B", null],
      ["A", "C", ["01", "02"]],
      ["A", "D", ["06", "07"]],
      ["missing", "A", null],
      ["A", "A", []],
    ])
      assert.deepEqual(candidate.queryGraph(order, from, to), expected);
  assert.deepEqual(candidate.queryGraph(edges, "A", "C"), ["01", "02"]);
});
