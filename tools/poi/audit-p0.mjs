import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  PREFIX,
  hash,
  readInputs,
  buildDataset,
  generateArtifacts,
} from "./enrich-candidates.mjs";
import {
  parsePoiFeatureSetV1,
  parsePoiVisitProfileV1,
} from "../../src/shared/contracts/planning/validation.ts";

// Independent disk audit: never trusts generated aggregate counters as the source of truth.
export function audit(root = ROOT) {
  const read = (p) => readFileSync(resolve(root, p), "utf8");
  const object = (p) => JSON.parse(read(p));
  const lines = (text) =>
    text.trim().split("\n").filter(Boolean).map(JSON.parse);
  const parts = (dir) =>
    readdirSync(resolve(root, `${PREFIX}/${dir}`))
      .filter((p) => /^batch-\d{4}\.jsonl$/.test(p))
      .sort()
      .flatMap((p) => lines(read(`${PREFIX}/${dir}/${p}`)));
  const input = readInputs(root);
  const baseline = buildDataset(
    input.candidates,
    input.articleIndex,
    input.reviewed,
    input.rubric,
    input.heldKeys,
  );
  const population = object(`${PREFIX}/manifests/p0-population.v1.json`);
  const ledger = object(`${PREFIX}/sources/p0-reviewed-evidence.v1.json`);
  const manifest = object(`${PREFIX}/manifests/p0-current.v1.json`);
  const p0 = new Set(population.orderedCandidateKeys);
  assert.equal(p0.size, 322);
  assert.equal(ledger.entries.length, 322);
  const evidence = new Map(
    [...input.reviewed.entries, ...ledger.entries].map((e) => [e.sourceRef, e]),
  );
  const rows = parts("features"),
    visits = parts("visit-profiles"),
    links = parts("transport-anchors"),
    edges = parts("neighbors");
  const anchors = lines(read(`${PREFIX}/transport-anchors/anchors.v1.jsonl`));
  const byId = new Map(rows.map((r) => [r.candidateKey, r]));
  const original = new Map(input.candidates.map((r) => [r.candidateKey, r]));
  const sources = new Map(
    input.articleIndex.entries.map((a) => [a.sourceRef, a]),
  );
  assert.equal(rows.length, 10369);
  assert.equal(byId.size, 10369);
  const counts = {};
  let known = 0,
    nulls = 0;
  for (const r of rows) {
    assert.equal(
      r.identityInputChecksum,
      hash(JSON.stringify(original.get(r.candidateKey))),
    );
    assert.equal(r.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");
    assert.equal(
      r.currentFactUsability,
      "UNKNOWN_REVERIFY_VIA_EXISTING_FACT_POLICY",
    );
    assert.ok(parsePoiFeatureSetV1(r.featureSet).ok);
    assert.equal(Object.keys(r.featureSet.values).length, 43);
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    const prov = new Map(r.provenance.map((p) => [p.featureCode, p]));
    assert.equal(prov.size, r.provenance.length);
    for (const [k, v] of Object.entries(r.featureSet.values)) {
      if (v === null) {
        nulls++;
        assert.ok(!prov.has(k));
        continue;
      }
      known++;
      assert.ok(Number.isInteger(v) && v >= 0 && v <= 9);
      const p = prov.get(k),
        definition = input.rubric.definitions.find((d) => d.code === k);
      assert.equal(p.value, v);
      assert.equal(p.kind, definition.kind);
      assert.equal(p.rubricVersion, input.rubric.rubricVersion);
      assert.equal(p.annotationMethod, "editorial_calibration");
      assert.ok(
        p.confidence >= 0 && p.confidence <= 1 && p.sourceRefs.length > 0,
      );
      if (p0.has(r.candidateKey)) assert.ok(p.rationale);
      for (const ref of p.sourceRefs) {
        assert.ok(
          original
            .get(r.candidateKey)
            .evidenceRefs.includes(sources.get(ref).url),
        );
        assert.ok(
          evidence.get(ref).features.some((f) => f.code === k && f.value === v),
        );
      }
      for (const f of p.facts) {
        const a = sources.get(f.sourceRef);
        assert.ok(
          f.reason &&
            f.locator.offset >= 0 &&
            f.locator.length > 0 &&
            f.locator.offset + f.locator.length <= a.targetContentEnd,
        );
        assert.match(f.locator.locatorSha256, /^[a-f0-9]{64}$/);
      }
    }
    if (p0.has(r.candidateKey)) {
      const e = ledger.entries.find((e) => e.candidateKey === r.candidateKey);
      assert.equal(r.status, e.status);
      assert.deepEqual(
        r.provenance.map((p) => [p.featureCode, p.value]),
        e.features
          .map((f) => [f.code, f.value])
          .sort((a, b) => a[0].localeCompare(b[0])),
      );
      if (r.status !== "REVIEWED_PARTIAL") assert.equal(r.provenance.length, 0);
    }
  }
  const anchorIds = new Set(anchors.map((a) => a.anchorRef));
  assert.equal(anchorIds.size, anchors.length);
  const linkIds = new Set();
  for (const l of links) {
    assert.ok(byId.has(l.candidateKey) && anchorIds.has(l.anchorRef));
    assert.ok(!linkIds.has(l.candidateKey + "|" + l.anchorRef));
    linkIds.add(l.candidateKey + "|" + l.anchorRef);
    assert.notEqual(byId.get(l.candidateKey).status, "QUARANTINED");
    for (const k of [
      "distanceMeters",
      "durationMinutes",
      "fare",
      "barrierFree",
      "lastMileWalkLevel",
    ])
      assert.equal(l[k], null);
    assert.equal(l.currentService, "UNKNOWN");
    assert.ok(
      l.sourceRefs.length &&
        l.locator.locatorSha256 &&
        l.confidence >= 0 &&
        l.confidence <= 1,
    );
  }
  for (const a of anchors) {
    assert.equal(a.providerRef, null);
    assert.equal(a.identityStatus, "CANDIDATE_NAME_SCOPED_NOT_PROVIDER_ID");
  }
  for (const v of visits) {
    assert.ok(parsePoiVisitProfileV1(v.profile).ok);
    assert.equal(v.profile.poiRef, v.candidateKey);
    for (const k of [
      "minimumDurationMinutes",
      "maximumUsefulDurationMinutes",
      "fixedWalkingLoad",
      "variableWalkingLoad",
      "fixedPhysicalLoad",
      "variablePhysicalLoad",
      "terrainModifier",
      "standingModifier",
    ])
      assert.equal(v.profile[k], null);
    for (const ref of v.profile.sourceRefs)
      assert.equal(
        evidence.get(ref).visit.recommendedDurationMinutes,
        v.profile.recommendedDurationMinutes,
      );
  }
  // Original TASK-068 snapshots are historical; compare only the scope that P0 cannot change.
  let preservedPartitions = 0;
  const generated = generateArtifacts(
    baseline,
    input.inputChecksum,
    input.rubric.rubricVersion,
  );
  for (const [p, text] of generated.files) {
    if (
      !/\/(features|visit-profiles|transport-anchors|neighbors)\/batch-/.test(p)
    )
      continue;
    const unchanged = (rs) => rs.filter((r) => !p0.has(r.candidateKey));
    if (p.includes("/neighbors/"))
      assert.equal(read(p), text, "Neighbor graph changed");
    else
      assert.deepEqual(
        unchanged(lines(read(p))),
        unchanged(lines(text)),
        "Non-P0 changed " + p,
      );
    preservedPartitions++;
  }
  const beforeAnchors = new Map(baseline.anchors.map((a) => [a.anchorRef, a]));
  for (const a of anchors)
    if (beforeAnchors.has(a.anchorRef)) {
      const b = beforeAnchors.get(a.anchorRef);
      assert.deepEqual({ ...a, sourceRefs: b.sourceRefs }, b);
      for (const ref of b.sourceRefs) assert.ok(a.sourceRefs.includes(ref));
    }
  for (const e of edges) {
    assert.ok(
      linkIds.has(e.from + "|" + e.anchorRef) &&
        linkIds.has(e.to + "|" + e.anchorRef),
    );
    assert.equal(e.walkable, null);
    assert.equal(e.routeFeasibility, "UNKNOWN");
  }
  let checksums = 0;
  for (const entry of [...manifest.inputHashes, ...manifest.outputs]) {
    assert.equal(
      hash(readFileSync(resolve(root, entry.path))),
      entry.sha256,
      entry.path,
    );
    checksums++;
  }
  const scanPaths = [
    ...new Set([
      ...manifest.outputs.map((o) => o.path),
      ...manifest.inputHashes.map((o) => o.path),
    ]),
  ];
  const secrets = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]{20,}/,
    /\bsk-[A-Za-z0-9]{24,}/,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}/,
  ];
  for (const p of scanPaths)
    assert.ok(
      !secrets.some((re) => re.test(read(p))),
      "Credential pattern " + p,
    );
  const aggregate = object("docs/qa/TASK-070/aggregate.json");
  assert.equal(aggregate.after.nonNull, known);
  assert.equal(aggregate.corpusRemainingNulls, nulls);
  assert.equal(
    aggregate.after.scoredPois,
    rows.filter((r) => r.provenance.length).length,
  );
  assert.equal(aggregate.after.anchors, anchors.length);
  assert.equal(aggregate.after.accessLinks, links.length);
  assert.equal(aggregate.after.visitProfiles, visits.length);
  assert.deepEqual(
    aggregate.identityRegistryHashesBefore,
    aggregate.identityRegistryHashesAfter,
  );
  return {
    schemaVersion: "task070-independent-disk-audit-v1",
    status: "PASS",
    candidateCount: rows.length,
    p0Reviewed: 322,
    states: counts,
    known,
    nulls,
    visitProfiles: visits.length,
    anchors: anchors.length,
    accessLinks: links.length,
    unchangedNeighborEdges: edges.length,
    preservedPartitions,
    checksumsVerified: checksums,
    credentialPatternFilesScanned: scanPaths.length,
    credentialFindings: 0,
    independentHumanGold: false,
    runtimeImportAuthorized: false,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(audit(), null, 2));
