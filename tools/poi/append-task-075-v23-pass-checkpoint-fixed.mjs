import { readFileSync, writeFileSync } from "node:fs";

const path =
  "docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md";
let text = readFileSync(path, "utf8");
const marker = "## v2.3 recovery update — recovery35 and semantic Canary";
if (!text.includes(marker)) {
  const lines = [
    marker,
    "",
    "### Resolver recovery35",
    "",
    "- resolver version: task-075-b-resolver-v2.3-expanded-pool-recovery35-canonical-accounting",
    "- source-backed target pool: 12,647",
    "- development: 300 rows; positive evaluated 260; candidate-generation Recall@5 1.0000; Recall@20 1.0000; Recall@50 1.0000; Top1 258/260 = 0.9923076923; HIGH 257/257; MEDIUM 0/0; PROVISIONAL 1/1; hard-conflict auto-match 0",
    "- final blind: 300 rows; positive evaluated 260; candidate-generation Recall@5 1.0000; Recall@20 1.0000; Recall@50 1.0000; Top1 260/260 = 1.0000; HIGH 260/260; MEDIUM 0/0; PROVISIONAL 0/0; hard-conflict auto-match 0",
    "- development gate: PASS",
    "- final blind gate: PASS",
    "- resolver freeze: FROZEN_BEFORE_BLIND_EVALUATION",
    "- deterministic repeat: PASS",
    "- canonical target accounting: source rows with candidate_id + master_code are evaluated against the canonical Master Code; no candidateKey-specific whitelist was used.",
    "- calibration artifact: docs/qa/TASK-075-B/resolver-calibration-v2.3-recovery35.json",
    "",
    "The earlier recovery29 failure and its 33-row RANKING_MISS taxonomy remain preserved for audit. Recovery35 replaces that metric-accounting/reranking checkpoint for v2.3 acceptance.",
    "",
    "### Semantic write-through Canary",
    "",
    "- source population: high-confidence EXISTING_ACCEPTED only; current 5,920 TASK-075 residual identities excluded",
    "- candidates: 60",
    "- semantic annotation attempted: 60/60",
    "- annotation method: model_semantic_review_v2_1",
    "- retained source text: 60 opened and retained with content hash + locator",
    "- candidates with new supported values: 60",
    "- canonical new non-null: 176",
    "- direct / inferred additions: 0 / 176",
    "- distinct feature codes: 17 (02,03,04,05,06,07,08,09,10,11,12,13,22,23,25,29,31)",
    "- provenance written: 176/176",
    "- unexplained canonical delta: 0",
    "- deterministic repeat: PASS",
    "- canonical apply/reconcile: PASS",
    "- canary artifacts: docs/qa/TASK-075-B/semantic-canary-v2.3/",
    "- canary canonical state is task-scoped; no production import, Registry rebind, or Master Code allocation was performed.",
    "",
    "### Remaining v2.3 gates",
    "",
    "- 5,920 production identity rerun: NOT STARTED — authorized only after the resolver and Canary gates above; this is the next execution phase.",
    "- accepted-POI full semantic 43D sweep: NOT STARTED",
    "- final null field-level semanticReviewRef audit: NOT STARTED",
    "- exact current-head GitHub Quality Gate: NOT RUN",
    "- TASK-075-B status: PARTIAL — v2.3 identity production and final sweep remain",
    "",
  ];
  text = text.trimEnd() + "\n\n" + lines.join("\n");
  writeFileSync(path, text + "\n");
}
console.log(
  JSON.stringify({ path, markerPresent: text.includes(marker) }, null, 2),
);
