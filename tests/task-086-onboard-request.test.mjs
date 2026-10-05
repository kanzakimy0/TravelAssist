import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  admitNodes,
  generatePattern,
  validateEdges,
  queryGraph,
} from "../tools/transport/task-086-model.mjs";
function fixture() {
  const source = {
      sourceId: "synthetic-only",
      url: "https://fixture.invalid/",
      observedAt: "2026-10-03",
      contentSha256: hash("fixture"),
      persistenceAllowed: true,
      derivedDataAllowed: true,
      redistributionAllowed: true,
      rightsDecision: "TEST_ONLY",
    },
    sources = new Map([[source.sourceId, source]]),
    evidence = new Map();
  const seal = (key, record) => {
    evidence.set(key, {
      evidenceId: key,
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      record,
      recordSha256: hash(record),
      locator: "synthetic-only",
    });
    return key;
  };
  const ns = admitNodes(
      ["airport", "resident", "health"].map((name) => {
        const record = { name };
        return {
          identityAnchor: "test:" + name,
          canonicalNameJa: name,
          nodeKind: name === "airport" ? "airport" : "bus_stop",
          mode: name === "airport" ? "flight" : "local_bus",
          latitude: 35,
          longitude: 135,
          operatorRefs: ["test"],
          lineRefs: ["test"],
          evidenceRefs: [seal("identity:" + name, record)],
          identityRecord: record,
          independentReview: {
            decision: "ADMIT_TASK_086_TOPOLOGY",
            recordSha256: hash(record),
          },
          hubSemantics: "EXPLICIT_COMPONENT",
        };
      }),
      sources,
      evidence,
    ),
    nodes = new Map(ns.map((n) => [n.nodeId, n])),
    ids = Object.fromEntries(ns.map((n) => [n.canonicalNameJa, n.nodeId]));
  const rules = {
    listedBoardingStopsOnly: true,
    surfboardsAllowed: false,
    inconveniencingLargeLuggageAllowed: false,
    excursion: {
      maximumPerRun: 6,
      mayRefuseOrRequireAlighting: true,
      excludedPeriods: ["GOLDEN_WEEK", "JUL21_AUG31", "SILVER_WEEK"],
      unresolvedAnnualHolidayDates: true,
    },
  };
  const terms = {
    schemaVersion: 1,
    kind: "PUBLIC_BUS_ONBOARD_REQUEST",
    audience: "PUBLIC",
    eligibilityKeys: [],
    reviewedServiceDate: "2026-10-04",
    driverRequestDropoffNodeIds: [ids.airport],
    passengerRules: rules,
  };
  const c = {
    ...terms,
    sourceEvidenceRefs: [
      seal("condition", {
        kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
        accessTerms: structuredClone(terms),
      }),
    ],
  };
  const restrictions = [
      { pickupType: "0", dropOffType: "0" },
      { pickupType: "0", dropOffType: "3" },
    ],
    calls = ["health", "airport"].map((n, i) => ({
      nodeId: ids[n],
      sequence: i + 1,
      ...restrictions[i],
    }));
  const fact = {
    kind: "service",
    serviceState: "active",
    operator: "test",
    mode: "local_bus",
    purpose: "airport",
    callingStations: ["health", "airport"],
    callingComponents: ["health", "airport"].map((name) => ({
      name,
      operator: "test",
      line: "test",
      mode: nodes.get(ids[name]).mode,
    })),
    callingRestrictions: restrictions,
    parentCallingSequence: {
      sourceTripLabel: "Trip2",
      calls: ["resident", "health", "airport", "other"],
      selectedStartIndex: 1,
      selectedEndIndex: 2,
    },
    accessContract: structuredClone(c),
    corroboratingConditionEvidenceRefs: c.sourceEvidenceRefs,
  };
  seal("fact", fact);
  const resolved = {
    sourceFactRef: "fact",
    callingNodes: calls,
    lineRef: "test",
    operatorRef: "test",
    mode: "local_bus",
    serviceClass: "test",
    direction: "to-airport",
    purpose: "airport",
    accessContract: structuredClone(c),
  };
  seal("resolved", resolved);
  const pattern = {
    ...structuredClone(resolved),
    servicePatternId: "ground",
    segmentOperators: ["test"],
    sourceRefs: [source.url],
    evidenceRefs: ["resolved"],
    sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
    strictFactBinding: true,
    serviceState: "active",
    metrics: {},
  };
  const v = {
    nodes,
    sources,
    evidence,
    patternById: new Map([["ground", pattern]]),
    dynamicODById: new Map(),
  };
  const generate = () =>
    generatePattern(
      pattern,
      nodes,
      sources,
      evidence,
      "2026-10-01T00:00:00Z",
      v,
    );
  const edges = generate();
  const intent = {
    contractSha256: hash(c),
    travelDate: "2026-10-04",
    purpose: "ORDINARY_POINT_TO_POINT",
    purposeExplicitlyDeclared: true,
    acceptedPassengerRulesSha256: hash(rules),
    carriesSurfboard: false,
    carriesInconveniencingLargeLuggage: false,
    acceptsNoSeatOrDispatchGuarantee: true,
    driverRequestMethod: "ONBOARD_TELL_DRIVER",
    requestedDropoffNodeIds: [ids.airport],
  };
  const context = {
    kind: "EXPLICIT_CONDITIONAL_PLANNING",
    travelDate: "2026-10-04",
    acceptedContracts: [hash(c)],
    onboardIntents: [intent],
    publicStructureOnly: true,
    odValidationContext: v,
  };
  return {
    source,
    sources,
    evidence,
    seal,
    nodes,
    ids,
    c,
    fact,
    resolved,
    pattern,
    v,
    generate,
    edges,
    intent,
    context,
  };
}
test("actual model preserves3 and default denial; explicit onboard planning succeeds", () => {
  const f = fixture();
  validateEdges(f.edges, f.v);
  assert.equal(f.pattern.callingNodes[1].dropOffType, "3");
  assert.equal(queryGraph(f.edges, f.ids.health, f.ids.airport), null);
  assert.ok(queryGraph(f.edges, f.ids.health, f.ids.airport, f.context));
  assert.equal(
    queryGraph(f.edges, f.ids.airport, f.ids.health, f.context),
    null,
  );
});
for (const [name, change] of [
  ["absent driver request", (f) => delete f.intent.driverRequestMethod],
  ["PHONE is not onboard", (f) => (f.intent.driverRequestMethod = "PHONE")],
  [
    "wrong request point",
    (f) => (f.intent.requestedDropoffNodeIds = [f.ids.resident]),
  ],
  ["missing request point", (f) => delete f.intent.requestedDropoffNodeIds],
  ["undeclared purpose", (f) => delete f.intent.purposeExplicitlyDeclared],
  ["excursion", (f) => (f.intent.purpose = "EXCURSION")],
  ["tourist is not journey purpose", (f) => (f.intent.purpose = "TOURIST")],
  ["resident is not journey purpose", (f) => (f.intent.purpose = "RESIDENT")],
  ["surfboard", (f) => (f.intent.carriesSurfboard = true)],
  [
    "large inconvenient luggage",
    (f) => (f.intent.carriesInconveniencingLargeLuggage = true),
  ],
  [
    "unspecified luggage",
    (f) => delete f.intent.carriesInconveniencingLargeLuggage,
  ],
  [
    "no rules acknowledgement",
    (f) => delete f.intent.acceptedPassengerRulesSha256,
  ],
  [
    "no guarantee acknowledgment",
    (f) => delete f.intent.acceptsNoSeatOrDispatchGuarantee,
  ],
  ["invalid date", (f) => (f.context.travelDate = "2026-02-30")],
  ["unreviewed date", (f) => (f.context.travelDate = "2026-10-05")],
  ["missing registry", (f) => delete f.context.odValidationContext],
  ["raw evidence withdrawn", (f) => f.evidence.delete("fact")],
  ["condition evidence withdrawn", (f) => f.evidence.delete("condition")],
  ["rights withdrawn", (f) => (f.source.derivedDataAllowed = false)],
  ["pattern withdrawn", (f) => f.v.patternById.clear()],
  [
    "edge fields all stripped",
    (f) => {
      delete f.edges[0].accessContract;
      delete f.edges[0].accessContractSha256;
      delete f.edges[0].conditionalTopology;
    },
  ],
  [
    "edge target swapped",
    (f) => (f.edges[0].toTransportNodeId = f.ids.resident),
  ],
])
  test(name + " rejects", () => {
    const f = fixture();
    change(f);
    assert.equal(
      queryGraph(f.edges, f.ids.health, f.ids.airport, f.context),
      null,
    );
  });
for (const [name, change] of [
  [
    "remove restrictions",
    (f) => (f.fact.callingRestrictions[1].dropOffType = "0"),
  ],
  ["phone-required invented", (f) => (f.fact.reservation = "required")],
  [
    "parent skips actual stop",
    (f) => f.fact.parentCallingSequence.calls.splice(2, 0, "intermediate"),
  ],
  ["reverse sequence", (f) => f.pattern.callingNodes.reverse()],
  ["stripped contract", (f) => delete f.pattern.accessContract],
  [
    "stripped passenger rules",
    (f) => delete f.pattern.accessContract.passengerRules,
  ],
  [
    "excursion maximum changed",
    (f) =>
      (f.pattern.accessContract.passengerRules.excursion.maximumPerRun = 7),
  ],
  [
    "summer restriction omitted",
    (f) =>
      (f.pattern.accessContract.passengerRules.excursion.excludedPeriods = [
        "GOLDEN_WEEK",
        "SILVER_WEEK",
      ]),
  ],
  [
    "resident-only audience",
    (f) => (f.pattern.accessContract.audience = "RESIDENT"),
  ],
  ["pickup3 invented", (f) => (f.pattern.callingNodes[0].pickupType = "3")],
  [
    "dropoff2 not implicitly allowed",
    (f) => (f.pattern.callingNodes[1].dropOffType = "2"),
  ],
])
  test(name + " generation fails", () => {
    const f = fixture();
    change(f);
    f.seal("fact", f.fact);
    assert.throws(f.generate);
  });
test("validateEdges refuses stripped conditional edge independently from registry", () => {
  const f = fixture();
  delete f.edges[0].accessContract;
  delete f.edges[0].conditionalTopology;
  delete f.edges[0].accessContractSha256;
  assert.throws(() => validateEdges(f.edges, f.v));
});

test("resealed changed raw restrictions cannot pass query", () => {
  const f = fixture();
  f.fact.callingRestrictions[1].dropOffType = "0";
  f.seal("fact", f.fact);
  assert.equal(
    queryGraph(f.edges, f.ids.health, f.ids.airport, f.context),
    null,
  );
});
test("withdrawn node identity refuses conditional query", () => {
  const f = fixture();
  f.evidence.delete("identity:health");
  assert.equal(
    queryGraph(f.edges, f.ids.health, f.ids.airport, f.context),
    null,
  );
});
test("non-admitted endpoint refuses conditional query", () => {
  const f = fixture();
  f.nodes.get(f.ids.health).decision = "HOLD";
  assert.equal(
    queryGraph(f.edges, f.ids.health, f.ids.airport, f.context),
    null,
  );
});
test("ordinary trip is not automatically excursion merely because passenger is visitor", () => {
  const f = fixture();
  f.intent.passengerVisitor = true;
  assert.ok(queryGraph(f.edges, f.ids.health, f.ids.airport, f.context));
});
test("seven-person excursion never passes ordinary-intent branch", () => {
  const f = fixture();
  f.intent.purpose = "EXCURSION";
  f.intent.partySize = 7;
  assert.equal(
    queryGraph(f.edges, f.ids.health, f.ids.airport, f.context),
    null,
  );
});
test("summer excursion denied even with six people and declared empty seats", () => {
  const f = fixture();
  f.intent.purpose = "EXCURSION";
  f.intent.partySize = 6;
  f.intent.emptySeats = 10;
  f.context.travelDate = "2026-07-21";
  assert.equal(
    queryGraph(f.edges, f.ids.health, f.ids.airport, f.context),
    null,
  );
});

function airportOrigin() {
  const f = fixture();
  f.c.driverRequestDropoffNodeIds = [];
  const { sourceEvidenceRefs, ...terms } = f.c;
  f.seal("condition", {
    kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
    accessTerms: terms,
  });
  const calls = ["airport", "resident"].map((n, i) => ({
    nodeId: f.ids[n],
    sequence: i + 1,
    pickupType: "0",
    dropOffType: "0",
  }));
  f.fact.callingStations = ["airport", "resident"];
  f.fact.callingComponents = ["airport", "resident"].map((name) => ({
    name,
    operator: "test",
    line: "test",
    mode: f.nodes.get(f.ids[name]).mode,
  }));
  f.fact.callingRestrictions = calls.map(({ pickupType, dropOffType }) => ({
    pickupType,
    dropOffType,
  }));
  f.fact.parentCallingSequence = {
    sourceTripLabel: "Trip3",
    calls: ["airport", "resident", "other"],
    selectedStartIndex: 0,
    selectedEndIndex: 1,
  };
  for (const r of [f.fact, f.resolved, f.pattern])
    r.accessContract = structuredClone(f.c);
  f.resolved.callingNodes = structuredClone(calls);
  f.pattern.callingNodes = structuredClone(calls);
  f.seal("fact", f.fact);
  f.seal("resolved", f.resolved);
  f.edges = f.generate();
  f.intent.contractSha256 = hash(f.c);
  delete f.intent.driverRequestMethod;
  delete f.intent.requestedDropoffNodeIds;
  f.context.acceptedContracts = [hash(f.c)];
  return f;
}
test("independent timetable-origin airport pickup needs no inferred dropoff request; passenger conditions still apply", () => {
  const f = airportOrigin();
  validateEdges(f.edges, f.v);
  assert.equal(queryGraph(f.edges, f.ids.airport, f.ids.resident), null);
  assert.ok(queryGraph(f.edges, f.ids.airport, f.ids.resident, f.context));
  assert.equal(
    queryGraph(f.edges, f.ids.resident, f.ids.airport, f.context),
    null,
  );
});
test("ordinary pickup cannot evade no-boarding flag", () => {
  const f = airportOrigin();
  f.fact.callingRestrictions[0].pickupType = "1";
  f.resolved.callingNodes[0].pickupType = "1";
  f.pattern.callingNodes[0].pickupType = "1";
  f.seal("fact", f.fact);
  f.seal("resolved", f.resolved);
  f.edges = f.generate();
  assert.equal(
    queryGraph(f.edges, f.ids.airport, f.ids.resident, f.context),
    null,
  );
});

test("onboard pattern generation requires independently supplied node registry", () => {
  const f = fixture();
  assert.throws(
    () =>
      generatePattern(
        f.pattern,
        f.nodes,
        f.sources,
        f.evidence,
        "2026-10-01T00:00:00Z",
      ),
    /ONBOARD_NODE_REGISTRY_REQUIRED/,
  );
});
