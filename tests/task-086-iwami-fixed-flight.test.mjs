import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  admitNodes,
  generatePattern,
  validateEdges,
  queryGraph,
} from "../tools/transport/task-086-model.mjs";
function fixture(relation = "ARRIVAL") {
  const departing = relation === "DEPARTURE",
    code = departing ? "ANA726" : "ANA725";
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
      ["hnd", "iwj", "office"].map((name) => {
        const record = { name };
        return {
          identityAnchor: "test:" + name,
          canonicalNameJa: name,
          nodeKind: name === "office" ? "public_pickup_facility" : "airport",
          mode: name === "office" ? "demand_shared_taxi" : "flight",
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
  const patternById = new Map(),
    v = {
      nodes,
      sources,
      evidence,
      patternById,
      dynamicODById: new Map(),
      nativeFacilityByAnchor: new Map(),
    };
  function make(key, names, mode, c) {
    const restrictions = names.map(() => ({
        pickupType: "0",
        dropOffType: "0",
      })),
      calls = names.map((name, i) => ({
        nodeId: ids[name],
        sequence: i + 1,
        ...restrictions[i],
      })),
      fact = {
        kind: "service",
        serviceState: "active",
        operator: "test",
        mode,
        callingStations: names,
        callingComponents: names.map((name) => ({
          name,
          operator: "test",
          line: "test",
          mode: nodes.get(ids[name]).mode,
        })),
        callingRestrictions: restrictions,
        ...(c
          ? {
              reservation: "required",
              accessContract: structuredClone(c),
              corroboratingConditionEvidenceRefs: c.sourceEvidenceRefs,
            }
          : { reviewedFlightCode: code, reviewedServiceDate: "20261004" }),
      },
      factRef = seal("fact:" + key, fact),
      resolved = {
        sourceFactRef: factRef,
        callingNodes: calls,
        lineRef: "test",
        operatorRef: "test",
        mode,
        serviceClass: "test",
        direction: key,
        ...(c ? { accessContract: structuredClone(c) } : {}),
      },
      ref = seal("resolved:" + key, resolved),
      p = {
        ...resolved,
        servicePatternId: key,
        segmentOperators: names.slice(1).map(() => "test"),
        sourceRefs: [source.url],
        evidenceRefs: [ref],
        sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
        strictFactBinding: true,
        serviceState: "active",
        metrics: {},
      };
    patternById.set(key, p);
    return p;
  }
  const flight = make(
    "flight",
    departing ? ["iwj", "hnd"] : ["hnd", "iwj"],
    "flight",
  );
  const terms = {
      schemaVersion: 3,
      kind: "BOOKABLE_PASSENGER_SERVICE",
      audience: "PUBLIC",
      eligibilityKeys: [],
      reservation: {
        requirement: "REQUIRED",
        method: "PHONE",
        deadline: { daysBefore: 1, localTime: "17:00", timeZone: "Asia/Tokyo" },
        noBookingNoDispatch: true,
      },
      validFrom: "2026-03-29",
      validTo: "2026-10-24",
      operatingDays: "DAILY",
      flightService: {
        servicePatternId: "flight",
        sourceFactRef: "fact:flight",
        flightCode: code,
        reviewedServiceDate: "20261004",
      },
      flightDispatch: {
        airportNodeId: ids.iwj,
        relation,
        delay: departing ? "SCHEDULED_DEPARTURE" : "WAIT_FOR_ARRIVAL",
        cancellation: departing
          ? "NO_DISPATCH_OR_RETURN_IF_ALREADY_STARTED"
          : "NO_DISPATCH",
        diversion: departing ? "NOT_STATED" : "NO_DISPATCH",
        noBookingOrCapacityGuarantee: true,
      },
      passengerRules: {
        offStopPickupDropoffAllowed: false,
        luggageMustFitTrunk: true,
        luggageConsultAtBooking: true,
        smokingAllowed: false,
        drinkingAllowed: false,
        arrivalLeadMinutes: 5,
      },
    },
    contract = {
      ...terms,
      sourceEvidenceRefs: [
        seal("condition", {
          kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
          accessTerms: structuredClone(terms),
        }),
      ],
    },
    ground = make(
      "ground",
      departing ? ["office", "iwj"] : ["iwj", "office"],
      "demand_shared_taxi",
      contract,
    );
  const generate = () =>
      generatePattern(
        ground,
        nodes,
        sources,
        evidence,
        "2026-10-01T00:00:00Z",
        v,
      ),
    edges = generate();
  const context = {
    kind: "EXPLICIT_CONDITIONAL_PLANNING",
    publicStructureOnly: true,
    travelDate: "2026-10-04",
    acceptedContracts: [hash(contract)],
    reservationIntents: [
      {
        kind: "REQUEST_BEFORE_DEADLINE",
        contractSha256: hash(contract),
        travelDate: "2026-10-04",
        planningAt: "2026-10-03T12:00:00+09:00",
        channel: "PHONE",
        flightCode: code,
        flightServicePatternId: "flight",
        flightServiceStatus: "PLANNED_OPERATING",
        acceptedPassengerRulesSha256: hash(contract.passengerRules),
        acceptsNoDispatchGuarantee: true,
      },
    ],
    odValidationContext: v,
  };
  const refresh = () =>
    (context.evidenceContextSha256 = hash({
      sources: [...sources].sort(),
      evidence: [...evidence].sort(),
      nodes: [...nodes].sort(),
      patterns: [...patternById].sort(),
      dynamicOD: [],
      nativeFacilities: [],
    }));
  refresh();
  return {
    source,
    sources,
    evidence,
    seal,
    nodes,
    ids,
    v,
    flight,
    ground,
    contract,
    context,
    generate,
    edges,
    refresh,
  };
}
test("real generator validates independently bound flight and explicit conditional public path", () => {
  const f = fixture();
  validateEdges(f.edges, f.v);
  assert.equal(queryGraph(f.edges, f.ids.iwj, f.ids.office), null);
  assert.ok(queryGraph(f.edges, f.ids.iwj, f.ids.office, f.context));
});
for (const [name, change] of [
  [
    "cancelled",
    (f) => (f.context.reservationIntents[0].flightServiceStatus = "CANCELLED"),
  ],
  [
    "diverted",
    (f) => (f.context.reservationIntents[0].flightServiceStatus = "DIVERTED"),
  ],
  [
    "unknown",
    (f) => (f.context.reservationIntents[0].flightServiceStatus = "UNKNOWN"),
  ],
  [
    "wrong flight",
    (f) => (f.context.reservationIntents[0].flightCode = "ANA726"),
  ],
  ["wrong date", (f) => (f.context.travelDate = "2026-10-05")],
  [
    "late phone intent",
    (f) =>
      (f.context.reservationIntents[0].planningAt =
        "2026-10-03T17:00:00.001+09:00"),
  ],
  [
    "missing passenger acknowledgement",
    (f) => delete f.context.reservationIntents[0].acceptedPassengerRulesSha256,
  ],
  ["unbound registry", (f) => delete f.context.odValidationContext],
  [
    "evidence fingerprint withdrawn",
    (f) => delete f.context.evidenceContextSha256,
  ],
  ["flight pattern withdrawn", (f) => f.v.patternById.delete("flight")],
  ["flight fact withdrawn", (f) => f.evidence.delete("fact:flight")],
  [
    "flight raw code resealed wrong",
    (f) => {
      const r = structuredClone(f.evidence.get("fact:flight").record);
      r.reviewedFlightCode = "ANA999";
      f.seal("fact:flight", r);
      f.refresh();
    },
  ],
  [
    "flight inactive",
    (f) => {
      f.flight.serviceState = "inactive";
      f.refresh();
    },
  ],
  [
    "wrong flight direction",
    (f) => {
      f.flight.callingNodes.reverse();
      f.refresh();
    },
  ],
  [
    "source permission withdrawn",
    (f) => {
      f.source.persistenceAllowed = false;
      f.source.derivedDataAllowed = false;
      f.source.redistributionAllowed = false;
      f.refresh();
    },
  ],
])
  test(name + " denies conditional path", () => {
    const f = fixture();
    change(f);
    assert.equal(queryGraph(f.edges, f.ids.iwj, f.ids.office, f.context), null);
  });
test("missing flight registry refuses generation", () => {
  const f = fixture();
  f.v.patternById.delete("flight");
  assert.throws(f.generate, /ACCESS_FLIGHT_REGISTRY_REQUIRED/);
});
test("source-bound dispatch rules stripped refuses generation", () => {
  const f = fixture();
  f.ground.accessContract = structuredClone(f.ground.accessContract);
  delete f.ground.accessContract.flightDispatch;
  assert.throws(f.generate, /ACCESS_FLIGHT_DISPATCH_RULES_REQUIRED/);
});
test("edge contract fully stripped cannot escape independent pattern registry", () => {
  const f = fixture(),
    e = structuredClone(f.edges);
  delete e[0].accessContract;
  delete e[0].accessContractSha256;
  delete e[0].conditionalTopology;
  assert.throws(() => validateEdges(e, f.v));
});
test("strict valid date rejects February30 before source matching", () => {
  const f = fixture();
  f.ground.accessContract = structuredClone(f.ground.accessContract);
  f.ground.accessContract.flightService.reviewedServiceDate = "20260230";
  assert.throws(f.generate, /ACCESS_FLIGHT_SERVICE_REQUIRED/);
});

test("independent airport-bound direction binds departure flight and preserves asymmetric source diversion rule", () => {
  const f = fixture("DEPARTURE");
  assert.equal(f.contract.flightDispatch.diversion, "NOT_STATED");
  validateEdges(f.edges, f.v);
  assert.ok(queryGraph(f.edges, f.ids.office, f.ids.iwj, f.context));
  assert.equal(queryGraph(f.edges, f.ids.office, f.ids.iwj), null);
});
test("departure relation cannot bind arrival-flight registry", () => {
  const f = fixture("DEPARTURE");
  f.flight.callingNodes.reverse();
  assert.throws(f.generate);
});
test("telephone intent without timezone fails strict planning clock", () => {
  const f = fixture();
  f.context.reservationIntents[0].planningAt = "2026-10-03T12:00:00";
  assert.equal(queryGraph(f.edges, f.ids.iwj, f.ids.office, f.context), null);
});
test("prior-day exactly17 valid, millisecondafter rejected", () => {
  const f = fixture();
  f.context.reservationIntents[0].planningAt = "2026-10-03T17:00:00+09:00";
  assert.ok(queryGraph(f.edges, f.ids.iwj, f.ids.office, f.context));
  f.context.reservationIntents[0].planningAt = "2026-10-03T17:00:00.001+09:00";
  assert.equal(queryGraph(f.edges, f.ids.iwj, f.ids.office, f.context), null);
});
test("valid flight evidence cannot substitute nonairport source endpoint role", () => {
  const f = fixture();
  f.nodes.get(f.ids.hnd).nodeKind = "ferry_port";
  assert.throws(f.generate, /ACCESS_FLIGHT_DIRECTION_MISMATCH/);
});
test("hotel audience source contract cannot masquerade fixed PUBLIC profile", () => {
  const f = fixture();
  f.ground.accessContract = structuredClone(f.ground.accessContract);
  f.ground.accessContract.audience = "ELIGIBILITY_RESTRICTED";
  f.ground.accessContract.eligibilityKeys = ["hotel:guest"];
  assert.throws(f.generate, /ACCESS_FLIGHT_PROFILE_VALIDITY/);
});
