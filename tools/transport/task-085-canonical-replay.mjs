import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { digest, stable, jsonl } from "./task-085-access-core.mjs";
import {
  TARGETED_PATH,
  targetedRepairOutcome,
} from "./task-085-targeted-repair.mjs";
import {
  ROOT,
  OUTPUT,
  CANONICAL,
  fingerprint,
  readJson,
  sha256,
  auditCanonical,
} from "./task-085-gate0.mjs";

export const REPLAY_PATH = OUTPUT + "/inputs/post-canonical-replay.json";
export const REPLAY_BASE = "f70c154a881fd6aa620481639aef0b2e76ff6a46";
export const REPLAY_DEVELOP = "5123966f62dbe9587a3bbe38e877ccf3ea959b80";
export const REPLAY_MERGE = "509c9fda40bb443b5a9c4a5e6ef36e875e713744";
export const REPLAY_AMENDMENT = "8ac80bf5d684a34145489f27c6cf2e6bd1e22e67";
export const EXCEPTION_STATUS =
  "READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS";
const lines = (bytes) =>
  bytes.toString().trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const identity = (poi) =>
  Object.fromEntries(
    Object.entries(poi).filter(
      ([key]) => !["lifecycle", "sourceRefs", "revision"].includes(key),
    ),
  );
const equal = (a, b, reason) => assert.equal(stable(a), stable(b), reason);

/** Offline, explicit bridge from the frozen discovery authority to PR #465.
 * Original source/extraction/review files are never rewritten or silently resealed. */
export function validateReplayReceipt(receipt, canonical, pois, fileHash) {
  const { receiptSha256, ...body } = receipt;
  assert.equal(receiptSha256, digest(body), "REPLAY_RECEIPT_CORRUPTED");
  assert.equal(receipt.baseHead, REPLAY_BASE, "REPLAY_BASE_CHANGED");
  assert.equal(receipt.developSha, REPLAY_DEVELOP, "REPLAY_AUTHORITY_CHANGED");
  assert.equal(receipt.mergeCommit, REPLAY_MERGE, "REPLAY_MERGE_CHANGED");
  assert.equal(
    receipt.amendmentCommit,
    REPLAY_AMENDMENT,
    "REPLAY_AMENDMENT_CHANGED",
  );
  assert.equal(
    canonical.sha256,
    receipt.newAuthority.runtimeManifestSha256,
    "REPLAY_RUNTIME_CHANGED",
  );
  assert.equal(
    canonical.datasetFileSha256,
    receipt.newAuthority.datasetFileSha256,
    "REPLAY_DATASET_CHANGED",
  );
  assert.equal(
    canonical.accessAdjudication.sha256,
    receipt.newAuthority.adjudicationFileSha256,
    "REPLAY_OWNER_CHANGED",
  );
  equal(
    pois.map((p) => p.internalId).sort(),
    receipt.records.map((p) => p.poiId).sort(),
    "REPLAY_MEMBERSHIP_DRIFT",
  );
  const excluded = new Set(canonical.accessAdjudication.excludedInternalIds);
  equal(
    [...excluded].sort(),
    receipt.excludedInternalIds,
    "REPLAY_EXCLUSIONS_CHANGED",
  );
  for (const p of pois) {
    const old = receipt.records.find((r) => r.poiId === p.internalId);
    assert.equal(
      digest(identity(p)),
      old.identitySha256,
      "REPLAY_IDENTITY_COORDINATE_DRIFT:" + p.internalId,
    );
    if (!excluded.has(p.internalId))
      assert.equal(
        digest(p),
        old.recordSha256,
        "REPLAY_NON_EXCLUDED_RECORD_CHANGED:" + p.internalId,
      );
  }
  for (const [path, hash] of Object.entries(receipt.preservedFiles)) {
    assert.ok(
      path.startsWith(OUTPUT + "/inputs/") && !path.includes(".."),
      "REPLAY_UNSAFE_PATH",
    );
    assert.equal(fileHash(path), hash, "REPLAY_EVIDENCE_CHANGED:" + path);
  }
  assert.equal(receipt.nationwideDiscoveryPerformed, false);
  assert.equal(receipt.newBlockerReleasingEvidence, false);
  return receipt;
}
export function loadCanonicalReplay(root, canonical, pois) {
  const r = validateReplayReceipt(
    readJson(root, REPLAY_PATH),
    canonical,
    pois,
    (p) => fingerprint(root, p).sha256,
  );
  const files = readdirSync(join(root, OUTPUT, "inputs"))
    .map((f) => OUTPUT + "/inputs/" + f)
    .filter((f) => f !== REPLAY_PATH && f !== TARGETED_PATH)
    .sort();
  equal(
    files,
    Object.keys(r.preservedFiles).sort(),
    "REPLAY_INPUT_INVENTORY_CHANGED",
  );
  return r;
}
export function validatePriorCanonicalBinding(oldHash, currentHash, receipt) {
  assert.equal(
    currentHash,
    receipt.newAuthority.datasetFileSha256,
    "REPLAY_NEW_BINDING_CHANGED",
  );
  assert.equal(
    oldHash,
    receipt.previousAuthority.datasetFileSha256,
    "REPLAY_OLD_BINDING_CHANGED",
  );
}
export function rebindDiscoveryReviews(reviews, receipt) {
  equal(
    reviews.map((r) => r.poiId).sort(),
    receipt.fixpointCases.map((p) => p.poiId).sort(),
    "REPLAY_FIXPOINT_SET_CHANGED",
  );
  return reviews.map((r) => {
    const old = receipt.fixpointCases.find((p) => p.poiId === r.poiId);
    assert.equal(digest(r), old.reviewSha256, "REPLAY_OLD_REVIEW_CHANGED");
    validatePriorCanonicalBinding(
      r.inventoryHashes.canonicalDatasetFileSha256,
      receipt.newAuthority.datasetFileSha256,
      receipt,
    );
    return {
      ...r,
      inventoryHashes: {
        ...r.inventoryHashes,
        canonicalDatasetFileSha256: receipt.newAuthority.datasetFileSha256,
      },
    };
  });
}
export function replayOutcome(input, combined, proofs) {
  if (input.targetedRepair)
    return targetedRepairOutcome(input, combined, proofs);
  if (!input.canonicalReplay) return { status: "NOT_APPLICABLE", issues: [] };
  const r = input.canonicalReplay,
    issues = [];
  for (const [name, actual] of [
    ["node-downstream-admission.jsonl", jsonl(input.admissions)],
    ["topology-confirmed-edges.jsonl", jsonl(combined.edges)],
    ["candidate-node-decisions.jsonl", jsonl(combined.decisions)],
  ])
    if (sha256(actual) !== r.preservedOutputHashes[name])
      issues.push("REPLAY_OUTPUT_CHANGED:" + name);
  const cases = r.fixpointCases.map((old) => {
    const p = proofs.find((p) => p.poiId === old.poiId);
    const current = p?.inventoryHashes ?? {};
    const changed = Object.keys(old.inventoryHashes).filter(
      (k) =>
        k !== "canonicalDatasetFileSha256" &&
        current[k] !== old.inventoryHashes[k],
    );
    if (
      !p ||
      p.status !== "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF" ||
      p.proofValidationIssues.length ||
      changed.length ||
      p.confirmedUsefulNodes !== old.confirmedUsefulNodes
    )
      issues.push("REPLAY_PROOF_INVALID:" + old.poiId);
    return {
      poiId: old.poiId,
      name: old.name,
      confirmedUsefulNodes: p?.confirmedUsefulNodes ?? null,
      missingEvidenceType: [
        ...new Set(
          [
            ...(p?.allCredibleCandidateDispositions ?? []),
            ...(p?.namedGatewayDispositions ?? []),
          ]
            .filter((b) => b.status.startsWith("EXTERNAL_"))
            .map((b) => b.status),
        ),
      ].sort(),
      exactBlockers: p?.externalBlockers ?? [],
      scope: p?.scope ?? null,
      previousInventoryHashes: old.inventoryHashes,
      currentInventoryHashes: current,
      previousProofSha256: old.proofSha256,
      currentProofSha256: p ? digest(p) : null,
      previousReviewSha256: old.reviewSha256,
      currentReviewSha256: p?.reviewSha256 ?? null,
      unchangedNonCanonicalHashes: changed.length === 0,
      proofValidAfterMerge:
        !!p &&
        p.status === "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF" &&
        !p.proofValidationIssues.length &&
        !changed.length &&
        p.confirmedUsefulNodes === old.confirmedUsefulNodes,
      newBlockerReleasingEvidenceFromPR465: false,
      evidenceDecision:
        "PR #465 changes only five excluded Canonical records and supporting authority; all source/review/license/admission inputs and this assessed record are unchanged.",
    };
  });
  const actualIds = proofs
    .filter((p) => p.status === "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF")
    .map((p) => p.poiId)
    .sort();
  if (stable(actualIds) !== stable(cases.map((p) => p.poiId).sort()))
    issues.push("REPLAY_FIXPOINT_SET_CHANGED");
  return {
    status: issues.length ? "FAIL" : "PASS",
    issues,
    receiptSha256: r.receiptSha256,
    latestDevelopSha: r.developSha,
    developMergeCommit: r.mergeCommit,
    previousHead: r.baseHead,
    nationwideDiscoveryPerformed: false,
    cases,
  };
}

export function createReplayReceipt(root = ROOT) {
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, maxBuffer: 80 * 1024 * 1024 });
  const blob = (rev, path) => git("show", rev + ":" + path);
  for (const rev of [REPLAY_BASE, REPLAY_DEVELOP, REPLAY_AMENDMENT])
    git("merge-base", "--is-ancestor", rev, REPLAY_MERGE);
  const canonical = auditCanonical(root),
    runtime = readJson(root, CANONICAL);
  const dataset = readJson(root, runtime.datasetPath),
    oldRuntime = JSON.parse(blob(REPLAY_BASE, CANONICAL));
  assert.equal(
    sha256(blob(REPLAY_BASE, oldRuntime.datasetPath)),
    oldRuntime.datasetFileSha256,
  );
  const oldDataset = JSON.parse(blob(REPLAY_BASE, oldRuntime.datasetPath));
  const excluded = canonical.accessAdjudication.excludedInternalIds
    .slice()
    .sort();
  const protectedPaths = [
    CANONICAL,
    runtime.datasetPath,
    runtime.accessAdjudicationPath,
    runtime.sampleManifestPath,
    runtime.registryPath,
    runtime.admissionResultsPath,
  ];
  for (const p of protectedPaths)
    assert.equal(
      fingerprint(root, p).sha256,
      sha256(blob(REPLAY_DEVELOP, p)),
      "DEVELOP_AUTHORITY_DIFFERENT:" + p,
    );
  equal(
    dataset.records.map((p) => p.internalId),
    oldDataset.records.map((p) => p.internalId),
    "REPLAY_MEMBERSHIP_DRIFT",
  );
  const preservedFiles = Object.fromEntries(
    readdirSync(join(root, OUTPUT, "inputs"))
      .sort()
      .map((f) => OUTPUT + "/inputs/" + f)
      .filter((f) => f !== REPLAY_PATH && f !== TARGETED_PATH)
      .map((p) => {
        const hash = sha256(blob(REPLAY_BASE, p));
        assert.equal(
          fingerprint(root, p).sha256,
          hash,
          "BASE_EVIDENCE_CHANGED:" + p,
        );
        return [p, hash];
      }),
  );
  const proofs = lines(
    blob(REPLAY_BASE, OUTPUT + "/candidate-exhaustion-proofs.jsonl"),
  ).filter((p) => p.status === "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF");
  const reviews = JSON.parse(
    blob(REPLAY_BASE, OUTPUT + "/inputs/discovery-review.json"),
  );
  const receipt = {
    schemaVersion: "1.0",
    scope: "TASK_085_POST_CANONICAL_REPLAY_ONLY",
    baseHead: REPLAY_BASE,
    developSha: REPLAY_DEVELOP,
    mergeCommit: REPLAY_MERGE,
    amendmentCommit: REPLAY_AMENDMENT,
    previousAuthority: {
      runtimeManifestSha256: sha256(blob(REPLAY_BASE, CANONICAL)),
      datasetFileSha256: oldRuntime.datasetFileSha256,
    },
    newAuthority: {
      runtimeManifestSha256: canonical.sha256,
      datasetFileSha256: canonical.datasetFileSha256,
      adjudicationFileSha256: canonical.accessAdjudication.sha256,
    },
    excludedInternalIds: excluded,
    records: oldDataset.records.map((p) => ({
      poiId: p.internalId,
      recordSha256: digest(p),
      identitySha256: digest(identity(p)),
    })),
    preservedFiles,
    preservedOutputHashes: Object.fromEntries(
      [
        "node-downstream-admission.jsonl",
        "topology-confirmed-edges.jsonl",
        "candidate-node-decisions.jsonl",
      ].map((p) => [p, sha256(blob(REPLAY_BASE, OUTPUT + "/" + p))]),
    ),
    fixpointCases: proofs.map((p) => ({
      poiId: p.poiId,
      name: p.name,
      confirmedUsefulNodes: p.confirmedUsefulNodes,
      proofSha256: digest(p),
      reviewSha256: digest(reviews.find((r) => r.poiId === p.poiId)),
      inventoryHashes: p.inventoryHashes,
    })),
    nationwideDiscoveryPerformed: false,
    newBlockerReleasingEvidence: false,
    boundary:
      "Original source and discovery receipts retain their historical Canonical binding. This verified bridge permits only the PR #465 owner-only change; it never converts external fixpoint proofs into physical exhaustion.",
  };
  receipt.receiptSha256 = digest(receipt);
  validateReplayReceipt(
    receipt,
    canonical,
    dataset.records,
    (p) => fingerprint(root, p).sha256,
  );
  return receipt;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  assert.ok(
    ["--write", "--check"].includes(process.argv[2]),
    "Use --write or --check; no discovery/network operation",
  );
  const receipt = createReplayReceipt();
  const text = JSON.stringify(receipt, null, 2) + "\n";
  if (process.argv[2] === "--write")
    writeFileSync(join(ROOT, REPLAY_PATH), text);
  else
    assert.equal(
      readFileSync(join(ROOT, REPLAY_PATH), "utf8"),
      text,
      "REPLAY_RECEIPT_DRIFT",
    );
  console.log(
    JSON.stringify({
      status: "PASS",
      receiptSha256: receipt.receiptSha256,
      proofCount: receipt.fixpointCases.length,
      rawCount: receipt.records.length,
      assessmentCount:
        receipt.records.length - receipt.excludedInternalIds.length,
      nationwideDiscoveryPerformed: false,
    }),
  );
}
