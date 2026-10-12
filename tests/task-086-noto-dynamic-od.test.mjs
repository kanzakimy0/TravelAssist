import test from "node:test";
import assert from "node:assert/strict";
import { buildNotoFixture } from "./fixtures/task-086-noto-od/fixture.mjs";
import {
  dynamicOD,
  generateDynamicOD,
  validateEdges,
  queryGraph,
  surfaceServiceRoundTrip,
  admitNodes,
  hash,
} from "../tools/transport/task-086-model.mjs";
import { publicODHospitalCandidate } from "../tools/transport/task-086-public-od-facility.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "../tools/transport/task-086-source-actions.mjs";
const F = buildNotoFixture(),
  fresh = () => structuredClone(F),
  od = (f) => [...f.validation.dynamicODById.values()][0];
const allowed = (f) => f.odEdges.map((e) => dynamicOD.allows(e, f.context));
test("actual cached native P04 and four source-bound directed edges", () => {
  validateEdges(F.edges, F.validation);
  assert.equal(F.hospital.decision, "ADMIT_TASK_086_TOPOLOGY");
  assert.equal(F.edges.length, 4);
  assert.equal(F.flightEdges.length, 2);
  assert.equal(F.odEdges.length, 2);
  assert.deepEqual(allowed(F), [true, true]);
  assert.equal(F.phase.facts.filter((x) => x.kind === "dynamic_od").length, 2);
});
test("default public graph rejects OD, explicit conditional profile retains both airport surface rides", () => {
  assert.equal(
    queryGraph(F.odEdges, F.airport.nodeId, F.hospital.nodeId),
    null,
  );
  assert.equal(
    queryGraph(F.odEdges, F.airport.nodeId, F.hospital.nodeId, F.context)
      .length,
    1,
  );
  const witness = surfaceServiceRoundTrip(
    [F.airport, F.hospital],
    F.odEdges,
    F.airport.nodeId,
    F.context,
    F.validation,
  );
  assert(witness);
  assert.equal(witness.bookingConfirmed, false);
  assert.equal(witness.capacityGuaranteed, false);
  assert.equal(witness.globalGateClosed, false);
});
test("INTERNET published channel works with the same prior-day deadline", () => {
  const f = fresh();
  f.context.odReservationIntents.forEach((i) => (i.channel = "INTERNET"));
  assert.deepEqual(allowed(f), [true, true]);
});
for (const [label, change] of [
  [
    "one millisecond after previous-day15 deadline",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-02T15:00:00.001+09:00"),
      ),
  ],
  [
    "same-day request",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-03T08:00:00+09:00"),
      ),
  ],
  [
    "timezone missing",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-02T14:00:00"),
      ),
  ],
  [
    "request before planning",
    (f) => (f.context.planningAt = "2026-10-02T16:00:00+09:00"),
  ],
  [
    "wrong service day",
    (f) => {
      f.context.travelDate = "2026-10-04";
      f.context.odReservationIntents.forEach(
        (i) => (i.pickupAt = "2026-10-04T11:00:00+09:00"),
      );
    },
  ],
  [
    "cancelled flight",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.flightServiceStatus = "CANCELLED"),
      ),
  ],
  [
    "diverted flight",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.flightServiceStatus = "DIVERTED"),
      ),
  ],
  [
    "unknown flight state",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => delete i.flightServiceStatus,
      ),
  ],
  [
    "wrong linked flight",
    (f) =>
      f.context.odReservationIntents.forEach((i) => (i.flightCode = "NH999")),
  ],
  [
    "unbound flight pattern",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.flightServicePatternId = "fake"),
      ),
  ],
  [
    "resident qualification cannot replace public profile",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.profile = "RESIDENT_ONLY"),
      ),
  ],
  [
    "ticket-holder qualification cannot replace public profile",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.profile = "FLIGHT_TICKET_HOLDER"),
      ),
  ],
  [
    "unpublished email booking",
    (f) => f.context.odReservationIntents.forEach((i) => (i.channel = "EMAIL")),
  ],
  [
    "unpublished payment",
    (f) => f.context.odReservationIntents.forEach((i) => (i.payment = "CARD")),
  ],
  [
    "assigned place condition stripped",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => delete i.acceptsOperatorAssignedPlace,
      ),
  ],
  [
    "operator confirmation condition stripped",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => delete i.requestsOperatorConfirmation,
      ),
  ],
  [
    "dispatch uncertainty stripped",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => delete i.acceptsNoDispatchGuarantee,
      ),
  ],
  ["unaccepted contract", (f) => (f.context.acceptedContracts = [])],
])
  test(label + " rejects", () => {
    const f = fresh();
    change(f);
    assert.deepEqual(allowed(f), [false, false]);
  });
for (const [label, change] of [
  ["flight pattern absent", (f) => f.validation.patternById.clear()],
  [
    "flight source withdrawn",
    (f) => {
      for (const p of f.flightPatterns) {
        const e = f.validation.evidence.get(p.sourceFactRef);
        f.validation.sources.get(e.sourceId).derivedDataAllowed = false;
      }
    },
  ],
  [
    "flight pattern suspended",
    (f) => {
      for (const p of f.flightPatterns)
        f.validation.patternById.get(p.servicePatternId).serviceState =
          "suspended";
    },
  ],
  [
    "native condition evidence absent",
    (f) => {
      for (const x of f.validation.dynamicODById.values())
        f.validation.evidence.delete(Object.values(x.parameterEvidenceRefs)[0]);
    },
  ],
  [
    "hospital native registry absent",
    (f) => f.validation.nativeFacilityByAnchor.clear(),
  ],
  [
    "airport missing identity evidence",
    (f) => (f.validation.nodes.get(f.airport.nodeId).evidenceRefs = []),
  ],
  [
    "hospital unknown latitude",
    (f) => (f.validation.nodes.get(f.hospital.nodeId).latitude = null),
  ],
  [
    "airport HOLD",
    (f) => (f.validation.nodes.get(f.airport.nodeId).decision = "HOLD"),
  ],
])
  test(label + " rejects", () => {
    const f = fresh();
    change(f);
    assert.deepEqual(allowed(f), [false, false]);
  });
for (const [label, change] of [
  ["South Daito minimum lead", (x) => (x.minimumLeadMinutes = 30)],
  ["invented service hour", (x) => (x.serviceStart = "09:00")],
  ["removed dispatch rule", (x) => delete x.noReservationNoDispatch],
  ["resident audience", (x) => (x.audience = "RESIDENT")],
  ["open-ended flight period", (x) => (x.validTo = "2027-01-31")],
  ["invented pickup guarantee", (x) => (x.capacityGuaranteed = true)],
])
  test(label + " terms fail before binding", () => {
    const f = fresh(),
      fact = structuredClone(f.phase.facts[2]);
    change(fact.accessTerms);
    assert.throws(() =>
      dynamicOD.bindClaims(
        fact,
        f.actions,
        f.validation.sources,
        f.validation.evidence,
        { reviewedFactAction, validateCorroboratingEvidence },
      ),
    );
  });
test("each new parameter needs an independent source binding", () => {
  const f = fresh(),
    fact = structuredClone(f.phase.facts[2]);
  delete fact.conditionObservations[0].claims.operatorConfirmationRequired;
  assert.throws(
    () =>
      dynamicOD.bindClaims(fact, f.actions, new Map(), new Map(), {
        reviewedFactAction,
        validateCorroboratingEvidence,
      }),
    /EVERY_PARAMETER/,
  );
});
test("fixed calls cannot enter OD", () => {
  const f = fresh(),
    fact = structuredClone(f.phase.facts[2]);
  fact.callingStations = ["能登空港", "公立宇出津総合病院"];
  assert.throws(
    () =>
      dynamicOD.bindClaims(
        fact,
        f.actions,
        f.validation.sources,
        f.validation.evidence,
        { reviewedFactAction, validateCorroboratingEvidence },
      ),
    /FIXED_SEQUENCE/,
  );
});
test("condition conflicting duplicate fails without overwriting published rows", () => {
  const f = fresh(),
    fact = structuredClone(f.phase.facts[2]),
    prior = hash([...f.validation.evidence]);
  fact.conditionObservations[0].locator = "changed";
  assert.throws(
    () =>
      dynamicOD.bindClaims(
        fact,
        f.actions,
        f.validation.sources,
        f.validation.evidence,
        { reviewedFactAction, validateCorroboratingEvidence },
      ),
    /REBIND/,
  );
  assert.equal(hash([...f.validation.evidence]), prior);
});
for (const [label, change] of [
  ["wrong raw archive", (a) => (a.archiveBytes = Buffer.from("bad"))],
  ["changed native member", (a) => (a.memberBytes = Buffer.from("{}"))],
  ["changed native GML", (a) => (a.gmlBytes = Buffer.from("bad"))],
  ["wrong P04 native ID", (a) => (a.review.nativeRecordId = "DE01_722")],
  ["P05 relabel", (a) => (a.review.dataset = "P05-22")],
  ["curb coordinate scope", (a) => (a.review.coordinateScope = "CURB")],
  [
    "native source removed",
    (a) =>
      a.sources.delete(a.evidence.get(a.nativeIdentityEvidenceRef).sourceId),
  ],
  [
    "native license unknown",
    (a) =>
      (a.sources.get(
        a.evidence.get(a.nativeIdentityEvidenceRef).sourceId,
      ).rightsDecision = "UNKNOWN"),
  ],
  [
    "catalog source hash changed",
    (a) =>
      (a.sources.get(
        a.evidence.get(a.nativeIdentityEvidenceRef).sourceId,
      ).rightsReview.licenseEvidenceSha256 = "0".repeat(64)),
  ],
  [
    "current named endpoint removed",
    (a) => a.evidence.delete(a.currentEndpointEvidenceRef),
  ],
])
  test(label + " factory rejects", () => {
    const f = fresh(),
      a = f.factoryArgs;
    change(a);
    assert.throws(() => publicODHospitalCandidate(a));
  });
test("identity coordinates cannot be guessed", () => {
  const f = fresh();
  f.candidate.latitude = 37;
  const n = admitNodes(
    [f.candidate],
    f.validation.sources,
    f.validation.evidence,
    [],
    { nativeFacilityByAnchor: f.validation.nativeFacilityByAnchor },
  )[0];
  assert.equal(n.decision, "HOLD");
});
test("removing one OD direction leaves no airport round trip", () => {
  const f = fresh();
  assert.throws(
    () =>
      surfaceServiceRoundTrip(
        [f.airport, f.hospital],
        f.odEdges.slice(0, 1),
        f.airport.nodeId,
        f.context,
        f.validation,
      ),
    /OD_REGISTERED_EDGE_MISSING/,
  );
});

test("coherent fake resolved field is still rejected", () => {
  const f = fresh(),
    x = od(f);
  x.ticketHolderRequired = true;
  assert.throws(
    () => dynamicOD.validateRecord(x, f.validation),
    /UNMODELED_RESOLVED/,
  );
});
test("raw source fact changed remains rejected even if caller marks flight active", () => {
  const f = fresh(),
    x = od(f),
    ref = x.accessTerms.flightService.sourceFactRef;
  f.validation.evidence.get(ref).record.reviewedFlightCode = "NH999";
  assert.equal(dynamicOD.allows(f.odEdges[0], f.context), false);
});
test("new condition source revocation invalidates PUBLIC planning", () => {
  const f = fresh();
  for (const x of f.validation.dynamicODById.values()) {
    const ref = x.parameterEvidenceRefs.audience;
    f.validation.sources.get(
      f.validation.evidence.get(ref).sourceId,
    ).rightsClass = "REFERENCE_ONLY";
  }
  assert.deepEqual(allowed(f), [false, false]);
});
test("different endpoint cannot be substituted under hospital identity", () => {
  const f = fresh();
  f.validation.nodes.get(f.hospital.nodeId).canonicalNameJa = "七尾駅";
  assert.deepEqual(allowed(f), [false, false]);
});
test("wrong current hospital address cannot pass native factory", () => {
  const f = fresh(),
    a = f.factoryArgs;
  const row = a.evidence.get(a.currentEndpointEvidenceRef);
  row.record.currentHospitalAddress = "unknown";
  assert.throws(() => publicODHospitalCandidate(a));
});

test("conditional flight cannot recursively supply the OD operating dependency", () => {
  const f = fresh();
  for (const p of f.flightPatterns)
    f.validation.patternById.get(p.servicePatternId).accessContract = {
      audience: "PUBLIC",
    };
  assert.deepEqual(allowed(f), [false, false]);
});
