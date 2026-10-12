import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { fixture } from "./helpers/task-086-service-access-fixture.mjs";
import {
  hash,
  canonical,
  queryGraph,
  generatePattern,
  generateTransfer,
  admitNodes,
  validateEdges,
  auditGraph,
  surfaceServiceRoundTrip,
} from "../tools/transport/task-086-model.mjs";
import {
  bindReviewedConditionEvidence,
  conditionEvidenceId,
  resolvedAccessFields,
} from "../tools/transport/task-086-condition-evidence.mjs";
import { executeBatches } from "../tools/transport/task-086-batches.mjs";
import {
  validPath,
  passengerComponents,
  passengerViewReports,
} from "../tools/transport/task-086-stage.mjs";
const dir = path.dirname(fileURLToPath(import.meta.url)),
  real = JSON.parse(
    fs.readFileSync(
      path.join(
        dir,
        "fixtures/task-086-service-access/reviewed-municipal-conditions.json",
      ),
      "utf8",
    ),
  );
function reviewed() {
  const f = fixture(),
    pdf = real.sourceObservations["city-current-taxi"],
    page = real.sourceObservations["city-current-access"],
    terms = real.rightsReview;
  assert.equal(
    pdf.contentSha256,
    "333b163d65c6d247f20578a8f286220f844ada37991a305317e026c086b19141",
  );
  assert.equal(real.reservation.deadlineLocalTime, "17:00");
  assert.equal(real.outbound.parent.length, 3);
  assert.equal(real.inbound.parent.length, 3);
  const action = {
    actionId: "private-reviewed-tanegashima-condition-only",
    state: "RIGHTS_REVIEWED",
    sourcesChecked: [
      pdf,
      { ...page, rawPayloadRetained: false, privateCacheOnly: true },
    ],
    rightsFindings: [
      {
        rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
        termsUrl: terms.termsUrl,
        observedAt: pdf.observedAt,
        rawReuseClaimed: false,
        reason:
          terms.finding +
          " Private contract integration test only; no real-node admission or canonical approval implied.",
      },
    ],
  };
  const { sourceEvidenceRefs, ...accessTerms } = f.contract;
  const observation = {
    conditionId: "tanegashima-public-prior-day17-phone-20260901-20261020",
    sourceActionId: action.actionId,
    sourceUrl: pdf.url,
    observedResponseSha256: pdf.contentSha256,
    locator:
      "Current independently reviewed municipal airport taxi PDF: public eligibility, prior-day17 PHONE deadline, no-booking-no-dispatch, effective date and directional prohibitions; city current access page corroborates.",
    accessTerms,
    corroboratingEvidence: [
      {
        sourceActionId: action.actionId,
        url: page.url,
        observedResponseSha256: page.contentSha256,
      },
    ],
  };
  const contract = {
    ...accessTerms,
    sourceEvidenceRefs: [conditionEvidenceId(observation)],
  };
  const fact = {
    kind: "service",
    factId: "private-synthetic-identities-real-condition-proof",
    sourceActionId: action.actionId,
    sourceUrl: pdf.url,
    observedResponseSha256: pdf.contentSha256,
    accessContract: contract,
    conditionEvidence: [observation],
    corroboratingConditionEvidenceRefs: contract.sourceEvidenceRefs,
  };
  return { ...f, actions: [action], observation, contract, fact };
}
const context = (f) => ({
  sources: f.sources,
  evidence: f.evidence,
  patternById: f.patternById,
});
function batchGroups(f) {
  return [f.outbound, f.inbound].map((p) => ({
    groupId: p.servicePatternId,
    pattern: p,
    edges: f.edges.filter((e) => e.servicePatternRef === p.servicePatternId),
    sources: [...f.sources.values()],
    nodes: [...f.nodes.values()],
    generatorSha256: hash("private actual integration"),
    nextActionDeficitSummary: {},
  }));
}
function temp() {
  const root = path.join(os.tmpdir(), "task-086-service-access-tests");
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, "batch-"));
}
test("reviewed actual cached municipal conditions create deterministic independent evidence with exact original hashes", () => {
  const f = reviewed();
  const refs = bindReviewedConditionEvidence(
    f.fact,
    f.actions,
    f.sources,
    f.evidence,
  );
  const once = canonical([...f.evidence]);
  assert.deepEqual(refs, f.contract.sourceEvidenceRefs);
  assert.deepEqual(
    bindReviewedConditionEvidence(
      structuredClone(f.fact),
      f.actions,
      f.sources,
      f.evidence,
    ),
    refs,
  );
  assert.equal(canonical([...f.evidence]), once);
  const e = f.evidence.get(refs[0]);
  assert.equal(
    f.sources.get(e.sourceId).evidenceContentSha256,
    real.sourceObservations["city-current-taxi"].contentSha256,
  );
  assert.deepEqual(e.record.accessTerms, f.observation.accessTerms);
});
for (const [name, change, expected] of [
  [
    "unreviewed action",
    (f) => (f.actions[0].state = "SOURCE_FOUND"),
    /FACT_RIGHTS_REVIEW_REQUIRED/,
  ],
  [
    "condition source raw hash changed",
    (f) => {
      f.observation.observedResponseSha256 = "f".repeat(64);
      f.fact.accessContract.sourceEvidenceRefs = [
        conditionEvidenceId(f.observation),
      ];
      f.fact.corroboratingConditionEvidenceRefs =
        f.fact.accessContract.sourceEvidenceRefs;
    },
    /FACT_SOURCE_NOT_OBSERVED/,
  ],
  [
    "corroborating city response changed",
    (f) =>
      (f.observation.corroboratingEvidence[0].observedResponseSha256 =
        "f".repeat(64)),
    /CORROBORATING_SOURCE_NOT_BOUND/,
  ],
  [
    "condition terms changed",
    (f) =>
      (f.observation.accessTerms = {
        ...f.observation.accessTerms,
        validTo: "2026-10-21",
      }),
    /CONDITION_TERMS_NOT_EXACT/,
  ],
  [
    "condition refs stripped",
    (f) => (f.fact.corroboratingConditionEvidenceRefs = []),
    /CONDITION_REFERENCE_SET_MISMATCH/,
  ],
  [
    "condition observation omitted",
    (f) => (f.fact.conditionEvidence = []),
    /REVIEWED_CONDITION_OBSERVATIONS_REQUIRED/,
  ],
  [
    "unknown source action",
    (f) => (f.fact.sourceActionId = "absent"),
    /FACT_RIGHTS_REVIEW_REQUIRED/,
  ],
])
  test("actual source-action contract rejects " + name, () => {
    const f = reviewed();
    change(f);
    assert.throws(
      () =>
        bindReviewedConditionEvidence(f.fact, f.actions, f.sources, f.evidence),
      expected,
    );
  });
test("retained raw condition source requires actual immutable bytes instead of trusting a hash claim", () => {
  const f = reviewed();
  f.actions[0].sourcesChecked[0] = {
    ...f.actions[0].sourcesChecked[0],
    rawPayloadRetained: true,
    retainedPath: "fixture.zip",
  };
  f.actions[0].rightsFindings[0].rightsClass = "RAW_PERSISTENCE_ALLOWED";
  assert.throws(
    () =>
      bindReviewedConditionEvidence(
        f.fact,
        f.actions,
        f.sources,
        f.evidence,
        () => Buffer.from("wrong"),
      ),
    /CONDITION_RETAINED_SOURCE_HASH_MISMATCH/,
  );
});
test("raw-to-resolved access field is an exact independent clone, never rewritten to ordinary access", () => {
  const f = reviewed(),
    r = resolvedAccessFields(f.fact);
  assert.deepEqual(r.accessContract, f.fact.accessContract);
  assert.notEqual(r.accessContract, f.fact.accessContract);
  delete r.accessContract.validTo;
  assert.ok(f.fact.accessContract.validTo);
  assert.deepEqual(resolvedAccessFields({}), {});
});
test("resealed condition evidence with wrong actual terms is rejected by direct generator", () => {
  const f = fixture();
  const r = structuredClone(f.evidence.get("condition-proof").record);
  r.accessTerms.validTo = "2026-10-21";
  f.seal("condition-proof", r);
  assert.throws(() => f.generate(f.outbound), /ACCESS_CONDITION_TERMS_BINDING/);
});
test("actual batch runner requires complete independent context and rejects all-marker stripping", () => {
  const f = fixture();
  assert.throws(
    () => executeBatches(temp(), batchGroups(f)),
    /BATCH_VALIDATION_CONTEXT_REQUIRED/,
  );
  const groups = batchGroups(f);
  for (const g of groups)
    for (const e of g.edges) {
      delete e.accessContract;
      delete e.accessContractSha256;
      delete e.conditionalTopology;
      e.topologyEvidenceRefs = ["condition-proof"];
    }
  assert.throws(
    () => executeBatches(temp(), groups, { validationContext: context(f) }),
    /EDGE_ACCESS_CONTRACT_STRIPPED_OR_CHANGED/,
  );
});
test("actual batch context persists deterministic fingerprint and invalidates on independently changed registry", () => {
  const f = fixture(),
    output = temp(),
    groups = batchGroups(f),
    opts = { validationContext: context(f), chunkSize: 1 };
  const a = executeBatches(output, groups, opts),
    b = executeBatches(output, groups, opts);
  assert.equal(a.receipts.length, 4);
  assert.ok(b.results.every((x) => x.disposition === "CHECKSUM_SKIP"));
  f.evidence.set("new-independent-record", {
    recordSha256: hash("additional"),
  });
  const c = executeBatches(output, groups, opts);
  assert.ok(
    c.results.every((x) => x.disposition === "SOURCE_OR_GENERATOR_INVALIDATED"),
  );
});
test("registry must include every published service pattern, even when all edge markers have been stripped", () => {
  const f = fixture();
  assert.throws(
    () => validateEdges(f.edges, { ...context(f), patternById: new Map() }),
    /EDGE_PATTERN_REGISTRY_INCOMPLETE/,
  );
});
test("actual stage SCC and path implementations separate default and explicit public conditional views", () => {
  const f = fixture(),
    nodes = [...f.nodes.values()],
    plain = passengerComponents(nodes, f.edges),
    conditional = passengerComponents(nodes, f.edges, f.context);
  assert.notEqual(plain.get(f.ids.bank), plain.get(f.ids.airport));
  assert.equal(conditional.get(f.ids.bank), conditional.get(f.ids.airport));
  const pathIds = queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context),
    by = new Map(f.edges.map((e) => [e.edgeId, e]));
  assert.equal(validPath(pathIds, f.ids.bank, f.ids.airport, by), false);
  assert.equal(
    validPath(pathIds, f.ids.bank, f.ids.airport, by, f.context),
    true,
  );
  const views = passengerViewReports(nodes, f.edges, f.ids.airport, [
    f.context,
  ]);
  assert.equal(
    views.defaultUnconditional.nodes.find((x) => x.nodeId === f.ids.bank).valid,
    false,
  );
  assert.equal(
    views.evidencedPublicConditionalStructure[0].nodes.find(
      (x) => x.nodeId === f.ids.bank,
    ).valid,
    true,
  );
});
test("actual airport audit retains default diagnostic while source-bound PUBLIC rides satisfy the structural check", () => {
  const f = fixture();
  const audit = auditGraph({
    nodes: [...f.nodes.values()],
    patterns: [f.outbound, f.inbound],
    transfers: [],
    edges: f.edges,
    inventory: [
      {
        requirementId: "original-airport",
        kind: "airport",
        nodeId: f.ids.airport,
        tier: "T1",
      },
    ],
    anchorNodeId: f.ids.airport,
    validationContext: { ...context(f), nodes: f.nodes },
    conditionalAccessContexts: [f.context],
  });
  assert.ok(
    audit.defaultDiagnostics.deficits.some(
      (x) => x.deficitId === "mode:original-airport",
    ),
  );
  assert.equal(
    audit.deficits.some((x) => x.deficitId === "mode:original-airport"),
    false,
  );
  assert.equal(
    audit.structuralChecks.find((x) => x.checkId === "mode:original-airport")
      .status,
    "PASS_WITH_PUBLIC_RESERVATION_CONDITIONS",
  );
  assert.equal(
    audit.structuralChecks.find((x) => x.checkId === "mode:original-airport")
      .defaultDiagnostic,
    "FAIL",
  );
  assert.equal(audit.airportSurfaceViews[0].defaultUnconditional, null);
  assert.equal(
    audit.airportSurfaceViews[0].evidencedPublicConditionalStructure.length,
    1,
  );
  assert.equal(
    audit.airportSurfaceViews[0].evidencedPublicConditionalStructure[0]
      .bookingConfirmed,
    false,
  );
});
test("actual airport witness rejects walking only, one-way service, and hotel-only eligibility", () => {
  const f = fixture(),
    nodes = [...f.nodes.values()];
  const walks = [
    {
      fromTransportNodeId: f.ids.airport,
      toTransportNodeId: f.ids.bank,
      edgeKind: "hub_transfer",
      mode: "walk",
      edgeId: "walk1",
    },
    {
      fromTransportNodeId: f.ids.bank,
      toTransportNodeId: f.ids.airport,
      edgeKind: "hub_transfer",
      mode: "walk",
      edgeId: "walk2",
    },
  ];
  assert.equal(surfaceServiceRoundTrip(nodes, walks, f.ids.airport), null);
  assert.equal(
    surfaceServiceRoundTrip(
      nodes,
      f.edges.filter(
        (e) => e.servicePatternRef === f.outbound.servicePatternId,
      ),
      f.ids.airport,
      f.context,
      context(f),
    ),
    null,
  );
  const h = fixture("ELIGIBILITY_RESTRICTED");
  h.context.eligibilityKeys = h.contract.eligibilityKeys;
  assert.equal(
    surfaceServiceRoundTrip(
      [...h.nodes.values()],
      h.edges,
      h.ids.airport,
      h.context,
      context(h),
    ),
    null,
  );
});

test("reviewed source action through raw/resolved pattern, batch, stage and audit executes as one private pipeline", () => {
  const f = reviewed();
  for (const [direction, p] of [
    ["outbound", f.outbound],
    ["inbound", f.inbound],
  ]) {
    const original = f.evidence.get("fact:" + direction).record;
    const fact = {
      ...structuredClone(original),
      ...structuredClone(f.fact),
      factId: "private-" + direction,
    };
    bindReviewedConditionEvidence(fact, f.actions, f.sources, f.evidence);
    f.seal("fact:" + direction, fact);
    const resolved = {
      ...structuredClone(f.evidence.get("pattern:" + direction).record),
      ...resolvedAccessFields(fact),
    };
    f.seal("pattern:" + direction, resolved);
    p.accessContract = structuredClone(fact.accessContract);
  }
  f.edges = [...f.generate(f.outbound), ...f.generate(f.inbound)];
  f.context.acceptedContracts = [hash(f.contract)];
  f.context.reservationIntents[0].contractSha256 = hash(f.contract);
  validateEdges(f.edges, context(f));
  const batched = executeBatches(temp(), batchGroups(f), {
    validationContext: context(f),
    chunkSize: 2,
  });
  assert.equal(
    batched.receipts.reduce((n, r) => n + r.edgeCount, 0),
    4,
  );
  const views = passengerViewReports(
    [...f.nodes.values()],
    f.edges,
    f.ids.airport,
    [f.context],
  );
  assert.ok(
    views.evidencedPublicConditionalStructure[0].nodes.every((n) => n.valid),
  );
  assert.equal(
    views.defaultUnconditional.nodes.find((n) => n.nodeId === f.ids.bank).valid,
    false,
  );
  const witness = surfaceServiceRoundTrip(
    [...f.nodes.values()],
    f.edges,
    f.ids.airport,
    f.context,
    context(f),
  );
  assert.ok(witness);
  assert.equal(witness.bookingConfirmed, false);
  assert.equal(
    witness.conditions[0].sourceEvidenceRefs[0],
    conditionEvidenceId(f.observation),
  );
  assert.equal(witness.globalGateClosed, false);
});

test("independent raw/resolved registry rejects stripping both pattern and edge conditional fields", () => {
  const f = fixture();
  delete f.outbound.accessContract;
  for (const e of f.edges) {
    if (e.servicePatternRef !== f.outbound.servicePatternId) continue;
    delete e.accessContract;
    delete e.accessContractSha256;
    delete e.conditionalTopology;
    e.topologyEvidenceRefs = ["condition-proof"];
  }
  assert.throws(
    () => validateEdges(f.edges, context(f)),
    /ACCESS_CONTRACT_KIND/,
  );
});

test("condition observation failure is atomic across independent source/evidence registries", () => {
  const f = reviewed(),
    before = canonical([[...f.sources], [...f.evidence]]);
  const bad = {
    ...structuredClone(f.observation),
    conditionId: "second",
    observedResponseSha256: "f".repeat(64),
  };
  f.fact.conditionEvidence.push(bad);
  f.fact.accessContract.sourceEvidenceRefs.push(conditionEvidenceId(bad));
  f.fact.corroboratingConditionEvidenceRefs = [
    ...f.fact.accessContract.sourceEvidenceRefs,
  ];
  assert.throws(
    () =>
      bindReviewedConditionEvidence(f.fact, f.actions, f.sources, f.evidence),
    /FACT_SOURCE_NOT_OBSERVED/,
  );
  assert.equal(canonical([[...f.sources], [...f.evidence]]), before);
});

function differentDirectionOperators() {
  const f = fixture("PUBLIC", {
    outbound: "outbound-carrier",
    inbound: "inbound-carrier",
  });
  const contract = {
    ...structuredClone(f.contract),
    sourceEvidenceRefs: ["inbound-condition-proof"],
  };
  const { sourceEvidenceRefs, ...accessTerms } = contract;
  f.seal("inbound-condition-proof", {
    kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
    accessTerms,
  });
  const fact = structuredClone(f.evidence.get("fact:inbound").record);
  fact.accessContract = contract;
  fact.corroboratingConditionEvidenceRefs = contract.sourceEvidenceRefs;
  f.seal("fact:inbound", fact);
  const resolved = structuredClone(f.evidence.get("pattern:inbound").record);
  resolved.accessContract = contract;
  f.seal("pattern:inbound", resolved);
  f.inbound.accessContract = structuredClone(contract);
  f.edges = [...f.generate(f.outbound), ...f.generate(f.inbound)];
  validateEdges(f.edges, context(f));
  return { ...f, inboundContract: contract };
}
function acceptBoth(f) {
  f.context.acceptedContracts.push(hash(f.inboundContract));
  f.context.reservationIntents.push({
    ...f.context.reservationIntents[0],
    contractSha256: hash(f.inboundContract),
  });
}
test("opposite operators do not inherit contract acceptance from the other direction", () => {
  const f = differentDirectionOperators();
  assert.ok(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context));
  assert.equal(queryGraph(f.edges, f.ids.airport, f.ids.bank, f.context), null);
  assert.equal(
    surfaceServiceRoundTrip(
      [...f.nodes.values()],
      f.edges,
      f.ids.airport,
      f.context,
      context(f),
    ),
    null,
  );
});
test("opposite operators need independent booking intent even with both hashes acknowledged", () => {
  const f = differentDirectionOperators();
  f.context.acceptedContracts.push(hash(f.inboundContract));
  assert.equal(queryGraph(f.edges, f.ids.airport, f.ids.bank, f.context), null);
});
test("two public operators with separately acknowledged contracts expose both directional conditions", () => {
  const f = differentDirectionOperators();
  acceptBoth(f);
  const w = surfaceServiceRoundTrip(
    [...f.nodes.values()],
    f.edges,
    f.ids.airport,
    f.context,
    context(f),
  );
  assert.ok(w);
  assert.equal(w.conditions.length, 2);
  assert.deepEqual(
    new Set(f.edges.map((e) => e.operatorRef)),
    new Set(["outbound-carrier", "inbound-carrier"]),
  );
  assert.equal(queryGraph(f.edges, f.ids.airport, f.ids.bank), null);
  assert.equal(w.bookingConfirmed, false);
});
test("one operator's late booking intent cannot be satisfied by the opposite operator's timely intent", () => {
  const f = differentDirectionOperators();
  acceptBoth(f);
  f.context.reservationIntents[1].planningAt = "2026-10-02T17:00:01+09:00";
  assert.equal(queryGraph(f.edges, f.ids.airport, f.ids.bank, f.context), null);
  assert.ok(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context));
});
test("inbound operator qualifier changed only on pattern fails the independent directional source binding", () => {
  const f = differentDirectionOperators();
  f.inbound.accessContract = {
    ...f.inbound.accessContract,
    audience: "ELIGIBILITY_RESTRICTED",
    eligibilityKeys: ["hotel:inbound-property:guest"],
  };
  assert.throws(() => f.generate(f.inbound), /ACCESS_CONDITION_TERMS_BINDING/);
});

// Independent ordinary-bus fixture: arrival and departure are distinct native
// components. The only airport interfaces are two separately evidenced walks.
function distinctAirportGateways({ badBoarding = false } = {}) {
  const f = fixture(),
    source = [...f.sources.values()][0],
    operator = "airport-bus-fixture",
    line = "ordinary-airport-line";
  const nodes = new Map(
    admitNodes(
      ["terminal", "departure", "arrival", "city"].map((name) => {
        const record = { name, nativeId: "distinct:" + name, operator };
        const ref = f.seal("gate-identity:" + name, record);
        return {
          identityAnchor: record.nativeId,
          canonicalNameJa: name,
          nodeKind: name === "terminal" ? "airport" : "bus_stop",
          mode: name === "terminal" ? "flight" : "airport_bus",
          latitude: 35,
          longitude: 135,
          operatorRefs: [operator],
          lineRefs: [line],
          sourceRefs: [source.url],
          evidenceRefs: [ref],
          identityRecord: record,
          independentReview: {
            decision: "ADMIT_TASK_086_TOPOLOGY",
            recordSha256: hash(record),
          },
          hubSemantics: "EXPLICIT_COMPONENT",
        };
      }),
      f.sources,
      f.evidence,
    ).map((n) => [n.nodeId, n]),
  );
  assert.ok(
    [...nodes.values()].every((n) => n.decision === "ADMIT_TASK_086_TOPOLOGY"),
  );
  const ids = Object.fromEntries(
    [...nodes.values()].map((n) => [n.canonicalNameJa, n.nodeId]),
  );
  const selector = (name) => ({
    name,
    operator,
    line,
    mode: nodes.get(ids[name]).mode,
  });
  function service(direction, names) {
    const restrictions = [
      {
        pickupType: badBoarding && direction === "outbound" ? "1" : "0",
        dropOffType: "1",
      },
      { pickupType: "1", dropOffType: "0" },
    ];
    const fact = {
      kind: "service",
      operator,
      line,
      mode: "airport_bus",
      purpose: "airport",
      callingStations: names,
      callingComponents: names.map(selector),
      callingRestrictions: restrictions,
    };
    const factRef = f.seal("gate-fact:" + direction, fact);
    const resolved = {
      sourceFactRef: factRef,
      callingNodes: names.map((name, i) => ({
        nodeId: ids[name],
        sequence: i + 1,
        ...restrictions[i],
      })),
      lineRef: line,
      operatorRef: operator,
      mode: "airport_bus",
      purpose: "airport",
      serviceClass: "ordinary airport bus",
      direction,
    };
    const ref = f.seal("gate-resolved:" + direction, resolved);
    return {
      ...resolved,
      servicePatternId: "gate-pattern:" + direction,
      segmentOperators: [operator],
      sourceRefs: [source.url],
      evidenceRefs: [ref],
      sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
      strictFactBinding: true,
      serviceState: "active",
      metrics: {},
    };
  }
  const outbound = service("outbound", ["departure", "city"]),
    inbound = service("inbound", ["city", "arrival"]),
    patterns = [outbound, inbound];
  const rides = patterns.flatMap((p) =>
    generatePattern(p, nodes, f.sources, f.evidence, "fixture"),
  );
  function walk(from, to) {
    const hubRef = "reviewed-airport-public-interface",
      fact = {
        kind: "transfer",
        components: [selector(from), selector(to)],
        directions: [[0, 1]],
      };
    const factRef = f.seal("gate-walk-fact:" + from, fact),
      resolved = {
        from: ids[from],
        to: ids[to],
        hubRef,
        sourceFactRef: factRef,
      };
    const ref = f.seal("gate-walk-resolved:" + from, resolved);
    return generateTransfer(
      {
        ...resolved,
        transferId: "walk:" + from,
        directed: true,
        evidenceKind: "OFFICIAL_INTERCHANGE",
        strictFactBinding: true,
        sourceRefs: [source.url],
        evidenceRefs: [ref],
      },
      nodes,
      f.sources,
      f.evidence,
      "fixture",
    );
  }
  const walks = [walk("terminal", "departure"), walk("arrival", "terminal")],
    edges = [...rides, ...walks],
    registry = {
      sources: f.sources,
      evidence: f.evidence,
      patternById: new Map(patterns.map((p) => [p.servicePatternId, p])),
    };
  validateEdges(edges, registry);
  return {
    nodes: [...nodes.values()],
    ids,
    patterns,
    rides,
    walks,
    edges,
    registry,
  };
}
test("distinct departure and arrival gateways plus independently evidenced return bus close ordinary airport coverage", () => {
  const f = distinctAirportGateways();
  assert.notEqual(f.ids.departure, f.ids.arrival);
  const w = surfaceServiceRoundTrip(
    f.nodes,
    f.edges,
    f.ids.terminal,
    undefined,
    f.registry,
  );
  assert.ok(w);
  assert.equal(w.unconditional, true);
  const by = new Map(f.edges.map((e) => [e.edgeId, e]));
  assert.ok(validPath(w.forwardEdgeIds, f.ids.terminal, w.otherNodeId, by));
  assert.ok(validPath(w.reverseEdgeIds, w.otherNodeId, f.ids.terminal, by));
  const a = auditGraph({
    nodes: f.nodes,
    patterns: f.patterns,
    transfers: [],
    edges: f.edges,
    inventory: [
      {
        requirementId: "distinct-airport",
        kind: "airport",
        nodeId: f.ids.terminal,
        tier: "T1",
      },
    ],
    anchorNodeId: f.ids.city,
    validationContext: f.registry,
  });
  assert.equal(
    a.deficits.some((d) => d.deficitId === "mode:distinct-airport"),
    false,
  );
});
test("different airport gateways with only two public walks do not prove surface service", () => {
  const f = distinctAirportGateways();
  assert.equal(
    surfaceServiceRoundTrip(
      f.nodes,
      f.walks,
      f.ids.terminal,
      undefined,
      f.registry,
    ),
    null,
  );
});
test("different airport gateways and one-way bus cannot invent the return direction", () => {
  const f = distinctAirportGateways();
  assert.equal(
    surfaceServiceRoundTrip(
      f.nodes,
      [...f.walks, f.rides[0]],
      f.ids.terminal,
      undefined,
      f.registry,
    ),
    null,
  );
});
test("different airport gateways with forbidden departure boarding fail despite physical directed cycle", () => {
  const f = distinctAirportGateways({ badBoarding: true });
  assert.equal(f.rides[0].boardAllowed, false);
  assert.equal(
    surfaceServiceRoundTrip(
      f.nodes,
      f.edges,
      f.ids.terminal,
      undefined,
      f.registry,
    ),
    null,
  );
});
