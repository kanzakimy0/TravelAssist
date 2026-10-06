import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  canonical,
  admitNodes,
  queryGraph,
  generatePattern,
  reviewedConditionalApplicability,
} from "../tools/transport/task-086-model.mjs";
import {
  loadQualifiedHotelInputs,
  loadQualifiedContextInputs,
  bindQualifiedHotelSelector,
} from "../tools/transport/task-086-qualified-inputs.mjs";
import { attachODContexts } from "../tools/transport/task-086-dynamic-od-registry.mjs";
const location = new URL("./fixtures/task-086-hamayuso/", import.meta.url);
function fixture() {
  const f = JSON.parse(
      fs.readFileSync(new URL("actual-subgraph.json", location), "utf8"),
    ),
    v = {
      nodes: new Map(f.nodes.map((x) => [x.nodeId, x])),
      sources: new Map(f.sources.map((x) => [x.sourceId, x])),
      evidence: new Map(f.evidence.map((x) => [x.evidenceId, x])),
      patternById: new Map(f.patterns.map((x) => [x.servicePatternId, x])),
      nativeFacilityByAnchor: new Map(f.nativeFacilityByAnchor),
      dynamicODById: new Map(),
    },
    airport = v.nodes.get(f.review.airportNodeId),
    hotel = v.nodes.get(f.review.endpointNodeId);
  return { ...f, v, airport, hotel };
}
function assess(f) {
  return reviewedConditionalApplicability({
    nodes: [...f.v.nodes.values()],
    edges: f.edges,
    inventory: [
      {
        requirementId: f.review.requirementId,
        nodeId: f.airport.nodeId,
        kind: "airport",
        tier: "T3",
      },
      {
        requirementId: f.hotel.nodeId,
        nodeId: f.hotel.nodeId,
        kind: "private_hotel_pickup_facility",
        tier: "T3",
      },
    ],
    anchorNodeId: f.airport.nodeId,
    deficits: [
      {
        deficitId: f.review.checkId,
        requirementId: f.review.requirementId,
        class: "AIRPORT_SURFACE_GAP",
      },
    ],
    corridors: [],
    contexts: attachODContexts(f.contexts, f.v),
    validationContext: f.v,
  });
}
function denied(f) {
  try {
    assert.equal(assess(f).assessments[0].status, "OPEN");
  } catch (e) {
    if (e.code === "ERR_ASSERTION") throw e;
    assert(e instanceof Error);
  }
}
function inputFixture(f) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "hamayuso230-")),
    put = (p, x) => {
      fs.mkdirSync(path.dirname(path.join(d, p)), { recursive: true });
      fs.writeFileSync(
        path.join(d, p),
        typeof x === "string" ? x : JSON.stringify(x),
      );
    };
  put("research/qualified-hotel-facilities.v1.json", f.hotelConfig);
  for (const e of f.hotelConfig.facilities)
    for (const k of ["archivePath", "positionArchivePath"]) {
      fs.mkdirSync(path.dirname(path.join(d, e[k])), { recursive: true });
      fs.copyFileSync(
        new URL(path.basename(e[k]), location),
        path.join(d, e[k]),
      );
    }
  put(f.review.phaseFile, f.phase);
  const review = structuredClone(f.review);
  for (const b of review.inputBindings) {
    put(b.path, "bound static fixture");
    b.sha256 = hash(fs.readFileSync(path.join(d, b.path)));
  }
  put("research/review.json", review);
  put("research/qualified-airport-contexts.v1.json", {
    schemaVersion: 1,
    contexts: [{ context: f.context, reviewPath: "research/review.json" }],
  });
  put(
    "next-source-actions.jsonl",
    f.actions.map((a) => JSON.stringify(a)).join("\n"),
  );
  return { d, put };
}
test("actual exact private ABR identity re-extracts both licensed native archives", () => {
  const f = fixture(),
    x = inputFixture(f),
    r = loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions);
  assert.equal(r.candidates.size, 1);
  assert.equal(
    canonical([...r.nativeFacilityByAnchor]),
    canonical(f.nativeFacilityByAnchor),
  );
  const n = admitNodes(
    [...r.candidates.values()],
    f.v.sources,
    f.v.evidence,
    [],
    r,
  )[0];
  assert.equal(n.decision, "ADMIT_TASK_086_TOPOLOGY");
  assert.equal(n.nodeId, f.hotel.nodeId);
  assert.equal(
    loadQualifiedContextInputs(x.d).contexts[0].qualificationInputError,
    null,
  );
});
test("actual sources generate two opposite rides and qualified audit separately passes", () => {
  const f = fixture();
  for (const p of f.patterns) {
    const es = generatePattern(
      p,
      f.v.nodes,
      f.v.sources,
      f.v.evidence,
      "2026-10-01T00:00:00Z",
      f.v,
    );
    assert.equal(es.length, 1);
  }
  assert.equal(
    assess(f).qualifiedReviews[0].status,
    "STRUCTURALLY_CONNECTED_WITH_REVIEWED_QUALIFICATION",
  );
  const c = attachODContexts(f.contexts, f.v)[0];
  assert.equal(
    queryGraph(f.edges, f.airport.nodeId, f.hotel.nodeId, c).length,
    1,
  );
  assert.equal(
    queryGraph(f.edges, f.hotel.nodeId, f.airport.nodeId, c).length,
    1,
  );
});
for (const [name, patch] of Object.entries({
  default: null,
  PUBLIC: { publicStructureOnly: true },
  unconfirmedProduct: { tourProductStatus: "REQUESTED" },
  unknownGuest: { hotelGuestStatus: "UNKNOWN" },
  otherHotel: { hotelIdentityAnchor: "abr:other" },
  missingArrivalReport: { arrivalFlightInformationStatus: "UNKNOWN" },
  cancelled: { flightServiceStatus: "CANCELLED" },
  diverted: { flightServiceStatus: "DIVERTED" },
  unknownFlight: { flightServiceStatus: "UNKNOWN" },
  noCapacityAcknowledgment: { acceptsUnknownShuttleDispatchAndCapacity: false },
  lostQualification: { eligibilityKeys: ["hamayuso:lodging-guest"] },
}))
  test("qualified routing denies " + name, () => {
    const f = fixture(),
      c =
        patch === null
          ? undefined
          : { ...attachODContexts(f.contexts, f.v)[0], ...patch };
    assert.equal(
      queryGraph(f.edges, f.airport.nodeId, f.hotel.nodeId, c),
      null,
    );
    assert.equal(
      queryGraph(f.edges, f.hotel.nodeId, f.airport.nodeId, c),
      null,
    );
  });
for (const [name, change] of Object.entries({
  returnMissing: (f) => f.edges.pop(),
  nativeCoordinate: (f) =>
    (f.v.nativeFacilityByAnchor.get(f.hotel.identityAnchor).longitude += 0.1),
  wrongHotel: (f) => (f.hotel.canonicalNameJa = "別施設"),
  sourceWithdrawn: (f) => {
    const s = [...f.v.sources.values()].find(
      (s) => s.url === "https://south-west.co.jp/tour/okinawa_kitadaitou/",
    );
    s.rightsClass = "REFERENCE_ONLY";
  },
  sourceVersion: (f) => {
    const s = f.v.sources.get(f.review.sourceBindings[0].sourceId);
    s.contentSha256 = "0".repeat(64);
  },
  lostCondition: (f) =>
    delete f.edges[0].accessContract.requiredConditions
      .arrivalFlightInformationReportedToHotel,
  staticReviewChanged: (f) =>
    (f.contexts[0].qualifiedInputBindings[0][1] = "0".repeat(64)),
  defaultAudienceForgery: (f) =>
    (f.edges[0].accessContract.audience = "PUBLIC"),
  publicRoleForgery: (f) => (f.hotel.nodeKind = "public_pickup_facility"),
}))
  test("qualified applicability reopens " + name, () => {
    const f = fixture();
    change(f);
    denied(f);
  });
for (const [name, change] of Object.entries({
  nativeMasterAction: (f) =>
    (f.actions
      .find((a) => a.actionId.endsWith("abr-master"))
      .rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY"),
  nativePositionAction: (f) =>
    (f.actions
      .find((a) => a.actionId.endsWith("abr-position"))
      .rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY"),
  ownerAction: (f) =>
    (f.actions[0].rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY"),
  missingMojTerms: (f) => {
    for (const [e, r] of f.v.evidence)
      if (r.record.termsType === "MOJ_MAP_DATA_TERMS") f.v.evidence.delete(e);
  },
  wrongNativeAddress: (f) =>
    (f.hotelConfig.facilities[0].nativeIdentity.address = "another address"),
  publicDataset: (f) =>
    (f.hotelConfig.facilities[0].nativeIdentity.dataset =
      "ABR_EXACT_MUNICIPAL_PUBLIC_FACILITY_PARCEL"),
  duplicate: (f) => f.hotelConfig.facilities.push(f.hotelConfig.facilities[0]),
}))
  test("native loader rejects " + name, () => {
    const f = fixture();
    change(f);
    const x = inputFixture(f);
    assert.throws(() =>
      loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
    );
  });
for (const k of ["archivePath", "positionArchivePath"])
  test("native loader rejects changed " + k, () => {
    const f = fixture(),
      x = inputFixture(f);
    fs.appendFileSync(
      path.join(x.d, f.hotelConfig.facilities[0][k]),
      "changed",
    );
    assert.throws(
      () => loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
      /ARCHIVE_HASH/,
    );
  });
test("condition profile rejects invented cutoff and forged opposite direction", () => {
  const f = fixture();
  f.patterns[0].accessContract.unknowns.shuttleBookingLeadMinutes = 0;
  assert.throws(() =>
    generatePattern(
      f.patterns[0],
      f.v.nodes,
      f.v.sources,
      f.v.evidence,
      "2026-10-01T00:00:00Z",
      f.v,
    ),
  );
  const g = fixture();
  g.patterns[0].accessContract.direction = "HOTEL_TO_AIRPORT";
  assert.throws(() =>
    generatePattern(
      g.patterns[0],
      g.v.nodes,
      g.v.sources,
      g.v.evidence,
      "2026-10-01T00:00:00Z",
      g.v,
    ),
  );
});
test("persisted phase mutation and product-source action withdrawal invalidate audited context", () => {
  for (const mode of ["phase", "rights"]) {
    const f = fixture(),
      x = inputFixture(f);
    if (mode === "phase") {
      f.phase.facts[0].direction = "OTHER";
      x.put(f.review.phaseFile, f.phase);
    } else {
      f.actions[1].rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY";
      x.put(
        "next-source-actions.jsonl",
        f.actions.map((a) => JSON.stringify(a)).join("\n"),
      );
    }
    assert(loadQualifiedContextInputs(x.d).contexts[0].qualificationInputError);
  }
});
test("typed selector cannot substitute a different record or public park", () => {
  const f = fixture(),
    x = inputFixture(f),
    r = loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
    s = structuredClone(f.phase.facts[0].callingComponents[1]);
  s.privateHotelIdentity.recordSha256 = "0".repeat(64);
  assert.throws(
    () =>
      bindQualifiedHotelSelector(s, f.patterns[0].sourceFactRef, {
        ...f.v,
        candidates: r.candidates,
      }),
    /SELECTOR/,
  );
});
