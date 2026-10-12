import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildFixture } from "./fixtures/task-086-dynamic-od/fixture.mjs";
import { executeBatches } from "../tools/transport/task-086-batches.mjs";
import {
  hash,
  validateEdges,
  queryGraph,
  surfaceServiceRoundTrip,
} from "../tools/transport/task-086-model.mjs";
import { publicODOfficeCandidate } from "../tools/transport/task-086-public-od-facility.mjs";
const F = buildFixture(),
  fresh = () => structuredClone(F),
  out = () => fs.mkdtempSync(path.join(os.tmpdir(), "task086-od-batch-"));
test("actual two independent OD groups publish with full registry, then one-edge chunk validation", () => {
  const f = fresh(),
    dir = out(),
    result = executeBatches(dir, f.groups, {
      chunkSize: 1,
      validationContext: f.validation,
    });
  assert.equal(result.receipts.length, 2);
  const payload = JSON.parse(
    fs.readFileSync(
      dir + "/batches/" + result.receipts[0].batchId + ".json",
      "utf8",
    ),
  );
  assert.equal(payload.input.dynamicODInput.kind, "dynamic_od");
  assert.equal(payload.input.servicePatternInput, undefined);
  assert.equal(payload.edges[0].reservation, "required");
  assert.equal(
    payload.edges[0].metrics.durationTypicalMin.status,
    "unresolved",
  );
  assert.equal(payload.edges[0].metrics.reservation.status, "unresolved");
});
test("omitted direction rejected before batch publication", () => {
  const f = fresh(),
    dir = out();
  f.groups.pop();
  assert.throws(
    () => executeBatches(dir, f.groups, { validationContext: f.validation }),
    /OD_REGISTERED_EDGE_MISSING/,
  );
  assert.equal(fs.readdirSync(dir).length, 0);
});
test("complete conditional stripping rejected before batch publication", () => {
  const f = fresh(),
    dir = out();
  for (const g of f.groups)
    for (const e of g.edges) {
      delete e.dynamicODRef;
      delete e.accessContract;
      delete e.accessContractSha256;
      delete e.conditionalTopology;
      delete e.reservation;
      e.edgeKind = "hub_transfer";
    }
  assert.throws(
    () => executeBatches(dir, f.groups, { validationContext: f.validation }),
    /OD_EDGE_STRIPPED_OR_CHANGED/,
  );
  assert.equal(fs.readdirSync(dir).length, 0);
});
test("batch input cannot replace typed OD with fixed pattern", () => {
  const f = fresh(),
    dir = out();
  f.groups[0].pattern = f.groups[0].dynamicOD;
  delete f.groups[0].dynamicOD;
  assert.throws(
    () => executeBatches(dir, f.groups, { validationContext: f.validation }),
    /BATCH_OD_INPUT_REGISTRY_MISMATCH/,
  );
});
test("source revocation rejects all output before batching", () => {
  const f = fresh(),
    dir = out(),
    od = [...f.validation.dynamicODById.values()][0],
    ref = od.parameterEvidenceRefs.minimumLeadMinutes;
  f.validation.sources.get(
    f.validation.evidence.get(ref).sourceId,
  ).rightsClass = "REVOKED";
  assert.throws(() =>
    executeBatches(dir, f.groups, { validationContext: f.validation }),
  );
  assert.equal(fs.readdirSync(dir).length, 0);
});
test("batch registry fingerprint includes full native registry fields, not Map empty object", () => {
  const a = fresh(),
    b = fresh();
  b.validation.nativeFacilityByAnchor.get(
    b.office.identityAnchor,
  ).reviewContext = "changed binding";
  const x = executeBatches(out(), a.groups, {
      validationContext: a.validation,
    }),
    y = executeBatches(out(), b.groups, { validationContext: b.validation });
  assert.notEqual(x.receipts[0].fingerprint, y.receipts[0].fingerprint);
});
test("partial-batch context cannot bypass complete publication preflight", () => {
  const f = fresh();
  f.validation.dynamicODValidationScope = "PARTIAL_BATCH";
  assert.throws(
    () => executeBatches(out(), f.groups, { validationContext: f.validation }),
    /BATCH_COMPLETE_OD_CONTEXT_REQUIRED/,
  );
});
test("current offsite role repair rejects office masquerading as flight facility", () => {
  const f = fresh();
  f.validation.nodes.get(f.office.nodeId).mode = "flight";
  assert.equal(
    queryGraph(f.edges, f.airport.nodeId, f.office.nodeId, f.context),
    null,
  );
  assert.throws(() =>
    surfaceServiceRoundTrip(
      [...f.validation.nodes.values()],
      f.edges,
      f.airport.nodeId,
      f.context,
      f.validation,
    ),
  );
});
test("native constructor rejects altered archive and mismatched source point", () => {
  const review = JSON.parse(
      fs.readFileSync(
        new URL(
          "./fixtures/task-086-dynamic-od/south-daito-office-p05-native-identity-review.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
    memberBytes = fs.readFileSync(
      new URL(
        "./fixtures/task-086-dynamic-od/P05-22_47.geojson",
        import.meta.url,
      ),
    ),
    archiveBytes = fs.readFileSync(
      new URL(
        "./fixtures/task-086-dynamic-od/p05-22-47-native.zip",
        import.meta.url,
      ),
    ),
    f = fresh(),
    [nativeIdentityEvidenceRef, currentEndpointEvidenceRef] =
      f.office.evidenceRefs,
    ctx = {
      archiveBytes,
      memberBytes,
      review,
      currentEndpointEvidenceRef,
      nativeIdentityEvidenceRef,
      sources: f.validation.sources,
      evidence: f.validation.evidence,
    };
  assert.throws(
    () =>
      publicODOfficeCandidate({ ...ctx, archiveBytes: Buffer.from("wrong") }),
    /P05_ARCHIVE_OR_MEMBER_CHANGED/,
  );
  const changed = JSON.parse(memberBytes);
  changed.features[858].geometry.coordinates[0] += 0.001;
  const bad = Buffer.from(JSON.stringify(changed));
  assert.throws(
    () =>
      publicODOfficeCandidate({
        ...ctx,
        memberBytes: bad,
        review: { ...review, memberSha256: hash(bad) },
      }),
    /P05_EXACT_NATIVE_RECORD_CHANGED/,
  );
});
