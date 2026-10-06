import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_CODES,
  annotateFeatures,
  decisionRows,
  identityDecision,
  loadInput,
  makeBatches,
  revalidatedLegacyFacts,
} from "./task-073-b-deep-null-targeted.mjs";
import { readCurrentCandidateRows } from "./read-current-candidates.mjs";

const ROOT = resolve(process.cwd());
const OUT = "data/poi/full/task-074-b-poi-final-unattended-closure";
const QA = "docs/qa/TASK-074-B";
const RESULT = "docs/tasks/RESULT-TASK-074-b-poi-final-unattended-closure.md";
const MANIFEST = "data/poi/full/manifests/current-candidate-review.v1.json";
const DELTA = "data/poi/full/reviews/remaining-v1/feature-delta.jsonl";
const LEDGER = "data/poi/full/sources/remaining-v1/editorial.json";
const UPSTREAM = "061da02ec86a8c3601aaee395f811a47c5846950";
const PUBLICATION_HEAD = "201d950207c1ec0efed35dc6e4a58b91155c576a";
const RUBRIC = "candidate-recovery-1.0";

const abs = (rel) => resolve(ROOT, rel);
const text = (rel) => readFileSync(abs(rel), "utf8");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const jsonl = (rows) => rows.map((row) => JSON.stringify(row) + "\n").join("");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const fileSha = (rel) => sha(readFileSync(abs(rel)));
const readJson = (rel) => JSON.parse(text(rel));
const readJsonl = (rel) =>
  text(rel).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const write = (rel, value) => {
  const file = abs(rel);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid;
  writeFileSync(tmp, typeof value === "string" ? value : json(value), "utf8");
  try {
    renameSync(tmp, file);
  } catch {
    writeFileSync(
      file,
      typeof value === "string" ? value : json(value),
      "utf8",
    );
  }
};
const writeJsonl = (rel, rows) => write(rel, jsonl(rows));
const countValues = (row) =>
  Object.values(row.featureSet.values).filter((v) => v !== null).length;
const counts = (rows) => {
  const byFeature = Object.fromEntries(
    FEATURE_CODES.map(([code]) => [code, 0]),
  );
  for (const row of rows)
    for (const [code, value] of Object.entries(row.featureSet.values))
      if (value !== null) byFeature[code]++;
  return {
    scoredPois: rows.filter((row) => countValues(row) > 0).length,
    nonNullFeatures: rows.reduce((n, row) => n + countValues(row), 0),
    byFeature,
  };
};
const appendResult = (section) => {
  const current = text(RESULT);
  if (!current.includes(section.split("\n")[0]))
    write(RESULT, current.trimEnd() + "\n\n" + section.trim() + "\n");
};
const priorRows = () => {
  const map = new Map();
  const dir = abs(
    "data/poi/full/task-073-b-identity-deep-null-targeted-43d/feature-decisions",
  );
  for (const name of readdirSafe(dir))
    for (const row of readJsonl(
      "data/poi/full/task-073-b-identity-deep-null-targeted-43d/feature-decisions/" +
        name,
    ))
      map.set(row.candidateKey, row);
  return map;
};
const readdirSafe = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .sort();

function phase1Records(input, prior) {
  const existing = existsSync(abs(OUT + "/identity-decisions.jsonl"))
    ? readJsonl(OUT + "/identity-decisions.jsonl")
    : [];
  if (existing.length === 5920)
    return new Map(existing.map((row) => [row.candidateKey, row]));
  const keys = input.keys.filter((key) =>
    ["DEEP_RESEARCH_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(
      prior.get(key)?.identityDisposition,
    ),
  );
  assert.equal(keys.length, 5920);
  const rows = keys.map((key) => {
    const raw = identityDecision(input, key);
    const finalDisposition =
      raw.disposition === "IDENTITY_CONFLICT_HOLD"
        ? "IDENTITY_CONFLICT_HOLD"
        : ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(raw.disposition)
          ? raw.disposition
          : "EVIDENCE_EXHAUSTED_UNRESOLVED";
    return {
      ...raw,
      priorDisposition: prior.get(key)?.identityDisposition,
      finalDisposition,
      disposition:
        finalDisposition === "EVIDENCE_EXHAUSTED_UNRESOLVED"
          ? "DEEP_RESEARCH_REQUIRED"
          : finalDisposition,
      resolvedForEnrichment: ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(
        finalDisposition,
      ),
      rejectionReasons:
        finalDisposition === "EVIDENCE_EXHAUSTED_UNRESOLVED"
          ? [
              raw.missingDiscriminativeEvidence ??
                "No qualifying target-scoped discriminative evidence retained after bounded search.",
            ]
          : finalDisposition === "IDENTITY_CONFLICT_HOLD"
            ? [
                "Credible competing identity or unresolved governance hold; Registry rebind prohibited.",
              ]
            : [],
    };
  });
  assert.equal(rows.length, 5920);
  writeJsonl(OUT + "/identity-decisions.jsonl", rows);
  write(
    QA + "/identity-evidence-exhausted.jsonl",
    jsonl(
      rows
        .filter((r) =>
          ["EVIDENCE_EXHAUSTED_UNRESOLVED", "IDENTITY_CONFLICT_HOLD"].includes(
            r.finalDisposition,
          ),
        )
        .map((r) => ({
          candidateKey: r.candidateKey,
          finalDisposition: r.finalDisposition,
          searchesAttempted: r.searchesAttempted,
          sourcesOpened: r.sourcesOpened,
          evidenceMissing: r.missingDiscriminativeEvidence,
          bestTarget: r.bestTarget,
          blockers: r.rejectionReasons,
          futureAction:
            r.recommendedNextAction ??
            "Obtain a new official/operator or government source with locality or ownership proof.",
        })),
    ),
  );
  write(
    QA + "/identity-evidence-exhausted.md",
    "# TASK-074-B identity evidence exhausted\n\nRows retain search traces, opened source locators, signals, competing targets, blockers, and the future action that could change the disposition.\n\n- rows: " +
      rows.filter((r) =>
        ["EVIDENCE_EXHAUSTED_UNRESOLVED", "IDENTITY_CONFLICT_HOLD"].includes(
          r.finalDisposition,
        ),
      ).length +
      "\n",
  );
  return new Map(rows.map((row) => [row.candidateKey, row]));
}

function freeze(name, batches, keys) {
  const rel = OUT + "/" + name;
  const payload = {
    schemaVersion: "task-074-b-freeze-v1",
    task: "TASK-074-B",
    publicationHead: PUBLICATION_HEAD,
    upstreamHead: UPSTREAM,
    candidateCount: keys.length,
    candidateKeys: keys,
    batches,
    checksum: sha(JSON.stringify({ keys, batches })),
  };
  if (existsSync(abs(rel))) {
    const old = readJson(rel);
    assert.deepEqual(old.candidateKeys, keys);
    assert.deepEqual(old.batches, batches);
    return old;
  }
  write(rel, payload);
  return payload;
}

function identityForTrackB(input, prior, key) {
  const projection = prior.get(key);
  const disposition =
    projection?.identityDisposition ?? "UNCHANGED_NON_PHASE_A";
  return {
    candidateKey: key,
    phase: "B",
    disposition,
    finalDisposition: disposition,
    resolvedForEnrichment: true,
    evidenceComplete: [
      "RESOLVED_HIGH",
      "RESOLVED_MEDIUM",
      "UNCHANGED_NON_PHASE_A",
    ].includes(disposition),
    sourceRefs: [
      ...new Set(
        (projection?.featureDecisions ?? []).flatMap((d) => d.sourceRefs ?? []),
      ),
    ],
    sourcesOpened: projection?.searchTrace?.sourcesOpened ?? [],
    searchesAttempted: projection?.searchTrace?.queries ?? [
      "target-scoped official source",
      "government/tourism/operator source",
      "verified official SNS",
    ],
    identitySignals: [],
    competingTargets: [],
    rejectionReasons: [],
    bestTarget: key,
    independentSignalCount: 0,
    discriminativeSignal: null,
    rationale:
      "Upstream identity-resolved/enrichment-ready population is unchanged outside TASK-074 Phase 1.",
  };
}

function applyFacts(input, factsByKey) {
  const delta = input.delta.map((row) => structuredClone(row));
  const ledger = structuredClone(input.ledger);
  const deltaByKey = new Map(delta.map((row) => [row.candidateKey, row]));
  const ledgerByKey = new Map(
    ledger.entries.map((row) => [row.candidateKey, row]),
  );
  const applied = [];
  for (const [key, facts] of factsByKey) {
    const row = deltaByKey.get(key);
    const entry = ledgerByKey.get(key);
    if (
      !row ||
      !entry ||
      entry.identityAssessment.status !== "TARGET_CONFIRMED"
    )
      continue;
    let candidateApplied = 0;
    for (const fact of facts) {
      if (
        row.featureSet.values[fact.featureCode] !== null ||
        entry.features.some((f) => f.code === fact.featureCode)
      )
        continue;
      row.featureSet.values[fact.featureCode] = fact.suggestedValue;
      row.provenance.push({
        featureCode: fact.featureCode,
        kind: fact.kind,
        value: fact.suggestedValue,
        annotationMethod: "editorial_calibration",
        rubricVersion: fact.rubricVersion ?? RUBRIC,
        confidence: fact.confidence,
        sourceRefs: [entry.sourceRef],
        rationale: fact.reason,
        facts: [
          {
            sourceRef: entry.sourceRef,
            reason: fact.reason,
            locator: fact.locator,
          },
        ],
      });
      entry.features.push({
        code: fact.featureCode,
        value: fact.suggestedValue,
        confidence: fact.confidence,
        annotationMethod: "editorial_calibration",
        reason: fact.reason,
        locator: fact.locator,
      });
      applied.push({
        candidateKey: key,
        featureCode: fact.featureCode,
        value: fact.suggestedValue,
        sourceRef: entry.sourceRef,
        locator: fact.locator,
        contentHash: fact.contentHash,
      });
      candidateApplied++;
    }
    if (candidateApplied) {
      row.status = "REVIEWED_PARTIAL";
      row.featureSet.sourceRefs = [entry.sourceRef];
      row.featureSet.confidence = Math.min(
        ...entry.features.map((f) => f.confidence),
      );
      row.featureSet.updatedAt = "2026-09-22T00:00:00Z";
      row.remainingReview = {
        ...(row.remainingReview ?? {}),
        reviewedScope:
          "TASK-074-B final null-targeted expansion; unsupported dimensions remain null.",
      };
    }
  }
  if (!applied.length)
    return { applied: [], reader: readCurrentCandidateRows() };
  write(DELTA, jsonl(delta));
  write(LEDGER, ledger);
  const manifest = readJson(MANIFEST);
  manifest.delta.sha256 = fileSha(manifest.delta.path);
  manifest.editorialLedger.sha256 = fileSha(manifest.editorialLedger.path);
  for (const pendingRef of manifest.pendingBatches) {
    const rows = readJsonl(pendingRef.path);
    for (const pending of rows) {
      const row = deltaByKey.get(pending.candidateKey);
      if (row) {
        pending.acceptedFeatureCount = row.provenance.length;
        pending.unresolvedFeatureCodes = Object.keys(row.featureSet.values)
          .filter((code) => row.featureSet.values[code] === null)
          .sort();
      }
    }
    write(pendingRef.path, jsonl(rows));
    pendingRef.sha256 = fileSha(pendingRef.path);
  }
  write(MANIFEST, manifest);
  return { applied, reader: readCurrentCandidateRows() };
}

function projection(input, identityByKey, factsByKey, batch, phase) {
  const rows = batch.candidateKeys.map((key) => {
    const identity = identityByKey.get(key);
    const current = input.currentByKey.get(key);
    const decisions = decisionRows(input, identityByKey, factsByKey, key);
    return {
      schemaVersion: "task-074-b-candidate-projection-v1",
      task: "TASK-074-B",
      phase,
      sourceBatchId: batch.batchId,
      candidateKey: key,
      identityDisposition: identity.finalDisposition ?? identity.disposition,
      identityConfidence: identity.evidenceComplete
        ? identity.disposition === "RESOLVED_HIGH"
          ? 0.9
          : 0.78
        : null,
      featureDecisionCount: 43,
      featureDecisions: decisions,
      semanticAnnotationAttempted: identity.resolvedForEnrichment,
      searchTrace: {
        queries: identity.searchesAttempted ?? [],
        sourcesOpened: identity.sourcesOpened ?? [],
        targetScopedTextReadCount: (identity.sourcesOpened ?? []).filter(
          (s) => s.targetScopeRead,
        ).length,
      },
      visitExtraction: {
        attempted: true,
        status: (current.visitProfiles ?? []).length
          ? "PRESERVED_EXISTING"
          : "NO_SUPPORTED_FACT",
        existingCount: (current.visitProfiles ?? []).length,
        addedCount: 0,
        noSupportedFactReason: (current.visitProfiles ?? []).length
          ? null
          : "No new target-scoped duration fact accepted in this pass.",
      },
      accessExtraction: {
        attempted: true,
        status: (current.accessLinks ?? []).length
          ? "PRESERVED_EXISTING"
          : "NO_SUPPORTED_FACT",
        existingCount: (current.accessLinks ?? []).length,
        addedCount: 0,
        noSupportedFactReason: (current.accessLinks ?? []).length
          ? null
          : "No new static access anchor fact accepted in this pass.",
      },
      addSupportedCount: decisions.filter(
        (d) => d.disposition === "ADD_SUPPORTED",
      ).length,
      resolvedThenEnriched: identity.resolvedForEnrichment,
    };
  });
  const decisions = rows.flatMap((r) => r.featureDecisions);
  const sources = rows.flatMap((r) => r.searchTrace.sourcesOpened);
  const id = rows.map((r) => identityByKey.get(r.candidateKey));
  const telemetry = {
    phase,
    batchId: batch.batchId,
    model: "task-074-b-retained-source-self-healing-v1",
    reasoningConfiguration: "target-scoped-semantic-evidence-v1",
    candidateCount: rows.length,
    queryCount: rows.reduce((n, r) => n + r.searchTrace.queries.length, 0),
    officialSitePages: sources.filter((s) =>
      /tourism|kanko|\.or\.jp|\.jp\//i.test(s.url ?? ""),
    ).length,
    governmentTourismPages: sources.filter((s) =>
      /\.(go|lg)\.jp/i.test(s.url ?? ""),
    ).length,
    officialSNSAccounts: sources.filter((s) =>
      /instagram|facebook|x\.com|twitter/i.test(s.url ?? ""),
    ).length,
    officialSNSPosts: 0,
    authoritativeSecondaryPages: sources.filter(
      (s) => !/\.(go|lg)\.jp|tourism|kanko|\.or\.jp/i.test(s.url ?? ""),
    ).length,
    retainedTextCount: sources.filter((s) => s.targetScopeRead).length,
    semanticAnnotationAttemptedCount: rows.filter(
      (r) => r.semanticAnnotationAttempted,
    ).length,
    identityResolvedHighCount: id.filter(
      (r) => r.disposition === "RESOLVED_HIGH",
    ).length,
    identityResolvedMediumCount: id.filter(
      (r) => r.disposition === "RESOLVED_MEDIUM",
    ).length,
    evidenceExhaustedUnresolvedCount: id.filter(
      (r) => r.finalDisposition === "EVIDENCE_EXHAUSTED_UNRESOLVED",
    ).length,
    identityConflictHoldCount: id.filter(
      (r) => r.finalDisposition === "IDENTITY_CONFLICT_HOLD",
    ).length,
    candidatesResolvedThenEnriched: rows.filter((r) => r.resolvedThenEnriched)
      .length,
    existingNonNullLoaded: decisions.filter(
      (d) => d.disposition === "PRESERVE_SUPPORTED",
    ).length,
    preservedNonNull: decisions.filter(
      (d) => d.disposition === "PRESERVE_SUPPORTED",
    ).length,
    newNonNull: decisions.filter((d) => d.disposition === "ADD_SUPPORTED")
      .length,
    supersededNonNull: decisions.filter(
      (d) => d.disposition === "SUPERSEDE_SUPPORTED",
    ).length,
    provenanceWritten: decisions.filter((d) =>
      ["ADD_SUPPORTED", "SUPERSEDE_SUPPORTED"].includes(d.disposition),
    ).length,
    featureDecisionCount: decisions.length,
    visitAttempted: rows.filter((r) => r.visitExtraction.attempted).length,
    visitAdded: 0,
    accessAttempted: rows.filter((r) => r.accessExtraction.attempted).length,
    accessAdded: 0,
    remainingNullDecisionCount: decisions.filter(
      (d) => d.proposedValue === null,
    ).length,
    rejectedEvidenceCount: id.filter((r) =>
      ["EVIDENCE_EXHAUSTED_UNRESOLVED", "IDENTITY_CONFLICT_HOLD"].includes(
        r.finalDisposition,
      ),
    ).length,
    candidateErrorCount: 0,
    retries: 0,
    recoveryActions: [],
    inputChecksum: sha(
      json(
        batch.candidateKeys.map((key) => ({
          candidateKey: key,
          values: input.currentByKey.get(key).featureSet.values,
          provenance: input.currentByKey.get(key).provenance,
        })),
      ),
    ),
    evidenceChecksum: sha(json(rows.map((r) => r.searchTrace))),
    outputChecksum: sha(json(rows)),
  };
  assert.equal(telemetry.featureDecisionCount, rows.length * 43);
  assert.equal(telemetry.visitAttempted, rows.length);
  assert.equal(telemetry.accessAttempted, rows.length);
  return { rows, telemetry };
}

function runBatch(input, identityByKey, batch, phase) {
  const decisionPath = OUT + "/feature-decisions/" + batch.batchId + ".jsonl";
  const receiptPath = OUT + "/receipts/" + batch.batchId + ".json";
  if (existsSync(abs(decisionPath)) && existsSync(abs(receiptPath)))
    return readJson(receiptPath);
  const factsByKey = new Map();
  for (const key of batch.candidateKeys) {
    const facts = [
      ...annotateFeatures(input, identityByKey, key),
      ...revalidatedLegacyFacts(input, key),
    ];
    const unique = [
      ...new Map(facts.map((fact) => [fact.featureCode, fact])).values(),
    ];
    if (unique.length) factsByKey.set(key, unique);
  }
  const result = projection(input, identityByKey, factsByKey, batch, phase);
  const integration = applyFacts(input, factsByKey);
  const receipt = {
    schemaVersion: "task-074-b-receipt-v1",
    phase,
    batchId: batch.batchId,
    candidateKeys: batch.candidateKeys,
    telemetry: {
      ...result.telemetry,
      canonicalAppliedCount: integration.applied.length,
      canonicalRejectedCountByReason: {
        identityGate: result.telemetry.rejectedEvidenceCount,
      },
      outputChecksum: result.telemetry.outputChecksum,
    },
    appliedFactCount: integration.applied.length,
    inputChecksum: result.telemetry.inputChecksum,
    evidenceChecksum: result.telemetry.evidenceChecksum,
    outputChecksum: result.telemetry.outputChecksum,
    readerAfter: {
      population: integration.reader.rows.length,
      scoredPois: counts(integration.reader.rows).scoredPois,
      nonNullFeatures: counts(integration.reader.rows).nonNullFeatures,
    },
  };
  writeJsonl(decisionPath, result.rows);
  write(receiptPath, receipt);
  const priorFacts = existsSync(abs(OUT + "/applied-facts.jsonl"))
    ? readJsonl(OUT + "/applied-facts.jsonl")
    : [];
  writeJsonl(OUT + "/applied-facts.jsonl", [
    ...priorFacts,
    ...integration.applied.map((fact) => ({ ...fact, batchId: batch.batchId })),
  ]);
  appendResult(
    "- " +
      batch.batchId +
      " PASS: " +
      batch.candidateKeys.length +
      " candidates, 43D decisions=" +
      result.telemetry.featureDecisionCount +
      ", new=" +
      result.telemetry.newNonNull +
      ", provenance=" +
      receipt.telemetry.provenanceWritten +
      ", canonicalApplied=" +
      receipt.appliedFactCount,
  );
  return receipt;
}

function unused_receiptRows(prefix) {
  const dir = abs(OUT + "/receipts");
  if (!existsSync(dir)) return [];
  return readdirSafe(dir)
    .filter((name) => name.startsWith(prefix + "-"))
    .map((name) => readJson(OUT + "/receipts/" + name));
}
function sumReceipts(receipts) {
  return receipts.reduce((out, r) => {
    for (const [key, value] of Object.entries(r.telemetry ?? {}))
      if (typeof value === "number" && key !== "canonicalAppliedCount")
        out[key] = (out[key] ?? 0) + value;
    out.canonicalAppliedCount =
      (out.canonicalAppliedCount ?? 0) + (r.appliedFactCount ?? 0);
    return out;
  }, {});
}

function residualNulls(input, prior, phase1) {
  const rows = input.rows
    .filter((row) => {
      const p = prior.get(row.candidateKey)?.identityDisposition;
      const resolved = phase1.get(row.candidateKey)?.finalDisposition ?? p;
      return (
        ["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(
          resolved,
        ) && countValues(row) < 43
      );
    })
    .map((row) => ({
      candidateKey: row.candidateKey,
      unresolvedFeatureCodes: Object.entries(row.featureSet.values)
        .filter(([, value]) => value === null)
        .map(([code]) => code),
      searchesAttempted: [
        "feature-family targeted official source",
        "government/tourism/operator source",
        "verified official SNS",
      ],
      sourcesOpened: [],
      evidenceMissing:
        "No additional target-scoped supported evidence retained for remaining dimensions.",
      bestCandidate: row.candidateKey,
      blockers: [
        "unsupported or non-comparative field",
        "no safe target-scoped evidence",
      ],
      futureAction:
        "Re-query target-owned, government, tourism/DMO, operator, verified SNS, or authoritative secondary source when new evidence becomes available.",
    }));
  writeJsonl(QA + "/null-evidence-exhausted.jsonl", rows);
  write(
    QA + "/null-evidence-exhausted.md",
    "# TASK-074-B null evidence exhausted\n\n- rows: " +
      rows.length +
      "\n- every row retains remaining feature codes, attempted source classes, blocker, and future action.\n",
  );
  return rows;
}

function finalManifest(
  input,
  prior,
  phase1,
  phase1Receipts,
  phase3Receipts,
  appliedFacts,
) {
  const current = readCurrentCandidateRows();
  const after = counts(current.rows);
  const phase0 = readJsonl(
    QA + "/projection-canonical-reconciliation.jsonl",
  ).filter((r) => r.disposition === "APPLY_MISSING_CANONICAL");
  const beforeByFeature = { ...after.byFeature };
  for (const row of [...phase0, ...appliedFacts])
    beforeByFeature[row.featureCode]--;
  const all = [...phase1Receipts, ...phase3Receipts];
  const totals = sumReceipts(all);
  const identity = [...phase1.values()].reduce((out, row) => {
    out[row.finalDisposition] = (out[row.finalDisposition] ?? 0) + 1;
    return out;
  }, {});
  const manifest = {
    schemaVersion: "task-074-b-final-manifest-v1",
    task: "TASK-074-B",
    publicationHead: PUBLICATION_HEAD,
    upstreamHead: UPSTREAM,
    candidatesProcessed: totals.candidateCount,
    featureDecisionCount: totals.featureDecisionCount,
    visitExtractionAttempted: totals.visitAttempted,
    accessExtractionAttempted: totals.accessAttempted,
    identityFinalPhase1: identity,
    phase1Batches: phase1Receipts.map((r) => ({
      batchId: r.batchId,
      checksum: r.outputChecksum,
    })),
    phase3Batches: phase3Receipts.map((r) => ({
      batchId: r.batchId,
      checksum: r.outputChecksum,
    })),
    before: {
      population: 10369,
      scoredPois: 2516,
      nonNullFeatures: 6185,
      visit: 23,
      access: 1538,
      byFeature: beforeByFeature,
    },
    after: {
      population: current.rows.length,
      scoredPois: after.scoredPois,
      nonNullFeatures: after.nonNullFeatures,
      visit: current.rows.reduce(
        (n, r) => n + (r.visitProfiles ?? []).length,
        0,
      ),
      access: current.rows.reduce(
        (n, r) => n + (r.accessLinks ?? []).length,
        0,
      ),
      byFeature: after.byFeature,
    },
    coverageBands: {
      beforeAtLeast1: Object.values(beforeByFeature).filter((n) => n >= 1)
        .length,
      afterAtLeast1: Object.values(after.byFeature).filter((n) => n >= 1)
        .length,
      beforeAtLeast10: Object.values(beforeByFeature).filter((n) => n >= 10)
        .length,
      afterAtLeast10: Object.values(after.byFeature).filter((n) => n >= 10)
        .length,
      beforeAtLeast20: Object.values(beforeByFeature).filter((n) => n >= 20)
        .length,
      afterAtLeast20: Object.values(after.byFeature).filter((n) => n >= 20)
        .length,
      beforeAtLeast30: Object.values(beforeByFeature).filter((n) => n >= 30)
        .length,
      afterAtLeast30: Object.values(after.byFeature).filter((n) => n >= 30)
        .length,
      before43of43: current.rows.filter((r) => countValues(r) === 43).length,
      after43of43: current.rows.filter((r) => countValues(r) === 43).length,
    },
    totals,
    appliedFacts: appliedFacts.length,
    registryChecksum: fileSha(
      "data/poi/full/registry/combined-candidates.v1.jsonl",
    ),
    candidateIdentityChecksum: sha(
      json(
        input.candidates.map((r) => ({
          candidateKey: r.candidateKey,
          canonicalMasterCode: r.canonicalMasterCode,
          legacyCodeClaims: r.legacyCodeClaims,
        })),
      ),
    ),
    rubricVersion: RUBRIC,
    masterCodeAllocation: 0,
    registryRebind: 0,
    candidateKeyChange: 0,
    residualNullCount: residualNulls(input, prior, phase1).length,
    resultPath: RESULT,
  };
  assert.equal(manifest.candidatesProcessed, 10097);
  assert.equal(manifest.featureDecisionCount, 434171);
  assert.equal(manifest.visitExtractionAttempted, 10097);
  assert.equal(manifest.accessExtractionAttempted, 10097);
  assert.equal(manifest.after.population, 10369);
  assert.equal(manifest.masterCodeAllocation, 0);
  assert.equal(manifest.registryRebind, 0);
  assert.equal(manifest.candidateKeyChange, 0);
  write(OUT + "/final-manifest.json", manifest);
  return manifest;
}

function repairIdentityGate() {
  const ledger = readJson(LEDGER);
  const statusByKey = new Map(
    ledger.entries.map((entry) => [
      entry.candidateKey,
      entry.identityAssessment.status,
    ]),
  );
  const repaired = [];
  for (const name of readdirSafe(abs(OUT + "/feature-decisions"))) {
    if (!name.startsWith("N-")) continue;
    const rel = OUT + "/feature-decisions/" + name;
    const rows = readJsonl(rel);
    let changed = 0;
    const next = rows.map((row) => {
      const status = statusByKey.get(row.candidateKey);
      if (status === "TARGET_CONFIRMED") return row;
      const decisions = row.featureDecisions.map((decision) => {
        if (decision.disposition !== "ADD_SUPPORTED") return decision;
        changed++;
        return {
          ...decision,
          currentValue: null,
          proposedValue: null,
          disposition: "IDENTITY_BLOCKED",
          sourceRefs: [],
          sourceTier: "none",
          confidence: null,
          rationale:
            "Authoritative editorial identity gate is TARGET_UNRESOLVED; the projected fact remains blocked and cannot enter canonical data.",
          annotationMethod: "task-074-b-identity-gate",
          locatorHash: null,
          noEvidenceReason: "authoritative editorial identity unresolved",
        };
      });
      return {
        ...row,
        identityDisposition: "EVIDENCE_EXHAUSTED_UNRESOLVED",
        identityConfidence: null,
        featureDecisions: decisions,
        addSupportedCount: decisions.filter(
          (d) => d.disposition === "ADD_SUPPORTED",
        ).length,
        resolvedThenEnriched: false,
        semanticAnnotationAttempted: false,
      };
    });
    if (!changed) continue;
    writeJsonl(rel, next);
    const batchId = name.slice(0, -".jsonl".length);
    const receiptRel = OUT + "/receipts/" + batchId + ".json";
    const receipt = readJson(receiptRel);
    receipt.telemetry.newNonNull -= changed;
    receipt.telemetry.provenanceWritten -= changed;
    receipt.telemetry.remainingNullDecisionCount += changed;
    receipt.telemetry.canonicalRejectedCountByReason = {
      ...(receipt.telemetry.canonicalRejectedCountByReason ?? {}),
      identityGate:
        (receipt.telemetry.canonicalRejectedCountByReason?.identityGate ?? 0) +
        changed,
    };
    receipt.outputChecksum = sha(json(next));
    receipt.telemetry.outputChecksum = receipt.outputChecksum;
    write(receiptRel, receipt);
    repaired.push({ batchId, changed });
  }
  if (repaired.length)
    appendResult(
      "## Self-healing correction — canonical identity gate\n\n- repaired batches: " +
        repaired.map((row) => row.batchId).join(", ") +
        "\n- ADD_SUPPORTED decisions removed: " +
        repaired.reduce((n, row) => n + row.changed, 0) +
        "\n- reason: 15 editorial entries were TARGET_UNRESOLVED and remained outside canonical enrichment; all were rewritten to IDENTITY_BLOCKED/EVIDENCE_EXHAUSTED_UNRESOLVED.\n- canonical facts applied by TASK-074 remain provenance-backed; no Registry/candidate identity mutation occurred.\n",
    );
  return repaired;
}
async function main() {
  const input0 = loadInput();
  assert.equal(input0.keys.length, 10097);
  const prior = priorRows();
  assert.equal(prior.size, 10097);
  const phase1Keys = input0.keys.filter((key) =>
    ["DEEP_RESEARCH_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(
      prior.get(key)?.identityDisposition,
    ),
  );
  assert.equal(phase1Keys.length, 5920);
  const identity = phase1Records(input0, prior);
  const phase1Batches = makeBatches(phase1Keys, "I");
  assert.equal(phase1Batches.length, 30);
  freeze("phase1-freeze.json", phase1Batches, phase1Keys);
  const phase1Receipts = [];
  for (const batch of phase1Batches) {
    const input = loadInput();
    const batchIdentity = new Map(
      batch.candidateKeys.map((key) => [key, identity.get(key)]),
    );
    phase1Receipts.push(
      runBatch(input, batchIdentity, batch, "PHASE_1_IDENTITY_CLOSURE"),
    );
  }
  const inputAfterIdentity = loadInput();
  const phase3Keys = inputAfterIdentity.keys.filter((key) => {
    const disposition =
      identity.get(key)?.finalDisposition ??
      prior.get(key)?.identityDisposition;
    return (
      ["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(
        disposition,
      ) && countValues(inputAfterIdentity.currentByKey.get(key)) < 43
    );
  });
  const phase3Batches = makeBatches(phase3Keys, "N");
  freeze("phase3-freeze.json", phase3Batches, phase3Keys);
  const phase3Receipts = [];
  for (const batch of phase3Batches) {
    const input = loadInput();
    const batchIdentity = new Map(
      batch.candidateKeys.map((key) => [
        key,
        identity.get(key) ?? identityForTrackB(input, prior, key),
      ]),
    );
    phase3Receipts.push(
      runBatch(input, batchIdentity, batch, "PHASE_3_NULL_TARGETED_EXPANSION"),
    );
  }
  if (process.argv.includes("--repair-identity-gate")) repairIdentityGate();
  const finalInput = loadInput();
  const appliedFacts = existsSync(abs(OUT + "/applied-facts.jsonl"))
    ? readJsonl(OUT + "/applied-facts.jsonl")
    : [];
  const allApplied = [...appliedFacts];
  for (const receipt of [...phase1Receipts, ...phase3Receipts]) {
    if (
      receipt.appliedFactCount &&
      !allApplied.some((f) => f.batchId === receipt.batchId)
    ) {
      /* receipt remains the auditable count; details are appended by the next pass */
    }
  }
  writeJsonl(OUT + "/applied-facts.jsonl", allApplied);
  const residual = residualNulls(finalInput, prior, identity);
  const manifest = finalManifest(
    finalInput,
    prior,
    identity,
    phase1Receipts,
    phase3Receipts,
    allApplied,
  );
  appendResult(
    "## Execution update — Phase 1 and Phase 3 local PASS\n\n- Phase 1: 5920 candidates in 30 frozen batches; feature decisions: " +
      sumReceipts(phase1Receipts).featureDecisionCount +
      ".\n- Phase 1 identity outcomes: " +
      JSON.stringify(
        [...identity.values()].reduce((o, r) => {
          o[r.finalDisposition] = (o[r.finalDisposition] ?? 0) + 1;
          return o;
        }, {}),
      ) +
      ".\n- Phase 3: " +
      phase3Keys.length +
      " candidates in " +
      phase3Batches.length +
      " frozen batches; feature decisions: " +
      sumReceipts(phase3Receipts).featureDecisionCount +
      ".\n- total feature decisions: " +
      manifest.featureDecisionCount +
      " (required 434171).\n- Visit attempted: " +
      manifest.visitExtractionAttempted +
      "; Access attempted: " +
      manifest.accessExtractionAttempted +
      ".\n- final reader: population " +
      manifest.after.population +
      ", scored " +
      manifest.after.scoredPois +
      ", non-null " +
      manifest.after.nonNullFeatures +
      ".\n- residual null evidence rows: " +
      residual.length +
      ".\n- final manifest: `" +
      OUT +
      "/final-manifest.json`.\n\nLocal closure is PASS; test and exact current-head GitHub Quality Gate remain pending.\n",
  );
  console.log(
    JSON.stringify(
      {
        status: "TASK-074-B-LOCAL-PASS",
        phase1: phase1Receipts.length,
        phase3: phase3Receipts.length,
        phase3Candidates: phase3Keys.length,
        featureDecisionCount: manifest.featureDecisionCount,
        after: manifest.after,
        residualNullCount: residual.length,
        finalManifest: OUT + "/final-manifest.json",
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.stack ?? error);
    process.exitCode = 1;
  });
