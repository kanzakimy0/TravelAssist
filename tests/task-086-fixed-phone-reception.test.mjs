import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/task-086-service-access-fixture.mjs";
import {
  hash,
  generatePattern,
  validateEdges,
  queryGraph,
} from "../tools/transport/task-086-model.mjs";
export function fixedPhoneFixture() {
  const f = fixture();
  Object.assign(f.contract, {
    schemaVersion: 2,
    payment: "CASH_ONLY",
    passengerRules: {
      petsAllowed: false,
      dangerousGoodsAllowed: false,
      smokingAllowed: false,
      drinkingAllowed: false,
      largeLuggageNoticeThresholdMetres: 1.5,
      largeLuggageNoticeAtBooking: true,
      cancellationNoticeHours: 2,
      bookingDetailsRequired: [
        "NAME",
        "PHONE",
        "PASSENGER_COUNT",
        "TRAVEL_DATE",
        "SERVICE",
        "PICKUP",
        "DROPOFF",
      ],
    },
  });
  f.contract.reservation.reception = {
    startLocalTime: "09:00",
    endLocalTime: "17:00",
    timeZone: "Asia/Tokyo",
  };
  const { sourceEvidenceRefs, ...accessTerms } = f.contract;
  f.seal("condition-proof", {
    kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
    accessTerms,
  });
  for (const [ref, e] of f.evidence) {
    if (e.record.accessContract) {
      e.record.accessContract = structuredClone(f.contract);
      e.recordSha256 = hash(e.record);
    }
  }
  for (const p of f.patternById.values())
    p.accessContract = structuredClone(f.contract);
  f.edges = [...f.patternById.values()].flatMap((p) =>
    generatePattern(p, f.nodes, f.sources, f.evidence, "2026-10-03"),
  );
  f.context.acceptedContracts = [hash(f.contract)];
  Object.assign(f.context.reservationIntents[0], {
    contractSha256: hash(f.contract),
    planningAt: "2026-10-02T02:00:00+09:00",
    requestAt: "2026-10-02T09:00:00+09:00",
    channel: "PHONE",
    payment: "CASH",
    acceptedPassengerRulesSha256: hash(f.contract.passengerRules),
  });
  f.validation = {
    sources: f.sources,
    evidence: f.evidence,
    patternById: f.patternById,
    nodes: f.nodes,
  };
  return f;
}
const path = (f) => queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context);
test("actual generator/validator uses v2 and preserves real public fixed round trip; default denies", () => {
  const f = fixedPhoneFixture();
  validateEdges(f.edges, f.validation);
  assert(path(f));
  assert(queryGraph(f.edges, f.ids.airport, f.ids.bank, f.context));
  assert.equal(queryGraph(f.edges, f.ids.bank, f.ids.airport), null);
  assert.equal(
    queryGraph(
      f.edges.filter((e) => e.servicePatternRef === "synthetic-outbound"),
      f.ids.port,
      f.ids.bank,
      f.context,
    ),
    null,
  );
  assert.equal(
    queryGraph(
      f.edges.filter((e) => e.servicePatternRef === "synthetic-inbound"),
      f.ids.bank,
      f.ids.port,
      f.context,
    ),
    null,
  );
});
for (const [label, mutate] of [
  ["02h immediate request", (i) => (i.requestAt = "2026-10-02T02:00:00+09:00")],
  [
    "before reception by one millisecond",
    (i) => (i.requestAt = "2026-10-02T08:59:59.999+09:00"),
  ],
  [
    "after reception by one millisecond",
    (i) => {
      i.planningAt = "2026-10-01T09:00:00+09:00";
      i.requestAt = "2026-10-01T17:00:00.001+09:00";
    },
  ],
  ["after deadline", (i) => (i.requestAt = "2026-10-02T17:00:00.001+09:00")],
  [
    "retrospective booking",
    (i) => (i.planningAt = "2026-10-02T10:00:00+09:00"),
  ],
  [
    "late planning",
    (i) => {
      i.planningAt = "2026-10-02T18:00:00+09:00";
      i.requestAt = "2026-10-02T18:00:00+09:00";
    },
  ],
  ["no request time", (i) => delete i.requestAt],
  ["no timezone", (i) => (i.requestAt = "2026-10-02T09:00:00")],
  ["invalid date", (i) => (i.requestAt = "2026-02-30T09:00:00+09:00")],
  ["invalid month", (i) => (i.requestAt = "2026-99-99T09:00:00+09:00")],
  ["WEB", (i) => (i.channel = "WEB")],
  ["card", (i) => (i.payment = "CARD")],
  ["no cash commitment", (i) => delete i.payment],
  [
    "unacknowledged passenger rules",
    (i) => delete i.acceptedPassengerRulesSha256,
  ],
  [
    "wrong passenger rules",
    (i) => (i.acceptedPassengerRulesSha256 = "f".repeat(64)),
  ],
])
  test(label + " rejects", () => {
    const f = fixedPhoneFixture();
    mutate(f.context.reservationIntents[0]);
    assert.equal(path(f), null);
  });
for (const requestAt of [
  "2026-10-02T09:00:00+09:00",
  "2026-10-02T17:00:00+09:00",
  "2026-10-02T08:00:00Z",
])
  test("exact valid reception/deadline boundary " + requestAt, () => {
    const f = fixedPhoneFixture();
    f.context.reservationIntents[0].requestAt = requestAt;
    assert(path(f));
  });
for (const [label, mutate] of [
  ["reception stripped", (c) => delete c.reservation.reception],
  ["payment stripped", (c) => delete c.payment],
  ["passenger rules stripped", (c) => delete c.passengerRules],
  [
    "wrong reception",
    (c) => (c.reservation.reception.startLocalTime = "00:00"),
  ],
  ["unknown condition", (c) => (c.unmodeledQualification = "RESIDENT")],
  ["version downgrade", (c) => (c.schemaVersion = 1)],
])
  test(label + " fails actual edge provenance validation", () => {
    const f = fixedPhoneFixture();
    mutate(f.edges[0].accessContract);
    f.edges[0].accessContractSha256 = hash(f.edges[0].accessContract);
    assert.throws(() => validateEdges(f.edges, f.validation));
  });
test("condition source revoked fails actual edge validation", () => {
  const f = fixedPhoneFixture();
  f.evidence.delete("condition-proof");
  assert.throws(() => validateEdges(f.edges, f.validation));
});
test("source raw contract downgrade cannot escape by stripping resolved edge fields", () => {
  const f = fixedPhoneFixture();
  for (const e of f.edges) {
    delete e.accessContract;
    delete e.accessContractSha256;
    delete e.conditionalTopology;
  }
  assert.throws(() => validateEdges(f.edges, f.validation));
});
test("expired service rejects context", () => {
  const f = fixedPhoneFixture();
  f.context.travelDate = "2026-10-21";
  assert.equal(path(f), null);
});
