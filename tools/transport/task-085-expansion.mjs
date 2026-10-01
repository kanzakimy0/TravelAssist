import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, sha256, auditGate0 } from "./task-085-gate0.mjs";
import { digest, jsonl, readTask085Access } from "./task-085-access-core.mjs";
const PREFIX = "data/transport/access-expansion";
const parseLines = (s) =>
  s.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const obj = (v) => JSON.stringify(v, null, 2) + "\n";

export function loadExpansion(root = ROOT) {
  const read = (p) => readFileSync(join(root, p));
  const source = JSON.parse(read(PREFIX + "/inputs/manifest.json"));
  const targetBytes = read(PREFIX + "/inputs/targets.jsonl");
  assert.equal(
    sha256(targetBytes),
    source.targetSha256,
    "EXPANSION_TARGET_HASH",
  );
  assert.equal(
    sha256(read(source.sourcePath)),
    source.sourceSha256,
    "EXPANSION_WORKBOOK_CHANGED",
  );
  const canonical = auditGate0(root).canonical;
  assert.equal(canonical.supportingSampleManifest.hashMatches, true);
  const manifest = JSON.parse(read("data/transport/access/manifest.json"));
  assert.equal(
    manifest.canonical.datasetFileSha256,
    canonical.datasetFileSha256,
    "EXPANSION_CANONICAL_DRIFT",
  );
  const getArtifact = (name) => {
    const data = read("data/transport/access/" + name);
    assert.equal(
      sha256(data),
      manifest.generatedArtifactHashes[name],
      "EXPANSION_REPLAY_ARTIFACT_DRIFT:" + name,
    );
    return data.toString();
  };
  const audit = JSON.parse(getArtifact("review-remediation-audit.json"));
  assert.equal(audit.status, "PASS", "EXPANSION_REMEDIATION_NOT_VERIFIED");
  const gate = JSON.parse(getArtifact("final-acceptance-gate.json"));
  const permittedGaps = new Set([
    "Valid Canonical POIs with confirmed useful topology",
    "Zero-node valid accessible POIs",
    "Under-target without exhaustion proof",
    "globalTopologyDiscoveryFixpoint",
  ]);
  assert.ok(
    gate.gates.every((g) => g.status === "PASS" || permittedGaps.has(g.name)),
    "EXPANSION_INTEGRITY_GATE_FAILED",
  );
  const targets = parseLines(targetBytes.toString());
  assert.equal(targets.length, source.targetCount);
  assert.equal(
    new Set(targets.map((r) => r.candidateInternalUuid)).size,
    targets.length,
    "EXPANSION_DUPLICATE_UUID",
  );
  assert.ok(
    targets.every((r) => /^[1-7][0-9]{4}$/.test(r.targetMasterCode)),
    "EXPANSION_FORBIDDEN_PREFIX",
  );
  const sourceFiles = [
    "tools/transport/task-085-expansion.mjs",
    "tools/transport/task-085-expansion-inventory.py",
    PREFIX + "/inputs/manifest.json",
    PREFIX + "/inputs/targets.jsonl",
    "data/transport/access/manifest.json",
  ].map((path) => ({ path, sha256: sha256(read(path)) }));
  return {
    targets,
    source,
    canonical,
    sourceFiles,
    inputFingerprint: digest(sourceFiles),
    pois: JSON.parse(read(canonical.datasetPath)).records,
    completeness: JSON.parse(getArtifact("poi-access-completeness.json")),
    edges: parseLines(getArtifact("topology-confirmed-edges.jsonl")),
    evidence: parseLines(getArtifact("topology-evidence-export.jsonl")),
    admissions: parseLines(getArtifact("node-downstream-admission.jsonl")),
  };
}

export function buildExpansion(input) {
  const admitted = new Map(
    input.admissions
      .filter((n) => n.downstream085Authorized)
      .map((n) => [n.nodeId, n]),
  );
  const canonicalByUuid = new Map(
    input.pois.map((p) => [p.internalId.replace(/^poi:/, ""), p]),
  );
  assert.ok(
    input.pois.every((p) =>
      input.targets.some(
        (t) => t.candidateInternalUuid === p.internalId.replace(/^poi:/, ""),
      ),
    ),
    "EXPANSION_AUTHORIZED_MEMBERSHIP_LOST",
  );
  const artifacts = {},
    summaries = [],
    results = [];
  for (let start = 0; start < input.targets.length; start += 200) {
    const targets = input.targets.slice(start, start + 200),
      id = String(start / 200 + 1).padStart(4, "0");
    const edges = [],
      rows = [];
    for (const target of targets) {
      const poi = canonicalByUuid.get(target.candidateInternalUuid);
      const state = poi
        ? input.completeness.find((p) => p.poiId === poi.internalId)
        : null;
      if (poi) assert.ok(state, "EXPANSION_AUTHORIZED_POI_SILENT_OMISSION");
      const related =
        poi && state.assessmentEligible
          ? input.edges.filter((e) => e.poiId === poi.internalId)
          : [];
      for (const edge of related) {
        assert.ok(admitted.has(edge.nodeId), "EXPANSION_UNADMITTED_NODE");
        const evidence = input.evidence.filter((e) =>
          edge.provenance.topologyEvidence.some(
            (p) => p.evidenceId === e.evidenceId && p.sha256 === digest(e),
          ),
        );
        assert.ok(evidence.length, "EXPANSION_EVIDENCE_MISSING");
        readTask085Access(edge, evidence);
        assert.ok(
          related.some(
            (e) => e.nodeId === edge.nodeId && e.direction !== edge.direction,
          ),
          "EXPANSION_MISSING_DIRECTION",
        );
      }
      const count = new Set(related.map((e) => e.nodeId)).size;
      assert.ok(count <= 8, "EXPANSION_NODE_CAP");
      const row = {
        ...target,
        batchId: id,
        canonicalPoiId: poi?.internalId ?? null,
        canonicalMasterCode: poi?.masterCode ?? null,
        canonicalAuthorized: !!poi,
        assessmentEligible: !!state?.assessmentEligible,
        status: !poi
          ? "HOLD_CANONICAL_NOT_ADMITTED"
          : !state.assessmentEligible
            ? "OWNER_ADJUDICATED_EXCLUDED"
            : count < 3
              ? "HOLD_ACCESS_EVIDENCE_SHORTFALL"
              : "CONFIRMED_TOPOLOGY_TARGET_MET",
        usefulNodeCount: count,
        directedEdgeCount: related.length,
        shortfall: state?.assessmentEligible ? Math.max(0, 3 - count) : null,
        newCoverage: false,
        reusedVerifiedTopology: related.length > 0,
        missingEvidence: !poi
          ? ["A_CANONICAL_ADMISSION_IDENTITY_AND_COORDINATE_AUTHORITY"]
          : state?.assessmentEligible && count < 3
            ? ["OFFICIAL_GATEWAY_IDENTITY_OR_ENDPOINT_EVIDENCE"]
            : [],
        nodeIds: [...new Set(related.map((e) => e.nodeId))],
        edgeIds: related.map((e) => e.edgeId),
        runtimeImportAuthorized: false,
        metricsRemainDirectionSpecific: true,
      };
      rows.push(row);
      edges.push(...related);
    }
    const paths = {
      ["batches/" + id + "/poi-results.jsonl"]: jsonl(rows),
      ["batches/" + id + "/edges.jsonl"]: jsonl(edges),
    };
    const summary = {
      batchId: id,
      targetCount: targets.length,
      canonicalAdmitted: rows.filter((r) => r.canonicalAuthorized).length,
      newCoverage: 0,
      existingCoveredPois: rows.filter((r) => r.usefulNodeCount > 0).length,
      confirmedRelationships: edges.length / 2,
      directedEdges: edges.length,
      canonicalHold: rows.filter((r) => !r.canonicalAuthorized).length,
      excludedByOwner: rows.filter(
        (r) => r.status === "OWNER_ADJUDICATED_EXCLUDED",
      ).length,
      accessShortfalls: rows
        .filter((r) => r.status === "HOLD_ACCESS_EVIDENCE_SHORTFALL")
        .map((r) => r.canonicalPoiId),
      identityLicenseAndRestrictionQa: "PASS",
      qaScope: "EXPORTED_EDGES_ONLY_HOLD_NOT_ACCEPTED",
      fullAccessAcceptance: rows.every(
        (r) => r.status === "CONFIRMED_TOPOLOGY_TARGET_MET",
      )
        ? "PASS"
        : "PARTIAL",
      inputFingerprint: input.inputFingerprint,
      artifactHashes: Object.fromEntries(
        Object.entries(paths).map(([p, text]) => [p, sha256(text)]),
      ),
    };
    const receipt = { ...summary, receiptSha256: digest(summary) };
    Object.assign(artifacts, paths, {
      ["batch-receipts/" + id + ".json"]: obj(receipt),
    });
    summaries.push(summary);
    results.push(...rows);
  }
  assert.equal(results.length, input.targets.length);
  artifacts["poi-results.jsonl"] = jsonl(results);
  artifacts["batch-summary.json"] = obj(summaries);
  const summary = {
    status: "PARTIAL_CANONICAL_ADMISSION_AND_ACCESS_EVIDENCE_REQUIRED",
    scope: "TASK_085_POI_TO_TRANSPORT_ONLY",
    targetCount: results.length,
    batchCount: summaries.length,
    batchSize: 200,
    rawCanonicalCount: input.pois.length,
    assessmentDenominator: input.canonical.accessAdjudication.assessmentCount,
    canonicalMatched: results.filter((r) => r.canonicalAuthorized).length,
    canonicalHold: results.filter((r) => !r.canonicalAuthorized).length,
    newCoverage: 0,
    existingCoveredPois: results.filter((r) => r.usefulNodeCount > 0).length,
    relationships: summaries.reduce((s, b) => s + b.confirmedRelationships, 0),
    directedEdges: summaries.reduce((s, b) => s + b.directedEdges, 0),
    excludedPrefix0: input.source.region0Excluded,
    prefix8NodeReuseOnly: input.source.transport8NodeOnly,
    admittedTransportNodeInventory: admitted.size,
    noCandidatePromotion: true,
    runtimeImportAuthorized: false,
    nationwideBackboneAccepted: false,
    sourceFiles: input.sourceFiles,
    inputFingerprint: input.inputFingerprint,
    generatedArtifactHashes: Object.fromEntries(
      Object.entries(artifacts).map(([p, t]) => [p, sha256(t)]),
    ),
  };
  artifacts["manifest.json"] = obj(summary);
  return { artifacts, summary };
}

export function executeExpansion({
  root = ROOT,
  out = join(root, PREFIX),
  mode = "resume",
  rerunBatch = null,
  input = loadExpansion(root),
} = {}) {
  const built = buildExpansion(input);
  assert.ok(
    rerunBatch === null ||
      (Number.isInteger(rerunBatch) &&
        rerunBatch >= 1 &&
        rerunBatch <= built.summary.batchCount),
    "EXPANSION_INVALID_BATCH",
  );
  assert.deepEqual(
    built.artifacts,
    buildExpansion(input).artifacts,
    "EXPANSION_NON_DETERMINISTIC",
  );
  const operations = [];
  // Validate every existing receipt before writing any output.
  for (let i = 1; i <= built.summary.batchCount; i++) {
    const id = String(i).padStart(4, "0"),
      file = join(out, "batch-receipts", id + ".json");
    if (!existsSync(file) || mode === "rebuild" || rerunBatch === i) continue;
    const { receiptSha256, ...r } = JSON.parse(readFileSync(file));
    assert.equal(digest(r), receiptSha256, "EXPANSION_CORRUPTED_RECEIPT");
    for (const [path, hash] of Object.entries(r.artifactHashes)) {
      assert.ok(
        new RegExp("^batches/" + id + "/(poi-results|edges)\\.jsonl$").test(
          path,
        ),
        "EXPANSION_UNSAFE_RECEIPT_PATH",
      );
      assert.equal(
        sha256(readFileSync(join(out, path))),
        hash,
        "EXPANSION_CORRUPTED_BATCH",
      );
    }
  }
  for (const [path, text] of Object.entries(built.artifacts)) {
    const file = join(out, path);
    const same = existsSync(file) && readFileSync(file, "utf8") === text;
    const rerun =
      rerunBatch !== null &&
      (path.startsWith(
        "batches/" + String(rerunBatch).padStart(4, "0") + "/",
      ) ||
        path ===
          "batch-receipts/" + String(rerunBatch).padStart(4, "0") + ".json");
    if (mode === "check") assert.ok(same, "EXPANSION_ARTIFACT_DRIFT:" + path);
    else if (!same || mode === "rebuild" || rerun) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
    if (path.startsWith("batch-receipts/"))
      operations.push({
        path,
        action:
          same && mode !== "rebuild" && !rerun ? "CHECKSUM_SKIP" : "GENERATE",
      });
  }
  return { ...built.summary, deterministicRebuild: "PASS", operations };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = executeExpansion({
    mode: process.argv.includes("--check")
      ? "check"
      : process.argv.includes("--rebuild")
        ? "rebuild"
        : "resume",
    rerunBatch: process.argv.includes("--rerun-batch")
      ? Number(process.argv[process.argv.indexOf("--rerun-batch") + 1])
      : null,
  });
  console.log(JSON.stringify(result, null, 2));
}
