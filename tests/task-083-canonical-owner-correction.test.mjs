import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { supportingManifestSha256 } from "../tools/qa/canonical-supporting-hash.mjs";
import { validateCanonicalAccessAdjudication } from "../src/server/poi-runtime/access-adjudication.ts";
import {
  canonicalPoiRuntimeRepository,
  createCanonicalPoiRuntimeRepository,
  CanonicalPoiRuntimeIntegrityError,
} from "../src/server/poi-runtime/repository.ts";
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const hash = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const d = read("src/shared/data/canonical-poi-pilot100.v1.json");
const m = read(
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json",
);
const a = read(m.accessAdjudicationPath);
const registry = read(m.registryPath);
const sample = read(m.sampleManifestPath);
const expected = new Map([
  ["J-WORLD TOKYO", ["permanently_closed", "CLOSED"]],
  ["レインボープール", ["permanently_closed", "CLOSED"]],
  ["舳倉島", ["temporarily_closed", "RESTRICTED_RESIDENTS_RECOVERY_ONLY"]],
  ["鶴見つばさ橋", ["active", "NOT_A_VISITOR_ENDPOINT"]],
  ["我善坊谷", ["active", "HISTORICAL_RECORD_ONLY"]],
]);
test("Canonical supporting hash is committed LF; CRLF cannot be reauthorized", () => {
  const b = readFileSync(m.sampleManifestPath);
  assert.equal(
    supportingManifestSha256(b),
    "6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51",
  );
  assert.equal(m.sampleManifestSha256, supportingManifestSha256(b));
  assert.throws(
    () =>
      supportingManifestSha256(
        Buffer.from(b.toString("utf8").replaceAll("\n", "\r\n")),
      ),
    /REQUIRES_UTF8_LF/,
  );
  assert.equal(
    read("docs/qa/TASK-083/pilot100-handoff.json").sampleManifestSha256,
    m.sampleManifestSha256,
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync(m.accessAdjudicationPath))
      .digest("hex"),
    m.accessAdjudicationFileSha256,
  );
});
test("owner decisions preserve all 100 members and never substitute endpoints", async () => {
  assert.deepEqual(
    m.internalIds,
    sample.records.map((r) => r.internalId),
  );
  assert.deepEqual(
    m.masterCodes,
    sample.records.map((r) => r.allocatedMasterCode),
  );
  assert.equal(d.records.length, 100);
  assert.equal(a.records.length, 5);
  assert.equal(a.downstreamAssessment.remainingRecordCount, 95);
  assert.doesNotThrow(() => validateCanonicalAccessAdjudication(d, m, a));
  for (const r of a.records) {
    assert.deepEqual([r.lifecycleStatus, r.publicAccess], expected.get(r.name));
    assert.equal(r.visitorEndpoint, null);
    assert.equal(r.replacementPoiRef, null);
    assert.equal(r.generalTouristAccessEligible, false);
    const poi = await canonicalPoiRuntimeRepository.getByInternalId(
      r.internalId,
    );
    assert.equal(poi.lifecycle.status, r.lifecycleStatus);
    assert.equal(poi.masterCode, r.masterCode);
    assert.deepEqual(poi.accessAnchors, []);
  }
  assert.equal((await canonicalPoiRuntimeRepository.list()).length, 100);
});
test("a stale or omitted owner authorization fails closed in the real repository", () => {
  for (const change of [
    (m) => delete m.accessAdjudicationSha256,
    (m) => (m.accessAdjudicationRevision = "stale"),
    (m) =>
      (m.accessAdjudicationPath = "data/transport/access/owner-override.json"),
  ]) {
    const x = structuredClone(m);
    change(x);
    assert.throws(
      () => createCanonicalPoiRuntimeRepository(d, x, registry),
      CanonicalPoiRuntimeIntegrityError,
    );
  }
  const changed = structuredClone(a);
  changed.records[0].publicAccess = "PUBLIC";
  assert.throws(
    () =>
      createCanonicalPoiRuntimeRepository(
        d,
        m,
        registry,
        undefined,
        undefined,
        changed,
      ),
    CanonicalPoiRuntimeIntegrityError,
  );
});
test("rehashed duplicate, open, redirected or incomplete decisions cannot bypass owner semantics", () => {
  for (const change of [
    (a) => (a.records[1] = structuredClone(a.records[0])),
    (a) => (a.records[0].generalTouristAccessEligible = true),
    (a) => (a.records[0].visitorEndpoint = { latitude: 35, longitude: 139 }),
    (a) => (a.records[0].replacementPoiRef = d.records[0].internalId),
    (a) => (a.records[0].decisionStatus = "REVIEW"),
    (a) => (a.records[0].owner = "B"),
    (a) => (a.records[0].evidence = []),
    (a) => a.downstreamAssessment.excludedInternalIds.pop(),
    (a) => (a.records[0].publicAccess = "HISTORICAL_RECORD_ONLY"),
  ]) {
    const x = structuredClone(a);
    change(x);
    const manifest = { ...m, accessAdjudicationSha256: hash(x) };
    assert.throws(() => validateCanonicalAccessAdjudication(d, manifest, x));
  }
});
test("closure and eligibility are independent of catalog admission and active code ownership", () => {
  for (const r of a.records) {
    assert.equal(
      registry.entries.find((e) => e.masterCode === r.masterCode)
        .lifecycleStatus,
      "active",
    );
    const poi = d.records.find((p) => p.internalId === r.internalId);
    assert.equal(poi.lifecycle.mergedIntoPoiRef, null);
    assert.equal(poi.lifecycle.supersededByPoiRef, null);
  }
  assert.equal(
    a.records.find((r) => r.name === "J-WORLD TOKYO").effectiveDate,
    "2019-02-17",
  );
  assert.equal(
    a.records.find((r) => r.name === "レインボープール").effectiveDate,
    null,
  );
});
