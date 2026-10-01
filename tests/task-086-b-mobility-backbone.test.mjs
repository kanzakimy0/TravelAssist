import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hash,
  id,
  canonical,
  DEFICITS,
  DEFAULT_PARAMETERS,
  admitNodes,
  generatePattern,
  generateTransfer,
  generateDirect,
  validateEdges,
  growInventory,
  queryGraph,
  auditGraph,
  selectAction,
  adaptParameters,
  validateFixpoint,
  acceptance,
} from "../tools/transport/task-086-model.mjs";
import {
  executeBatches,
  readJson,
} from "../tools/transport/task-086-batches.mjs";
const source = {
  sourceId: "fixture",
  url: "https://fixture.invalid/source",
  observedAt: "2026-10-01",
  contentSha256: hash("fixture-source"),
  persistenceAllowed: true,
  derivedDataAllowed: true,
  redistributionAllowed: true,
  rightsDecision: "TEST_ONLY",
};
const record = { official: "synthetic test evidence" };
const proofRow = {
  evidenceId: "proof",
  sourceId: "fixture",
  sourceSha256: source.contentSha256,
  locator: "test",
  record,
  recordSha256: hash(record),
};
const sources = new Map([["fixture", source]]),
  evidence = new Map([["proof", proofRow]]);
function candidate(anchor) {
  const identityRecord = { name: anchor, operator: "A" };
  const evidenceId = "identity:" + anchor;
  evidence.set(evidenceId, {
    ...proofRow,
    evidenceId,
    record: identityRecord,
    recordSha256: hash(identityRecord),
  });
  return {
    identityAnchor: anchor,
    canonicalNameJa: anchor,
    nodeKind: "rail_station",
    latitude: 35,
    longitude: 135,
    operatorRefs: ["A"],
    lineRefs: ["line"],
    sourceRefs: [source.url],
    evidenceRefs: [evidenceId],
    identityRecord,
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(identityRecord),
    },
    hubSemantics: "EXPLICIT_COMPONENT",
  };
}
const admitted = admitNodes(
  ["a", "b", "c", "d"].map(candidate),
  sources,
  evidence,
);
const nodes = new Map(admitted.map((n) => [n.nodeId, n]));
function pattern(overrides = {}) {
  return {
    servicePatternId: "pattern-local",
    lineRef: "line",
    operatorRef: "A",
    serviceClass: "local",
    mode: "rail",
    direction: "outbound",
    callingNodes: ["a", "b", "c"].map((n, sequence) => ({
      nodeId: id("node", n),
      sequence,
      pickupType: "0",
      dropOffType: "0",
    })),
    segmentOperators: ["A", "A"],
    evidenceRefs: ["proof"],
    sourceRefs: [source.url],
    sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
    serviceState: "active",
    ...overrides,
  };
}
const generate = (p) =>
  generatePattern(p, nodes, sources, evidence, "fixture-snapshot");
const temp = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task-086-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};
const group = (edges) => ({
  groupId: "pattern",
  sources: [source],
  nodes: admitted,
  pattern: pattern(),
  edges,
  generatorSha256: hash("generator"),
  nextActionDeficitSummary: {},
});
test("TASK086 ordered service pattern generates only actual directed adjacent calls, independent of inventory size", () => {
  const extra = new Map(nodes);
  for (let i = 0; i < 1000; i++)
    extra.set(String(i), { decision: "ADMIT_TASK_086_TOPOLOGY" });
  const edges = generatePattern(pattern(), extra, sources, evidence, "fixed");
  assert.equal(edges.length, 2);
  assert.equal(edges[0].fromTransportNodeId, id("node", "a"));
  assert.equal(edges[0].toTransportNodeId, id("node", "b"));
  assert.equal(queryGraph(edges, id("node", "c"), id("node", "a")), null);
});
test("TASK086 express/local and Shinkansen skipped stops stay distinct", () => {
  const local = generate(pattern());
  const express = generate(
    pattern({
      servicePatternId: "express",
      serviceClass: "express",
      callingNodes: [pattern().callingNodes[0], pattern().callingNodes[2]],
      segmentOperators: ["A"],
    }),
  );
  assert.equal(express.length, 1);
  assert.notEqual(express[0].edgeId, local[0].edgeId);
  assert.equal(express[0].toTransportNodeId, id("node", "c"));
  const shinkansen = generate(
    pattern({
      servicePatternId: "kodama",
      serviceClass: "kodama",
      mode: "shinkansen",
    }),
  );
  validateEdges([...local, ...express, ...shinkansen]);
});
test("TASK086 missing dynamic metrics preserve confirmed topology without fabricated values", () => {
  const edges = generate(pattern());
  assert.equal(edges[0].topologyStatus, "CONFIRMED");
  for (const metric of Object.values(edges[0].metrics)) {
    assert.equal(metric.status, "unresolved");
    assert.equal(metric.value, null);
  }
});
test("TASK086 metric observations require complete source validity and rights", () => {
  assert.throws(
    () => generate(pattern({ metrics: { fareTypicalYen: { value: 10 } } })),
    /METRIC_PROVENANCE/,
  );
  assert.throws(
    () =>
      generate(
        pattern({
          metrics: { durationP90Min: { value: 5, sourceId: "fixture" } },
        }),
      ),
    /METRIC_PROVENANCE/,
  );
});
test("TASK086 through service across operator boundary requires independent evidence", () => {
  assert.throws(
    () => generate(pattern({ segmentOperators: ["A", "B"] })),
    /THROUGH_SERVICE/,
  );
  const edges = generate(
    pattern({
      segmentOperators: ["A", "B"],
      throughServiceEvidenceRefs: ["proof"],
    }),
  );
  assert.deepEqual(
    edges.map((e) => e.operatorRef),
    ["A", "B"],
  );
  assert.ok(queryGraph(edges, id("node", "a"), id("node", "c")));
});
test("TASK086 operator segment count and unresolved direction fail closed", () => {
  assert.throws(
    () => generate(pattern({ segmentOperators: ["A"] })),
    /OPERATOR_BOUNDARY/,
  );
  assert.throws(() => generate(pattern({ direction: "unknown" })), /DIRECTION/);
});
test("TASK086 physical adjacency is not a service pattern", () => {
  assert.throws(
    () => generate(pattern({ sequenceEvidence: "PHYSICAL_ADJACENCY" })),
    /PHYSICAL_ADJACENCY/,
  );
});
const transfer = {
  transferId: "transfer",
  from: id("node", "a"),
  to: id("node", "d"),
  hubRef: "hub",
  directed: true,
  evidenceRefs: ["proof"],
  sourceRefs: [source.url],
  evidenceKind: "OFFICIAL_INTERCHANGE",
};
test("TASK086 same-name components without official interchange are rejected", () => {
  assert.throws(
    () =>
      generateTransfer(
        { ...transfer, evidenceKind: "SAME_NAME" },
        nodes,
        sources,
        evidence,
        "fixed",
      ),
    /SAME_NAME/,
  );
});
test("TASK086 official hub transfer retains unresolved minutes and only evidenced direction", () => {
  const edge = generateTransfer(transfer, nodes, sources, evidence, "fixed");
  assert.equal(edge.edgeKind, "hub_transfer");
  assert.equal(edge.metrics.transferTimeMin.value, null);
  assert.equal(queryGraph([edge], transfer.to, transfer.from), null);
});
test("TASK086 flight seasonal and inactive ferry have separate semantics", () => {
  const flight = generate(
    pattern({
      mode: "flight",
      serviceState: "seasonal",
      serviceClass: "scheduled_flight",
    }),
  );
  assert.equal(flight.length, 2);
  assert.equal(flight[0].metrics.seasonal.status, "unresolved");
  assert.deepEqual(
    generate(pattern({ mode: "ferry", serviceState: "inactive" })),
    [],
  );
  assert.equal(generate(pattern({ mode: "ferry" })).length, 2);
});
test("TASK086 bus expansion is bounded by approved purpose", () => {
  assert.throws(
    () => generate(pattern({ mode: "local_bus" })),
    /BUS_EXPANSION/,
  );
  assert.equal(
    generate(pattern({ mode: "airport_bus", purpose: "airport" })).length,
    2,
  );
});
test("TASK086 deterministic node admission, duplicate rejection and ID rebind rejection", () => {
  assert.deepEqual(
    admitNodes([candidate("a")], sources, evidence),
    admitNodes([candidate("a")], sources, evidence),
  );
  assert.throws(
    () => admitNodes([candidate("a"), candidate("a")], sources, evidence),
    /DUPLICATE/,
  );
  const prior = admitNodes([candidate("a")], sources, evidence);
  assert.equal(
    admitNodes(
      [{ ...candidate("a"), canonicalNameJa: "rebound" }],
      sources,
      evidence,
      prior,
    )[0].decision,
    "REJECT",
  );
});
test("TASK086 v1 use and unreviewed v2 promotion are forbidden", () => {
  assert.equal(
    admitNodes(
      [{ ...candidate("a"), origin: "TASK_084_V1" }],
      sources,
      evidence,
    )[0].decision,
    "REJECT",
  );
  assert.equal(
    admitNodes(
      [{ ...candidate("a"), independentReview: null }],
      sources,
      evidence,
    )[0].decision,
    "HOLD",
  );
});
test("TASK086 invalid coordinates, modified evidence and denied persistence fail admission", () => {
  assert.equal(
    admitNodes([{ ...candidate("a"), latitude: NaN }], sources, evidence)[0]
      .decision,
    "REJECT",
  );
  const altered = new Map([
    ["proof", { ...proofRow, record: { wrong: true } }],
  ]);
  assert.equal(
    admitNodes([candidate("a")], sources, altered)[0].decision,
    "HOLD",
  );
  const denied = new Map([
    ["fixture", { ...source, persistenceAllowed: false }],
  ]);
  assert.equal(
    admitNodes([candidate("a")], denied, evidence)[0].decision,
    "HOLD",
  );
});
test("TASK086 deterministic edge IDs and same-service duplicates rejected", () => {
  const edges = generate(pattern());
  assert.deepEqual(edges, generate(pattern()));
  assert.throws(() => validateEdges([...edges, edges[0]]), /DUPLICATE/);
  assert.throws(
    () => validateEdges([...edges, { ...edges[0], edgeId: "new-id" }]),
    /SAME_SERVICE/,
  );
});
test("TASK086 direct service requires its underlying segments", () => {
  const p = pattern(),
    shortcut = {
      evidenceKind: "REAL_THROUGH_SERVICE",
      plannerValue: "No forced interchange",
      servicePatternRef: p.servicePatternId,
      from: id("node", "a"),
      to: id("node", "c"),
    };
  assert.throws(
    () => generateDirect(shortcut, p, [], sources, "fixed"),
    /UNDERLYING/,
  );
  assert.equal(
    generateDirect(shortcut, p, generate(p), sources, "fixed").edgeKind,
    "direct_service",
  );
});
test("TASK086 pickup/dropoff restrictions do not invent a transfer", () => {
  const p = pattern();
  p.callingNodes[1].dropOffType = "1";
  const first = generate(p);
  const onward = generate(
    pattern({
      servicePatternId: "other",
      callingNodes: [
        p.callingNodes[1],
        { nodeId: id("node", "d"), sequence: 2 },
      ],
      segmentOperators: ["A"],
    }),
  );
  assert.ok(queryGraph(first, id("node", "a"), id("node", "c")));
  assert.equal(
    queryGraph([...first, ...onward], id("node", "a"), id("node", "d")),
    null,
  );
});
test("TASK086 required inventory cannot shrink without evidence", () => {
  const old = [{ requirementId: "a" }];
  assert.throws(() => growInventory(old, []), /SHRINK/);
  assert.deepEqual(
    growInventory(
      old,
      [],
      [
        {
          requirementId: "a",
          decision: "DEPRECATED",
          evidencePath: "reason",
          evidenceSha256: hash("reason"),
        },
      ],
    ),
    [],
  );
});
function audit(edges = []) {
  return auditGraph({
    nodes: admitted,
    patterns: [pattern()],
    transfers: [transfer],
    edges,
    inventory: [
      { requirementId: "a", nodeId: id("node", "a"), tier: "T0" },
      { requirementId: "c", nodeId: id("node", "c"), tier: "T1" },
    ],
    corridors: [
      { corridorId: "a-c", from: id("node", "a"), to: id("node", "c") },
    ],
    anchorNodeId: id("node", "a"),
    discoveryGaps: [{ deficitId: "rights", class: "SOURCE_LICENSE_GAP" }],
  });
}
test("TASK086 all deficit classes are emitted as machine counters", () => {
  const result = audit();
  assert.deepEqual(Object.keys(result.counts), DEFICITS);
  assert.equal(result.counts.DISCONNECTED_T1, 1);
  assert.equal(result.counts.HUB_TRANSFER_GAP, 1);
  assert.equal(result.counts.SERVICE_PATTERN_GAP, 1);
  assert.ok(result.counts.CORRIDOR_UNREACHABLE > 0);
});
test("TASK086 corridor QA is derived from directed graph and inventory", () => {
  const result = audit(generate(pattern()));
  assert.equal(result.corridors[0].status, "FAIL");
  assert.equal(result.corridors[0].forwardEdgeIds.length, 2);
  assert.equal(result.corridors[0].reverseEdgeIds, null);
  assert.ok(result.corridors.some((c) => c.origin === "REQUIRED_INVENTORY"));
});
const action = (name, cls = "DISCONNECTED_T1") => ({
  actionId: name,
  strategyFingerprint: name,
  triggerClasses: [cls],
  requiredImpact: 1,
  corridorImpact: 1,
  authority: 1,
  identityCertainty: 1,
  licenseUsability: 1,
  expectedImprovement: { nodes: 1 },
});
test("TASK086 deterministic next action and national priority", () => {
  const actions = [
    action("z"),
    action("a"),
    action("rights", "SOURCE_LICENSE_GAP"),
  ];
  assert.equal(selectAction(audit(), actions, []).actionId, "a");
  assert.deepEqual(
    selectAction(audit(), actions, []),
    selectAction(audit(), [...actions].reverse(), []),
  );
});
test("TASK086 no-improvement strategy cannot be repeated by renaming action", () => {
  const history = [
    {
      actionId: "first",
      strategyFingerprint: "same",
      actualImprovement: { hardDeficitsReduced: 0 },
    },
  ];
  assert.equal(
    selectAction(
      audit(),
      [{ ...action("renamed"), strategyFingerprint: "same" }],
      history,
    ),
    null,
  );
  assert.equal(
    selectAction(audit(), [action("different-source")], history).actionId,
    "different-source",
  );
});
test("TASK086 parameters are traced and thresholds cannot change", () => {
  const changed = adaptParameters(
    DEFAULT_PARAMETERS,
    { ...action("a"), parameterChanges: { routeChunkSize: 100 } },
    audit(),
  );
  assert.equal(changed.changes[0].previousValue, 200);
  assert.equal(changed.changes[0].newValue, 100);
  assert.throws(
    () =>
      adaptParameters(
        DEFAULT_PARAMETERS,
        { ...action("a"), parameterChanges: { routeChunkSize: 201 } },
        audit(),
      ),
    /HARD_CAP/,
  );
  assert.throws(
    () =>
      adaptParameters(
        DEFAULT_PARAMETERS,
        { ...action("a"), parameterChanges: { requiredCoverage: 0.5 } },
        audit(),
      ),
    /THRESHOLD/,
  );
});
test("TASK086 fixpoint requires every category, matching proof hash and no ordinary work", () => {
  const deficit = { deficitId: "external" };
  const bytes = "actual evidence";
  const body = {
    type: "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF",
    deficitId: "external",
    externalBlocker: "Denied source scope",
    invalidateWhen: "New authorization",
    repeatSearchReason: "Same reviewed source snapshot",
    ordinaryWorkRemaining: false,
    searches: [
      "official_operator",
      "government_open_data",
      "licensed_static",
      "mode_specific",
      "identity",
      "alternative_connection",
    ].map((category) => ({
      category,
      outcome: "Denied",
      evidencePath: "evidence",
      evidenceSha256: hash(bytes),
    })),
  };
  const proof = { ...body, proofSha256: hash(body) };
  assert.equal(
    validateFixpoint(proof, deficit, () => bytes),
    true,
  );
  assert.equal(
    validateFixpoint(
      { ...proof, ordinaryWorkRemaining: true },
      deficit,
      () => bytes,
    ),
    false,
  );
  assert.equal(
    validateFixpoint(proof, deficit, () => "corrupt"),
    false,
  );
  assert.equal(
    validateFixpoint(
      { ...proof, searches: body.searches.slice(1) },
      deficit,
      () => bytes,
    ),
    false,
  );
});
test("TASK086 empty national graph cannot claim PASS or a discovery fixpoint", () => {
  const result = acceptance(audit(), [], () => "", { deterministic: "PASS" });
  assert.match(result.status, /^IN_PROGRESS_AUTO_REMEDIATION$/);
  assert.equal(result.globalTopologyDiscoveryFixpoint, "NOT_PROVEN");
});
test("TASK086 batch checksum skip, resume and deterministic output", (t) => {
  const dir = temp(t),
    groups = [group(generate(pattern()))];
  const first = executeBatches(dir, groups);
  assert.equal(first.results[0].disposition, "CREATED");
  assert.equal(
    executeBatches(dir, groups).results[0].disposition,
    "CHECKSUM_SKIP",
  );
  const manifest = readJson(path.join(dir, "checkpoint.json"));
  assert.equal(manifest.complete, true);
  assert.deepEqual(first.receipts, executeBatches(dir, groups).receipts);
});
test("TASK086 corruption is detected and only explicit single-batch repair is permitted", (t) => {
  const dir = temp(t),
    groups = [group(generate(pattern()))],
    result = executeBatches(dir, groups);
  const batch = result.results[0].batchId;
  fs.writeFileSync(
    path.join(dir, "batch-receipts", batch + ".json"),
    "corrupt",
  );
  assert.throws(() => executeBatches(dir, groups), /CORRUPTED/);
  assert.equal(
    executeBatches(dir, groups, { repair: true, rerunBatch: batch }).results[0]
      .disposition,
    "REPAIRED_EXPLICIT_BATCH",
  );
  assert.equal(
    executeBatches(dir, groups, { rerunBatch: batch }).results[0].disposition,
    "EXPLICIT_RERUN",
  );
});
test("TASK086 changed-source fingerprint invalidates receipt", (t) => {
  const dir = temp(t),
    g = group(generate(pattern()));
  executeBatches(dir, [g]);
  const changed = {
    ...g,
    sources: [{ ...source, contentSha256: hash("new") }],
  };
  assert.equal(
    executeBatches(dir, [changed]).results[0].disposition,
    "SOURCE_OR_GENERATOR_INVALIDATED",
  );
});
test("TASK086 batches stay at <=200 directed edges and resume crash after PASS", (t) => {
  const dir = temp(t);
  const edges = Array.from({ length: 401 }, (_, i) => ({
    ...generate(pattern())[0],
    edgeId: `e${i}`,
    segmentIndex: i,
  }));
  const groups = [group(edges)];
  assert.throws(
    () => executeBatches(dir, groups, { crashAfter: 1 }),
    /SIMULATED_CRASH/,
  );
  const result = executeBatches(dir, groups);
  assert.deepEqual(
    result.results.map((r) => r.edgeCount),
    [200, 200, 1],
  );
  assert.equal(result.results[0].disposition, "CHECKSUM_SKIP");
  assert.ok(result.results.slice(1).every((r) => r.disposition === "CREATED"));
});
test("TASK086 one replay cannot mutate input evidence or infer reverse topology", () => {
  const p = pattern(),
    before = canonical(p);
  generate(p);
  assert.equal(canonical(p), before);
  assert.deepEqual(generate({ ...p, serviceState: "suspended" }), []);
});

test("TASK086 inventory cannot silently rebind or downgrade required tiers", () => {
  const old = [{ requirementId: "r", nodeId: "a", tier: "T0" }];
  assert.throws(
    () => growInventory(old, [{ requirementId: "r", nodeId: "b", tier: "T0" }]),
    /REBIND/,
  );
  assert.throws(
    () => growInventory(old, [{ requirementId: "r", nodeId: "a", tier: "T3" }]),
    /TIER_CHANGE/,
  );
});

test("TASK086 direct shortcut uses final stop alighting restriction", () => {
  const p = pattern();
  p.callingNodes[1].dropOffType = "1";
  const shortcut = {
    evidenceKind: "REAL_THROUGH_SERVICE",
    plannerValue: "Preserve continuous service",
    servicePatternRef: p.servicePatternId,
    from: id("node", "a"),
    to: id("node", "c"),
  };
  const edge = generateDirect(shortcut, p, generate(p), sources, "fixed");
  assert.equal(edge.alightAllowed, true);
});

test("TASK086 unrelated valid evidence cannot admit a node identity", () => {
  const node = candidate("new");
  node.evidenceRefs = ["proof"];
  assert.equal(admitNodes([node], sources, evidence)[0].decision, "HOLD");
});

test("TASK086 retained GTFS calls bind direction, endpoints and boarding restrictions", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const pack = readJson(
    path.join(root, "data/transport/network/sources/fukuoka-ferry.json"),
  );
  const packSources = new Map([[pack.source.sourceId, pack.source]]);
  const packEvidence = new Map(pack.evidence.map((e) => [e.evidenceId, e]));
  const packNodes = new Map(
    admitNodes(pack.nodes, packSources, packEvidence).map((n) => [n.nodeId, n]),
  );
  const original = pack.patterns[0];
  const p = {
    ...original,
    servicePatternId: id("pattern", original.sourcePatternKey),
    callingNodes: original.callingNodes.map((c) => ({
      ...c,
      nodeId: id("node", c.identityAnchor),
    })),
  };
  const invoke = (value) =>
    generatePattern(value, packNodes, packSources, packEvidence, "fixture");
  assert.ok(invoke(p).length > 0);
  assert.throws(
    () => invoke({ ...p, direction: "tampered" }),
    /SOURCE_BINDING/,
  );
  assert.throws(
    () =>
      invoke({
        ...p,
        callingNodes: p.callingNodes.map((c, i) =>
          i ? c : { ...c, pickupType: "1" },
        ),
      }),
    /SOURCE_BINDING/,
  );
  assert.throws(() => invoke({ ...p, sourceTripIds: [] }), /SOURCE_BINDING/);
});

test("TASK086 retained GTFS transfer cannot be rebound to a different component", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const pack = readJson(
    path.join(root, "data/transport/network/sources/nagasaki-bus.json"),
  );
  const packSources = new Map([[pack.source.sourceId, pack.source]]);
  const packEvidence = new Map(pack.evidence.map((e) => [e.evidenceId, e]));
  const packNodes = new Map(
    admitNodes(pack.nodes, packSources, packEvidence).map((n) => [n.nodeId, n]),
  );
  const original = pack.transfers[0];
  const t = {
    ...original,
    from: id("node", original.fromAnchor),
    to: id("node", original.toAnchor),
  };
  assert.equal(
    generateTransfer(t, packNodes, packSources, packEvidence, "fixture")
      .edgeKind,
    "hub_transfer",
  );
  const wrong = [...packNodes.keys()].find(
    (key) => key !== t.from && key !== t.to,
  );
  assert.throws(
    () =>
      generateTransfer(
        { ...t, to: wrong },
        packNodes,
        packSources,
        packEvidence,
        "fixture",
      ),
    /SOURCE_BINDING/,
  );
});

test("TASK086 regional T0/T1 connectivity alone cannot declare a national core", () => {
  const state = {
    tier: { T0: { connected: 1 }, T1: { connected: 1 } },
    deficits: [],
    corridors: [],
  };
  assert.match(
    acceptance(state, [], () => "", { checks: "PASS" }).status,
    /^IN_PROGRESS_AUTO_REMEDIATION$/,
  );
  state.corridors = [{ origin: "TASK_MANDATORY_QUERY_ONLY", status: "FAIL" }];
  assert.match(
    acceptance(state, [], () => "", { checks: "PASS" }).status,
    /^IN_PROGRESS_AUTO_REMEDIATION$/,
  );
  state.corridors[0].status = "PASS";
  assert.equal(
    acceptance(state, [], () => "", { checks: "PASS" }).status,
    "PASS / READY_FOR_REVIEW",
  );
  assert.match(
    acceptance(state, [], () => "", { checks: "NOT_RUN" }).status,
    /^IN_PROGRESS_AUTO_REMEDIATION$/,
  );
});

test("TASK086 expanded inventory invalidates a batch's changed deficit snapshot", (t) => {
  const dir = temp(t),
    original = group(generate(pattern()));
  executeBatches(dir, [original]);
  const expanded = {
    ...original,
    nextActionDeficitSummary: { DISCONNECTED_T0: 2 },
  };
  assert.equal(
    executeBatches(dir, [expanded]).results[0].disposition,
    "SOURCE_OR_GENERATOR_INVALIDATED",
  );
});
