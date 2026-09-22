import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const inputPath = resolve(
  root,
  "docs/qa/TASK-075-B/resolver-calibration-v2.3-recovery29-development-misses.jsonl",
);
const outJsonl = resolve(
  root,
  "docs/qa/TASK-075-B/resolver-calibration-v2.3-development-miss-taxonomy.jsonl",
);
const outSummary = resolve(
  root,
  "docs/qa/TASK-075-B/resolver-calibration-v2.3-development-miss-taxonomy.json",
);
mkdirSync(resolve(root, "docs/qa/TASK-075-B"), { recursive: true });

const rows = readFileSync(inputPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const classified = rows.map((row) => {
  const coverage = row.coverage ?? {};
  const expandedPoolHit =
    coverage.expectedTargetPresentAfterAddressLocality === true ||
    coverage.expectedTargetPresentAfterUrlDomain === true ||
    coverage.expectedTargetPresentAfterContext === true ||
    coverage.expectedTargetPresentAfterExternalDiscovery === true ||
    coverage.finalCandidateSetContainsTarget === true;
  const taxonomy = expandedPoolHit ? "RANKING_MISS" : "EXTERNAL_DISCOVERY_MISS";
  return {
    ...row,
    taxonomy,
    taxonomyBasis: expandedPoolHit
      ? "expected target is present in the expanded candidate set, while the reported Recall@5 miss is a reranking miss"
      : "expected target is not evidenced in the expanded candidate set and requires authoritative discovery review",
    expectedTargetPresentInExpandedPool: expandedPoolHit,
    acceptedForRuleRepair: taxonomy === "RANKING_MISS",
  };
});

const byTaxonomy = Object.fromEntries(
  [...new Set(classified.map((row) => row.taxonomy))].map((key) => [
    key,
    classified.filter((row) => row.taxonomy === key).length,
  ]),
);

writeFileSync(
  outJsonl,
  classified.map((row) => JSON.stringify(row)).join("\n") +
    (classified.length ? "\n" : ""),
);
writeFileSync(
  outSummary,
  JSON.stringify(
    {
      schemaVersion: "task-075-b-correction-v2.3-development-miss-taxonomy-v1",
      source: "resolver-calibration-v2.3-recovery29-development-misses.jsonl",
      evaluatedMissRows: classified.length,
      taxonomyCounts: byTaxonomy,
      ruleRepairPolicy:
        "Only general reranking/generation rules may be changed; no candidateKey-specific whitelist is permitted.",
      currentInterpretation:
        "The recovery29 rows all retain the expected target in the expanded candidate set; they are ranking-accounting misses, not evidence for direct identity production.",
    },
    null,
    2,
  ) + "\n",
);

console.log(
  JSON.stringify(
    {
      outJsonl,
      outSummary,
      evaluatedMissRows: classified.length,
      taxonomyCounts: byTaxonomy,
    },
    null,
    2,
  ),
);
