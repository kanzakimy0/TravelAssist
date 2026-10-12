import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  canonical,
  invariant,
  verifyEvidence,
  admitNodes,
  queryGraph,
  auditGraph,
  reviewedConditionalApplicability,
  generatePattern,
  publicConditionalApplicability,
} from "../tools/transport/task-086-model.mjs";
import {
  loadQualifiedHotelInputs,
  loadQualifiedContextInputs,
  bindQualifiedHotelSelector,
  qualifiedInputPath,
} from "../tools/transport/task-086-qualified-inputs.mjs";
import { createPriciaFacility } from "../tools/transport/task-086-pricia-facility.mjs";
import { attachODContexts } from "../tools/transport/task-086-dynamic-od-registry.mjs";
import {
  assertPublicStructuralConsumption,
  validPath,
} from "../tools/transport/task-086-stage.mjs";
import { preflightPhaseHeaders } from "../tools/transport/task-086-remediate.mjs";
import { bindReviewedConditionEvidence } from "../tools/transport/task-086-condition-evidence.mjs";
const raw = () =>
  JSON.parse(
    fs.readFileSync(
      new URL(
        "./fixtures/task-086-qualified-hotel/actual-subgraph.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
function fixture() {
  const f = raw(),
    nodes = new Map(f.nodes.map((n) => [n.nodeId, n])),
    sources = new Map(f.sources.map((s) => [s.sourceId, s])),
    evidence = new Map(f.evidence.map((e) => [e.evidenceId, e])),
    v = {
      nodes,
      sources,
      evidence,
      patternById: new Map(f.patterns.map((p) => [p.servicePatternId, p])),
      nativeFacilityByAnchor: new Map(f.nativeFacilityByAnchor),
      dynamicODById: new Map(),
    },
    airport = nodes.get(f.review.airportNodeId),
    hotel = nodes.get(f.review.endpointNodeId),
    inventory = [
      {
        requirementId: f.review.requirementId,
        nodeId: airport.nodeId,
        kind: "airport",
        tier: airport.nodeLevel,
      },
      {
        requirementId: hotel.nodeId,
        nodeId: hotel.nodeId,
        kind: hotel.nodeKind,
        tier: hotel.nodeLevel,
      },
    ],
    contexts = attachODContexts(f.contexts, v),
    corridors = f.patterns.map((p) => ({
      corridorId: "service:" + p.servicePatternId,
      from: p.callingNodes[0].nodeId,
      to: p.callingNodes.at(-1).nodeId,
    })),
    args = {
      nodes: [...nodes.values()],
      edges: f.edges,
      patterns: f.patterns,
      transfers: [],
      inventory,
      anchorNodeId: airport.nodeId,
      corridors,
      validationContext: v,
      conditionalAccessContexts: contexts,
    };
  return { ...f, v, airport, hotel, contexts, args };
}
function assess(f) {
  const deficits = [
    {
      deficitId: f.review.checkId,
      requirementId: f.review.requirementId,
      class: "AIRPORT_SURFACE_GAP",
    },
  ];
  return reviewedConditionalApplicability({
    ...f.args,
    deficits,
    contexts: f.contexts,
  });
}
function deny(f) {
  try {
    assert.equal(assess(f).assessments[0].status, "OPEN");
  } catch (e) {
    if (e.code === "ERR_ASSERTION") throw e;
    assert(e instanceof Error);
  }
}
function inputFixture(f) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "task086-qualified-"));
  const put = (p, v) => {
    fs.mkdirSync(path.dirname(path.join(d, p)), { recursive: true });
    fs.writeFileSync(
      path.join(d, p),
      typeof v === "string" ? v : JSON.stringify(v),
    );
  };
  put("research/qualified-hotel-facilities.v1.json", f.hotelConfig);
  for (const e of f.hotelConfig.facilities) {
    fs.mkdirSync(path.dirname(path.join(d, e.nativePath)), { recursive: true });
    fs.copyFileSync(
      new URL(
        "./fixtures/task-086-qualified-hotel/pricia-native.xml",
        import.meta.url,
      ),
      path.join(d, e.nativePath),
    );
  }
  put(f.review.phaseFile, f.phase);
  for (const b of f.review.inputBindings) put(b.path, "fixture static review");
  const review = structuredClone(f.review);
  review.inputBindings = review.inputBindings.map((b) => ({
    ...b,
    sha256: hash(fs.readFileSync(path.join(d, b.path))),
  }));
  put("research/review.json", review);
  put("research/qualified-airport-contexts.v1.json", {
    schemaVersion: 1,
    contexts: [{ context: f.context, reviewPath: "research/review.json" }],
  });
  put(
    "next-source-actions.jsonl",
    f.actions.map((a) => JSON.stringify(a)).join("\n") + "\n",
  );
  return { d, put, review };
}
test("actual production phase header, source conditions and exact native loader reconstruct", () => {
  const f = fixture(),
    x = inputFixture(f);
  preflightPhaseHeaders([f.phase], f.actions);
  for (const fact of f.phase.facts)
    bindReviewedConditionEvidence(fact, f.actions, f.v.sources, f.v.evidence);
  const result = loadQualifiedHotelInputs(
    x.d,
    f.v.sources,
    f.v.evidence,
    f.actions,
  );
  assert.equal(result.candidates.size, 1);
  assert.equal(
    loadQualifiedContextInputs(x.d).contexts[0].qualificationInputError,
    null,
  );
  const selector = f.phase.facts[0].callingComponents[1];
  assert.equal(
    bindQualifiedHotelSelector(selector, f.patterns[0].sourceFactRef, {
      ...f.v,
      candidates: result.candidates,
    }),
    f.hotel.nodeId,
  );
});
test("audit and independent acceptance consume qualified results without PUBLIC/default leakage", () => {
  const f = fixture(),
    audit = auditGraph(f.args);
  assert(!audit.deficits.length);
  assert(audit.connected.includes(f.hotel.nodeId));
  assert(
    audit.conditionalApplicability.qualifiedReviews[0].audience ===
      "ELIGIBILITY_RESTRICTED",
  );
  assertPublicStructuralConsumption(
    audit.conditionalApplicability,
    audit.structuralChecks,
    audit.deficits,
  );
  assert.equal(queryGraph(f.edges, f.airport.nodeId, f.hotel.nodeId), null);
  assert.equal(
    queryGraph(f.edges, f.airport.nodeId, f.hotel.nodeId, {
      ...f.contexts[0],
      publicStructureOnly: true,
    }),
    null,
  );
  for (const [from, to] of [
    [f.airport.nodeId, f.hotel.nodeId],
    [f.hotel.nodeId, f.airport.nodeId],
  ])
    assert(
      validPath(
        queryGraph(f.edges, from, to, f.contexts[0]),
        from,
        to,
        new Map(f.edges.map((e) => [e.edgeId, e])),
        f.contexts[0],
      ),
    );
});
for (const [name, mutate] of [
  ["wrong actual hotel", (f) => (f.contexts[0].hotelIdentityAnchor = "wrong")],
  ["unproved guest", (f) => delete f.contexts[0].qualificationStatus],
  [
    "future booking",
    (f) => (f.contexts[0].qualificationStatus = "PLANS_TO_BOOK"),
  ],
  [
    "different customer class",
    (f) => (f.contexts[0].eligibilityKeys = ["windsurf:customer"]),
  ],
  ["default context", (f) => (f.contexts = [])],
  ["PUBLIC context", (f) => (f.contexts[0].publicStructureOnly = true)],
  ["unknown dispatch", (f) => (f.contexts[0].flightServiceStatus = "UNKNOWN")],
  [
    "cancelled association",
    (f) => (f.contexts[0].flightServiceStatus = "CANCELLED"),
  ],
  [
    "staff rule removed",
    (f) => (f.contexts[0].acknowledgesStaffReporting = false),
  ],
  [
    "source review withdrawn",
    (f) => (f.contexts[0].qualificationInputError = "RIGHTS_REVOKED"),
  ],
  [
    "original scope file changed",
    (f) => (f.contexts[0].qualifiedInputBindings[0][1] = "0".repeat(64)),
  ],
  [
    "review source hash changed",
    (f) =>
      (f.contexts[0].qualificationReview.sourceBindings[0].contentSha256 =
        "0".repeat(64)),
  ],
  [
    "review wrong original requirement",
    (f) => (f.contexts[0].qualificationReview.requirementId = "other"),
  ],
  ["one direction missing", (f) => (f.args.edges = f.edges.slice(0, 1))],
  [
    "wrong endpoint ID",
    (f) =>
      (f.contexts[0].qualificationReview.endpointNodeId = f.airport.nodeId),
  ],
  [
    "native record changed",
    (f) => (f.hotel.identityRecord.nativeElementVersion = 9),
  ],
  ["HOLD endpoint", (f) => (f.hotel.decision = "HOLD")],
  ["native registry missing", (f) => f.v.nativeFacilityByAnchor.clear()],
  [
    "changed raw OSM bytes",
    (f) => {
      const s = f.v.sources.get(
        f.v.evidence.get(f.nativeFacilityByAnchor[0][1].nativeEvidenceRef)
          .sourceId,
      );
      s.contentSha256 = "0".repeat(64);
    },
  ],
  [
    "raw OSM license changed",
    (f) =>
      (f.v.sources.get(
        f.v.evidence.get(f.nativeFacilityByAnchor[0][1].nativeEvidenceRef)
          .sourceId,
      ).license = "UNKNOWN"),
  ],
  [
    "endpoint pickup changed",
    (f) => {
      const e = f.v.evidence.get(
        f.nativeFacilityByAnchor[0][1].endpointEvidenceRef,
      );
      e.record.pickupScope = "PUBLIC_ANYWHERE";
      e.recordSha256 = hash(e.record);
    },
  ],
  [
    "condition permission revoked",
    (f) =>
      (f.v.sources.get(
        f.v.evidence.get(f.patterns[0].accessContract.sourceEvidenceRefs[0])
          .sourceId,
      ).derivedDataAllowed = false),
  ],
  [
    "condition evidence removed",
    (f) =>
      f.v.evidence.delete(f.patterns[0].accessContract.sourceEvidenceRefs[0]),
  ],
  ["invented boarding", (f) => (f.edges[0].boardAllowed = false)],
  ["invented alighting", (f) => (f.edges[0].alightAllowed = false)],
  [
    "source scope omitted",
    (f) => f.contexts[0].qualificationReview.sourceBindings.pop(),
  ],
  [
    "static review omitted",
    (f) => (f.contexts[0].qualificationReview.inputBindings = []),
  ],
])
  test(name + " cannot satisfy original airport check", () => {
    const f = fixture();
    mutate(f);
    deny(f);
  });
test("ordinary PUBLIC-only reviewer still reports OPEN for qualified service", () => {
  const f = fixture();
  const report = publicConditionalApplicability({
    ...f.args,
    contexts: f.contexts,
    deficits: [
      {
        deficitId: f.review.checkId,
        requirementId: f.review.requirementId,
        class: "AIRPORT_SURFACE_GAP",
      },
    ],
  });
  assert.equal(report.assessments[0].status, "OPEN");
});
test("rights withdrawal from actual source action invalidates persisted qualified input", () => {
  const f = fixture(),
    x = inputFixture(f);
  f.actions[0].rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY";
  x.put(
    "next-source-actions.jsonl",
    f.actions.map((a) => JSON.stringify(a)).join("\n"),
  );
  assert(loadQualifiedContextInputs(x.d).contexts[0].qualificationInputError);
  assert.throws(() =>
    loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
  );
});
test("native action withdrawal rejects native intake", () => {
  const f = fixture(),
    x = inputFixture(f);
  f.actions[2].rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY";
  assert.throws(
    () => loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
    /QUALIFIED_NATIVE_ACTION/,
  );
});
test("native byte corruption and wrong hotel selector fail", () => {
  const f = fixture(),
    x = inputFixture(f),
    entry = f.hotelConfig.facilities[0];
  fs.appendFileSync(path.join(x.d, entry.nativePath), "changed");
  assert.throws(
    () => loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
    /HOTEL_NATIVE_BYTES_CHANGED/,
  );
  const selector = structuredClone(f.phase.facts[0].callingComponents[1]);
  selector.privateHotelIdentity.recordSha256 = "0".repeat(64);
  assert.throws(
    () =>
      bindQualifiedHotelSelector(selector, f.patterns[0].sourceFactRef, {
        ...f.v,
        candidates: new Map([[f.hotel.identityAnchor, f.hotel]]),
      }),
    /QUALIFIED_HOTEL_SELECTOR/,
  );
});
test("input path escape and duplicate native config reject", () => {
  const f = fixture(),
    x = inputFixture(f);
  assert.throws(() => qualifiedInputPath(x.d, "../outside"));
  f.hotelConfig.facilities.push(f.hotelConfig.facilities[0]);
  x.put("research/qualified-hotel-facilities.v1.json", f.hotelConfig);
  assert.throws(
    () => loadQualifiedHotelInputs(x.d, f.v.sources, f.v.evidence, f.actions),
    /DUPLICATE/,
  );
});
test("changed phase fact hash and fabricated embedded registry rejected", () => {
  const f = fixture(),
    x = inputFixture(f);
  f.phase.facts[0].direction = "OTHER";
  x.put(f.review.phaseFile, f.phase);
  assert(loadQualifiedContextInputs(x.d).contexts[0].qualificationInputError);
  x.put("research/qualified-airport-contexts.v1.json", {
    schemaVersion: 1,
    contexts: [
      {
        context: { ...f.context, odValidationContext: {} },
        reviewPath: "research/review.json",
      },
    ],
  });
  assert.throws(() => loadQualifiedContextInputs(x.d), /EMBEDDED_TRUST/);
});
