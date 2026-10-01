import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hash,
  sourceAllowed,
  metricFields,
  acceptance,
  assertTerminalResult,
  queryGraph,
  anchorQueries,
  resolveCorridorEndpoints,
  generatePattern,
  generateTransfer,
} from "../tools/transport/task-086-model.mjs";
import {
  transitionAction,
  nextSourceAction,
  acquireEvidence,
  recordReferenceEvidence,
} from "../tools/transport/task-086-source-actions.mjs";
import { jsonlBytes, readRows } from "../tools/transport/task-086-batches.mjs";
const minimal = {
  sourceId: "official",
  url: "https://operator.invalid/map",
  observedAt: "2026-10-01",
  contentSha256: hash("minimum facts"),
  rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
  rawPayloadRetained: false,
  derivedDataAllowed: true,
  redistributionAllowed: true,
  rightsDecision: "MINIMUM_FACTS_ONLY",
  rightsReview: {
    scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
    termsUrl: "https://operator.invalid/terms",
    reason: "Factual calling order only; expressive map excluded",
  },
};
const action = () => ({
  actionId: "rail:test",
  mode: "shinkansen",
  state: "PENDING_RESEARCH",
  attempts: [],
  sourcesChecked: [],
  rightsFindings: [],
  extractedFacts: [],
  affectedDeficits: ["SERVICE_PATTERN_GAP"],
  result: "OPEN",
  nextAction: "RESEARCH",
});
const detail = { result: "OBSERVED", nextAction: "REVIEW" };
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-actions-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test("TASK086 layered rights accept only reviewed minimal facts and prohibit raw/map retention", () => {
  assert.equal(!!sourceAllowed(minimal), true);
  assert.equal(
    !!sourceAllowed({ ...minimal, rawPayloadRetained: true }),
    false,
  );
  assert.equal(!!sourceAllowed({ ...minimal, rightsReview: {} }), false);
  for (const rightsClass of ["REFERENCE_ONLY_DISCOVERY", "LICENSE_BLOCKED"])
    assert.equal(!!sourceAllowed({ ...minimal, rightsClass }), false);
});
test("TASK086 fact-only source cannot smuggle persistent timetable metrics", () => {
  assert.throws(() =>
    metricFields(
      {
        durationTypicalMin: {
          value: 10,
          sourceId: "official",
          sourceSha256: minimal.contentSha256,
          observedAt: "2026-10-01",
          validFrom: "2026-01-01",
          validTo: "2026-12-31",
          freshnessClass: "STATIC",
          rightsDecision: "x",
        },
      },
      new Map([["official", minimal]]),
    ),
  );
});
test("TASK086 ordinary queue work forbids terminal even when the graph hard gates pass", () => {
  const audit = {
    tier: { T0: { connected: 1 }, T1: { connected: 1 } },
    deficits: [],
    corridors: [{ origin: "TASK_MANDATORY_QUERY_ONLY", status: "PASS" }],
  };
  for (const state of [
    "PENDING_RESEARCH",
    "RESEARCHING",
    "SOURCE_FOUND",
    "RIGHTS_REVIEWED",
    "NO_SOURCE_FOUND",
  ]) {
    const actions = [{ ...action(), state }],
      gate = acceptance(audit, [], () => "", { qa: "PASS" }, actions);
    assert.equal(gate.status, "IN_PROGRESS_AUTO_REMEDIATION");
    assert.equal(gate.ordinaryDiscoveryRemaining, true);
    assert.throws(
      () => assertTerminalResult(gate, actions),
      /TERMINAL_RESULT_FORBIDDEN/,
    );
  }
  const gate = acceptance(audit, [], () => "", { qa: "PASS" }, [
    { ...action(), state: "INGESTED" },
  ]);
  assert.equal(assertTerminalResult(gate, []), true);
});
test("TASK086 source actions cannot skip research/rights or fabricate external approval exhaustion", () => {
  assert.throws(
    () => transitionAction(action(), "INGESTED", detail, "2026-10-01"),
    /INVALID_SOURCE_ACTION/,
  );
  const researched = transitionAction(
    action(),
    "RESEARCHING",
    detail,
    "2026-10-01",
  );
  const missing = transitionAction(
    researched,
    "NO_SOURCE_FOUND",
    detail,
    "2026-10-01",
  );
  assert.throws(
    () =>
      transitionAction(
        missing,
        "EXTERNAL_APPROVAL_REQUIRED",
        detail,
        "2026-10-01",
      ),
    /EXTERNAL_APPROVAL_NOT_PROVEN/,
  );
  const { eventSha256, ...event } = missing.events.at(-1);
  assert.equal(hash(event), eventSha256);
  assert.equal(event.previousEventSha256, researched.events.at(-1).eventSha256);
});
test("TASK086 real acquisition records response fingerprints, rights findings and no raw persistence for minimum facts", async (t) => {
  const dir = temp(t),
    queuePath = path.join(dir, "queue.jsonl");
  fs.writeFileSync(queuePath, jsonlBytes([action()]));
  let calls = 0;
  const request = {
    actionId: "rail:test",
    urls: [
      { url: minimal.url, purpose: "topology", retainAs: "must-not-exist.bin" },
      { url: minimal.rightsReview.termsUrl, purpose: "terms" },
    ],
    rightsClass: minimal.rightsClass,
    termsUrl: minimal.rightsReview.termsUrl,
    rightsFinding: minimal.rightsReview.reason,
  };
  const result = await acquireEvidence(request, {
    queuePath,
    now: () => minimal.observedAt,
    network: async () => {
      calls++;
      return new Response("observed official response", { status: 200 });
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.state, "RIGHTS_REVIEWED");
  assert.equal(result.attempts.length, 1);
  assert.equal(
    result.sourcesChecked[0].contentSha256,
    hash("observed official response"),
  );
  assert.equal(result.sourcesChecked[0].rawPayloadRetained, false);
  assert.equal(readRows(queuePath)[0].state, result.state);
});
test("TASK086 reference evidence explicitly fingerprints the observation instead of claiming raw source bytes", (t) => {
  const dir = temp(t),
    queuePath = path.join(dir, "queue.jsonl");
  fs.writeFileSync(queuePath, jsonlBytes([action()]));
  const r = recordReferenceEvidence(
    {
      actionId: "rail:test",
      observedAt: "2026-10-01",
      observedVia: "web.run",
      observations: [
        {
          url: minimal.url,
          purpose: "topology",
          facts: { interchangeGate: true },
        },
        {
          url: minimal.rightsReview.termsUrl,
          purpose: "terms",
          finding: "Expressive works reserved",
        },
      ],
      rightsClass: minimal.rightsClass,
      termsUrl: minimal.rightsReview.termsUrl,
      rightsFinding: minimal.rightsReview.reason,
    },
    { queuePath },
  );
  assert.equal(r.sourcesChecked[0].status, "REFERENCE_RETRIEVED");
  assert.equal(
    r.sourcesChecked[0].fingerprintScope,
    "MINIMUM_REVIEWED_OBSERVATION_NOT_SOURCE_BYTES",
  );
  assert.equal(r.state, "RIGHTS_REVIEWED");
});
test("TASK086 queued Shinkansen research precedes dominant regional bus expansion", () => {
  assert.equal(
    nextSourceAction([
      { ...action(), actionId: "bus", mode: "highway_bus", priority: 0 },
      { ...action(), actionId: "shinkansen", priority: 50 },
    ]).actionId,
    "shinkansen",
  );
});
test("TASK086 optimized anchor replay matches directed onboard queries including pickup/drop-off restrictions", () => {
  const segment = (edgeId, from, to, index, board, alight, pattern = "p") => ({
    edgeId,
    fromTransportNodeId: from,
    toTransportNodeId: to,
    edgeKind: "service_segment",
    servicePatternRef: pattern,
    segmentIndex: index,
    boardAllowed: board,
    alightAllowed: alight,
  });
  const e = [
    segment("a", "A", "B", 0, true, false),
    segment("b", "B", "C", 1, false, true),
    segment("c", "C", "D", 0, true, true, "q"),
    segment("d", "D", "A", 0, true, true, "r"),
    {
      edgeId: "illegal-branch",
      fromTransportNodeId: "B",
      toTransportNodeId: "X",
      edgeKind: "hub_transfer",
    },
  ];
  for (const anchor of ["A", "B", "C", "D", "X"]) {
    const query = anchorQueries(e, anchor);
    for (const from of ["A", "B", "C", "D", "X"])
      for (const to of ["A", "B", "C", "D", "X"])
        assert.equal(
          query(from, to) !== null,
          queryGraph(e, from, to) !== null,
          `${anchor}: ${from}->${to}`,
        );
  }
});

test("TASK086 new corridor stations resolve previously null endpoints without changing an established component", () => {
  const corridor = { corridorId: "札幌:旭川", from: "sapporo-fixed", to: null };
  const rail = {
    nodeId: "asahikawa-rail",
    canonicalNameJa: "旭川",
    decision: "ADMIT_TASK_086_TOPOLOGY",
    mode: "conventional_rail",
  };
  const airport = { ...rail, nodeId: "asahikawa-airport", mode: "airport" };
  assert.deepEqual(resolveCorridorEndpoints(corridor, [rail, airport]), {
    ...corridor,
    to: rail.nodeId,
  });
  assert.equal(
    resolveCorridorEndpoints(corridor, [{ ...rail, decision: "HOLD" }]).to,
    null,
  );
  assert.equal(
    resolveCorridorEndpoints(corridor, [rail, { ...rail, nodeId: "ambiguous" }])
      .to,
    null,
  );
  assert.equal(
    resolveCorridorEndpoints({ ...corridor, to: "already-bound" }, [rail]).to,
    "already-bound",
  );
});

function boundOfficialFixture() {
  const sources = new Map([["official", minimal]]),
    evidence = new Map();
  const nodes = new Map(
    ["A", "B", "C"].map((name) => [
      name,
      {
        nodeId: name,
        canonicalNameJa: name,
        operatorRefs: ["operator"],
        lineRefs: ["line"],
        mode: "conventional_rail",
        decision: "ADMIT_TASK_086_TOPOLOGY",
      },
    ]),
  );
  const put = (key, record) => {
    evidence.set(key, {
      evidenceId: key,
      sourceId: "official",
      sourceSha256: minimal.contentSha256,
      record,
      recordSha256: hash(record),
      locator: "Reviewed factual test record",
    });
    return key;
  };
  const factRef = put("fact", {
    kind: "service",
    callingStations: ["A", "B"],
    operator: "operator",
    line: "line",
    mode: "conventional_rail",
  });
  const callingNodes = ["A", "B"].map((nodeId, i) => ({
    nodeId,
    sequence: i + 1,
    pickupType: "0",
    dropOffType: "0",
  }));
  const resolved = {
    callingNodes,
    lineRef: "line",
    operatorRef: "operator",
    mode: "conventional_rail",
    serviceClass: "local",
    direction: "outbound",
    sourceFactRef: factRef,
  };
  const pattern = {
    ...resolved,
    servicePatternId: "p",
    evidenceRefs: [put("resolved", resolved)],
    sourceRefs: [minimal.url],
    sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
    segmentOperators: ["operator"],
    serviceState: "active",
    metrics: {},
  };
  return { sources, evidence, nodes, put, pattern };
}
test("TASK086 minimal official calls cannot bypass binding by removing the strict flag or choosing a namesake operator", () => {
  const f = boundOfficialFixture();
  assert.equal(
    generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01")
      .length,
    1,
  );
  assert.throws(
    () =>
      generatePattern(
        {
          ...f.pattern,
          strictFactBinding: false,
          callingNodes: [
            f.pattern.callingNodes[0],
            { ...f.pattern.callingNodes[1], nodeId: "C" },
          ],
        },
        f.nodes,
        f.sources,
        f.evidence,
        "2026-10-01",
      ),
    /OFFICIAL_PATTERN_SOURCE_BINDING/,
  );
  f.nodes.get("B").operatorRefs = ["namesake-operator"];
  assert.throws(
    () =>
      generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01"),
    /OFFICIAL_PATTERN_SOURCE_BINDING/,
  );
});
test("TASK086 minimal official transfer binds the exact reviewed pair and direction", () => {
  const f = boundOfficialFixture();
  const components = ["A", "B"].map((name) => ({
    name,
    operator: "operator",
    line: "line",
    mode: "conventional_rail",
  }));
  const factRef = f.put("transfer-fact", {
    kind: "transfer",
    components,
    directions: [[0, 1]],
  });
  const resolved = {
    from: "A",
    to: "B",
    hubRef: "hub",
    sourceFactRef: factRef,
  };
  const transfer = {
    ...resolved,
    evidenceKind: "OFFICIAL_INTERCHANGE",
    directed: true,
    evidenceRefs: [f.put("transfer-resolved", resolved)],
    metrics: {},
  };
  assert.equal(
    generateTransfer(transfer, f.nodes, f.sources, f.evidence, "2026-10-01")
      .fromTransportNodeId,
    "A",
  );
  assert.throws(
    () =>
      generateTransfer(
        { ...transfer, from: "B", to: "A" },
        f.nodes,
        f.sources,
        f.evidence,
        "2026-10-01",
      ),
    /OFFICIAL_TRANSFER_SOURCE_BINDING/,
  );
  const forged = { ...resolved, to: "C" };
  assert.throws(
    () =>
      generateTransfer(
        {
          ...transfer,
          ...forged,
          evidenceRefs: [f.put("forged-transfer", forged)],
        },
        f.nodes,
        f.sources,
        f.evidence,
        "2026-10-01",
      ),
    /OFFICIAL_TRANSFER_SOURCE_BINDING/,
  );
});
test("TASK086 reviewed evidence remains schedulable and failed terms do not erase acquired source state", async (t) => {
  assert.equal(
    nextSourceAction([{ ...action(), state: "RIGHTS_REVIEWED" }]).state,
    "RIGHTS_REVIEWED",
  );
  const dir = temp(t),
    queuePath = path.join(dir, "queue.jsonl");
  fs.writeFileSync(queuePath, jsonlBytes([action()]));
  await assert.rejects(
    acquireEvidence(
      {
        actionId: "rail:test",
        urls: [{ url: minimal.url, purpose: "topology" }],
        rightsClass: minimal.rightsClass,
        rightsFinding: "review",
        termsUrl: "https://operator.invalid/missing",
      },
      { queuePath, network: async () => new Response("source") },
    ),
    /TERMS_NOT_OBSERVED/,
  );
  assert.equal(readRows(queuePath)[0].state, "SOURCE_FOUND");
});
