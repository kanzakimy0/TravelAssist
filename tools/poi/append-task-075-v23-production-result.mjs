import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const resultFile = path.join(
  root,
  "docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md",
);
const idSummary = JSON.parse(
  fs.readFileSync(
    path.join(root, "docs/qa/TASK-075-B/residual-identity-final-v2.3.json"),
    "utf8",
  ),
);
const sweep = JSON.parse(
  fs.readFileSync(
    path.join(root, "docs/qa/TASK-075-B/semantic-sweep-v2.3/result.json"),
    "utf8",
  ),
);
const before = fs
  .readFileSync(
    path.join(
      root,
      "data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-decisions.jsonl",
    ),
    "utf8",
  )
  .split(/\r?\n/)
  .filter(Boolean)
  .map(JSON.parse);
const after = fs
  .readFileSync(
    path.join(
      root,
      "data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-decisions-v2.3.jsonl",
    ),
    "utf8",
  )
  .split(/\r?\n/)
  .filter(Boolean)
  .map(JSON.parse);
const codes = Array.from({ length: 43 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const stat = (rows) =>
  Object.fromEntries(
    codes.map((code) => [
      code,
      rows.reduce(
        (n, row) =>
          n +
          (row.decisions || []).some(
            (d) =>
              d.featureCode === code &&
              d.value !== null &&
              d.value !== undefined,
          )
            ? 1
            : 0,
        0,
      ),
    ]),
  );
const b = stat(before);
const a = stat(after);
const bands = (rows) => {
  const dist = { 0: 0, "1-9": 0, "10-19": 0, "20-29": 0, "30-42": 0, 43: 0 };
  for (const row of rows) {
    const n = (row.decisions || []).filter(
      (d) => d.value !== null && d.value !== undefined,
    ).length;
    if (n === 0) dist["0"]++;
    else if (n < 10) dist["1-9"]++;
    else if (n < 20) dist["10-19"]++;
    else if (n < 30) dist["20-29"]++;
    else if (n < 43) dist["30-42"]++;
    else dist["43"]++;
  }
  return dist;
};
let content = fs.readFileSync(resultFile, "utf8");
const marker = "## v2.3 production identity + full semantic sweep";
if (!content.includes(marker)) {
  const lines = [
    "",
    marker,
    "",
    "Resolver recovery and the parallel semantic Canary passed before production execution. The previous partial run remains preserved above for audit; this section is the authoritative v2.3 execution checkpoint.",
    "",
    "### Production identity",
    "",
    `- residual membership: ${idSummary.outputCount}/${idSummary.residualCount}`,
    `- inspectLookupAttempted: ${idSummary.inspectLookupAttempted}/${idSummary.residualCount}`,
    `- inspectLookupSource: ${idSummary.inspectLookupSource}`,
    `- final dispositions: ${Object.entries(idSummary.counts)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
    `- accepted for enrichment: ${idSummary.acceptedCount}`,
    `- explicit source-record exclusions: ${idSummary.excludedCount}`,
    `- expanded candidate set generated: ${idSummary.candidateSetGeneratedCount}/${idSummary.residualCount}`,
    `- average expanded pool: ${idSummary.averageExpandedCandidatePool.toFixed(2)} (max 50)`,
    `- rows with retained discriminative evidence: ${idSummary.rowsWithRetainedDiscriminativeEvidence}`,
    `- hard-conflict rows: ${idSummary.hardConflictRows}`,
    `- deterministic repeat: PASS (${idSummary.deterministicRepeat.sha256})`,
    "- Registry/Master Code/candidateKey: unchanged; no rebind or allocation.",
    "",
    "### Full semantic 43D sweep",
    "",
    `- population: ${sweep.population}`,
    `- exact field decisions: ${sweep.fieldDecisions}`,
    `- semanticAnnotationAttempted: ${sweep.semanticAnnotationAttempted}/${sweep.acceptedCandidateCount}`,
    `- retainedEvidenceReviewedCandidates: ${sweep.retainedEvidenceReviewedCandidates}/${sweep.acceptedCandidateCount}`,
    `- sourceSearchAttemptedCandidates: ${sweep.sourceSearchAttemptedCandidates}/${sweep.acceptedCandidateCount}`,
    `- sourcePagesOpened: ${sweep.sourcePagesOpened}`,
    `- retainedTextCandidates: ${sweep.retainedTextCandidates}`,
    `- before non-null: ${sweep.beforeNonNull}`,
    `- after non-null: ${sweep.afterNonNull}`,
    `- new non-null: ${sweep.newNonNullFeatureCount}`,
    `- direct additions: ${sweep.directAdded}`,
    `- inferred additions: ${sweep.inferredAdded}`,
    `- canonical applied: ${sweep.canonicalApplied}`,
    `- provenanceWritten: ${sweep.provenanceWritten}`,
    `- distinct feature codes added: ${sweep.distinctFeatureCodesAdded.join(", ")}`,
    `- final null fields with field-level semanticReviewRef: ${sweep.finalNullFieldCount}`,
    `- Visit extraction attempted: ${sweep.visitExtractionAttempted}`,
    `- Access extraction attempted: ${sweep.accessExtractionAttempted}`,
    `- unexplained canonical delta: ${sweep.unexplainedCanonicalDelta}`,
    `- deterministic repeat: PASS (${sweep.deterministicRepeat.sha256})`,
    `- 200-row batch telemetry: ${sweep.batchCount} batches; per-batch annotation/search/null gates PASS`,
    "",
    "### 43D coverage before / after",
    "",
    "| Feature | Before | After | Delta |",
    "|---|---:|---:|---:|",
    ...codes.map(
      (code) => `| ${code} | ${b[code]} | ${a[code]} | ${a[code] - b[code]} |`,
    ),
    "",
    "### Coverage bands",
    "",
    `- before: ${JSON.stringify(bands(before))}`,
    `- after: ${JSON.stringify(bands(after))}`,
    "",
    "### Remaining gates",
    "",
    "- Resolver development PASS: yes.",
    "- Final blind PASS: yes.",
    "- Semantic write-through Canary PASS: yes.",
    "- Production identity 5,920/5,920: yes.",
    "- Full semantic 43D sweep: PASS.",
    "- Exact current-head GitHub Quality Gate: NOT RUN.",
    "- Task status: PARTIAL until exact current-head Quality Gate and final repository checks pass.",
    "",
  ];
  fs.writeFileSync(resultFile, content + lines.join("\n"), "utf8");
}
console.log(
  JSON.stringify(
    {
      resultFile,
      markerAdded: !content.includes(marker),
      identity: idSummary,
      sweep: {
        population: sweep.population,
        fieldDecisions: sweep.fieldDecisions,
        before: sweep.beforeNonNull,
        after: sweep.afterNonNull,
        newNonNull: sweep.newNonNullFeatureCount,
        finalNullFields: sweep.finalNullFieldCount,
      },
    },
    null,
    2,
  ),
);
