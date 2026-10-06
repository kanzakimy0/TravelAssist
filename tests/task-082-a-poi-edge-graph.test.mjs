import assert from "node:assert/strict";
import test from "node:test";
import replay from "./fixtures/task-082-edge-replay.v1.json" with { type: "json" };

import {
  DEFAULT_EDGE_CONFIG,
  admittedGraphNodes,
  applyLicensedObservation,
  calculateScoreTrace,
  candidateToUnresolvedEdge,
  classifyPoiPair,
  createPoiEdgeLookup,
  generatePoiCandidates,
  generateTransportAccessCandidates,
  straightDistanceM,
  validateMobilityEdge,
} from "../src/shared/poi-edge-graph/index.ts";
import registry from "../src/shared/data/master-code-registry.v1.json" with { type: "json" };
import {
  PoiEdgeRepositoryUnavailable,
  unavailablePoiEdgeRepository,
} from "../src/server/poi-edge-graph/repository.ts";

const timestamp = "2026-09-28T00:00:00.000Z";
const point = (longitude, latitude) => ({ longitude, latitude });
const poi = (id, longitude, latitude, cityRef = "Tokyo/Chiyoda") => ({
  poiId: "poi:" + id,
  masterCode: "10000",
  point: point(longitude, latitude),
  regionRef: "prefecture-tokyo",
  cityRef,
  areaRef: null,
});
const a = poi("aaa", 139.7671, 35.6812);
const b = poi("bbb", 139.7681, 35.6812);
const c = poi("ccc", 139.7701, 35.6812);
const far = poi("far", 140.5, 35.6812, "Chiba/Chiba");
const metrics = {
  durationTypicalMin: 2,
  durationP90Min: 3,
  distanceM: 110,
  costMinYen: null,
  costTypicalYen: null,
  costMaxYen: null,
  walkDistanceM: 110,
  walkDurationMin: 2,
  transfers: 0,
  frequencyMin: null,
  firstDeparture: null,
  lastDeparture: null,
  elevationGainM: 4,
  stairs: false,
  accessibility: "good",
  detourRatio: null,
  timeBucket: null,
};
const rights = { batch: true, cache: true, retention: true, production: true };
const candidate = (from = a, to = b) =>
  generatePoiCandidates([from, to]).edges.find(
    (edge) => edge.from.id === from.poiId && edge.to.id === to.poiId,
  );

test("no self-edge, directed semantics, and duplicate POI removal", () => {
  const result = generatePoiCandidates([a, b, a]);
  assert.equal(result.edges.length, 2);
  assert.equal(result.rejected[0].reason, "duplicate_id");
  assert.ok(result.edges.every((edge) => edge.from.id !== edge.to.id));
  assert.notDeepEqual(result.edges[0].from, result.edges[1].from);
});

test("deterministic generation and bounded outgoing degree", () => {
  const cluster = Array.from({ length: 90 }, (_, index) =>
    poi(
      String(index).padStart(3, "0"),
      139.7 + (index % 10) * 0.0002,
      35.6 + Math.floor(index / 10) * 0.0002,
    ),
  );
  const first = generatePoiCandidates(cluster);
  const second = generatePoiCandidates([...cluster].reverse());
  assert.deepEqual(first, second);
  const degree = new Map();
  for (const edge of first.edges)
    degree.set(edge.from.id, (degree.get(edge.from.id) ?? 0) + 1);
  assert.ok([...degree.values()].every((value) => value <= 64));
  assert.ok([...degree.values()].every((value) => value > 0));
});

test("nearest-neighbor correctness and radius filter", () => {
  const config = { ...DEFAULT_EDGE_CONFIG, maxDegree: 1, nearestK: 1 };
  const result = generatePoiCandidates([a, b, c, far], config);
  assert.equal(
    result.edges.find((edge) => edge.from.id === a.poiId).to.id,
    b.poiId,
  );
  assert.ok(
    result.edges.every(
      (edge) => edge.from.id !== far.poiId && edge.to.id !== far.poiId,
    ),
  );
});

test("same-city and same-area classification use explicit keys", () => {
  const shifted = poi("shift", 139.8, 35.6812);
  assert.equal(classifyPoiPair(a, shifted, 3_000), "same_city");
  assert.equal(
    classifyPoiPair(
      { ...a, areaRef: "area:one" },
      { ...shifted, areaRef: "area:one" },
      3_000,
    ),
    "same_area",
  );
  assert.equal(
    classifyPoiPair(a, { ...shifted, cityRef: "Tokyo/Shinjuku" }, 3_000),
    "regional",
  );
});

test("missing and invalid coordinates fail closed", () => {
  const result = generatePoiCandidates([
    a,
    { ...b, point: null },
    { ...c, point: point(200, 35) },
  ]);
  assert.equal(result.edges.length, 0);
  assert.deepEqual(
    result.rejected.map((row) => row.reason),
    ["missing_coordinate", "invalid_coordinate"],
  );
});

test("geodesic distance is not walking route distance", () => {
  const distance = straightDistanceM(a.point, b.point);
  assert.ok(distance > 80 && distance < 110);
  const edge = candidateToUnresolvedEdge(candidate(), timestamp);
  assert.equal(edge.straightDistanceM, distance);
  assert.equal(edge.modes.walking.metrics, null);
  assert.equal(edge.modes.walking.status, "unresolved");
});

test("provider rights fail closed and preserve unresolved modes", () => {
  const edge = candidateToUnresolvedEdge(candidate(), timestamp);
  assert.throws(
    () =>
      applyLicensedObservation(edge, "walking", metrics, "route:test", {
        ...rights,
        retention: false,
      }),
    /rights/,
  );
  assert.equal(edge.modes.walking.status, "unresolved");
  const enriched = applyLicensedObservation(
    edge,
    "walking",
    metrics,
    "route:test",
    rights,
  );
  assert.equal(enriched.modes.walking.status, "resolved");
  assert.equal(enriched.modes.driving.status, "unresolved");
  assert.equal(enriched.modes.transit.status, "unresolved");
  assert.equal(enriched.modes.taxi.status, "unresolved");
});

test("extreme walking detour is flagged, not promoted to a good walk", () => {
  const edge = candidateToUnresolvedEdge(candidate(), timestamp);
  const enriched = applyLicensedObservation(
    edge,
    "walking",
    {
      ...metrics,
      distanceM: edge.straightDistanceM * 10,
      walkDistanceM: edge.straightDistanceM * 10,
    },
    "route:detour",
    rights,
  );
  assert.ok(enriched.qualityFlags.includes("extreme_walk_detour"));
  assert.equal(enriched.modes.walking.metrics.detourRatio, 10);
  assert.equal(
    createPoiEdgeLookup([enriched]).findMobilityOptions(a.poiId, b.poiId)
      .length,
    0,
  );
});

test("score determinism and component trace", () => {
  const first = calculateScoreTrace("walking", metrics);
  const second = calculateScoreTrace("walking", structuredClone(metrics));
  assert.deepEqual(first, second);
  assert.ok(first.convenience.components.duration > 0);
  assert.ok(first.reliability.components.p90Spread > 0);
  assert.ok(first.difficulty.components.walkKm > 0);
  assert.equal(
    calculateScoreTrace("walking", { ...metrics, durationP90Min: null })
      .reliability,
    null,
  );
  assert.equal(
    calculateScoreTrace("walking", { ...metrics, accessibility: null })
      .convenience,
    null,
  );
  assert.equal(
    calculateScoreTrace("transit", { ...metrics, frequencyMin: null })
      .reliability,
    null,
  );
});

test("three transport kinds produce separate directed access edges", () => {
  const nodes = [
    ["railway_station", "tokyo-station"],
    ["airport", "local-airport"],
    ["bus_terminal", "terminal"],
  ].map(([kind, nodeId], index) => ({
    nodeId: "transport:" + nodeId,
    kind,
    point: point(a.point.longitude + (index + 1) * 0.001, a.point.latitude),
    regionRef: "prefecture-tokyo",
    sourceRef: "source:test-fixture",
  }));
  const result = generateTransportAccessCandidates([a], nodes);
  assert.equal(result.length, 6);
  assert.equal(
    result.filter((edge) => edge.layer === "poi_transport_access").length,
    3,
  );
  assert.equal(
    result.filter((edge) => edge.layer === "transport_poi_access").length,
    3,
  );
});

test("serialization validation and read-only Planner lookup", () => {
  const outbound = applyLicensedObservation(
    candidateToUnresolvedEdge(candidate(a, b), timestamp),
    "walking",
    metrics,
    "route:test",
    rights,
  );
  const inbound = candidateToUnresolvedEdge(candidate(b, a), timestamp);
  assert.deepEqual(
    validateMobilityEdge(JSON.parse(JSON.stringify(outbound))),
    [],
  );
  const lookup = createPoiEdgeLookup([outbound, inbound]);
  assert.equal(lookup.getPoiEdges(a.poiId).length, 1);
  assert.equal(
    lookup.getPoiEdge(a.poiId, b.poiId).modes.walking.status,
    "resolved",
  );
  assert.equal(
    lookup.getPoiEdge(b.poiId, a.poiId).modes.walking.status,
    "unresolved",
  );
  assert.equal(lookup.findMobilityOptions(a.poiId, b.poiId).length, 1);
  assert.equal(lookup.findMobilityOptions(b.poiId, a.poiId).length, 0);
  assert.equal(
    lookup.findMobilityOptions(a.poiId, b.poiId, { avoidStairs: true }).length,
    1,
  );
  assert.throws(() => createPoiEdgeLookup([outbound, outbound]), /Duplicate/);
});

test("fixture replay proves asymmetric route observations are distinct", () => {
  assert.equal(replay.kind, "synthetic_test_fixture_not_pilot_data");
  const forward = applyLicensedObservation(
    candidateToUnresolvedEdge(candidate(a, b), timestamp),
    "walking",
    { ...metrics, ...replay.forwardWalking },
    "fixture:forward",
    rights,
  );
  const reverse = applyLicensedObservation(
    candidateToUnresolvedEdge(candidate(b, a), timestamp),
    "walking",
    { ...metrics, ...replay.reverseWalking },
    "fixture:reverse",
    rights,
  );
  assert.notEqual(
    forward.modes.walking.metrics.durationTypicalMin,
    reverse.modes.walking.metrics.durationTypicalMin,
  );
  assert.notEqual(
    forward.modes.walking.metrics.distanceM,
    reverse.modes.walking.metrics.distanceM,
  );
});

test("transport network layer is transport-to-transport, never a POI shortcut", () => {
  const network = candidateToUnresolvedEdge(
    {
      schemaVersion: "1.0",
      from: { kind: "transport", id: "transport:station-a" },
      to: { kind: "transport", id: "transport:station-b" },
      directed: true,
      layer: "transport_network",
      relation: "regional",
      straightDistanceM: 32_000,
    },
    timestamp,
  );
  assert.deepEqual(validateMobilityEdge(network), []);
  assert.equal(network.modes.transit.status, "unresolved");
});

test("unadmitted dataset cannot be used as formal Pilot input", () => {
  const unauthorized = {
    scope: "CANDIDATE_ONLY_NO_CANONICAL_IMPORT",
    runtimeImportAuthorized: false,
    internalIds: [],
  };
  assert.throws(
    () => admittedGraphNodes({}, registry, unauthorized),
    /authorization/,
  );
});

test("default server-side Planner repository fails closed", () => {
  assert.throws(
    () => unavailablePoiEdgeRepository.getPoiEdges(a.poiId),
    PoiEdgeRepositoryUnavailable,
  );
  assert.throws(
    () => unavailablePoiEdgeRepository.findMobilityOptions(a.poiId, b.poiId),
    PoiEdgeRepositoryUnavailable,
  );
});
