import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "../tools/transport/task-086-source-actions.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { buildFixture } from "./fixtures/task-086-dynamic-od/fixture.mjs";
import {
  hash,
  admitNodes,
  dynamicOD,
  generateDynamicOD,
  validateEdges,
  queryGraph,
  reachablePaths,
  anchorQueries,
  surfaceServiceRoundTrip,
  allowsServiceAccess,
} from "../tools/transport/task-086-model.mjs";
import {
  validPath,
  passengerComponents,
} from "../tools/transport/task-086-stage.mjs";
const F = buildFixture();
const fresh = () => structuredClone(F),
  query = (f) =>
    queryGraph(f.edges, f.office.nodeId, f.airport.nodeId, f.context);
test("actual two exact facilities; typed two directed OD rides; no fixed sequence", () => {
  validateEdges(F.edges, F.validation);
  assert.equal(F.edges.length, 2);
  assert.equal(F.office.decision, "ADMIT_TASK_086_TOPOLOGY");
  assert(
    F.edges.every(
      (e) => e.edgeKind === "dynamic_od_ride" && !e.servicePatternRef,
    ),
  );
});
test("default query/anchor/SCC reject; explicit PHONE both actual directions pass", () => {
  assert.equal(queryGraph(F.edges, F.office.nodeId, F.airport.nodeId), null);
  assert.equal(
    anchorQueries(F.edges, F.office.nodeId)(F.airport.nodeId, F.office.nodeId),
    null,
  );
  assert.notEqual(
    ...[...passengerComponents([F.office, F.airport], F.edges).values()],
  );
  for (const [from, to] of [
    [F.office.nodeId, F.airport.nodeId],
    [F.airport.nodeId, F.office.nodeId],
  ]) {
    const p = queryGraph(F.edges, from, to, F.context);
    assert.equal(p.length, 1);
    assert(
      validPath(
        p,
        from,
        to,
        new Map(F.edges.map((e) => [e.edgeId, e])),
        F.context,
      ),
    );
    assert.equal(anchorQueries(F.edges, to, F.context)(from, to).length, 1);
  }
  assert.equal(
    ...[
      ...passengerComponents(
        [F.office, F.airport],
        F.edges,
        F.context,
      ).values(),
    ],
  );
});
test("real bidirectional ground-ride witness is conditional only", () => {
  assert.equal(
    surfaceServiceRoundTrip(
      [F.office, F.airport],
      F.edges,
      F.airport.nodeId,
      undefined,
      F.validation,
    ),
    null,
  );
  const w = surfaceServiceRoundTrip(
    [F.office, F.airport],
    F.edges,
    F.airport.nodeId,
    F.context,
    F.validation,
  );
  assert(w);
  assert.equal(w.surfaceRideEdgeIds.length, 2);
  assert.equal(w.unconditional, false);
  assert.equal(w.bookingConfirmed, false);
  assert.equal(w.capacityGuaranteed, false);
  assert.equal(w.globalGateClosed, false);
});
for (const [name, mutate] of [
  [
    "late reservation",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-04T09:30:01+09:00"),
      ),
  ],
  [
    "expired",
    (f) => {
      f.context.travelDate = "2027-02-01";
      f.context.odReservationIntents.forEach((i) => {
        i.requestAt = "2027-02-01T09:00:00+09:00";
        i.pickupAt = "2027-02-01T10:00:00+09:00";
      });
    },
  ],
  [
    "before trial",
    (f) => {
      f.context.travelDate = "2026-09-30";
      f.context.odReservationIntents.forEach((i) => {
        i.requestAt = "2026-09-30T09:00:00+09:00";
        i.pickupAt = "2026-09-30T10:00:00+09:00";
      });
    },
  ],
  [
    "after service hours",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.pickupAt = "2026-10-04T17:00:01+09:00"),
      ),
  ],
  [
    "before service hours",
    (f) =>
      f.context.odReservationIntents.forEach((i) => {
        i.requestAt = "2026-10-04T07:00:00+09:00";
        i.pickupAt = "2026-10-04T07:59:59+09:00";
      }),
  ],
  [
    "before reception hours",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-04T06:59:59+09:00"),
      ),
  ],
  [
    "after reception hours",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-03T18:00:01+09:00"),
      ),
  ],
  [
    "invalid day",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-02-30T09:00:00+09:00"),
      ),
  ],
  [
    "missing timezone",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.requestAt = "2026-10-04T09:00:00"),
      ),
  ],
  ["date mismatch", (f) => (f.context.travelDate = "2026-10-05")],
  [
    "resident impersonation",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.profile = "RESIDENT_ALL_VILLAGE"),
      ),
  ],
  [
    "WEB unimplemented",
    (f) => f.context.odReservationIntents.forEach((i) => (i.channel = "WEB")),
  ],
  [
    "cash not accepted",
    (f) =>
      f.context.odReservationIntents.forEach(
        (i) => (i.payment = "CREDIT_CARD"),
      ),
  ],
  ["no accepted contract", (f) => (f.context.acceptedContracts = [])],
  ["no reservation intents", (f) => (f.context.odReservationIntents = [])],
  [
    "no independently supplied registry",
    (f) => delete f.context.odValidationContext.dynamicODById,
  ],
  [
    "source withdrawn",
    (f) => {
      const od = [...f.validation.dynamicODById.values()][0],
        ref = od.parameterEvidenceRefs.minimumLeadMinutes;
      f.validation.sources.get(
        f.validation.evidence.get(ref).sourceId,
      ).derivedDataAllowed = false;
    },
  ],
  [
    "wrong coordinate",
    (f) => {
      f.validation.nodes.get(f.office.nodeId).latitude += 0.01;
    },
  ],
  [
    "wrong office identity",
    (f) => {
      f.validation.nodes.get(
        f.office.nodeId,
      ).identityRecord.feature.properties.P05_003 = "別役場";
    },
  ],
])
  test(name + " rejected by actual query", () => {
    const f = fresh();
    mutate(f);
    assert.equal(query(f), null);
  });
for (const [name, mutate] of [
  [
    "edge entire conditional fields stripped",
    (f) => {
      for (const e of f.edges) {
        delete e.accessContract;
        delete e.accessContractSha256;
        delete e.conditionalTopology;
        delete e.dynamicODRef;
        e.edgeKind = "transfer";
      }
    },
  ],
  [
    "fixed calling sequence",
    (f) => ([...f.validation.dynamicODById.values()][0].callingNodes = []),
  ],
  ["false fixed edge kind", (f) => (f.edges[0].edgeKind = "service_segment")],
  ["unregistered new edge ID", (f) => (f.edges[0].edgeId += "fake")],
  ["one registered direction deleted", (f) => f.edges.pop()],
  [
    "condition changed",
    (f) =>
      ([
        ...f.validation.dynamicODById.values(),
      ][0].accessTerms.minimumLeadMinutes = 0),
  ],
  [
    "condition proof removed",
    (f) =>
      delete [...f.validation.dynamicODById.values()][0].parameterEvidenceRefs
        .minimumLeadMinutes,
  ],
  [
    "raw source fact changed",
    (f) => {
      const od = [...f.validation.dynamicODById.values()][0],
        r = f.validation.evidence.get(od.evidenceRefs[0]).record,
        raw = f.validation.evidence.get(r.sourceFactRef);
      raw.record.endpointNames = ["南大東港", "南大東空港"];
      raw.recordSha256 = hash(raw.record);
    },
  ],
  [
    "boarding disabled cannot preserve expected ride",
    (f) => (f.edges[0].boardAllowed = false),
  ],
  [
    "rights revoked",
    (f) => {
      const od = [...f.validation.dynamicODById.values()][0],
        ref = od.parameterEvidenceRefs.minimumLeadMinutes;
      f.validation.sources.get(
        f.validation.evidence.get(ref).sourceId,
      ).rightsClass = "PROHIBITED";
    },
  ],
])
  test(name + " rejected at publication", () => {
    const f = fresh();
    mutate(f);
    assert.throws(() => validateEdges(f.edges, f.validation));
  });
test("source actions withdrawn before condition ingestion reject", () => {
  const f = fresh();
  f.actions[0].state = "PENDING_RESEARCH";
  assert.throws(() =>
    dynamicOD.bindClaims(
      f.facts[0],
      f.actions,
      f.validation.sources,
      f.validation.evidence,
      { reviewedFactAction, validateCorroboratingEvidence },
    ),
  );
});
test("independent admission registry rejects wrong point even if identity hash updated", () => {
  const f = fresh();
  f.candidate.latitude += 0.01;
  const n = admitNodes(
    [f.candidate],
    f.validation.sources,
    f.validation.evidence,
    [],
    { nativeFacilityByAnchor: f.validation.nativeFacilityByAnchor },
  )[0];
  assert.notEqual(n.decision, "ADMIT_TASK_086_TOPOLOGY");
});
test("one direction without qualifying intent cannot yield airport return witness", () => {
  const f = fresh();
  f.context.odReservationIntents.pop();
  assert.equal(
    surfaceServiceRoundTrip(
      [f.office, f.airport],
      f.edges,
      f.airport.nodeId,
      f.context,
      f.validation,
    ),
    null,
  );
});
test("08:00 pickup with 07:30 phone request passes; 17:00 pickup passes", () => {
  for (const [r, p] of [
    ["07:30:00", "08:00:00"],
    ["16:30:00", "17:00:00"],
  ]) {
    const f = fresh();
    f.context.odReservationIntents.forEach((i) => {
      i.requestAt = "2026-10-04T" + r + "+09:00";
      i.pickupAt = "2026-10-04T" + p + "+09:00";
    });
    assert.equal(query(f).length, 1);
  }
});
test("30-minute boundary comparable across valid UTC offsets", () => {
  const f = fresh();
  f.context.odReservationIntents.forEach((i) => {
    i.requestAt = "2026-10-04T00:30:00Z";
    i.pickupAt = "2026-10-04T01:00:00Z";
  });
  assert.equal(query(f).length, 1);
});
test("actual frozen national graph integration, both ways, no new flights", () => {
  const edges = [...F.priorEdges, ...F.edges];
  validateEdges(edges, F.validation);
  for (const [from, to] of [
    [F.anchor, F.office.nodeId],
    [F.office.nodeId, F.anchor],
  ]) {
    assert.equal(queryGraph(edges, from, to), null);
    const p = queryGraph(edges, from, to, F.context);
    assert.equal(p.length, 9);
    assert(
      validPath(
        p,
        from,
        to,
        new Map(edges.map((e) => [e.edgeId, e])),
        F.context,
      ),
    );
  }
});

test("fractional service close and reception close rejected", () => {
  for (const key of ["pickupAt", "requestAt"]) {
    const f = fresh();
    f.context.odReservationIntents.forEach(
      (i) =>
        (i[key] =
          key === "pickupAt"
            ? "2026-10-04T17:00:00.001+09:00"
            : "2026-10-03T18:00:00.001+09:00"),
    );
    assert.equal(query(f), null);
  }
});
test("unmodeled raw eligibility cannot be silently stripped", () => {
  const f = fresh(),
    od = [...f.validation.dynamicODById.values()][0],
    resolved = f.validation.evidence.get(od.evidenceRefs[0]).record,
    raw = f.validation.evidence.get(resolved.sourceFactRef);
  raw.record.hotelGuestsOnly = true;
  raw.recordSha256 = hash(raw.record);
  assert.throws(
    () => validateEdges(f.edges, f.validation),
    /OD_UNMODELED_RAW_RESTRICTION/,
  );
});
test("raw condition observation replacement rejected despite same scalar terms", () => {
  const f = fresh(),
    od = [...f.validation.dynamicODById.values()][0],
    resolved = f.validation.evidence.get(od.evidenceRefs[0]).record,
    raw = f.validation.evidence.get(resolved.sourceFactRef);
  raw.record.conditionObservations[0].sourceUrl =
    "https://example.org/unrelated";
  raw.recordSha256 = hash(raw.record);
  assert.throws(
    () => validateEdges(f.edges, f.validation),
    /OD_RAW_CONDITION_OBSERVATION_MISMATCH/,
  );
});

test("planning outside telephone hours may preserve a future in-window request opportunity", () => {
  const f = fresh();
  f.context.planningAt = "2026-10-04T06:00:00+09:00";
  assert.equal(query(f).length, 1);
  f.context.odReservationIntents.forEach(
    (i) => (i.requestAt = f.context.planningAt),
  );
  assert.equal(query(f), null);
});
test("cannot retroactively request before the planning instant", () => {
  const f = fresh();
  f.context.planningAt = "2026-10-04T09:30:01+09:00";
  assert.equal(query(f), null);
});
test("planningAt requires strict date and explicit timezone", () => {
  for (const x of ["2026-10-04T09:00:00", "2026-02-30T09:00:00+09:00"]) {
    const f = fresh();
    f.context.planningAt = x;
    assert.equal(query(f), null);
  }
});
