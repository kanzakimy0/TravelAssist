import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  corridorDefinitions,
  evidenceIndex,
  graphDiagnostics,
  reachabilityReport,
  regionGraph,
  writePilotOutputs,
} from "../tools/qa/region-graph-pilot.mjs";
import { parseTravelRegionGraphV1 } from "../src/shared/contracts/planning/index.ts";

const expectIssue = (graph, code) => {
  const result = parseTravelRegionGraphV1(graph);
  assert.equal(result.ok, false);
  assert.equal(result.issue.code, code);
};

test("TASK-041 graph parses through the canonical Planning parser", () => {
  const parsed = parseTravelRegionGraphV1(regionGraph);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.nodes.length, 50);
  assert.equal(parsed.value.relations.length, 53);
  assert.equal(parsed.value.travelEdges.length, 58);
});

test("pilot diagnostics pass every required structural gate", () => {
  const report = graphDiagnostics();
  assert.equal(report.parser.ok, true);
  assert.deepEqual(report.violations, {
    duplicateNodeIds: 0,
    duplicateMasterCodes: 0,
    duplicateRelationIds: 0,
    duplicateEdgeIds: 0,
    danglingRefs: [],
    selfRelations: [],
    selfTravelEdges: [],
    containsCycles: [],
    symmetricDuplicates: 0,
    invalidRanges: [],
    planningPriorExactTimetableViolations: [],
    missingEvidenceRefs: [],
    invalidGatewayServedRefs: [],
  });
  assert.equal(report.evidence.nodeCoverage, report.evidence.nodeTotal);
  assert.equal(report.evidence.relationCoverage, report.evidence.relationTotal);
  assert.equal(report.evidence.edgeCoverage, report.evidence.edgeTotal);
});

test("all four corridors include their required core anchors", () => {
  const nodes = new Set(regionGraph.nodes.map(({ regionId }) => regionId));
  for (const [corridor, anchors] of Object.entries(corridorDefinitions)) {
    assert.ok(anchors.length >= 6, `${corridor} lacks representative anchors`);
    for (const anchor of anchors)
      assert.ok(nodes.has(anchor), `${corridor}:${anchor}`);
  }
});

test("provider-free graph traversal preserves required corridor paths", () => {
  const report = reachabilityReport();
  assert.equal(report.providerQueries, 0);
  assert.equal(report.allReachable, true);
  assert.equal(report.allRequiredPlanningPathsPresent, true);
  assert.equal(report.checks.length, 5);
  assert.ok(
    report.checks.every(
      ({ interpretation }) =>
        interpretation === "provider-free graph reachability only",
    ),
  );
});

test("relation and edge semantics remain distinct and part_of is derived only", () => {
  assert.ok(
    regionGraph.relations.every(
      (relation) => !Object.hasOwn(relation, "variants"),
    ),
  );
  assert.ok(
    regionGraph.travelEdges.every(
      (edge) => !Object.hasOwn(edge, "relationType"),
    ),
  );
  assert.ok(
    regionGraph.relations.every(
      ({ relationType }) => relationType !== "part_of",
    ),
  );
  assert.ok(
    regionGraph.travelEdges.every(({ variants }) => variants.length > 0),
  );
});

test("planning priors contain no exact timetable, live fare, availability or provider raw", () => {
  const forbidden = new Set([
    "departureMinute",
    "arrivalMinute",
    "departureTime",
    "arrivalTime",
    "liveFare",
    "availability",
    "providerRaw",
  ]);
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      assert.equal(forbidden.has(key), false, key);
      visit(item);
    }
  };
  visit(regionGraph.travelEdges);
  assert.ok(
    regionGraph.travelEdges
      .flatMap(({ variants }) => variants)
      .every(
        ({ observedAt, validUntil }) =>
          observedAt === null && validUntil === null,
      ),
  );
});

test("every graph source reference resolves in the evidence index", () => {
  const refs = new Set(evidenceIndex.sources.map(({ sourceRef }) => sourceRef));
  const used = [
    ...regionGraph.nodes.flatMap(({ sourceRefs, gatewayProfile }) => [
      ...sourceRefs,
      ...(gatewayProfile?.sourceRefs ?? []),
    ]),
    ...regionGraph.relations.flatMap(({ sourceRefs }) => sourceRefs),
    ...regionGraph.travelEdges.flatMap(({ sourceRefs, variants }) => [
      ...sourceRefs,
      ...variants.flatMap(({ sourceRefs }) => sourceRefs),
    ]),
  ];
  assert.ok(used.length > 0);
  assert.ok(used.every((ref) => refs.has(ref)));
});

test("negative: dangling region reference fails closed", () => {
  const graph = structuredClone(regionGraph);
  graph.relations[0].toRegionRef = "region-missing";
  expectIssue(graph, "DANGLING_REGION_REF");
});

test("negative: contains cycle fails closed", () => {
  const graph = structuredClone(regionGraph);
  graph.relations.push({
    ...graph.relations[0],
    relationId: "rel-negative-cycle",
    fromRegionRef: "region-tokyo",
    toRegionRef: "region-japan",
  });
  expectIssue(graph, "CONTAINS_CYCLE");
});

test("negative: reverse symmetric duplicate fails closed", () => {
  const graph = structuredClone(regionGraph);
  const adjacent = graph.relations.find(
    ({ relationType }) => relationType === "adjacent",
  );
  graph.relations.push({
    ...adjacent,
    relationId: "rel-negative-reverse",
    fromRegionRef: adjacent.toRegionRef,
    toRegionRef: adjacent.fromRegionRef,
  });
  expectIssue(graph, "DUPLICATE_SYMMETRIC_RELATION");
});

test("negative: duplicate IDs fail closed", () => {
  const graph = structuredClone(regionGraph);
  graph.nodes.push(structuredClone(graph.nodes[0]));
  expectIssue(graph, "DUPLICATE_ID");
});

test("negative: invalid range order fails closed", () => {
  const graph = structuredClone(regionGraph);
  graph.travelEdges[0].variants[0].typicalDurationMinutes = {
    low: 90,
    typical: 60,
    high: 30,
  };
  expectIssue(graph, "INVALID_RANGE_ORDER");
});

test("negative: unknown enum fails closed", () => {
  const graph = structuredClone(regionGraph);
  graph.travelEdges[0].variants[0].mode = "teleport";
  expectIssue(graph, "UNSUPPORTED_VALUE");
});

test("negative: planning prior exact timetable claim fails closed", () => {
  const graph = structuredClone(regionGraph);
  graph.travelEdges[0].variants[0].departureMinute = 540;
  expectIssue(graph, "UNKNOWN_FIELD");
});

test("generated evidence is deterministic and matches the in-memory pilot", async () => {
  await writePilotOutputs();
  const first = await readFile(
    "docs/qa/TASK-041/graph-validation.json",
    "utf8",
  );
  await writePilotOutputs();
  const second = await readFile(
    "docs/qa/TASK-041/graph-validation.json",
    "utf8",
  );
  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first).counts, graphDiagnostics().counts);
});
