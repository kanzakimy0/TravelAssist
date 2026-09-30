import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  auditCanonical,
  auditGate0,
  ROOT,
} from "../tools/transport/task-085-gate0.mjs";
import {
  admitNodes,
  identityFor,
  candidatesFor,
  spatialIndex,
  directedCandidate,
  enrichDirection,
  observationIssues,
  qualityAnomalies,
  generateBatch,
  digest,
} from "../tools/transport/task-085-access-core.mjs";
import {
  loadInputs,
  buildArtifacts,
  execute,
  validateReceipt,
  chunks,
  baselineRevalidation,
} from "../tools/transport/task-085-access-generation.mjs";

import {
  discoveryInventory,
  reviewIssues,
  topologyAcceptance,
} from "../tools/transport/task-085-topology-acceptance.mjs";
const input = loadInputs();
const canonical = input.pois[0];
const node = input.admissions.find(
  (n) => n.downstream085Authorized && n.sourceId === "mlit-s12-fy2024",
);
const config = input.config;
function fixtureEdge(direction = "NODE_TO_POI") {
  return directedCandidate(
    canonical,
    node,
    {
      straightDistanceM: 100,
      accessRole: "local_node",
      decisionId: "fixture-decision",
    },
    direction,
    config,
  );
}
function routeFixture(edge = fixtureEdge()) {
  const source = {
    sourceId: "test-only-licensed-route",
    sourceUrl: "https://example.test/route",
    routeAccessGrant: true,
    routeEvidenceHashes: ["a".repeat(64)],
    rights: {
      batchRouteQuery: true,
      cache: true,
      retention: true,
      production: true,
      derivativePersistence: true,
    },
  };
  const metrics = {
    durationTypicalMin: 3.7,
    durationP90Min: null,
    distanceM: 180,
    walkDistanceM: 180,
    walkDurationMin: 3.7,
    costMinYen: null,
    costTypicalYen: null,
    costMaxYen: null,
    transfers: null,
    frequencyMin: null,
    firstDeparture: null,
    lastDeparture: null,
    elevationGainM: null,
    stairs: null,
    accessibility: null,
    detourRatio: null,
    timeBucket: null,
  };
  const observation = {
    poiId: edge.poiId,
    nodeId: edge.nodeId,
    fromId: edge.from.id,
    toId: edge.to.id,
    direction: edge.direction,
    sourceId: source.sourceId,
    sourceRef: source.sourceUrl,
    evidenceSha256: "a".repeat(64),
    mode: "walking",
    metrics,
    endpointBindingVerified: true,
    completeLastMile: true,
    currentPublicAccess: true,
    measurementMethod: "surveyed_route",
    confidence: 0.9,
    barrierChecks: {
      riverBridge: "verified_passage",
      railHighway: "clear",
      mountain: "not_applicable",
      gated: "clear",
      impossibleWalking: "clear",
    },
  };
  return { source, observation };
}
function temporary() {
  return mkdtempSync(join(tmpdir(), "travelassist-task085-"));
}
function clean(path) {
  assert.ok(
    resolve(path).startsWith(resolve(tmpdir()) + "\\travelassist-task085-") ||
      resolve(path).startsWith(resolve(tmpdir()) + "/travelassist-task085-"),
  );
  rmSync(path, { recursive: true, force: true });
}
function snapshot(root) {
  const result = {};
  const walk = (dir, prefix = "") => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const key = prefix + ent.name;
      if (ent.isDirectory()) walk(join(dir, ent.name), key + "/");
      else result[key] = readFileSync(join(dir, ent.name), "utf8");
    }
  };
  walk(root);
  return result;
}

test("085 later amendment uses local admission without promoting the rejected national master", () => {
  const report = auditGate0();
  assert.equal(report.status, "TASK_085_LOCAL_ADMISSION_REQUIRED");
  assert.equal(report.transport.currentReview.downstream085Authorized, false);
  assert.equal(report.transport.historicalV1.consumed, false);
  assert.equal(report.transport.v2CandidatesPromoted, 0);
  assert.equal(auditCanonical().recordCount, input.pois.length);
  assert.equal(
    new Set(input.pois.map((p) => p.internalId)).size,
    input.preflight.canonical.recordCount,
  );
  assert.ok(input.admissions.some((n) => n.downstream085Authorized));
  assert.ok(input.admissions.every((n) => n.runtimeImportAuthorized === false));
});
test("085 source rights and frozen identities fail closed on missing grant, rebind and duplicates", () => {
  const row = input.records.find(
    (r) => r.sourceRecordSha256 === node.sourceRecordSha256,
  );
  const binding = identityFor(row);
  assert.equal(
    admitNodes([row], input.rights, [binding])[0].decision,
    "ADMIT_TASK_085_TOPOLOGY",
  );
  const rights = structuredClone(input.rights);
  rights.sources.find(
    (s) => s.sourceId === row.sourceId,
  ).rights.derivativePersistence = null;
  assert.ok(
    admitNodes([row], rights, [binding])[0].failures.includes(
      "LICENSE_NOT_APPROVED",
    ),
  );
  const moved = structuredClone(row);
  moved.point.latitude += 0.01;
  assert.equal(identityFor(moved).nodeId, binding.nodeId);
  assert.ok(
    admitNodes([moved], input.rights, [binding])[0].failures.includes(
      "IDENTITY_REBIND_OR_UNREGISTERED",
    ),
  );
  assert.ok(
    admitNodes([row, row], input.rights, [binding]).every((n) =>
      n.failures.includes("DUPLICATE_IDENTITY"),
    ),
  );
});
test("085 unknown and ambiguous official topology remains HOLD rather than bulk ACCEPT", () => {
  assert.ok(
    input.admissions.some((n) =>
      n.failures.includes("NEARBY_SAME_NAME_IDENTITY_REVIEW"),
    ),
  );
  assert.ok(
    input.admissions.some((n) => n.failures.includes("DUPLICATE_IDENTITY")),
  );
  assert.ok(
    input.admissions
      .filter((n) => n.downstream085Authorized)
      .every((n) => n.failures.length === 0),
  );
});
test("085 bounded spatial and role selection rejects remote filler and records every truncation", () => {
  const p = {
    ...canonical,
    location: {
      ...canonical.location,
      point: { latitude: 35, longitude: 139 },
    },
  };
  const nodes = Array.from({ length: 30 }, (_, i) => ({
    ...node,
    nodeId: "fixture:" + i,
    name: "n" + i,
    point: { latitude: 35 + i * 0.0001, longitude: 139 },
  }));
  nodes.push({
    ...node,
    nodeId: "remote",
    name: "hub",
    point: { latitude: 35.09, longitude: 139 },
    maxDailyPassengers: 1000000,
  });
  const r = {
    poiId: p.internalId,
    gatewayNames: [],
    barrierReviewTriggers: [],
  };
  const selected = candidatesFor(
    p,
    spatialIndex(nodes, config.cellDegrees),
    r,
    config,
  );
  assert.ok(selected.retained.length <= config.maxTotalNodesPerPoi);
  assert.ok(
    selected.retained.filter((x) => x.decision.accessRole === "local_node")
      .length <= config.maxLocalNodesPerPoi,
  );
  assert.equal(
    selected.decisions.find((d) => d.nodeId === "remote").reason,
    "REMOTE_NODE_WITHOUT_ACCESS_RELEVANCE",
  );
  assert.ok(selected.decisions.some((d) => d.reason === "ACCESS_ROLE_CAP"));
  assert.equal(
    new Set(selected.decisions.map((d) => d.rank)).size,
    selected.decisions.length,
  );
});
test("085 directions are independently evidenced; no implicit mirrored metrics", () => {
  const inbound = fixtureEdge(),
    outbound = fixtureEdge("POI_TO_NODE");
  assert.notEqual(inbound.edgeId, outbound.edgeId);
  const { source, observation } = routeFixture(inbound);
  const resolved = enrichDirection(
    inbound,
    [observation],
    { sources: [source] },
    config,
  ).edge;
  const untouched = enrichDirection(
    outbound,
    [observation],
    { sources: [source] },
    config,
  ).edge;
  assert.equal(resolved.modes.walking.status, "resolved");
  assert.equal(resolved.walkingRouteDistanceM, 180);
  assert.equal(resolved.straightDistanceM, 100);
  assert.equal(resolved.detourRatio, 1.8);
  assert.equal(untouched.modes.walking.status, "unresolved");
  assert.equal(untouched.walkingRouteDistanceM, null);
});
test("085 rejects speed estimates, missing walking time, impossible routes, unreviewed detours and barriers", () => {
  const edge = fixtureEdge(),
    { source, observation } = routeFixture(edge);
  const mutations = [
    (o) => {
      o.measurementMethod = "estimated_speed";
    },
    (o) => {
      o.metrics.walkDurationMin = null;
    },
    (o) => {
      o.metrics.distanceM = 60;
      o.metrics.walkDistanceM = 60;
    },
    (o) => {
      o.metrics.distanceM = 500;
      o.metrics.walkDistanceM = 500;
    },
    (o) => {
      o.metrics.distanceM = 100;
      o.metrics.walkDistanceM = 100;
    },
    (o) => {
      o.barrierChecks.riverBridge = "unresolved";
    },
    (o) => {
      o.barrierChecks.railHighway = "blocked";
    },
    (o) => {
      o.barrierChecks.mountain = "unresolved";
    },
    (o) => {
      o.barrierChecks.gated = "unknown";
    },
    (o) => {
      o.barrierChecks.impossibleWalking = "blocked";
    },
    (o) => {
      o.completeLastMile = false;
    },
    (o) => {
      o.evidenceSha256 = "b".repeat(64);
    },
  ];
  assert.deepEqual(observationIssues(edge, observation, source, config), []);
  for (const mutate of mutations) {
    const o = structuredClone(observation);
    mutate(o);
    assert.ok(observationIssues(edge, o, source, config).length > 0);
  }
});
test("085 unknown rights or a closed exact venue cannot create accepted access", () => {
  const edge = fixtureEdge(),
    { source, observation } = routeFixture(edge);
  const unknown = structuredClone(source);
  unknown.rights.retention = null;
  assert.equal(
    enrichDirection(edge, [observation], { sources: [unknown] }, config).edge
      .modes.walking.metrics,
    null,
  );
  const closed = enrichDirection(
    edge,
    [observation],
    { sources: [source] },
    config,
    { allGeneralTouristModesBlocked: true },
  );
  assert.ok(
    closed.rejected[0].issues.includes("CANONICAL_VENUE_PERMANENTLY_CLOSED"),
  );
  assert.equal(closed.edge.modes.walking.status, "unavailable");
});
test("085 confirmed topology survives unresolved/asymmetric route metrics and directional prohibitions", () => {
  const p = {
    ...canonical,
    location: { ...canonical.location, point: node.point },
  };
  const evidence = {
    poiId: p.internalId,
    nodeId: node.nodeId,
    nodeSourceRecordSha256: node.sourceRecordSha256,
    evidenceId: "fixture-topology",
    sourceRefs: ["https://example.test/official-access"],
    evidenceType: "OFFICIAL_VENUE_ACCESS",
    reviewStatus: "APPROVED",
    gatewayRelationshipVerified: true,
    identityJoinVerified: true,
    currentPublicAccess: true,
    sourceFactReviewSha256: "a".repeat(64),
    factPersistenceDecision: "FACTUAL_TOPOLOGY_ONLY_NO_RAW_PAYLOAD",
  };
  const research = [
    {
      poiId: p.internalId,
      gatewayNames: [node.name],
      barrierReviewTriggers: [],
      sourceRefs: evidence.sourceRefs,
      topologyEvidence: [evidence],
    },
  ];
  const run = (
    r = research,
    observations = [],
    rights = input.rights,
    blockers = [],
  ) => generateBatch([p], [node], r, observations, rights, config, blockers);
  const before = run();
  assert.equal(before.edges.length, 2);
  assert.equal(before.pending.length, 0);
  assert.ok(
    before.edges.every(
      (e) =>
        e.topologyStatus === "CONFIRMED" && e.walkingRouteDistanceM === null,
    ),
  );
  const incoming = before.edges.find((e) => e.direction === "NODE_TO_POI");
  const outgoing = before.edges.find((e) => e.direction === "POI_TO_NODE");
  const { source, observation } = routeFixture(incoming);
  const half = run(research, [observation], { sources: [source] });
  assert.equal(half.edges.length, 2);
  assert.equal(
    half.edges.find((e) => e.direction === "NODE_TO_POI").walkingRouteDistanceM,
    180,
  );
  assert.equal(
    half.edges.find((e) => e.direction === "POI_TO_NODE").walkingRouteDistanceM,
    null,
  );
  const reverse = routeFixture(outgoing).observation;
  reverse.metrics = {
    ...reverse.metrics,
    distanceM: 191,
    walkDistanceM: 191,
    durationTypicalMin: 4.2,
    walkDurationMin: 4.2,
  };
  const full = run(research, [observation, reverse], { sources: [source] });
  assert.notEqual(
    full.edges[0].walkingRouteDistanceM,
    full.edges[1].walkingRouteDistanceM,
  );
  const prohibited = structuredClone(research);
  prohibited[0].topologyEvidence[0].prohibitedDirections = ["POI_TO_NODE"];
  const blocked = run(prohibited);
  assert.equal(blocked.edges.length, 2);
  assert.equal(
    blocked.edges.find((e) => e.direction === "POI_TO_NODE").modes.walking
      .status,
    "unavailable",
  );
  assert.equal(
    blocked.edges.find((e) => e.direction === "NODE_TO_POI").modes.walking
      .status,
    "unresolved",
  );
  for (const patch of [
    { topologyEvidence: [] },
    {
      topologyEvidence: [{ ...evidence, evidenceType: "MLIT_PROXIMITY_ONLY" }],
    },
    { topologyEvidence: [{ ...evidence, currentPublicAccess: false }] },
    { topologyEvidence: [{ ...evidence, identityJoinVerified: false }] },
  ]) {
    assert.equal(run([{ ...research[0], ...patch }]).edges.length, 0);
  }
  assert.equal(
    run(research, [], input.rights, [
      { poiId: p.internalId, allGeneralTouristModesBlocked: true },
    ]).edges.length,
    0,
  );
});

test("085 anomalies catch duplicate edges, metric placeholders and concentration", () => {
  const fixture = fixtureEdge(),
    { source, observation } = routeFixture(fixture);
  const e = enrichDirection(
    fixture,
    [observation],
    { sources: [source] },
    config,
  ).edge;
  const edges = Array.from({ length: 8 }, (_, i) => ({
    ...e,
    edgeId: "e" + i,
  }));
  assert.ok(
    qualityAnomalies(edges, [canonical], config).some(
      (a) => a.reason === "IDENTICAL_METRIC_CONCENTRATION",
    ),
  );
  assert.ok(
    qualityAnomalies([e, e], [canonical], config).some(
      (a) => a.reason === "DUPLICATE_ACCEPTED_EDGE",
    ),
  );
  const round = structuredClone(e);
  round.modes.walking.metrics.distanceM = 200;
  round.modes.walking.metrics.durationTypicalMin = 5;
  assert.ok(
    qualityAnomalies([round], [canonical], config).some(
      (a) => a.reason === "ROUND_NUMBER_METRICS_REQUIRE_REVIEW",
    ),
  );
});
test("085 full topology coverage and route metrics are separate; no false Canonical PASS", () => {
  const result = buildArtifacts(input);
  assert.equal(
    result.manifest.metrics.canonicalPoiProcessedCount,
    input.pois.length,
  );
  assert.ok(result.manifest.metrics.totalDirectedEdges > 0);
  assert.equal(
    result.manifest.metrics.modeResolution.walking.acceptedEdges.numerator,
    0,
  );
  assert.equal(result.manifest.metrics.acceptedEdgeProvenance.actual, 1);
  assert.equal(result.acceptance.allPass, false);
  assert.equal(result.manifest.wbs715Status, "进行中");
  assert.equal(result.manifest.globalTopologyDiscoveryFixpoint, "PROVEN");
  assert.ok(
    result.acceptance.gates.some(
      (g) =>
        g.name === "Canonical supporting manifest integrity" &&
        g.status === "FAIL",
    ),
  );
  const noEvidence = {
    ...input,
    research: input.research.map((r) => ({ ...r, topologyEvidence: [] })),
    discoveryReview: [],
  };
  const empty = buildArtifacts(noEvidence);
  assert.equal(empty.manifest.metrics.totalDirectedEdges, 0);
  assert.equal(empty.acceptance.allPass, false);
  assert.equal(empty.acceptance.globalTopologyDiscoveryFixpoint, "IN_PROGRESS");
});
test("085 original 1887 admissions, 245 HOLD decisions and 772 candidates remain conserved", () => {
  const b = baselineRevalidation(input);
  assert.equal(b.status, "PASS");
  assert.equal(b.originalAdmitted, 1887);
  assert.equal(b.originalHeld, 245);
  assert.equal(b.missingOrChanged, 0);
  assert.equal(b.preservedDirectedCandidates, 772);
  const modified = {
    ...input,
    admissions: input.admissions.filter(
      (a) => a.nodeId !== input.baselineNodes.records[0].nodeId,
    ),
  };
  assert.equal(baselineRevalidation(modified).status, "FAIL");
});
test("085 proof cannot be completed by nine labels, changed inventory, or silent candidate omissions", () => {
  const built = buildArtifacts(input);
  const combined = {
    decisions: built.batches.flatMap((b) => b.data.decisions),
    scans: built.batches.flatMap((b) => b.data.scans),
    edges: built.batches.flatMap((b) => b.data.edges),
  };
  for (const r of input.discoveryReview) {
    const inventory = discoveryInventory(input, combined, r.poiId);
    assert.deepEqual(reviewIssues(r, inventory), []);
    const stale = structuredClone(r);
    stale.inventoryHashes.candidateDecisionSha256 = "0".repeat(64);
    assert.ok(
      reviewIssues(stale, inventory).includes("STALE_REVIEW_INVENTORY"),
    );
    const omitted = structuredClone(r);
    omitted.candidateDispositions.pop();
    assert.ok(
      reviewIssues(omitted, inventory).some((s) =>
        s.startsWith("UNACCOUNTED_INVENTORY"),
      ),
    );
    const physical = structuredClone(r);
    physical.exhaustionConclusion = "FEWER_THAN_TARGET_EXIST";
    assert.ok(
      reviewIssues(physical, inventory).includes(
        "NO_AUTHORITATIVE_FEWER_THAN_TARGET_PROOF",
      ),
    );
    const incomplete = structuredClone(r);
    delete incomplete.categories.ferry_port.finding;
    assert.ok(
      reviewIssues(incomplete, inventory).includes(
        "INCOMPLETE_SOURCE_CATEGORY:ferry_port",
      ),
    );
  }
});
test("085 Canonical-only exception yields READY_EXCEPT while metrics remain unresolved", () => {
  const built = buildArtifacts(input);
  const rows = JSON.parse(
    built.artifacts["poi-access-completeness.json"],
  ).filter((p) => p.usefulDistinctNodes >= 3);
  const ids = new Set(rows.map((p) => p.poiId));
  const fixture = {
    ...input,
    pois: input.pois.filter((p) => ids.has(p.internalId)),
    blockers: [],
    executionVerification: {
      deterministicRebuild: "PASS_TEST_FIXTURE",
      receiptIntegrity: "PASS_TEST_FIXTURE",
    },
  };
  const combined = {
    edges: built.batches
      .flatMap((b) => b.data.edges)
      .filter((e) => ids.has(e.poiId)),
    scans: built.batches
      .flatMap((b) => b.data.scans)
      .filter((p) => ids.has(p.poiId)),
  };
  const verdict = topologyAcceptance(fixture, combined, rows, []);
  assert.equal(verdict.status, "READY_EXCEPT_CANONICAL_ADJUDICATION");
  assert.ok(
    combined.edges.every((e) => e.modes.walking.status === "unresolved"),
  );
  const corrected = {
    ...fixture,
    preflight: structuredClone(fixture.preflight),
  };
  corrected.preflight.canonical.supportingSampleManifest.hashMatches = true;
  assert.equal(
    topologyAcceptance(corrected, combined, rows, []).status,
    "PASS / READY_FOR_REVIEW",
  );
});
test("085 chunks follow runtime population, including the 200/201 boundary", () => {
  assert.deepEqual(
    chunks(Array.from({ length: 401 }, (_, i) => i)).map((c) => c.length),
    [200, 200, 1],
  );
});
test("085 actual filesystem rebuild, checksum skip, changed source invalidation, corruption and single-batch repair", () => {
  const out = temporary(),
    rebuild = temporary();
  try {
    const first = execute({ input, out, mode: "rebuild" });
    assert.equal(first.deterministicRebuild, "PASS");
    const original = snapshot(out);
    assert.ok(
      execute({ input, out, mode: "resume" }).operations.every(
        (o) => o.action === "CHECKSUM_SKIP",
      ),
    );
    assert.deepEqual(snapshot(out), original);
    execute({ input, out: rebuild, mode: "rebuild" });
    assert.deepEqual(snapshot(rebuild), original);
    const receiptPath = join(out, "batch-receipts/0001.json");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.poiCount++;
    writeFileSync(receiptPath, JSON.stringify(receipt));
    assert.throws(
      () => execute({ input, out, mode: "resume" }),
      /CORRUPTED_RECEIPT/,
    );
    assert.equal(
      execute({ input, out, rerunBatch: 1 }).operations[0].action,
      "SINGLE_BATCH_RERUN",
    );
    assert.deepEqual(snapshot(out), original);
    writeFileSync(join(out, "batches/0001/edges.jsonl"), "{}\n");
    assert.throws(
      () => execute({ input, out, mode: "resume" }),
      /CORRUPTED_BATCH_ARTIFACT/,
    );
    execute({ input, out, rerunBatch: 1 });
    const changed = {
      ...input,
      inputFingerprint: digest({
        previous: input.inputFingerprint,
        changedSource: "test",
      }),
    };
    assert.ok(
      execute({ input: changed, out, mode: "resume" }).operations.every(
        (o) => o.action === "CHANGED_SOURCE_INVALIDATE",
      ),
    );
    assert.ok(
      execute({ input: changed, out, mode: "check" }).operations.every(
        (o) => o.action === "CHECKSUM_SKIP",
      ),
    );
  } finally {
    clean(out);
    clean(rebuild);
  }
});
test("085 201-POI replay checkpoints at 200 and detects unsafe receipt paths", () => {
  const out = temporary();
  try {
    const pois = Array.from({ length: 201 }, (_, i) => ({
      ...canonical,
      internalId: "poi:fixture-" + String(i).padStart(4, "0"),
    }));
    const fixture = {
      ...input,
      pois,
      admissions: [],
      baselineNodes: { records: [] },
      blockers: [],
      observations: [],
      discoveryScans: [],
      research: pois.map((p) => ({
        poiId: p.internalId,
        gatewayNames: [],
        barrierReviewTriggers: [],
        sourceRefs: [],
        finding: "synthetic batch boundary fixture",
      })),
      inputFingerprint: digest("201-poi-test-fixture"),
    };
    const result = execute({ input: fixture, out, mode: "rebuild" });
    assert.equal(result.operations.length, 2);
    assert.deepEqual(
      ["0001", "0002"].map(
        (id) =>
          JSON.parse(
            readFileSync(join(out, "batch-receipts/" + id + ".json"), "utf8"),
          ).poiCount,
      ),
      [200, 1],
    );
    const receipt = JSON.parse(
      readFileSync(join(out, "batch-receipts/0001.json"), "utf8"),
    );
    receipt.artifacts = { "../../not-a-task-file": "a".repeat(64) };
    delete receipt.receiptSha256;
    receipt.receiptSha256 = digest(receipt);
    assert.throws(() => validateReceipt(out, receipt), /UNSAFE_RECEIPT_PATH/);
    const secondBefore = readFileSync(
      join(out, "batch-receipts/0002.json"),
      "utf8",
    );
    const rerun = execute({ input: fixture, out, rerunBatch: 1 });
    assert.deepEqual(
      rerun.operations.map((o) => o.action),
      ["SINGLE_BATCH_RERUN", "CHECKSUM_SKIP"],
    );
    assert.equal(
      readFileSync(join(out, "batch-receipts/0002.json"), "utf8"),
      secondBefore,
    );
  } finally {
    clean(out);
  }
});
test("085 committed artifact receipt and all deterministic files match current inputs", () => {
  assert.equal(
    execute({ root: ROOT, mode: "check" }).acceptance,
    "BLOCKED_SOURCE_LICENSE_IDENTITY_FIXPOINT",
  );
});
