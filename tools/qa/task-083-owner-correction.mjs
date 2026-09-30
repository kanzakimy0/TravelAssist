import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { supportingManifestSha256 } from "./canonical-supporting-hash.mjs";
import { validateCanonicalAccessAdjudication } from "../../src/server/poi-runtime/access-adjudication.ts";
const BASE = "5b951195698d3e421f34a9922393b454412fa4bb";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const oldBytes = (p) =>
  execFileSync("git", ["show", BASE + ":" + p], {
    maxBuffer: 20 * 1024 * 1024,
  });
const datasetPath = "src/shared/data/canonical-poi-pilot100.v1.json";
const runtimePath =
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json";
const before = JSON.parse(oldBytes(datasetPath)),
  after = read(datasetPath),
  m = read(runtimePath),
  prior = JSON.parse(oldBytes(runtimePath)),
  a = read(m.accessAdjudicationPath);
validateCanonicalAccessAdjudication(after, m, a);
assert.deepEqual(m.internalIds, prior.internalIds);
assert.deepEqual(m.masterCodes, prior.masterCodes);
const changed = [];
for (let i = 0; i < before.records.length; i++) {
  const b = before.records[i],
    n = after.records[i];
  const keys = Object.keys(b).filter(
    (k) => JSON.stringify(b[k]) !== JSON.stringify(n[k]),
  );
  if (keys.length) {
    changed.push({ internalId: b.internalId, fields: keys });
    assert.ok(a.records.some((r) => r.internalId === b.internalId));
    assert.ok(
      keys.every((k) => ["lifecycle", "revision", "sourceRefs"].includes(k)),
    );
  }
}
assert.equal(changed.length, a.records.length);
const invariantPaths = [
  m.sampleManifestPath,
  m.registryPath,
  m.admissionResultsPath,
  "src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json",
  "data/poi/full/manifests/current-candidate-review.v1.json",
];
const unchanged = invariantPaths.map((p) => {
  assert.deepEqual(readFileSync(p), oldBytes(p), p);
  return { path: p, sha256: sha(readFileSync(p)) };
});
const sample = readFileSync(m.sampleManifestPath),
  actual = supportingManifestSha256(sample),
  crlf = sha(Buffer.from(sample.toString("utf8").replaceAll("\n", "\r\n")));
assert.equal(actual, m.sampleManifestSha256);
assert.equal(crlf, prior.sampleManifestSha256);
assert.equal(
  execFileSync(
    "git",
    [
      "diff",
      BASE,
      "--",
      "data/transport",
      "tools/transport",
      "docs/qa/TASK-085-B",
      "docs/tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md",
    ],
    { encoding: "utf8" },
  ),
  "",
);
const receipt = {
  task: "TASK-083-A",
  scope: "CANONICAL_OWNER_CORRECTION",
  status: "PASS",
  baseDevelopSha: BASE,
  reauthorizedAt: a.decidedAt,
  membershipCount: after.records.length,
  membershipAndOrderUnchanged: true,
  masterCodesAndBindingsUnchanged: true,
  changedRecords: changed,
  unaffectedRecordsByteEquivalent: before.records.length - changed.length,
  unchangedArtifacts: unchanged,
  supportingManifest: {
    path: m.sampleManifestPath,
    previousDeclaredSha256: prior.sampleManifestSha256,
    actualLfSha256: actual,
    reconstructedCrlfSha256: crlf,
    correctedDeclaredSha256: m.sampleManifestSha256,
    status: "PASS",
  },
  runtimeManifest: {
    path: runtimePath,
    sha256: sha(readFileSync(runtimePath)),
    datasetRevision: m.datasetRevision,
    datasetSha256: m.datasetSha256,
    datasetFileSha256: m.datasetFileSha256,
  },
  accessAdjudication: {
    path: m.accessAdjudicationPath,
    revision: m.accessAdjudicationRevision,
    sha256: m.accessAdjudicationFileSha256,
    finalDecisions: a.records.length,
    unresolvedOwnerDecisions: 0,
    assessmentExclusions: a.downstreamAssessment.excludedInternalIds,
    remainingAssessmentRecords: a.downstreamAssessment.remainingRecordCount,
  },
  transportArtifactsChanged: 0,
  task085ReplayExecuted: false,
  qualityGateReceipt:
    "Final head, PR and merged-develop run are recorded in the correction PR body; no self-referential commit hash in generated files.",
};
const out = "docs/qa/TASK-083/canonical-owner-correction/reauthorization.json",
  text = JSON.stringify(receipt, null, 2) + "\n";
if (process.argv.includes("--write")) writeFileSync(out, text);
else assert.equal(readFileSync(out, "utf8"), text);
console.log(JSON.stringify(receipt));
