import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  hash,
  id,
  admitNodes,
  factCallingRestrictions,
} from "../tools/transport/task-086-model.mjs";
import {
  validateAccessContract,
  validDateOnly,
  strictPlanningInstant,
  generateConditionalPattern,
  validateConditionalEdges,
  queryGraph,
  reachablePaths,
  validPath,
  queryWitness,
  publicStructuralRoundTrip,
} from "./helpers/task-086-service-access-harness.mjs";
import { fixture } from "./helpers/task-086-service-access-fixture.mjs";

test("strict actual production generator retains conditional contract and all boarding flags", () => {
  const f = fixture();
  assert.equal(f.edges.length, 4);
  assert.equal(f.edges[0].alightAllowed, false);
  assert.equal(f.edges[1].boardAllowed, true);
  assert.equal(f.edges[3].boardAllowed, false);
  assert.ok(f.edges.every((e) => e.accessContractSha256 === hash(f.contract)));
});
test("default query, reachability and independent stage path reject unbooked conditional edges", () => {
  const f = fixture(),
    { bank, airport } = f.ids;
  assert.equal(queryGraph(f.edges, bank, airport), null);
  assert.equal(reachablePaths(f.edges, bank).has(airport), false);
  const raw = queryGraph(f.edges, bank, airport, f.context);
  assert.ok(raw);
  assert.equal(
    validPath(raw, bank, airport, new Map(f.edges.map((e) => [e.edgeId, e]))),
    false,
  );
});
test("explicit public conditional path carries unmet real booking warning and roundtrip evidence", () => {
  const f = fixture();
  const r = publicStructuralRoundTrip(
    f.edges,
    f.ids.bank,
    f.ids.airport,
    f.context,
  );
  assert.equal(r.kind, "EVIDENCED_PUBLIC_CONDITIONAL_ROUND_TRIP");
  assert.equal(r.ordinaryDefaultReachableBoth, false);
  assert.equal(r.outbound.bookingConfirmed, false);
  assert.equal(r.outbound.unconditional, false);
  assert.equal(r.outbound.conditions.length, 1);
  assert.equal(r.globalGateClosed, false);
});
for (const [name, mutate] of [
  ["missing contract acknowledgement", (c) => (c.acceptedContracts = [])],
  [
    "wrong contract fingerprint",
    (c) => (c.acceptedContracts = ["f".repeat(64)]),
  ],
  ["expired", (c) => (c.travelDate = "2026-10-21")],
  ["before valid period", (c) => (c.travelDate = "2026-08-31")],
  ["missing date", (c) => delete c.travelDate],
  ["implicit condition override", (c) => (c.kind = "ANY")],
])
  test(name + " rejects path", () => {
    const f = fixture();
    mutate(f.context);
    assert.equal(
      queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context),
      null,
    );
  });
test("hotel eligibility is never public structure and needs exact property-scoped qualification", () => {
  const f = fixture("ELIGIBILITY_RESTRICTED");
  assert.equal(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context), null);
  f.context.eligibilityKeys = ["hotel:synthetic-property:registered-guest"];
  assert.equal(
    publicStructuralRoundTrip(f.edges, f.ids.bank, f.ids.airport, f.context),
    null,
  );
  f.context.publicStructureOnly = false;
  assert.ok(queryWitness(f.edges, f.ids.bank, f.ids.airport, f.context));
  f.context.eligibilityKeys = ["hotel:other-property:registered-guest"];
  assert.equal(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context), null);
});
test("actual directional boarding prevents forbidden local single-pattern journeys", () => {
  const f = fixture(),
    out = f.generate(f.outbound),
    back = f.generate(f.inbound);
  assert.equal(queryGraph(out, f.ids.port, f.ids.bank, f.context), null);
  assert.equal(queryGraph(back, f.ids.bank, f.ids.port, f.context), null);
  assert.ok(queryGraph(out, f.ids.port, f.ids.airport, f.context));
  assert.ok(queryGraph(back, f.ids.airport, f.ids.port, f.context));
  assert.equal(queryGraph(out, f.ids.airport, f.ids.bank, f.context), null);
});
test("native2/3 are rejected, never changed to ordinary0", () => {
  for (const type of ["2", "3"])
    assert.throws(
      () =>
        factCallingRestrictions({
          callingStations: ["a"],
          callingRestrictions: [{ pickupType: type, dropOffType: "0" }],
        }),
      /INVALID_FACT_BOARDING_RESTRICTIONS/,
    );
});
test("pattern cannot drop or change condition despite valid source fingerprints", () => {
  const f = fixture();
  delete f.outbound.accessContract;
  assert.throws(() => f.generate(f.outbound), /ACCESS_CONTRACT_KIND/);
});
test("source and raw fact changes invalidate exact binding", () => {
  const f = fixture();
  f.sources.values().next().value.contentSha256 = hash("changed");
  assert.throws(() => f.generate(f.outbound), /PATTERN_EVIDENCE_INVALID/);
  const g = fixture();
  g.evidence.get("fact:outbound").record.accessContract.audience =
    "ELIGIBILITY_RESTRICTED";
  assert.throws(() => g.generate(g.outbound));
});
test("stripped edge conditions and shortcut laundering are rejected", () => {
  const f = fixture();
  const stripped = structuredClone(f.edges);
  for (const e of stripped) {
    delete e.accessContract;
    delete e.accessContractSha256;
    delete e.conditionalTopology;
  }
  assert.throws(
    () =>
      validateConditionalEdges(stripped, f.sources, f.evidence, f.patternById),
    /STRIPPED/,
  );
  const direct = structuredClone(f.edges);
  direct[0].edgeKind = "direct_service";
  assert.throws(
    () =>
      validateConditionalEdges(direct, f.sources, f.evidence, f.patternById),
    /SHORTCUT/,
  );
});
test("frozen ordinary national paths retain exact pre-integration edge IDs", () => {
  const v = JSON.parse(
    fs.readFileSync(
      new URL(
        "./fixtures/task-086-service-access/ordinary-national-path.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(queryGraph(v.edges, v.anchor, v.airport), v.forward);
  assert.deepEqual(queryGraph(v.edges, v.airport, v.anchor), v.reverse);
});

test("missing booking intent or missed prior-day cutoff rejects planning query", () => {
  const f = fixture();
  delete f.context.reservationIntents;
  assert.equal(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context), null);
  const g = fixture();
  g.context.reservationIntents[0].planningAt = "2026-10-02T08:00:01Z";
  assert.equal(queryGraph(g.edges, g.ids.bank, g.ids.airport, g.context), null);
  g.context.reservationIntents[0].planningAt = "2026-10-02T08:00:00Z";
  assert.ok(queryGraph(g.edges, g.ids.bank, g.ids.airport, g.context));
});
test("unmodeled access qualifier cannot be silently discarded", () => {
  const f = fixture();
  f.outbound.accessContract = structuredClone(f.outbound.accessContract);
  f.outbound.accessContract.extraPassengersOnly = true;
  assert.throws(() => f.generate(f.outbound), /UNMODELED_ACCESS_CONSTRAINT/);
});
test("known required reservation metric alone fails closed without static contract", () => {
  const e = {
    edgeId: "metric-only",
    fromTransportNodeId: "a",
    toTransportNodeId: "b",
    boardAllowed: true,
    alightAllowed: true,
    metrics: { reservation: { status: "resolved", value: "required" } },
  };
  assert.equal(queryGraph([e], "a", "b"), null);
});

for (const value of [
  "2026-02-30",
  "2026-02-29",
  "2026-99-99",
  "2026-00-10",
  "2026-09-31",
  "2026-10-00",
])
  test("strict calendar rejects " + value, () => {
    assert.equal(validDateOnly(value), false);
    const f = fixture();
    for (const key of ["validFrom", "validTo"]) {
      const c = structuredClone(f.contract);
      c[key] = value;
      assert.throws(() => validateAccessContract(c), /ACCESS_VALIDITY/);
    }
  });
test("real leap day is allowed and invalid travel day cannot normalize", () => {
  assert.equal(validDateOnly("2024-02-29"), true);
  const f = fixture();
  f.context.travelDate = "2026-09-31";
  f.context.reservationIntents[0].travelDate = "2026-09-31";
  assert.equal(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context), null);
});
for (const value of [
  "2026-10-01T00:00:00",
  "2026-09-31T00:00:00Z",
  "2026-10-01T24:00:00Z",
  "2026-10-01T00:60:00Z",
  "2026-10-01T00:00:60Z",
  "2026-10-01T00:00:00+09:60",
  "2026-10-01T00:00:00+14:01",
  "2026-10-01T00:00:00+99:00",
])
  test("strict planning timestamp rejects " + value, () => {
    assert.equal(strictPlanningInstant(value), null);
    const f = fixture();
    f.context.reservationIntents[0].planningAt = value;
    assert.equal(
      queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context),
      null,
    );
  });
test("prior-day17 JST boundary exact and explicit timezone equivalent", () => {
  const f = fixture();
  for (const value of [
    "2026-10-02T16:59:59.999+09:00",
    "2026-10-02T17:00:00+09:00",
    "2026-10-02T08:00:00Z",
  ]) {
    f.context.reservationIntents[0].planningAt = value;
    assert.ok(queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context));
  }
  for (const value of [
    "2026-10-02T17:00:00.001+09:00",
    "2026-10-02T08:00:00.001Z",
  ]) {
    f.context.reservationIntents[0].planningAt = value;
    assert.equal(
      queryGraph(f.edges, f.ids.bank, f.ids.airport, f.context),
      null,
    );
  }
});

test("pure module has no import or filesystem dependency", () => {
  const text = fs.readFileSync(
    new URL(
      "../tools/transport/task-086-service-access-contract.mjs",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(/^\s*import\b/m.test(text), false);
  assert.equal(
    /(?:readFile|writeFile|fetch|queryGraph)\s*\(/.test(text),
    false,
  );
});
test("resolved contract stripped and resealed still fails exact fact binding", () => {
  const f = fixture();
  const r = structuredClone(f.evidence.get("pattern:outbound").record);
  delete r.accessContract;
  f.seal("pattern:outbound", r);
  assert.throws(() => f.generate(f.outbound), /ACCESS_CONTRACT_SOURCE_BINDING/);
});
test("source fact contract stripped and resealed still fails exact resolved binding", () => {
  const f = fixture();
  const r = structuredClone(f.evidence.get("fact:outbound").record);
  delete r.accessContract;
  f.seal("fact:outbound", r);
  assert.throws(() => f.generate(f.outbound), /ACCESS_CONTRACT_SOURCE_BINDING/);
});
test("edge fields and evidence stripped together fail against independent pattern registry", () => {
  const f = fixture();
  const stripped = structuredClone(f.edges);
  for (const e of stripped) {
    delete e.accessContract;
    delete e.accessContractSha256;
    delete e.conditionalTopology;
    e.topologyEvidenceRefs = ["condition-proof"];
  }
  assert.throws(
    () =>
      validateConditionalEdges(stripped, f.sources, f.evidence, f.patternById),
    /STRIPPED/,
  );
});
test("conditional edge validation requires independent pattern registry", () => {
  const f = fixture();
  assert.throws(
    () => validateConditionalEdges(f.edges, f.sources, f.evidence),
    /EDGE_PATTERN_REGISTRY_INCOMPLETE/,
  );
});
test("required metric cannot bypass ordinary pattern generator path in adapter", () => {
  const f = fixture();
  const p = {
    ...f.outbound,
    metrics: { reservation: { status: "unresolved", value: "required" } },
  };
  delete p.accessContract;
  for (const k of ["pattern:outbound", "fact:outbound"]) {
    const r = structuredClone(f.evidence.get(k).record);
    delete r.accessContract;
    f.seal(k, r);
  }
  assert.throws(
    () => f.generate(p),
    /REQUIRED_RESERVATION_WITHOUT_ACCESS_CONTRACT/,
  );
});
test("source condition evidence ref stripping invalidates edge", () => {
  const f = fixture();
  const e = structuredClone(f.edges);
  e[0].topologyEvidenceRefs = e[0].topologyEvidenceRefs.filter(
    (x) => x !== "condition-proof",
  );
  assert.throws(
    () => validateConditionalEdges(e, f.sources, f.evidence, f.patternById),
    /REQUIRED_REFS_STRIPPED/,
  );
});
test("malformed context and partial conditional markers fail closed", () => {
  const f = fixture();
  for (const field of ["acceptedContracts", "reservationIntents"]) {
    const c = structuredClone(f.context);
    c[field] = "not-an-array";
    assert.equal(queryGraph(f.edges, f.ids.bank, f.ids.airport, c), null);
  }
  const e = {
    edgeId: "partial",
    fromTransportNodeId: "a",
    toTransportNodeId: "b",
    accessContractSha256: "f".repeat(64),
    boardAllowed: true,
    alightAllowed: true,
  };
  assert.equal(queryGraph([e], "a", "b"), null);
});
test("condition provenance refs require nonempty strings array", () => {
  const f = fixture();
  for (const value of ["abc", [], [null], [""], ["same", "same"]]) {
    const c = structuredClone(f.contract);
    c.sourceEvidenceRefs = value;
    assert.throws(() => validateAccessContract(c), /ACCESS_SOURCE_REFS/);
  }
});

test("pure walk adjacency is not a conditional public service roundtrip witness", () => {
  const f = fixture();
  const walks = [
    {
      edgeId: "walk-ab",
      edgeKind: "hub_transfer",
      fromTransportNodeId: "a",
      toTransportNodeId: "b",
      boardAllowed: true,
      alightAllowed: true,
    },
    {
      edgeId: "walk-ba",
      edgeKind: "hub_transfer",
      fromTransportNodeId: "b",
      toTransportNodeId: "a",
      boardAllowed: true,
      alightAllowed: true,
    },
  ];
  assert.ok(queryGraph(walks, "a", "b"));
  assert.equal(publicStructuralRoundTrip(walks, "a", "b", f.context), null);
});

import {
  anchorQueries,
  validateEdges as actualValidateEdges,
  generatePattern as actualGeneratePattern,
} from "../tools/transport/task-086-model.mjs";
test("integrated model actual anchor forward and mirrored reverse preserve context", () => {
  const f = fixture();
  const query = anchorQueries(f.edges, f.ids.airport, f.context),
    plain = anchorQueries(f.edges, f.ids.airport);
  assert.ok(query(f.ids.airport, f.ids.port));
  assert.ok(query(f.ids.port, f.ids.airport));
  assert.equal(plain(f.ids.airport, f.ids.port), null);
  assert.equal(plain(f.ids.port, f.ids.airport), null);
  const viaAirport = query(f.ids.port, f.ids.bank);
  assert.ok(viaAirport);
  const by = new Map(f.edges.map((e) => [e.edgeId, e]));
  assert.ok(validPath(viaAirport, f.ids.port, f.ids.bank, by, f.context));
  assert.ok(
    viaAirport.some((id) => by.get(id).toTransportNodeId === f.ids.airport),
  );
  assert.equal(
    new Set(viaAirport.map((id) => by.get(id).servicePatternRef)).size,
    2,
  );
  assert.equal(
    queryGraph(
      f.edges.filter(
        (e) => e.servicePatternRef === f.outbound.servicePatternId,
      ),
      f.ids.port,
      f.ids.bank,
      f.context,
    ),
    null,
  );
});
test("integrated model actual validator rejects context-free conditional graph", () => {
  const f = fixture();
  assert.throws(
    () => actualValidateEdges(f.edges),
    /EDGE_ACCESS_VALIDATION_CONTEXT_REQUIRED/,
  );
  assert.throws(
    () =>
      actualValidateEdges(f.edges, {
        sources: f.sources,
        evidence: f.evidence,
      }),
    /EDGE_VALIDATION_CONTEXT_INCOMPLETE/,
  );
});
test("integrated model direct production generation attaches contract without adapter", () => {
  const f = fixture();
  const e = actualGeneratePattern(
    f.outbound,
    f.nodes,
    f.sources,
    f.evidence,
    "2026-10-03",
  );
  assert.ok(
    e.every(
      (x) =>
        x.conditionalTopology && x.accessContractSha256 === hash(f.contract),
    ),
  );
});
