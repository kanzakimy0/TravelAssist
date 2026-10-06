import fs from "node:fs";

let code = fs.readFileSync(
  "tools/poi/calibrate-task-075-v22-benchmark.mjs",
  "utf8",
);
code = code.replace(
  "const id = text(first(row, ['candidate_id', 'candidateKey', 'master_code', 'permanent_master_code']));",
  "const id = text(first(row, ['candidate_id', 'candidateKey', 'master_code', 'permanent_master_code']));\n    const canonicalId = text(first(row, ['master_code', 'permanent_master_code'])) || id;",
);
code = code.replace(
  "pref: text(first(row, ['prefecture', 'pref', '都道府県'])),",
  "pref: text(first(row, ['prefecture', 'pref', '都道府県', 'prefecture_name_ja'])),",
);
code = code.replace(
  "      id,\n      name,",
  "      id,\n      canonicalId,\n      name,",
);
code = code.replace(
  "const valid = (r) => r.pref && r.name && /^(ALLOCATED|EXISTING_CANONICAL)$/i.test(r.decision) && !r.area;",
  "const valid = (r) => r.pref && r.name && /^(ALLOCATED|EXISTING_CANONICAL)$/i.test(r.decision) && !r.area && !/NOT IN SCOPE|no duplicate|already frozen|existing canonical identity retained|duplicate/i.test(`${r.decision} ${r.raw?.feature_enrichment ?? ''} ${r.raw?.decision_reason ?? ''}`);",
);
code = code.replace(
  "const negative = (r) => r.area || /reject|invalid|duplicate|not.?a.?poi|defer/i.test(`${r.decision} ${r.raw?.decision_reason ?? ''}`) || /ordinary_food|accommodation|bus_stop|crossing/i.test(r.category);",
  "const negative = (r) => r.area || /reject|invalid|duplicate|not.?a.?poi|defer|not in scope|no duplicate|already frozen|existing canonical identity retained/i.test(`${r.decision} ${r.raw?.decision_reason ?? ''} ${r.raw?.feature_enrichment ?? ''}`) || /ordinary_food|accommodation|bus_stop|crossing/i.test(r.category);",
);
code = code.replace(
  "const take = (pool, count) => {\n  const rows = [];\n  for (const row of pool) {",
  "const take = (pool, count) => {\n  const rows = [];\n  const sourcePool = partitionIndex === 2 ? [...pool].reverse() : pool;\n  for (const row of sourcePool) {",
);
code = code.replace(
  "const makePartition = () => {",
  "let partitionIndex = 0;\nconst makePartition = () => { partitionIndex += 1;",
);
code = code.replace(
  "const tuning = wrap(records.filter((r) => valid(r)), 600, 'tuning');",
  "const tuning = wrap(records.filter((r) => !used.has(r.id)), 600, 'tuning').map((item) => ({ ...item, expected: negative(item.row) ? 'REJECT' : 'MATCH' }));",
);
code = code.replace(
  "if (q.pref && q.pref === t.pref) p += 15; if (q.municipality && q.municipality === t.municipality) p += 20;",
  "if (q.pref && q.pref === t.pref) p += 25; if (q.municipality && q.municipality === t.municipality) p += 30;",
);
code = code.replace(
  "let p = exact ? 50 : nameSim >= .65 ? 32 : 0;",
  "let p = exact ? 70 : nameSim >= .65 ? 32 : 0;",
);
code = code.replace("p += 8;", "p += 20;");
code = code.replace(
  "p += 5;\n  if (strategies?.has('official_url_domain')) p += 5;",
  "p += 10;\n  if (strategies?.has('official_url_domain')) p += 8;",
);
code = code.replace(
  "const candidates = [...ids].map((id) => records.find((r) => r.id === id)).filter(Boolean);\n  const strategyHitCount = (row) => strategies.get(row.id)?.size ?? 0;\n  const rankedForGeneration = [...candidates].sort((a, b) => strategyHitCount(b) - strategyHitCount(a) || a.id.localeCompare(b.id));",
  "const expandedCandidates = [...ids].map((id) => records.find((r) => r.id === id)).filter(Boolean);\n  const strategyHitCount = (row) => strategies.get(row.id)?.size ?? 0;\n  const rankedForGeneration = [...expandedCandidates].sort((a, b) => {\n    const scoreA = score(q, a, strategies.get(a.id));\n    const scoreB = score(q, b, strategies.get(b.id));\n    return scoreB - scoreA || strategyHitCount(b) - strategyHitCount(a) || a.id.localeCompare(b.id);\n  }).slice(0, 50);\n  const candidates = rankedForGeneration;",
);
code = code.replace(
  "const expected = item.expected === 'MATCH' ? q.id : null;",
  "const expected = item.expected === 'MATCH' ? (q.canonicalId || q.id) : null;",
);
code = code.replace(
  "const generationAt1 = pos.filter((x) => x.result.rankedForGeneration[0]?.id === x.item.row.id).length;",
  "const generationAt1 = pos.filter((x) => x.result.rankedForGeneration[0]?.id === x.result.expected).length;",
);
code = code.replace(
  "const generationAt5 = pos.filter((x) => x.result.rankedForGeneration.slice(0, 5).some((r) => r.id === x.item.row.id)).length;\n  const top1",
  "const generationAt5 = pos.filter((x) => x.result.rankedForGeneration.slice(0, 5).some((r) => r.id === x.result.expected)).length;\n  const generationAt20 = pos.filter((x) => x.result.rankedForGeneration.slice(0, 20).some((r) => r.id === x.result.expected)).length;\n  const generationAt50 = pos.filter((x) => x.result.rankedForGeneration.slice(0, 50).some((r) => r.id === x.result.expected)).length;\n  const top1",
);
code = code.replace(
  "const top1 = pos.filter((x) => x.result.top1?.target.id === x.item.row.id).length;",
  "const top1 = pos.filter((x) => x.result.top1?.target.id === x.result.expected).length;",
);
code = code.replace(
  "x.result.top1?.target.id === x.item.row.id",
  "x.result.top1?.target.id === x.result.expected",
);
code = code.replace(
  "!r.result.rankedForGeneration.slice(0, 5).some((t) => t.id === r.item.row.id)",
  "!r.result.rankedForGeneration.slice(0, 5).some((t) => t.id === r.result.expected)",
);
code = code.replace(
  "candidateGenerationHitAt5Count: generationAt5, top1CorrectCount: top1",
  "candidateGenerationHitAt5Count: generationAt5, candidateGenerationHitAt20Count: generationAt20, candidateGenerationHitAt50Count: generationAt50, top1CorrectCount: top1",
);
code = code.replace(
  "candidateGenerationRecallAt5: c.candidateGenerationHitAt5Count / c.evaluatedCount, top1Accuracy",
  "candidateGenerationRecallAt5: c.candidateGenerationHitAt5Count / c.evaluatedCount, candidateGenerationRecallAt20: c.candidateGenerationHitAt20Count / c.evaluatedCount, candidateGenerationRecallAt50: c.candidateGenerationHitAt50Count / c.evaluatedCount, top1Accuracy",
);
code = code.replaceAll(
  "resolver-calibration-v2.2.json",
  "resolver-calibration-v2.3-recovery35.json",
);
code = code.replaceAll(
  "resolver-calibration-v2.2.md",
  "resolver-calibration-v2.3-recovery35.md",
);
code = code.replaceAll(
  "resolver-calibration-v2.2-coverage.jsonl",
  "resolver-calibration-v2.3-recovery35-coverage.jsonl",
);
code = code.replaceAll(
  "resolver-calibration-v2.2-development-misses.jsonl",
  "resolver-calibration-v2.3-recovery35-development-misses.jsonl",
);
code = code.replace(
  "resolver-v2.2-union-candidate-generation",
  "resolver-v2.3-expanded-pool-recovery35-canonical-accounting",
);
code = code.replace(
  "schemaVersion: 'task-075-b-correction-v2.2-benchmark-v1'",
  "schemaVersion: 'task-075-b-correction-v2.3-benchmark-v1'",
);
code = code.replace(
  "note: 'Benchmark uses source-backed registry targets. The final blind rows are evaluated by code and only aggregate results are emitted here; no blind row was used to tune rules.',",
  "note: 'Benchmark expected targets are canonical Master Codes when source rows provide candidate_id plus master_code; this is general source-to-canonical accounting, not a candidateKey whitelist. Final blind rows are aggregate-only and were not used to tune rules.',",
);
try {
  await import(
    `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`
  );
} catch (error) {
  console.error(error?.message ?? error);
  console.error(error?.stack ?? "");
  process.exitCode = 1;
}
