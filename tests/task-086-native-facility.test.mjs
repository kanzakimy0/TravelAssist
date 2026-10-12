import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  canonical,
  verifyEvidence,
  admitNodes,
} from "../tools/transport/task-086-model.mjs";
import { createOfficialFacilityBus } from "../tools/transport/task-086-official-facility-bus.mjs";
const f = () => {
  const r = JSON.parse(
    fs.readFileSync(
      new URL(
        "./fixtures/task-086-onboard-request/actual-subgraph.json",
        import.meta.url,
      ),
    ),
  );
  return {
    r,
    sources: new Map(r.sources.map((s) => [s.sourceId, s])),
    evidence: new Map(r.evidence.map((e) => [e.evidenceId, e])),
    nativeFacilityByAnchor: new Map(
      r.nativeFacilities.map((n) => [n.identityAnchor, n]),
    ),
    nodes: r.nodes.filter((n) => n.nodeKind === "public_pickup_facility"),
  };
};
const api = createOfficialFacilityBus({ hash, canonical, verifyEvidence });
test("two actually parsed licensed native facilities admitted with coordinates unchanged", () => {
  const v = f();
  assert.equal(v.nodes.length, 2);
  for (const n of v.nodes) {
    assert.ok(api.facilityBound(n, v));
    assert.equal(
      admitNodes([n], v.sources, v.evidence, [], v)[0].decision,
      "ADMIT_TASK_086_TOPOLOGY",
    );
  }
});
for (const [name, change] of [
  ["missing independent registry", (n, v) => v.nativeFacilityByAnchor.clear()],
  ["coordinate shifted", (n) => (n.latitude += 0.001)],
  [
    "name borrowed from neighboring clinic",
    (n) => (n.canonicalNameJa = "本村診療所"),
  ],
  ["wrong role", (n) => (n.nodeKind = "bus_stop")],
  ["wrong mode", (n) => (n.mode = "flight")],
  [
    "native record changed",
    (n) => (n.identityRecord.nativeRecordSha256 = "0".repeat(64)),
  ],
  [
    "native data source withdrawn",
    (n, v) => v.sources.delete(v.evidence.get(n.evidenceRefs[0]).sourceId),
  ],
  [
    "license withdrawn",
    (n, v) =>
      (v.sources.get(
        v.evidence.get(n.evidenceRefs[0]).sourceId,
      ).derivedDataAllowed = false),
  ],
  [
    "native provenance withdrawn",
    (n, v) => v.evidence.delete(n.evidenceRefs[0]),
  ],
  [
    "curb claim",
    (n) => (n.independentReview.coordinateScope = "PRECISE_BUS_POLE"),
  ],
])
  test(name + " fails facility binding", () => {
    const v = f(),
      n = v.nodes[0];
    change(n, v);
    assert.equal(api.facilityBound(n, v), false);
  });
test("whole origin stripping cannot escape native admission contract", () => {
  const v = f(),
    n = v.nodes[0];
  delete n.origin;
  assert.notEqual(
    admitNodes([n], v.sources, v.evidence, [], v)[0].decision,
    "ADMIT_TASK_086_TOPOLOGY",
  );
});
test("native point alone without independently reviewed public component cannot alias service name", () => {
  const v = f(),
    fact = v.r.facts.find(
      (x) => x.mode === "local_bus" && x.callingStations[0] === "住民センター",
    ),
    s = fact.callingComponents[0],
    n = v.nodes.find((n) => n.canonicalNameJa === s.name);
  assert.ok(
    api.selectorBound(
      s,
      fact.callingStations[0],
      n,
      fact,
      v.sources,
      v.evidence,
    ),
  );
  delete s.publicFacilityComponentReviewEvidenceRef;
  assert.equal(
    api.selectorBound(
      s,
      fact.callingStations[0],
      n,
      fact,
      v.sources,
      v.evidence,
    ),
    false,
  );
});
for (const [name, change] of [
  ["wrong source calling name", (r) => (r.sourceCallName = "本村診療所")],
  ["wrong native name", (r) => (r.nativeName = "新島村役場")],
  ["wrong source fact", (r) => (r.sourceFactId = "other")],
  ["proximity-only join", (r) => (r.coordinateProximityUsed = true)],
  ["Google coordinates used", (r) => (r.googleCoordinatesUsed = true)],
  [
    "current own facility missing",
    (r) => (r.currentOfficialFacilityEvidenceRefs = []),
  ],
])
  test(name + " fails even when review record is resealed", () => {
    const v = f(),
      fact = v.r.facts.find(
        (x) =>
          x.mode === "local_bus" && x.callingStations[0] === "住民センター",
      ),
      s = fact.callingComponents[0],
      n = v.nodes.find((n) => n.canonicalNameJa === s.name),
      e = v.evidence.get(s.publicFacilityComponentReviewEvidenceRef);
    change(e.record);
    e.recordSha256 = hash(e.record);
    assert.equal(
      api.selectorBound(
        s,
        fact.callingStations[0],
        n,
        fact,
        v.sources,
        v.evidence,
      ),
      false,
    );
  });
