import { roadTerminalCandidate } from "../tools/transport/task-086-road-identities.mjs";
import { airportCandidate } from "../tools/transport/task-086-airport-identities.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hash,
  id,
  admitNodes,
  reviewedRailTransition,
  reviewedGtfsComponent,
  auditGraph,
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
  validateCorroboratingEvidence,
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
  assert.equal(result.nextAction, "EXTRACT_AND_BIND_MINIMAL_FACTS");
  for (const rightsClass of ["REFERENCE_ONLY_DISCOVERY", "LICENSE_BLOCKED"]) {
    const restricted = await acquireEvidence(
      { ...request, rightsClass },
      {
        queuePath,
        now: () => minimal.observedAt,
        network: async () =>
          new Response("restricted reference", { status: 200 }),
      },
    );
    assert.equal(restricted.nextAction, "SEARCH_NEXT_LAWFUL_ALTERNATIVE");
    assert.ok(restricted.sourcesChecked.every((s) => !s.rawPayloadRetained));
    assert.deepEqual(restricted.extractedFacts, []);
  }
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

test("TASK086 small-ke review binds the selected line identity at a multiline component", () => {
  const f = boundOfficialFixture();
  const node = f.nodes.get("B");
  node.canonicalNameJa = "霞ヶ関";
  node.identityRecord = { stationCode: "primary", line: "other-line" };
  const identity = {
    stationName: "霞ヶ関",
    stationCode: "selected",
    operator: "operator",
    line: "line",
  };
  node.evidenceRefs = [f.put("identity", identity)];
  const fact = {
    ...f.evidence.get("fact").record,
    callingStations: ["A", "霞ケ関"],
    callingComponents: [
      {
        name: "A",
        operator: "operator",
        line: "line",
        mode: "conventional_rail",
      },
      {
        name: "霞ヶ関",
        operator: "operator",
        line: "line",
        mode: "conventional_rail",
        nameVariantReview: {
          kind: "JAPANESE_SMALL_KE",
          sourceName: "霞ケ関",
          stationCode: "selected",
        },
      },
    ],
  };
  f.put("fact", fact);
  const generate = () =>
    generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01");
  assert.equal(generate().length, 1);
  for (const changed of [
    { line: "other-line" },
    { operator: "namesake" },
    { stationCode: "wrong-code" },
    { stationName: "different" },
  ]) {
    f.put("identity", { ...identity, ...changed });
    assert.throws(generate, /OFFICIAL_PATTERN_SOURCE_BINDING/);
  }
  f.put("identity", identity);
  f.evidence.get("identity").recordSha256 = hash("tampered");
  assert.throws(generate, /OFFICIAL_PATTERN_SOURCE_BINDING/);
});

test("TASK086 fullwidth digit review preserves every non-digit character and exact station identity", () => {
  const f = boundOfficialFixture();
  const node = f.nodes.get("B");
  node.canonicalNameJa = "空港第2ビル";
  const identity = {
    stationName: node.canonicalNameJa,
    stationCode: "airport-two",
    operator: "operator",
    line: "line",
  };
  node.evidenceRefs = [f.put("identity", identity)];
  const selector = {
    name: node.canonicalNameJa,
    operator: "operator",
    line: "line",
    mode: "conventional_rail",
    nameVariantReview: {
      kind: "JAPANESE_DIGIT_WIDTH",
      sourceName: "空港第２ビル",
      stationCode: "airport-two",
    },
  };
  const fact = {
    ...f.evidence.get("fact").record,
    callingStations: ["A", "空港第２ビル"],
    callingComponents: [
      {
        name: "A",
        operator: "operator",
        line: "line",
        mode: "conventional_rail",
      },
      selector,
    ],
  };
  f.put("fact", fact);
  const generate = () =>
    generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01");
  assert.equal(generate().length, 1);
  for (const invalid of ["空港第３ビル", "空港２ビル", "空港第２ターミナル"]) {
    fact.callingStations[1] = invalid;
    selector.nameVariantReview.sourceName = invalid;
    f.put("fact", fact);
    assert.throws(generate, /OFFICIAL_PATTERN_SOURCE_BINDING/);
  }
});

test("TASK086 parenthesis-width review preserves operator prefixes and exact independent station identity", () => {
  const f = boundOfficialFixture();
  const node = f.nodes.get("B");
  node.canonicalNameJa = "西鉄福岡（天神）";
  const identity = {
    stationName: node.canonicalNameJa,
    stationCode: "nishitetsu-tenjin",
    operator: "operator",
    line: "line",
  };
  node.evidenceRefs = [f.put("identity", identity)];
  const selector = {
    name: node.canonicalNameJa,
    operator: "operator",
    line: "line",
    mode: "conventional_rail",
    nameVariantReview: {
      kind: "JAPANESE_PAREN_WIDTH",
      sourceName: "西鉄福岡(天神)",
      stationCode: "nishitetsu-tenjin",
    },
  };
  const fact = {
    ...f.evidence.get("fact").record,
    callingStations: ["A", "西鉄福岡(天神)"],
    callingComponents: [
      {
        name: "A",
        operator: "operator",
        line: "line",
        mode: "conventional_rail",
      },
      selector,
    ],
  };
  f.put("fact", fact);
  const generate = () =>
    generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01");
  assert.equal(generate().length, 1);
  for (const invalid of ["福岡(天神)", "西鉄福岡(博多)", "西鉄福岡［天神］"]) {
    fact.callingStations[1] = invalid;
    selector.nameVariantReview.sourceName = invalid;
    f.put("fact", fact);
    assert.throws(generate, /OFFICIAL_PATTERN_SOURCE_BINDING/);
  }
});

test("TASK086 airport admission binds independent reference point, protected requirement and current access", () => {
  const record = {
    airportName: "福岡空港",
    referencePointId: "cf03_00083",
    latitude: 33.585,
    longitude: 130.45,
    identityAsOf: "2021-12-31",
    coordinateScope:
      "AIRPORT_REFERENCE_POINT_NOT_TERMINAL_OR_PRECISE_NAVIGATION",
  };
  const requirement = {
    requirementId: "review:airport-fukuoka",
    name: "福岡",
    tier: "T0",
    kind: "airport",
  };
  requirement.nodeId = id("node", requirement.requirementId);
  const selector = {
    name: "福岡空港",
    operator: "airport-facility:cf03_00083",
    line: "airport:cf03_00083",
    mode: "flight",
    airportIdentity: {
      dataset: "C28-21",
      referencePointId: "cf03_00083",
      requirementId: requirement.requirementId,
      expectedRequirementName: "福岡",
      method: "REVIEWED_EXACT_OFFICIAL_NAME_WITH_AIRPORT_SUFFIX",
      currentPassengerAccessReview:
        "Official municipal station guide explicitly identifies terminal-to-concourse access.",
    },
  };
  const candidate = airportCandidate(selector, record, requirement, [
    "identity",
    "access",
  ]);
  assert.equal(id("node", candidate.identityAnchor), requirement.nodeId);
  assert.equal(candidate.nodeLevel, "T0");
  for (const changed of [
    { ...selector, name: "東京国際空港" },
    { ...selector, operator: "airline:unreviewed" },
    {
      ...selector,
      airportIdentity: {
        ...selector.airportIdentity,
        referencePointId: "wrong",
      },
    },
    {
      ...selector,
      airportIdentity: {
        ...selector.airportIdentity,
        currentPassengerAccessReview: "",
      },
    },
  ])
    assert.throws(
      () =>
        airportCandidate(changed, record, requirement, ["identity", "access"]),
      /AIRPORT_/,
    );
  assert.throws(
    () =>
      airportCandidate(selector, record, { ...requirement, name: "東京国際" }, [
        "identity",
        "access",
      ]),
    /AIRPORT_/,
  );
  const sources = new Map([[minimal.sourceId, minimal]]);
  const evidence = new Map([
    [
      "identity",
      {
        sourceId: minimal.sourceId,
        sourceSha256: minimal.contentSha256,
        record,
        recordSha256: hash(record),
        locator: "independent raw C28 record",
      },
    ],
    [
      "access",
      {
        sourceId: minimal.sourceId,
        sourceSha256: minimal.contentSha256,
        record: { connection: "airport to station" },
        recordSha256: hash({ connection: "airport to station" }),
        locator: "current access",
      },
    ],
  ]);
  assert.equal(
    admitNodes([candidate], sources, evidence)[0].decision,
    "ADMIT_TASK_086_TOPOLOGY",
  );
  for (const changed of [
    { ...candidate, latitude: 35 },
    { ...candidate, canonicalNameJa: "東京国際空港" },
    { ...candidate, operatorRefs: ["airline:unreviewed"] },
    { ...candidate, nodeKind: "rail_station" },
  ])
    assert.ok(
      admitNodes([changed], sources, evidence)[0].reasons.includes(
        "IDENTITY_SOURCE_BINDING_MISMATCH",
      ),
    );
});

test("TASK086 fixed guideway identity cannot silently become conventional rail", () => {
  const record = {
    stationName: "三宮",
    operator: "神戸新交通",
    line: "ポートアイランド線",
    stationCode: "007125",
    latitude: 34.694,
    longitude: 135.195,
  };
  const candidate = {
    identityAnchor: "s12:test:portliner",
    canonicalNameJa: "三宮",
    nodeKind: "other_tourism_transport",
    nodeLevel: "T1",
    mode: "fixed_guideway",
    operatorRefs: [record.operator],
    lineRefs: [record.line],
    latitude: record.latitude,
    longitude: record.longitude,
    identityRecord: record,
    origin: "TASK_086_INDEPENDENT_S12_AND_OFFICIAL_SERVICE",
    evidenceRefs: ["identity"],
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(record),
    },
    hubSemantics: "PHYSICAL_OPERATOR_COMPONENT_NO_IMPLICIT_TRANSFER",
    parentHubId: null,
  };
  const sources = new Map([[minimal.sourceId, minimal]]);
  const evidence = new Map([
    [
      "identity",
      {
        sourceId: minimal.sourceId,
        sourceSha256: minimal.contentSha256,
        record,
        recordSha256: hash(record),
        locator: "independent S12 fixed guideway identity",
      },
    ],
  ]);
  assert.equal(
    admitNodes([candidate], sources, evidence)[0].decision,
    "ADMIT_TASK_086_TOPOLOGY",
  );
  for (const changed of [
    { ...candidate, nodeKind: "rail_station" },
    { ...candidate, mode: "conventional_rail" },
    { ...candidate, mode: "unreviewed" },
  ])
    assert.ok(
      admitNodes([changed], sources, evidence)[0].reasons.includes(
        "IDENTITY_SOURCE_BINDING_MISMATCH",
      ),
    );
});

test("TASK086 flight reachability does not substitute for airport surface access", () => {
  const nodes = [
    {
      nodeId: "airport-a",
      mode: "flight",
      decision: "ADMIT_TASK_086_TOPOLOGY",
    },
    {
      nodeId: "airport-b",
      mode: "flight",
      decision: "ADMIT_TASK_086_TOPOLOGY",
    },
    {
      nodeId: "surface",
      mode: "fixed_guideway",
      decision: "ADMIT_TASK_086_TOPOLOGY",
    },
  ];
  const edge = (from, to, mode) => ({
    edgeId: from + to,
    fromTransportNodeId: from,
    toTransportNodeId: to,
    mode,
    edgeKind: mode === "flight" ? "service_segment" : "hub_transfer",
    metrics: metricFields({}, new Map()),
  });
  const flight = [
    edge("airport-a", "airport-b", "flight"),
    edge("airport-b", "airport-a", "flight"),
  ];
  const audit = (extra) =>
    auditGraph({
      nodes,
      patterns: [],
      transfers: [],
      edges: [...flight, ...extra],
      inventory: [
        {
          requirementId: "required-airport",
          nodeId: "airport-b",
          kind: "airport",
          tier: "T0",
        },
      ],
      anchorNodeId: "airport-a",
    });
  assert.equal(audit([]).tier.T0.connected, 1);
  assert.equal(audit([]).counts.AIRPORT_SURFACE_GAP, 1);
  assert.equal(
    audit([edge("airport-b", "surface", "transfer")]).counts
      .AIRPORT_SURFACE_GAP,
    1,
  );
  assert.equal(
    audit([
      edge("airport-b", "surface", "transfer"),
      edge("surface", "airport-b", "transfer"),
    ]).counts.AIRPORT_SURFACE_GAP,
    0,
  );
  assert.equal(
    audit([
      edge("airport-b", "surface", "flight"),
      edge("surface", "airport-b", "flight"),
    ]).counts.AIRPORT_SURFACE_GAP,
    1,
  );
});

test("TASK086 terminal identities cannot merge a namesake, another operator or unreviewed requirement", () => {
  const record = {
    stopRecordId: "P36-23_13:kbs288",
    stopName: "バスタ新宿",
    operator: "ジェイアールバス関東（株）",
    latitude: 35.689,
    longitude: 139.701,
  };
  const requirement = {
    requirementId: "review:protected-terminal",
    name: "バスタ新宿",
    tier: "T0",
    kind: "bus_terminal",
  };
  requirement.nodeId = id("node", requirement.requirementId);
  const selector = {
    name: record.stopName,
    operator: record.operator,
    line: "p36-stop:" + record.stopRecordId,
    mode: "highway_bus",
    terminalIdentity: {
      dataset: "P36-23",
      stopRecordId: record.stopRecordId,
      requirementId: requirement.requirementId,
      expectedRequirementName: requirement.name,
      method: "EXACT_P36_OPERATOR_COMPONENT_AND_CURRENT_TERMINAL_ACCESS",
      currentOperatorReview: "Current operator boarding/alighting guide",
      currentPassengerAccessReview:
        "Reviewed station gate and terminal passage",
    },
  };
  const candidate = roadTerminalCandidate(selector, record, requirement, [
    "identity",
    "access",
  ]);
  assert.equal(id("node", candidate.identityAnchor), requirement.nodeId);
  assert.equal(candidate.nodeLevel, "T0");
  for (const changed of [
    { ...selector, operator: "another operator" },
    { ...selector, name: "新宿西口" },
    { ...selector, line: "nearby-stop" },
    { ...selector, mode: "local_bus" },
    {
      ...selector,
      terminalIdentity: {
        ...selector.terminalIdentity,
        stopRecordId: "P36-23_14:kbs288",
      },
    },
    {
      ...selector,
      terminalIdentity: {
        ...selector.terminalIdentity,
        currentOperatorReview: "",
      },
    },
    {
      ...selector,
      terminalIdentity: {
        ...selector.terminalIdentity,
        currentPassengerAccessReview: "",
      },
    },
  ]) {
    assert.throws(
      () =>
        roadTerminalCandidate(changed, record, requirement, [
          "identity",
          "access",
        ]),
      /ROAD_TERMINAL_/,
    );
  }
  assert.throws(
    () =>
      roadTerminalCandidate(
        selector,
        record,
        { ...requirement, name: "新宿駅" },
        ["identity", "access"],
      ),
    /ROAD_TERMINAL_/,
  );
  const sources = new Map([[minimal.sourceId, minimal]]);
  const evidence = new Map([
    [
      "identity",
      {
        sourceId: minimal.sourceId,
        sourceSha256: minimal.contentSha256,
        record,
        recordSha256: hash(record),
        locator: "licensed point reference",
      },
    ],
    [
      "access",
      {
        sourceId: minimal.sourceId,
        sourceSha256: minimal.contentSha256,
        record: { access: true },
        recordSha256: hash({ access: true }),
        locator: "current operator access",
      },
    ],
  ]);
  assert.equal(
    admitNodes([candidate], sources, evidence)[0].decision,
    "ADMIT_TASK_086_TOPOLOGY",
  );
  for (const changed of [
    { latitude: 34 },
    { longitude: 130 },
    { mode: "conventional_rail" },
    { nodeKind: "bus_stop" },
    { operatorRefs: [record.operator, "unreviewed colocated operator"] },
    { lineRefs: ["wrong"] },
  ]) {
    assert.ok(
      admitNodes(
        [{ ...candidate, ...changed }],
        sources,
        evidence,
      )[0].reasons.includes("IDENTITY_SOURCE_BINDING_MISMATCH"),
    );
  }
});

test("TASK086 corroborating evidence must bind an observed hash and usable rights in its own action", () => {
  const fact = {
    factId: "access",
    sourceActionId: "primary",
    corroboratingEvidence: [
      {
        sourceActionId: "secondary",
        url: "https://official.invalid/access",
        observedResponseSha256: hash("reviewed-response"),
      },
    ],
  };
  const action = {
    actionId: "secondary",
    state: "RIGHTS_REVIEWED",
    rightsFindings: [{ rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED" }],
    sourcesChecked: [
      {
        url: fact.corroboratingEvidence[0].url,
        status: 200,
        contentSha256: hash("reviewed-response"),
      },
    ],
  };
  assert.equal(validateCorroboratingEvidence(fact, [action]), true);
  for (const changed of [
    { ...action, state: "PENDING_RESEARCH" },
    { ...action, actionId: "wrong" },
    {
      ...action,
      rightsFindings: [{ rightsClass: "REFERENCE_ONLY_DISCOVERY" }],
    },
    {
      ...action,
      sourcesChecked: [{ ...action.sourcesChecked[0], status: 404 }],
    },
    {
      ...action,
      sourcesChecked: [
        { ...action.sourcesChecked[0], contentSha256: hash("different") },
      ],
    },
  ]) {
    assert.throws(
      () => validateCorroboratingEvidence(fact, [changed]),
      /CORROBORATING_SOURCE_NOT_BOUND/,
    );
  }
});
import { spawnSync } from "node:child_process";

test("TASK086 rail fact boarding restrictions survive resolution and cannot be erased in a resolved record", () => {
  const f = boundOfficialFixture();
  const fact = {
    ...f.evidence.get("fact").record,
    callingRestrictions: [
      { pickupType: "1", dropOffType: "0" },
      { pickupType: "0", dropOffType: "1" },
    ],
  };
  f.put("fact", fact);
  f.pattern.callingNodes = f.pattern.callingNodes.map((c, i) => ({
    ...c,
    ...fact.callingRestrictions[i],
  }));
  f.put("resolved", {
    ...f.evidence.get("resolved").record,
    callingNodes: f.pattern.callingNodes,
  });
  const [edge] = generatePattern(
    f.pattern,
    f.nodes,
    f.sources,
    f.evidence,
    "2026-10-01",
  );
  assert.equal(edge.boardAllowed, false);
  assert.equal(edge.alightAllowed, false);
  f.pattern.callingNodes[0].pickupType = "0";
  f.put("resolved", {
    ...f.evidence.get("resolved").record,
    callingNodes: f.pattern.callingNodes,
  });
  assert.throws(
    () =>
      generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01"),
    /OFFICIAL_PATTERN_SOURCE_BINDING/,
  );
  fact.callingRestrictions[0].pickupType = "2";
  f.put("fact", fact);
  assert.throws(
    () =>
      generatePattern(f.pattern, f.nodes, f.sources, f.evidence, "2026-10-01"),
    /INVALID_FACT_BOARDING_RESTRICTIONS/,
  );
});

test("TASK086 licensed rail GTFS rejects stale feed, inactive calendar, changed identity and changed endpoint scope", () => {
  const code = `
import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('rail','tools/transport/task-086-extract-rail-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
p=Path('data/transport/network');raw=(p/'sources/raw/toei-train-20261001.zip').read_bytes();req=json.loads((p/'research/toei-train-selection.json').read_text(encoding='utf8'))
f=m.extract(raw,req)['facts'];assert len(f)==4 and len(f[2]['callingStations'])==39 and f[2]['callingStations'].count('都庁前')==2
assert f[0]['callingRestrictions'][-1]['pickupType']=='1'
for edit,error in [(lambda r:r.update(serviceDate='20281001'),'FEED_NOT_CURRENT'),(lambda r:r.update(serviceDate='20261004'),'TRIP_NOT_ACTIVE'),(lambda r:r['trips'][0].update(direction='1'),'TRIP_IDENTITY_MISMATCH'),(lambda r:r['trips'][0].update(reviewedEndpointsAndCount=['目黒','西高島平',26]),'REVIEW_SCOPE_CHANGED'),(lambda r:r.update(archiveSha256='0'*64),'ARCHIVE_HASH_MISMATCH')]:
 r=json.loads(json.dumps(req));edit(r)
 try:m.extract(raw,r)
 except ValueError as e:assert error in str(e),(error,str(e))
 else:raise AssertionError(error)
`;
  const run = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-X", "utf8", "-c", code],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, run.stderr || run.stdout);
});

test("TASK086 dated operator mergers preserve exact archival identity and reject unsupported crosswalks", () => {
  const merger = {
    transitionId: "reviewed-merger",
    fromOperator: "旧鉄道",
    fromLine: "旧線",
    toOperator: "新鉄道",
    toLine: "新線",
    effectiveDate: "2025-04-01",
    method: "OFFICIAL_MERGER_SAME_PHYSICAL_STATIONS",
    evidence: {
      sourceActionId: "merger",
      url: "https://operator.invalid/merger",
      observedResponseSha256: hash("merger"),
    },
  };
  const selector = {
    name: "松戸",
    operator: "新鉄道",
    line: "新線",
    mode: "private_rail",
    operatorTransitionReview: {
      transitionId: merger.transitionId,
      stationCode: "003138",
    },
  };
  const fact = {
    callingComponents: [selector],
    operatorTransitions: [merger],
    corroboratingEvidence: [merger.evidence],
  };
  const raw = {
    stationName: "松戸",
    stationCode: "003138",
    operator: "旧鉄道",
    line: "旧線",
    latitude: 35.784,
    longitude: 139.901,
  };
  const sources = new Map([[minimal.sourceId, minimal]]);
  const put = (record) => ({
    sourceId: minimal.sourceId,
    sourceSha256: minimal.contentSha256,
    record,
    recordSha256: hash(record),
    locator: "independent reviewed record",
  });
  const evidence = new Map([
    ["raw", put(raw)],
    ["fact", put(fact)],
  ]);
  const node = {
    identityAnchor: "review:unchanged-requirement",
    canonicalNameJa: "松戸",
    nodeKind: "private_rail_station",
    mode: "private_rail",
    operatorRefs: ["新鉄道"],
    lineRefs: ["新線"],
    latitude: raw.latitude,
    longitude: raw.longitude,
    identityRecord: raw,
    origin: "TASK_086_INDEPENDENT_S12_AND_OFFICIAL_SERVICE",
    evidenceRefs: ["raw", "fact"],
    hubSemantics: "PHYSICAL_OPERATOR_COMPONENT_NO_IMPLICIT_TRANSFER",
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(raw),
    },
    identityTransition: reviewedRailTransition(
      selector,
      fact,
      minimal.observedAt,
    ),
  };
  const admitted = admitNodes([node], sources, evidence)[0];
  assert.equal(admitted.decision, "ADMIT_TASK_086_TOPOLOGY");
  assert.equal(admitted.nodeId, id("node", node.identityAnchor));
  assert.equal(admitted.identityRecord.operator, "旧鉄道");
  assert.deepEqual(admitted.operatorRefs, ["新鉄道"]);
  for (const changed of [
    { ...node, identityTransition: undefined },
    {
      ...node,
      identityTransition: { ...node.identityTransition, stationCode: "003139" },
    },
    { ...node, operatorRefs: ["another operator"] },
    { ...node, lineRefs: ["旧線"] },
    { ...node, canonicalNameJa: "同名別駅" },
    { ...node, evidenceRefs: ["raw"] },
  ])
    assert.ok(
      admitNodes([changed], sources, evidence)[0].reasons.includes(
        "IDENTITY_SOURCE_BINDING_MISMATCH",
      ),
    );
  for (const changed of [
    { ...fact, corroboratingEvidence: [] },
    {
      ...fact,
      operatorTransitions: [{ ...merger, effectiveDate: "2028-01-01" }],
    },
    {
      ...fact,
      operatorTransitions: [{ ...merger, toOperator: "another operator" }],
    },
    {
      ...fact,
      operatorTransitions: [{ ...merger, method: "SAME_NAME_GUESS" }],
    },
    { ...fact, operatorTransitions: [] },
  ])
    assert.throws(
      () => reviewedRailTransition(selector, changed, minimal.observedAt),
      /RAIL_TRANSITION_/,
    );
  const corrupted = new Map(evidence);
  corrupted.set("fact", { ...put(fact), recordSha256: hash("unrelated") });
  assert.ok(
    admitNodes([node], sources, corrupted)[0].reasons.includes(
      "IDENTITY_SOURCE_BINDING_MISMATCH",
    ),
  );
  assert.throws(
    () =>
      validateCorroboratingEvidence({ ...fact, sourceActionId: "merger" }, []),
    /CORROBORATING_SOURCE_NOT_BOUND/,
  );
});

test("TASK086 existing GTFS interchange keeps exact stop identity and rejects same-name platform rebinding", () => {
  const source = {
    ...minimal,
    sourceId: "gtfs:fixture",
    rightsClass: "RAW_PERSISTENCE_ALLOWED",
    persistenceAllowed: true,
    retainedArchive: "fixture.zip",
    agencies: [{ agency_name: "Bus operator" }],
  };
  const sources = new Map([
    [source.sourceId, source],
    [minimal.sourceId, minimal],
  ]);
  const raw = {
    stop_id: "airport_out",
    stop_name: "空港",
    stop_lat: "33",
    stop_lon: "130",
    platform_code: "5",
  };
  const row = {
    sourceId: source.sourceId,
    sourceSha256: source.contentSha256,
    locator: "stops.txt:airport_out",
    record: raw,
    recordSha256: hash(raw),
  };
  const evidence = new Map([["raw", row]]);
  const candidate = {
    identityAnchor: "gtfs:fixture:stop:airport_out",
    canonicalNameJa: "空港",
    nodeKind: "bus_stop",
    operatorRefs: ["Bus operator"],
    lineRefs: ["gtfs:fixture:route:airport"],
    latitude: 33,
    longitude: 130,
    identityRecord: raw,
    origin: "TASK_086_INDEPENDENT_GTFS",
    evidenceRefs: ["raw"],
    hubSemantics: "GTFS_STOP_POINT_NO_SAME_NAME_COLLAPSE",
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(raw),
    },
  };
  const node = admitNodes([candidate], sources, evidence)[0];
  const nodes = new Map([[node.nodeId, node]]);
  const selector = {
    name: "空港",
    operator: "Bus operator",
    line: "gtfs:fixture:route:airport",
    nodeKind: "bus_stop",
    gtfsIdentity: {
      sourceId: source.sourceId,
      stopId: raw.stop_id,
      sourceArchiveSha256: source.contentSha256,
      recordSha256: hash(raw),
      expectedPlatformCode: "5",
      method: "EXACT_LICENSED_GTFS_STOP_AND_CURRENT_INTERCHANGE",
      currentPassengerAccessReview:
        "Current airport diagram explicitly connects this boarding point to the terminal.",
    },
  };
  assert.equal(
    reviewedGtfsComponent(selector, nodes, sources, evidence).nodeId,
    node.nodeId,
  );
  for (const patch of [
    { stopId: "airport_in" },
    { expectedPlatformCode: "6" },
    { sourceArchiveSha256: hash("changed") },
    { recordSha256: hash("changed") },
    { sourceId: "gtfs:other" },
    { currentPassengerAccessReview: "" },
    { method: "PARENT_STATION_GUESS" },
  ]) {
    assert.throws(
      () =>
        reviewedGtfsComponent(
          { ...selector, gtfsIdentity: { ...selector.gtfsIdentity, ...patch } },
          nodes,
          sources,
          evidence,
        ),
      /GTFS_COMPONENT_/,
    );
  }
  for (const patch of [
    { name: "同名別駅" },
    { operator: "Other operator" },
    { line: "gtfs:fixture:route:other" },
    { nodeKind: "rail_station" },
    { mode: "airport_bus" },
  ]) {
    assert.throws(
      () =>
        reviewedGtfsComponent(
          { ...selector, ...patch },
          nodes,
          sources,
          evidence,
        ),
      /GTFS_COMPONENT_/,
    );
  }
  const wrong = new Map(evidence);
  wrong.set("raw", { ...row, recordSha256: hash("changed") });
  assert.throws(
    () => reviewedGtfsComponent(selector, nodes, sources, wrong),
    /GTFS_COMPONENT_/,
  );
  const rawTwin = { ...raw, stop_id: "airport_in", platform_code: "" };
  const twinRow = {
    ...row,
    locator: "stops.txt:airport_in",
    record: rawTwin,
    recordSha256: hash(rawTwin),
  };
  evidence.set("twin", twinRow);
  const twin = admitNodes(
    [
      {
        ...candidate,
        identityAnchor: "gtfs:fixture:stop:airport_in",
        identityRecord: rawTwin,
        evidenceRefs: ["twin"],
        independentReview: {
          decision: "ADMIT_TASK_086_TOPOLOGY",
          recordSha256: hash(rawTwin),
        },
      },
    ],
    sources,
    evidence,
  )[0];
  nodes.set(twin.nodeId, twin);
  const put = (key, record) =>
    evidence.set(key, {
      sourceId: minimal.sourceId,
      sourceSha256: minimal.contentSha256,
      record,
      recordSha256: hash(record),
      locator: key,
    });
  const twinSelector = {
    ...selector,
    gtfsIdentity: {
      ...selector.gtfsIdentity,
      stopId: rawTwin.stop_id,
      recordSha256: hash(rawTwin),
      expectedPlatformCode: "",
    },
  };
  put("fact", {
    kind: "transfer",
    components: [selector, twinSelector],
    directions: [[0, 1]],
  });
  const resolved = {
    from: node.nodeId,
    to: twin.nodeId,
    hubRef: "reviewed",
    sourceFactRef: "fact",
  };
  put("resolved", resolved);
  const transfer = {
    ...resolved,
    evidenceKind: "OFFICIAL_INTERCHANGE",
    directed: true,
    strictFactBinding: true,
    evidenceRefs: ["resolved"],
    sourceRefs: [minimal.url],
  };
  assert.equal(
    generateTransfer(transfer, nodes, sources, evidence, "2026-10-01")
      .toTransportNodeId,
    twin.nodeId,
  );
  const swapped = { ...resolved, from: twin.nodeId, to: node.nodeId };
  put("resolved", swapped);
  assert.throws(
    () =>
      generateTransfer(
        { ...transfer, ...swapped },
        nodes,
        sources,
        evidence,
        "2026-10-01",
      ),
    /OFFICIAL_TRANSFER_SOURCE_BINDING_MISMATCH/,
  );
});

test("TASK086 airfield suffix requires explicit official name correspondence bound to observed evidence", () => {
  const record = {
    airportName: "徳島飛行場",
    referencePointId: "cf03_00055",
    latitude: 34.132778,
    longitude: 134.605833,
  };
  const requirement = {
    requirementId: "review:official-airport:徳島",
    name: "徳島",
    tier: "T1",
    kind: "airport",
  };
  requirement.nodeId = id("node", requirement.requirementId);
  const nameEvidence = {
    officialName: "徳島飛行場",
    publicName: "徳島阿波おどり空港",
    requirementName: "徳島",
    url: "https://example.test/official-airport-overview",
    observedResponseSha256: "a".repeat(64),
  };
  const selector = {
    name: record.airportName,
    operator: "airport-facility:cf03_00055",
    line: "airport:cf03_00055",
    mode: "flight",
    airportIdentity: {
      dataset: "C28-21",
      referencePointId: record.referencePointId,
      requirementId: requirement.requirementId,
      expectedRequirementName: requirement.name,
      method: "REVIEWED_EXACT_OFFICIAL_NAME_WITH_AIRFIELD_SUFFIX",
      currentPassengerAccessReview: "Reviewed terminal public frontage",
      officialNameEvidence: nameEvidence,
    },
  };
  const fact = {
    corroboratingEvidence: [
      {
        url: nameEvidence.url,
        observedResponseSha256: nameEvidence.observedResponseSha256,
      },
    ],
  };
  const build = (s = selector, f = fact) =>
    airportCandidate(s, record, requirement, ["identity", "access"], f);
  assert.equal(id("node", build().identityAnchor), requirement.nodeId);
  assert.deepEqual(
    build().independentReview.officialNameEvidence,
    nameEvidence,
  );
  for (const change of [
    { officialName: "小松飛行場" },
    { requirementName: "小松" },
    { publicName: "小松空港" },
    { observedResponseSha256: "b".repeat(64) },
    { url: "https://example.test/unreviewed" },
  ]) {
    const s = structuredClone(selector);
    Object.assign(s.airportIdentity.officialNameEvidence, change);
    assert.throws(() => build(s), /AIRPORT_OFFICIAL_NAME_EVIDENCE_MISMATCH/);
  }
  assert.throws(
    () => build(selector, {}),
    /AIRPORT_OFFICIAL_NAME_EVIDENCE_MISMATCH/,
  );
  const unreviewed = structuredClone(selector);
  unreviewed.airportIdentity.method =
    "REVIEWED_EXACT_OFFICIAL_NAME_WITH_AIRPORT_SUFFIX";
  assert.throws(() => build(unreviewed), /AIRPORT_REQUIREMENT_REVIEW_MISMATCH/);
});
