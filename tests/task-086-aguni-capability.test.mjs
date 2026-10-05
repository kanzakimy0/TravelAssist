import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  canonical,
  admitNodes,
  generateDynamicOD,
  queryGraph,
  reviewedConditionalApplicability,
  auditGraph,
} from "../tools/transport/task-086-model.mjs";
import {
  loadODFacilityInputs,
  loadConditionalContextInputs,
  attachODContexts,
} from "../tools/transport/task-086-dynamic-od-registry.mjs";
import { assertPublicStructuralConsumption } from "../tools/transport/task-086-stage.mjs";
const location = new URL(
  "./fixtures/task-086-aguni-capability/",
  import.meta.url,
);
function fixture() {
  const f = JSON.parse(
      fs.readFileSync(new URL("actual-subgraph.json", location), "utf8"),
    ),
    v = {
      sources: new Map(f.sources.map((s) => [s.sourceId, s])),
      evidence: new Map(f.evidence.map((e) => [e.evidenceId, e])),
      nodes: new Map(f.nodes.map((n) => [n.nodeId, n])),
      patternById: new Map(f.patterns.map((p) => [p.servicePatternId, p])),
      dynamicODById: new Map(f.dynamicOD.map((o) => [o.odId, o])),
      nativeFacilityByAnchor: new Map(f.nativeFacilityByAnchor),
    },
    airport = v.nodes.get(f.review.airportNodeId),
    office = v.nodes.get(f.review.endpointNodeId),
    anchor = f.nodes.find((n) => n.canonicalNameJa === "那覇空港").nodeId;
  return { ...f, v, airport, office, anchor };
}
function args(f) {
  return {
    nodes: [...f.v.nodes.values()],
    edges: f.edges,
    patterns: f.patterns,
    transfers: [],
    inventory: [
      {
        requirementId: f.review.requirementId,
        nodeId: f.airport.nodeId,
        kind: "airport",
        tier: "T3",
      },
      {
        requirementId: f.office.nodeId,
        nodeId: f.office.nodeId,
        kind: "public_pickup_facility",
        tier: "T3",
      },
    ],
    anchorNodeId: f.anchor,
    corridors: [],
    validationContext: f.v,
    conditionalAccessContexts: attachODContexts(f.contexts, f.v),
  };
}
function assess(f) {
  const a = args(f);
  return reviewedConditionalApplicability({
    ...a,
    contexts: a.conditionalAccessContexts,
    deficits: [
      {
        deficitId: f.review.checkId,
        requirementId: f.review.requirementId,
        class: "AIRPORT_SURFACE_GAP",
      },
    ],
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
function input(f) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "aguni232-")),
    put = (p, x) => {
      fs.mkdirSync(path.dirname(path.join(d, p)), { recursive: true });
      fs.writeFileSync(
        path.join(d, p),
        typeof x === "string" ? x : JSON.stringify(x),
      );
    };
  put("research/public-od-facilities.v1.json", f.facilityConfig);
  for (const e of f.facilityConfig.facilities)
    for (const k of ["archivePath", "memberPath"]) {
      fs.mkdirSync(path.dirname(path.join(d, e[k])), { recursive: true });
      fs.copyFileSync(
        new URL(path.basename(e[k]), location),
        path.join(d, e[k]),
      );
    }
  put(f.review.phaseFile, f.phase);
  const review = structuredClone(f.review);
  for (const b of review.inputBindings) {
    put(b.path, "independent fixture review");
    b.sha256 = hash(fs.readFileSync(path.join(d, b.path)));
  }
  put("research/review.json", review);
  put("research/conditional-capability-contexts.v1.json", {
    schemaVersion: 1,
    contexts: [{ context: f.context, reviewPath: "research/review.json" }],
  });
  put(
    "next-source-actions.jsonl",
    f.actions.map((a) => JSON.stringify(a)).join("\n"),
  );
  return { d, put };
}
test("actual licensed P05 native intake and persisted capability review reconstruct", () => {
  const f = fixture(),
    x = input(f),
    loaded = loadODFacilityInputs(x.d, f.v.sources, f.v.evidence, f.actions);
  assert.equal(loaded.candidates.size, 1);
  assert.equal(
    admitNodes(
      [...loaded.candidates.values()],
      f.v.sources,
      f.v.evidence,
      [],
      loaded,
    )[0].nodeId,
    f.office.nodeId,
  );
  assert.equal(
    loadConditionalContextInputs(x.d).contexts[0].capabilityInputError,
    null,
  );
});
test("two actual OD and independent flights satisfy distinct conditional structural review", () => {
  const f = fixture();
  for (const od of f.dynamicOD)
    assert.equal(
      generateDynamicOD(od, f.v, "2026-10-01T00:00:00Z").edgeKind,
      "dynamic_od_ride",
    );
  const a = auditGraph(args(f));
  assert.equal(
    a.conditionalApplicability.capabilityReviews[0].status,
    "STRUCTURALLY_CONNECTED_WITH_REVIEWED_OD_CAPABILITY",
  );
  assert.equal(
    a.conditionalApplicability.capabilityReviews[0].actualBookingClaim,
    false,
  );
  assert(a.connected.includes(f.office.nodeId));
  assertPublicStructuralConsumption(
    a.conditionalApplicability,
    a.structuralChecks,
    a.deficits,
  );
});
for (const [name, patch] of Object.entries({
  default: null,
  ordinaryPUBLIC: {
    kind: "EXPLICIT_CONDITIONAL_PLANNING",
    publicStructureOnly: true,
  },
  fakeConfirmation: {
    kind: "EXPLICIT_CONDITIONAL_PLANNING",
    publicStructureOnly: true,
    operatorConfirmed: true,
  },
  actualClaim: { actualBookingClaim: true },
  dispatchClaim: { actualDispatchClaim: true },
  extraConfirmedFlag: { operatorConfirmed: true },
  requestIntent: {
    odReservationIntents: [
      {
        kind: "REQUEST_BEFORE_PICKUP",
        requestAt: "2026-10-17T08:30:00+09:00",
        pickupAt: "2026-10-17T13:00:00+09:00",
      },
    ],
  },
  lostPredicate: { capabilityPrerequisites: [] },
  wrongDate: { travelDate: "2026-10-04" },
  lostContract: { acceptedContracts: [] },
  unreviewed: { capabilityReview: null },
}))
  test("ordinary use or invalid capability denies " + name, () => {
    const f = fixture(),
      c =
        patch === null
          ? undefined
          : { ...attachODContexts(f.contexts, f.v)[0], ...patch },
      ground = f.edges.filter((e) => e.edgeKind === "dynamic_od_ride");
    assert.equal(
      queryGraph(ground, f.airport.nodeId, f.office.nodeId, c),
      null,
    );
    assert.equal(
      queryGraph(ground, f.office.nodeId, f.airport.nodeId, c),
      null,
    );
  });
for (const [name, change] of Object.entries({
  missingReverse: (f) => {
    const id = f.review.edgeIds[1];
    f.edges = f.edges.filter((e) => e.edgeId !== id);
  },
  missingFlightReturn: (f) => {
    f.edges = f.edges.filter(
      (e) => e.servicePatternRef !== f.patterns[1].servicePatternId,
    );
  },
  wrongFacility: (f) => {
    f.office.canonicalNameJa = "他役場";
  },
  nativeMoved: (f) => {
    f.v.nativeFacilityByAnchor.get(
      f.office.identityAnchor,
    ).identityRecord.feature.geometry.coordinates[0] += 0.1;
  },
  permissionWithdrawn: (f) => {
    const s = [...f.v.sources.values()].find((s) =>
      s.url.includes("sonsei/60"),
    );
    s.rightsClass = "REFERENCE_ONLY";
  },
  changedSource: (f) => {
    f.v.sources.get(f.review.sourceBindings[0].sourceId).contentSha256 =
      "0".repeat(64);
  },
  staticBinding: (f) => {
    f.contexts[0].capabilityInputBindings[0][1] = "0".repeat(64);
  },
  lostBoarding: (f) => {
    f.edges.find((e) => e.edgeKind === "dynamic_od_ride").boardAllowed = false;
  },
  lostAlighting: (f) => {
    f.edges.find((e) => e.edgeKind === "dynamic_od_ride").alightAllowed = false;
  },
  wrongAirport: (f) => {
    f.airport.identityRecord.referencePointId = "cf03_00088";
  },
  sourceScopeOmitted: (f) => {
    f.contexts[0].capabilityReview.sourceBindings.pop();
  },
  wrongOriginalRequirement: (f) => {
    f.contexts[0].capabilityReview.requirementId = "other-airport";
  },
}))
  test("structural audit reopens " + name, () => {
    const f = fixture();
    change(f);
    denied(f);
  });
for (const [name, value] of Object.entries({
  zero: 0,
  historicalThirty: 30,
  negative: -1,
}))
  test("unknown cutoff cannot become " + name, () => {
    const f = fixture(),
      od = f.dynamicOD[0];
    od.accessTerms.currentMinimumLeadMinutes = value;
    assert.throws(() => generateDynamicOD(od, f.v, "2026-10-01T00:00:00Z"));
  });
test("unknown payment cannot inherit cash from another operator", () => {
  const f = fixture(),
    od = f.dynamicOD[0];
  od.accessTerms.payment = "CASH";
  assert.throws(() => generateDynamicOD(od, f.v, "2026-10-01T00:00:00Z"));
});
test("unrelated source cannot prove literal copied OD terms", () => {
  const f = fixture(),
    od = f.dynamicOD[0],
    raw = f.v.evidence.get(od.sourceFactRef).record;
  raw.sourceUrl = "https://example.invalid/other";
  f.v.evidence.get(od.sourceFactRef).recordSha256 = hash(raw);
  assert.throws(() => generateDynamicOD(od, f.v, "2026-10-01T00:00:00Z"));
});
test("phase mutation and current source action withdrawal reopen persisted review", () => {
  for (const k of ["fact", "rights"]) {
    const f = fixture(),
      x = input(f);
    if (k === "fact") {
      f.phase.facts[2].endpointNames.reverse();
      x.put(f.review.phaseFile, f.phase);
    } else {
      f.actions[0].rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY";
      x.put(
        "next-source-actions.jsonl",
        f.actions.map((a) => JSON.stringify(a)).join("\n"),
      );
    }
    assert(loadConditionalContextInputs(x.d).contexts[0].capabilityInputError);
  }
});
for (const key of ["archivePath", "memberPath"])
  test("native " + key + " mutation rejects", () => {
    const f = fixture(),
      x = input(f);
    fs.appendFileSync(
      path.join(x.d, f.facilityConfig.facilities[0][key]),
      "changed",
    );
    assert.throws(() =>
      loadODFacilityInputs(x.d, f.v.sources, f.v.evidence, f.actions),
    );
  });
test("capability input rejects embedded trusted registry and unknown actual-use fields", () => {
  const f = fixture(),
    x = input(f);
  x.put("research/conditional-capability-contexts.v1.json", {
    schemaVersion: 1,
    contexts: [
      {
        context: { ...f.context, odValidationContext: {} },
        reviewPath: "research/review.json",
      },
    ],
  });
  assert.throws(() => loadConditionalContextInputs(x.d));
});
