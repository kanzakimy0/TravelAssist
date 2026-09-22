import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const delta = readFileSync(
  "data/poi/full/reviews/remaining-v1/feature-delta.jsonl",
  "utf8",
)
  .split(/\r?\n/)
  .filter(Boolean)
  .map(JSON.parse);
const projected = readFileSync(
  "docs/qa/TASK-075-B/semantic-canary-v2.3/candidate-projections.jsonl",
  "utf8",
)
  .split(/\r?\n/)
  .filter(Boolean)
  .map(JSON.parse);
const applied = readFileSync(
  "docs/qa/TASK-075-B/semantic-canary-v2.3/canonical-apply.jsonl",
  "utf8",
)
  .split(/\r?\n/)
  .filter(Boolean)
  .map(JSON.parse);
const byKey = new Map(projected.map((row) => [row.candidateKey, row]));
const canonical = delta.map((row) => byKey.get(row.candidateKey) ?? row);
const beforeValues = new Map(
  delta.map((row) => [row.candidateKey, JSON.stringify(row.featureSet.values)]),
);
const afterValues = new Map(
  canonical.map((row) => [
    row.candidateKey,
    JSON.stringify(row.featureSet.values),
  ]),
);
const changed = canonical.filter(
  (row) =>
    beforeValues.get(row.candidateKey) !== afterValues.get(row.candidateKey),
);
const actualAdditions = changed.flatMap((row) => {
  const before = JSON.parse(beforeValues.get(row.candidateKey));
  return Object.entries(row.featureSet.values)
    .filter(([code, value]) => before[code] === null && value !== null)
    .map(([featureCode, value]) => ({
      candidateKey: row.candidateKey,
      featureCode,
      value,
    }));
});
const appliedKey = new Set(
  applied.map((row) => `${row.candidateKey}|${row.featureCode}|${row.value}`),
);
const actualKey = new Set(
  actualAdditions.map(
    (row) => `${row.candidateKey}|${row.featureCode}|${row.value}`,
  ),
);
const unexplained = [...actualKey].filter((key) => !appliedKey.has(key));
const result = {
  schemaVersion:
    "task-075-b-correction-v2.3-semantic-write-through-reconcile-v1",
  sourceProjection:
    "docs/qa/TASK-075-B/semantic-canary-v2.3/candidate-projections.jsonl",
  canonicalStatePath:
    "docs/qa/TASK-075-B/semantic-canary-v2.3/canonical-state.jsonl",
  beforeRows: delta.length,
  afterRows: canonical.length,
  changedCandidates: changed.length,
  actualCanonicalNewNonNull: actualAdditions.length,
  appliedFacts: applied.length,
  unexplainedCanonicalDelta: unexplained.length,
  missingAppliedFacts: unexplained,
  canonicalStateSha256: sha256(
    canonical.map((row) => JSON.stringify(row)).join("\n") + "\n",
  ),
  status:
    canonical.length === delta.length &&
    actualAdditions.length === applied.length &&
    unexplained.length === 0
      ? "PASS"
      : "FAIL",
};
writeFileSync(
  result.canonicalStatePath,
  canonical.map((row) => JSON.stringify(row) + "\n").join(""),
);
writeFileSync(
  "docs/qa/TASK-075-B/semantic-canary-v2.3/reconcile.json",
  JSON.stringify(result, null, 2) + "\n",
);
writeFileSync(
  "docs/qa/TASK-075-B/semantic-canary-v2.3/reconcile.md",
  `# TASK-075-B v2.3 Semantic Canary Reconcile\n\n- Status: **${result.status}**\n- Before / after rows: ${result.beforeRows} / ${result.afterRows}\n- Changed candidates: ${result.changedCandidates}\n- Canonical new non-null: ${result.actualCanonicalNewNonNull}\n- Applied facts: ${result.appliedFacts}\n- Unexplained canonical delta: ${result.unexplainedCanonicalDelta}\n- Canonical state SHA-256: ${result.canonicalStateSha256}\n`,
);
console.log(JSON.stringify(result, null, 2));
