import { fileURLToPath } from "node:url";
import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  hash,
  canonical,
  verifyEvidence,
  generatePattern,
  validateEdges,
  queryGraph,
  admitNodes,
} from "../tools/transport/task-086-model.mjs";
import { attachODContexts } from "../tools/transport/task-086-dynamic-od-registry.mjs";
import {
  abrNativeShape,
  abrSourcesBound,
} from "../tools/transport/task-086-abr-public-facility.mjs";
const saved = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/task-086-hateruma/actual.json", import.meta.url),
    "utf8",
  ),
);
function fixture() {
  const a = structuredClone(saved),
    v = {
      nodes: new Map(a.nodes.map((n) => [n.nodeId, n])),
      sources: new Map(
        [...a.baselineAirportSources, ...a.sources].map((s) => [s.sourceId, s]),
      ),
      evidence: new Map(
        [...a.baselineAirportEvidence, ...a.evidence].map((e) => [
          e.evidenceId,
          e,
        ]),
      ),
      patternById: new Map(a.patterns.map((p) => [p.servicePatternId, p])),
      dynamicODById: new Map(),
      nativeFacilityByAnchor: new Map([
        [
          a.nativeEntry.nativeIdentity.identityAnchor,
          a.nativeEntry.nativeIdentity,
        ],
      ]),
    };
  return {
    a,
    v,
    bus: a.patterns.find((p) => p.mode === "local_bus"),
    edge: a.edges.find((e) => e.mode === "local_bus"),
  };
}
function ctx(f) {
  return attachODContexts([f.a.context], f.v)[0];
}
function route(f, c) {
  return queryGraph(
    f.a.edges,
    f.edge.fromTransportNodeId,
    f.edge.toTransportNodeId,
    c,
  );
}
function generate(f) {
  return generatePattern(
    f.bus,
    f.v.nodes,
    f.v.sources,
    f.v.evidence,
    "2026-10-01T00:00:00Z",
    f.v,
  );
}
function reseal(e) {
  e.recordSha256 = hash(e.record);
}
test("real 2 independent flights + 2 shuttle rides, exact ABR identity, explicit qualified context", () => {
  const f = fixture();
  assert.doesNotThrow(() => validateEdges(f.a.edges, f.v));
  assert.equal(generate(f).length, 1);
  assert.ok(route(f, ctx(f)));
  assert.equal(route(f), null);
  assert.equal(route(f, { ...ctx(f), publicStructureOnly: true }), null);
  assert.equal(
    f.a.nodes.filter(
      (n) =>
        n.identityRecord?.dataset ===
        "ABR_EXACT_MUNICIPAL_PUBLIC_FACILITY_PARCEL",
    ).length,
    1,
  );
});
for (const [name, change] of Object.entries({
  public: (c) => (c.publicStructureOnly = true),
  wrongdate: (c) => (c.travelDate = "2026-10-04"),
  invaliddate: (c) => (c.travelDate = "2026-02-30"),
  expired: (c) => (c.travelDate = "2027-10-05"),
  noeligibility: (c) => (c.eligibilityKeys = []),
  noacceptance: (c) => (c.acceptedContracts = []),
  nointent: (c) => (c.airPassengerIntents = []),
}))
  test("context rejects " + name, () => {
    const f = fixture();
    change(f.a.context);
    assert.equal(route(f, ctx(f)), null);
  });
for (const [name, key, value] of [
  ["hotel", "lodgingVisitor", true],
  ["wrongrole", "passengerRole", "GENERAL_PUBLIC"],
  ["unrelatedflightuser", "linkedFlightUserDeclared", false],
  ["tenpassengers", "partySize", 10],
  ["zero", "partySize", 0],
  ["fraction", "partySize", 1.5],
  ["wet", "wetBody", true],
  ["food", "willEat", true],
  ["drink", "willDrink", true],
  ["smoke", "willSmokeIncludingHeatedOrElectronic", true],
  ["no-direct-ack", "acceptsDirectServiceOnly", false],
  ["no-capacity-ack", "acceptsCapacityRefusal", false],
  ["no-dispatch-ack", "acceptsNoSeatOrActualDispatchGuarantee", false],
  ["cancelled", "flightServiceStatus", "CANCELLED"],
  ["diverted", "flightServiceStatus", "DIVERTED"],
  ["unknown", "flightServiceStatus", "UNKNOWN"],
  ["wrongflight", "flightServicePatternId", "wrong"],
  ["wrongrules", "acceptedPassengerRulesSha256", "0".repeat(64)],
])
  test("passenger intent rejects " + name, () => {
    const f = fixture();
    for (const i of f.a.context.airPassengerIntents) i[key] = value;
    assert.equal(route(f, ctx(f)), null);
  });
for (const kind of [
  "REVIEWED_FLIGHT_OPERATING_DATES",
  "REVIEWED_FLIGHT_USER_SHUTTLE_CONDITIONS",
  "REVIEWED_MUNICIPAL_PUBLIC_FACILITY_ROLE",
  "REVIEWED_ABR_POSITION_ARCHIVE_BINDING",
])
  test("withdraw " + kind, () => {
    const f = fixture();
    const ref = [...f.v.evidence.values()].find(
      (e) => e.record.kind === kind,
    ).evidenceId;
    f.v.evidence.delete(ref);
    assert.throws(() => generate(f));
    assert.equal(route(f, ctx(f)), null);
  });
for (const [name, mutate] of Object.entries({
  missingflight: (f) =>
    f.v.patternById.delete(f.bus.accessContract.flightService.servicePatternId),
  flightretired: (f) =>
    (f.v.patternById.get(
      f.bus.accessContract.flightService.servicePatternId,
    ).serviceState = "retired"),
  recursiveflight: (f) =>
    (f.v.patternById.get(
      f.bus.accessContract.flightService.servicePatternId,
    ).accessContract = structuredClone(f.bus.accessContract)),
  badflightdate: (f) => {
    const e = f.v.evidence.get(
      f.bus.accessContract.flightService.sourceFactRef,
    );
    e.record.reviewedServiceDate = "20261004";
    reseal(e);
  },
  oldcomment: (f) => {
    const e = f.v.evidence.get(
      f.bus.accessContract.flightService.sourceFactRef,
    );
    e.record.visibleScheduleOnly = false;
    reseal(e);
  },
  inventflightnumber: (f) => {
    const e = f.v.evidence.get(
      f.bus.accessContract.flightService.sourceFactRef,
    );
    e.record.reviewedFlightCode = "MADEUP";
    reseal(e);
  },
  calendarfake: (f) => {
    const e = f.v.evidence.get(
      f.bus.accessContract.flightService.calendarEvidenceRef,
    );
    e.record.operatingDates.push("2026-10-04");
    reseal(e);
  },
  badsource: (f) =>
    (f.v.sources.get(
      f.v.evidence.get(f.bus.accessContract.conditionsEvidenceRef).sourceId,
    ).evidenceContentSha256 = "0".repeat(64)),
}))
  test("source dependency rejects " + name, () => {
    const f = fixture();
    mutate(f);
    assert.throws(() => generate(f));
    assert.equal(route(f, ctx(f)), null);
  });
test("complete contract stripping of edge/pattern/resolved/raw cannot publish unconditional shuttle", () => {
  const f = fixture();
  for (const e of f.a.edges.filter((e) => e.mode === "local_bus")) {
    delete e.accessContract;
    delete e.serviceAccessProfile;
  }
  for (const p of f.a.patterns.filter((p) => p.mode === "local_bus")) {
    delete p.accessContract;
    delete p.serviceAccessProfile;
    for (const ref of [...p.evidenceRefs, p.sourceFactRef]) {
      const e = f.v.evidence.get(ref);
      delete e.record.accessContract;
      delete e.record.serviceAccessProfile;
      reseal(e);
    }
  }
  assert.throws(() => generate(f), /STRIPPED/);
  assert.throws(() => validateEdges(f.a.edges, f.v));
  assert.equal(route(f), null);
});
const deps = { canonical, hash, verifyEvidence };
test("ABR typed two archive rights bind actual named public park", () => {
  const f = fixture(),
    e = f.a.nativeEntry;
  assert.ok(abrNativeShape(e.nativeIdentity, deps));
  assert.ok(
    abrSourcesBound(
      e.nativeIdentity,
      [e.nativeIdentityEvidenceRef, ...e.nativeSupplementalEvidenceRefs],
      f.v,
      deps,
    ),
  );
});
for (const [name, mutate] of Object.entries({
  positionlicense: (f) => {
    const e = f.v.evidence.get(
      f.a.nativeEntry.nativeSupplementalEvidenceRefs[0],
    );
    f.v.sources.get(e.sourceId).license = "CC-BY-4.0";
  },
  missingposition: (f) =>
    f.v.evidence.delete(f.a.nativeEntry.nativeSupplementalEvidenceRefs[0]),
  privaterole: (f) => {
    const e = [...f.v.evidence.values()].find(
      (e) => e.record.kind === "REVIEWED_MUNICIPAL_PUBLIC_FACILITY_ROLE",
    );
    e.record.facilityRole = "PRIVATE_HOTEL";
    reseal(e);
  },
  withdrawterms: (f) => {
    const e = [...f.v.evidence.values()].find(
      (e) => e.record.termsType === "MOJ_MAP_DATA_TERMS",
    );
    f.v.evidence.delete(e.evidenceId);
  },
  missingattribution: (f) =>
    (f.v.sources.get("hateruma229:abr:master").rightsBinding.attribution = ""),
  forbiddenraw: (f) =>
    (f.v.sources.get("hateruma229:abr:position").persistenceAllowed = false),
}))
  test("ABR rejects " + name, () => {
    const f = fixture();
    mutate(f);
    const e = f.a.nativeEntry;
    assert.equal(
      abrSourcesBound(
        e.nativeIdentity,
        [e.nativeIdentityEvidenceRef, ...e.nativeSupplementalEvidenceRefs],
        f.v,
        deps,
      ),
      false,
    );
  });
for (const [name, mutate] of Object.entries({
  wrongparcel: (n) => (n.nativeRecord.position.prc_id = "other"),
  wrongmunicipality: (n) => (n.nativeRecord.position.lg_code = "other"),
  wrongarea: (n) => (n.nativeRecord.position.machiaza_id = "other"),
  coordinates: (n) => (n.latitude += 0.01),
  curb: (n) => (n.coordinateScope = "EXACT_CURB"),
  google: (n) =>
    (n.nativeRecord.municipalFacilityAddressReview.googleCoordinatesUsed = true),
  privaterole: (n) => (n.dataset = "ABR_PRIVATE_HOTEL"),
}))
  test("ABR shape rejects " + name, () => {
    const f = fixture(),
      n = f.a.nativeEntry.nativeIdentity;
    mutate(n);
    n.nativeRecordSha256 = hash(n.nativeRecord);
    assert.equal(abrNativeShape(n, deps), false);
  });
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadOfficialBusFacilityInputs } from "../tools/transport/task-086-official-facility-bus-registry.mjs";
import { loadQualifiedContextInputs } from "../tools/transport/task-086-qualified-inputs.mjs";
import { reviewedConditionalApplicability } from "../tools/transport/task-086-model.mjs";
function qualified(f) {
  const r = f.a.qualifiedReview,
    req = {
      kind: "airport",
      requirementId: r.requirementId,
      nodeId: r.airportNodeId,
      name: "波照間",
      tier: "T3",
    },
    context = attachODContexts([f.a.qualifiedContext], f.v)[0];
  return reviewedConditionalApplicability({
    nodes: [...f.v.nodes.values()],
    edges: f.a.edges,
    inventory: [req],
    anchorNodeId: f.a.nodes.find((n) => n.canonicalNameJa === "新石垣空港")
      .nodeId,
    deficits: [
      {
        deficitId: r.checkId,
        requirementId: r.requirementId,
        nodeId: r.airportNodeId,
        class: "AIRPORT_SURFACE_GAP",
      },
    ],
    corridors: [],
    contexts: context ? [context] : [],
    validationContext: f.v,
  });
}
test("same original structural check consumes real qualified pair, retains default failure", () => {
  const f = fixture(),
    r = qualified(f);
  assert.equal(
    r.qualifiedReviews[0].status,
    "STRUCTURALLY_CONNECTED_WITH_REVIEWED_QUALIFICATION",
  );
  assert.equal(r.assessments[0].checkId, f.a.qualifiedReview.checkId);
  assert.equal(
    r.assessments[0].originalDefaultFailure.class,
    "AIRPORT_SURFACE_GAP",
  );
  assert.equal(r.assessments[0].publicServiceClaim, false);
});
for (const [name, mutate] of Object.entries({
  withdrawreview: (f) => delete f.a.qualifiedContext.qualificationReview,
  changeinput: (f) =>
    (f.a.qualifiedContext.qualifiedInputBindings[0][1] = "0".repeat(64)),
  wrongeligibility: (f) => (f.a.qualifiedContext.eligibilityKeys = ["PUBLIC"]),
  wrongdate: (f) => (f.a.qualifiedContext.travelDate = "2026-10-04"),
  oneway: (f) =>
    (f.a.edges = f.a.edges.filter(
      (e) => e.edgeId !== f.a.qualifiedReview.edgeIds[0],
    )),
  wrongendpoint: (f) =>
    (f.a.qualifiedContext.qualificationReview.endpointNodeId =
      f.a.qualifiedContext.qualificationReview.airportNodeId),
  sourcewithdrawal: (f) =>
    (f.v.sources.get("hateruma229:abr:position").persistenceAllowed = false),
  contextstrip: (f) => (f.a.qualifiedContext.airPassengerIntents = []),
}))
  test("qualified structural witness reopens " + name, () => {
    const f = fixture();
    mutate(f);
    if (name === "sourcewithdrawal") {
      assert.throws(
        () => qualified(f),
        /AIR_SHUTTLE_REAL_DIRECT_PUBLIC_COMPONENTS/,
      );
      return;
    }
    const r = qualified(f);
    assert(
      !r.assessments.some(
        (a) =>
          a.status === "STRUCTURALLY_CONNECTED_WITH_REVIEWED_QUALIFICATION",
      ),
    );
  });
const registration = new URL(
  "./fixtures/task-086-hateruma/registration/",
  import.meta.url,
);
function registry(dir = registration) {
  const packs = fs
      .readdirSync(new URL("sources/", dir))
      .filter((n) => n.endsWith(".json"))
      .map((n) =>
        JSON.parse(fs.readFileSync(new URL("sources/" + n, dir), "utf8")),
      ),
    sources = new Map(packs.map((p) => [p.source.sourceId, p.source])),
    evidence = new Map(
      packs.flatMap((p) => p.evidence).map((e) => [e.evidenceId, e]),
    ),
    actions = fs
      .readFileSync(new URL("next-source-actions.jsonl", dir), "utf8")
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse);
  return { sources, evidence, actions };
}
test("actual persisted dual ZIP extraction + independent source packages load admission and qualified review", () => {
  const r = registry(),
    loaded = loadOfficialBusFacilityInputs(
      fileURLToPath(registration),
      r.sources,
      r.evidence,
      r.actions,
    );
  assert.equal(loaded.candidates.size, 1);
  assert(
    loaded.inputPaths.includes("sources/raw/hateruma-abr-position-473812.zip"),
  );
  assert.equal(
    admitNodes(
      [...loaded.candidates.values()],
      r.sources,
      r.evidence,
      [],
      loaded,
    )[0].decision,
    "ADMIT_TASK_086_TOPOLOGY",
  );
  assert.equal(
    loadQualifiedContextInputs(fileURLToPath(registration)).contexts[0]
      .qualificationInputError,
    null,
  );
});
test("actual second native archive byte mutation fails before admission", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task086-hateruma-"));
  try {
    fs.cpSync(registration, tmp, { recursive: true });
    fs.appendFileSync(
      path.join(tmp, "sources/raw/hateruma-abr-position-473812.zip"),
      "changed",
    );
    const r = registry();
    assert.throws(
      () =>
        loadOfficialBusFacilityInputs(tmp, r.sources, r.evidence, r.actions),
      /ABR_POSITION_ARCHIVE_HASH/,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
test("permanent offline Python native extractor positive and 13 source-key negatives", () => {
  const output = execFileSync(
    process.env.TASK086_PYTHON ?? "python",
    [path.join(import.meta.dirname, "task-086-hateruma-abr.test.py")],
    {
      encoding: "utf8",
      env: { ...process.env, PYTHONUTF8: "1" },
      stdio: "pipe",
    },
  );
  assert.match(output, /ABR_UNITTESTS_PASS/);
});
