import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDataset,
  splitBatches,
  sparseNeighbors,
  generateArtifacts,
  sampleRows,
  parseArgs,
  readInputs,
  hash,
} from "../tools/poi/enrich-candidates.mjs";
import { parsePoiVisitProfileV1 } from "../src/shared/contracts/planning/validation.ts";
import { readFileSync } from "node:fs";
const input = readInputs();
const candidate = (id = "candidate:synthetic") => ({
  candidateKey: id,
  canonicalMasterCode: null,
  namesJa: ["synthetic"],
  namesEn: [],
  prefectures: ["synthetic-prefecture"],
  observations: [],
  evidenceRefs: ["https://example.invalid/synthetic"],
});
const article = {
  sourceRef: "synthetic:source",
  url: "https://example.invalid/synthetic",
  nameJa: "synthetic",
  nameEn: "",
  prefecture: "synthetic-prefecture",
  contentSha256: "synthetic-hash",
  targetContentEnd: 1000,
};
const fact = (code = "01", value = 7) => ({
  code,
  value,
  reason: "Synthetic unit fixture, not a real POI",
  confidence: 0.6,
  annotationMethod: "editorial_calibration",
  locator: { offset: 0, length: 4, locatorSha256: hash("synthetic-locator") },
});
const evidence = () => ({
  sourceRef: article.sourceRef,
  contentSha256: article.contentSha256,
  features: [fact()],
  anchors: [],
  visit: null,
});
const build = (rows = [candidate()], ev = [evidence()], held = []) =>
  buildDataset(
    rows,
    { entries: [article] },
    { entries: ev },
    input.rubric,
    held,
  );

test("43 frozen code/key/kind definitions and zero/unknown remain distinct", () => {
  const e = evidence();
  e.features = [fact("01", 0), fact("02", 5)];
  const r = build(undefined, [e]).rows[0];
  assert.equal(Object.keys(r.featureSet.values).length, 43);
  assert.equal(r.featureSet.values["01"], 0);
  assert.equal(r.featureSet.values["02"], 5);
  assert.equal(r.featureSet.values["03"], null);
  assert.equal(r.provenance.length, 2);
  assert.equal(r.provenance[0].kind, "benefit");
  const bad = structuredClone(input.rubric);
  bad.definitions[0].kind = "cost";
  assert.throws(
    () => buildDataset([], { entries: [] }, { entries: [] }, bad, []),
    /Frozen/,
  );
});
test("unknown and category-only identities never generate scores or profiles", () => {
  const r = build([candidate()], []).rows[0];
  assert.equal(r.status, "REVIEW_REQUIRED");
  assert.ok(Object.values(r.featureSet.values).every((v) => v === null));
  assert.deepEqual(r.visitProfiles, []);
  const c = candidate();
  c.namesJa = ["unrelated name"];
  assert.equal(build([c]).rows[0].status, "SOURCE_UNAVAILABLE");
  const d = candidate();
  d.prefectures = ["different prefecture"];
  assert.equal(build([d]).rows[0].status, "SOURCE_UNAVAILABLE");
});
test("held identity and shared article identities fail closed, without silent merging", () => {
  const held = build(undefined, undefined, ["candidate:synthetic"]).rows[0];
  assert.equal(held.status, "QUARANTINED");
  assert.equal(held.provenance.length, 0);
  assert.equal(held.accessLinks.length, 0);
  assert.ok(
    build([candidate("candidate:a"), candidate("candidate:b")]).rows.every(
      (r) => r.status === "QUARANTINED",
    ),
  );
});
test("evidence hash, value, duplicate code and provenance failures stop generation", () => {
  for (const mutate of [
    (e) => (e.contentSha256 = "changed"),
    (e) => (e.features[0].value = 1.5),
    (e) => (e.features[0].value = 10),
    (e) => (e.features[0].reason = ""),
    (e) => e.features.push(fact()),
  ]) {
    const e = evidence();
    mutate(e);
    assert.throws(() => build(undefined, [e]));
  }
  const c = candidate();
  c.canonicalMasterCode = "00000";
  assert.throws(() => build([c]), /canonical/);
  assert.throws(() => build([candidate(), candidate()]), /Duplicate candidate/);
});
test("partial numeric Visit Profile uses existing validator and invents no load split", () => {
  const e = evidence();
  e.visit = {
    recommendedDurationMinutes: 30,
    reason: "Synthetic",
    confidence: 0.6,
    locator: { offset: 0, length: 4, locatorSha256: hash("synthetic") },
  };
  const p = build(undefined, [e]).rows[0].visitProfiles[0].profile;
  assert.ok(parsePoiVisitProfileV1(p).ok);
  assert.equal(p.minimumDurationMinutes, null);
  assert.equal(p.maximumUsefulDurationMinutes, null);
  assert.equal(p.fixedWalkingLoad, null);
  assert.equal(p.variableWalkingLoad, null);
  assert.equal(
    parsePoiVisitProfileV1({ ...p, minimumDurationMinutes: 40 }).ok,
    false,
  );
  assert.equal(
    parsePoiVisitProfileV1({ ...p, maximumUsefulDurationMinutes: 20 }).ok,
    false,
  );
  assert.equal(
    parsePoiVisitProfileV1({ ...p, recommendedDurationMinutes: -1 }).ok,
    false,
  );
});
test("transport link allowlist excludes departure duration, fare and current service claims", () => {
  const e = evidence();
  e.anchors = [
    {
      name: "Synthetic station",
      type: "rail_station",
      scope: "Test city",
      mode: "walk",
      confidence: 0.7,
      locator: { offset: 0, length: 4, locatorSha256: hash("synthetic") },
      durationMinutes: 10,
      fare: 100,
      currentService: "OPERATING",
    },
  ];
  const d = build(undefined, [e]);
  const a = d.rows[0].accessLinks[0];
  assert.equal(a.durationMinutes, null);
  assert.equal(a.fare, null);
  assert.equal(a.currentService, "UNKNOWN");
  assert.equal(a.barrierFree, null);
  assert.equal(d.anchors[0].providerRef, null);
  assert.equal(a.anchorRef, d.anchors[0].anchorRef);
});
test("200-item ordering and automatic next batches deterministic, input order independent", () => {
  const rows = Array.from({ length: 401 }, (_, i) =>
    candidate(`candidate:${String(400 - i).padStart(4, "0")}`),
  );
  const batches = splitBatches(rows);
  assert.deepEqual(
    batches.map((x) => x.length),
    [200, 200, 1],
  );
  assert.equal(batches[0][0].candidateKey, "candidate:0000");
  assert.equal(batches[1][0].candidateKey, "candidate:0200");
  assert.deepEqual(batches, splitBatches(rows.reverse()));
  assert.throws(() => splitBatches(rows, 201));
});
test("sparse inverted graph bounded even with 10,000 shared-anchor candidates", () => {
  const rows = Array.from({ length: 10000 }, (_, i) => ({
    candidateKey: `synthetic:${i}`,
    accessLinks: [{ anchorRef: "synthetic:station" }],
  }));
  const { result, probes } = sparseNeighbors(rows);
  assert.equal(probes, 200000);
  for (const r of rows) {
    const edges = result.get(r.candidateKey);
    assert.equal(edges.length, 20);
    assert.equal(new Set(edges.map((e) => e.to)).size, 20);
    assert.ok(
      edges.every(
        (e) =>
          e.to !== r.candidateKey &&
          e.walkable === null &&
          e.routeFeasibility === "UNKNOWN",
      ),
    );
  }
  assert.throws(() => sparseNeighbors(rows, 21));
  assert.equal(sparseNeighbors(rows, 0).probes, 0);
});
test("batch samples respect small/final batches without claiming human review", () => {
  for (const size of [1, 8, 10, 11, 169, 200]) {
    const rows = Array.from({ length: size }, (_, i) => ({
      ...candidate(`x:${i}`),
      provenance: [],
      status: "SOURCE_UNAVAILABLE",
    }));
    const s = sampleRows(rows);
    assert.ok(s.length <= size && s.length <= 20);
    if (size >= 10) assert.ok(s.length >= 10);
    assert.ok(s.every((x) => x.check.startsWith("MACHINE_")));
  }
});
test("CLI validates range flags, explicit batch and full check boundaries", () => {
  assert.deepEqual(parseArgs(["--resume", "--batch", "batch-0001"]), {
    resume: true,
    batch: "batch-0001",
  });
  assert.throws(() => parseArgs(["--reset"]));
  assert.throws(() => parseArgs(["--from-id"]));
  assert.throws(() => parseArgs(["--check", "--batch", "batch-0001"]));
  assert.throws(() =>
    parseArgs(["--batch", "batch-0001", "--to-id", "candidate:x"]),
  );
});
test("real approved corpus preserves all identity and historical code claims byte for byte", () => {
  const before = hash(JSON.stringify(input.candidates));
  const d = buildDataset(
    input.candidates,
    input.articleIndex,
    input.reviewed,
    input.rubric,
    input.heldKeys,
  );
  assert.equal(before, hash(JSON.stringify(input.candidates)));
  assert.equal(d.rows.length, 10369);
  assert.equal(
    d.rows.filter((r) => r.status === "QUARANTINED").length,
    input.heldKeys.length,
  );
  const identities = new Map(input.candidates.map((c) => [c.candidateKey, c]));
  const ids = new Set(d.rows.map((r) => r.candidateKey));
  const refs = new Set(d.anchors.map((a) => a.anchorRef));
  for (const r of d.rows) {
    assert.equal(r.featureSet.poiRef, r.candidateKey);
    assert.equal(
      r.identityInputChecksum,
      hash(JSON.stringify(identities.get(r.candidateKey))),
    );
    for (const a of r.accessLinks) assert.ok(refs.has(a.anchorRef));
    for (const n of r.neighbors) assert.ok(ids.has(n.to));
    assert.equal(
      r.currentFactUsability,
      "UNKNOWN_REVERIFY_VIA_EXISTING_FACT_POLICY",
    );
  }
  const { files, manifest } = generateArtifacts(
    d,
    input.inputChecksum,
    input.rubric.rubricVersion,
  );
  const rebuilt = generateArtifacts(
    d,
    input.inputChecksum,
    input.rubric.rubricVersion,
  );
  assert.equal(
    hash(JSON.stringify([...files])),
    hash(JSON.stringify([...rebuilt.files])),
  );
  assert.equal(manifest.batches.length, 52);
  assert.equal(manifest.processed, 10369);
  assert.equal(manifest.remaining, 0);
  const changed = generateArtifacts(
    d,
    "changed-source-or-rubric",
    input.rubric.rubricVersion,
  );
  assert.notEqual(
    manifest.batches[0].inputChecksum,
    changed.manifest.batches[0].inputChecksum,
  );
  assert.ok(d.rows.filter((r) => r.provenance.length).length > 20);
  assert.equal(
    d.rows.reduce((s, r) => s + r.visitProfiles.length, 0),
    1,
  );
});
test("approved source input and canonical allocation lock match recorded SHA-256", () => {
  const lock = JSON.parse(
    readFileSync(
      new URL(
        "../data/poi/full/manifests/recovery-population-lock.v1.json",
        import.meta.url,
      ),
    ),
  );
  assert.equal(
    lock.hashes["src/shared/data/master-code-registry.v1.json"],
    "9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2",
  );
  assert.equal(lock.observationCount, 10491);
});
