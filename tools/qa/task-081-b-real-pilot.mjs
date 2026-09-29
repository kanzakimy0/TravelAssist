import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

import {
  POI_FEATURE_CODES,
  POI_FEATURE_DEFINITIONS,
} from "../../src/shared/contracts/planning/features.ts";
import { parseCanonicalPoiV1 } from "../../src/shared/contracts/poi/validation.ts";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const prettierConfig = await resolveConfig("package.json");
const json = (value) =>
  format(JSON.stringify(value), { ...prettierConfig, parser: "json" });
const check = process.argv.includes("--check");
const datasetPath = "src/shared/data/canonical-poi-pilot100.v1.json";
const runtimePath =
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json";
const samplePath = "data/poi/canonical/pilot-100/sample-manifest.v1.json";
const sourcePath =
  "docs/qa/TASK-081-B/source-capsules.wikidata-revisions.v1.json";
const overlayPath =
  "src/shared/data/canonical-poi-pilot100.feature43-overlay.v1.json";
const overlayManifestPath =
  "src/shared/data/canonical-poi-pilot100.feature43-overlay.manifest.v1.json";
const qa = "docs/qa/TASK-081-B/";
const now = "2026-09-29T00:00:00+09:00";
const rubricVersion = "TASK-081-B-evidence-inference-v1";
const dataset = read(datasetPath);
const runtime = read(runtimePath);
const sample = read(samplePath);
const sources = read(sourcePath);
assert.equal(runtime.runtimeImportAuthorized, true);
assert.equal(runtime.candidateCorpusAuthorized, false);
assert.equal(runtime.recordCount, 100);
assert.equal(runtime.datasetPath, datasetPath);
assert.equal(sha(JSON.stringify(dataset)), runtime.datasetSha256);
assert.equal(sha(readFileSync(datasetPath)), runtime.datasetFileSha256);
assert.equal(dataset.records.length, 100);
assert.equal(sample.records.length, 100);
assert.equal(sources.recordCount, 100);
assert.equal(sources.fetchedCount, 100);
assert.equal(sources.failureCount, 0);
assert.equal(sources.sampleSelectionSha256, sample.selectionSha256);
assert.equal(sources.manifestDatasetSha256, runtime.datasetSha256);
assert.deepEqual(
  dataset.records.map((poi) => poi.internalId),
  runtime.internalIds,
);
assert.deepEqual(
  dataset.records.map((poi) => poi.masterCode),
  runtime.masterCodes,
);
assert.deepEqual(
  sample.records.map((poi) => poi.internalId),
  runtime.internalIds,
);
assert.deepEqual(
  sample.records.map((poi) => poi.allocatedMasterCode),
  runtime.masterCodes,
);
assert.deepEqual(
  sources.records.map((poi) => poi.internalId),
  runtime.internalIds,
);
assert.equal(POI_FEATURE_CODES.length, 43);
assert.ok(dataset.records.every((poi) => poi.features === null));

// These are deliberately narrow, individually reviewed inferences. All other
// cells remain null; neither category nor an empty source claim becomes 0 or 5.
const approved = [
  [
    "Q270983",
    "02",
    9,
    0.88,
    "P571",
    "+1397-00-00T00:00:00Z",
    "1397 foundation plus UNESCO component, National Treasure and Special Historic Site support top-tier historical value.",
  ],
  [
    "Q270983",
    "01",
    8,
    0.8,
    "P1435",
    "Q94987823",
    "Special Place of Scenic Beauty designation supports very high scenic value.",
  ],
  [
    "Q11580783",
    "02",
    8,
    0.82,
    "P1435",
    "Q26764449",
    "Eighth-century former temple with Special Historic Site designation supports very high historical value.",
  ],
  [
    "Q3816159",
    "02",
    8,
    0.84,
    "P1435",
    "Q26764449",
    "Seventh-century kofun with Special Historic Site designation supports very high historical value.",
  ],
  [
    "Q615465",
    "02",
    7,
    0.75,
    "P571",
    "+1225-00-00T00:00:00Z",
    "Thirteenth-century foundation plus Important Cultural Property designation supports high historical value.",
  ],
  [
    "Q249139",
    "02",
    7,
    0.75,
    "P571",
    "+1393-00-00T00:00:00Z",
    "Fourteenth-century foundation plus Important Cultural Property designation supports high historical value.",
  ],
  [
    "Q11437203",
    "02",
    8,
    0.79,
    "P1435",
    "Q1139795",
    "National Treasure designation supports very high historical value; no unrelated temple fields inferred.",
  ],
  [
    "Q11576407",
    "02",
    7,
    0.73,
    "P1435",
    "Q30834580",
    "Archaeological site with Historic Site of Japan designation supports high historical value.",
  ],
  [
    "Q11647655",
    "02",
    7,
    0.73,
    "P1435",
    "Q30834580",
    "Archaeological site with Historic Site of Japan designation supports high historical value.",
  ],
  [
    "Q11609251",
    "02",
    7,
    0.76,
    "P1435",
    "Q850649",
    "Historic district with Important Preservation District designation supports high historical value.",
  ],
  [
    "Q11559352",
    "02",
    7,
    0.76,
    "P1435",
    "Q850649",
    "Historic post town with Important Preservation District designation supports high historical value.",
  ],
  [
    "Q670049",
    "02",
    7,
    0.73,
    "P1435",
    "Q1188622",
    "Shinto shrine with Important Cultural Property designation supports high historical value.",
  ],
  [
    "Q11630696",
    "02",
    7,
    0.75,
    "P571",
    "+1641-00-00T00:00:00Z",
    "Seventeenth-century building with Important Cultural Property designation supports high historical value.",
  ],
  [
    "Q6434159",
    "07",
    8,
    0.78,
    "P1435",
    "Q122904442",
    "Beach designated both Place of Scenic Beauty and Natural Monument supports very high nature value.",
  ],
  [
    "Q473472",
    "07",
    8,
    0.76,
    "P1435",
    "Q43113623",
    "Island listed as part of a UNESCO World Heritage Site supports very high nature value.",
  ],
  [
    "Q615767",
    "07",
    8,
    0.77,
    "P1435",
    "Q23790",
    "Forest carrying Natural Monument and UNESCO component claims supports very high nature value.",
  ],
  [
    "Q28685888",
    "06",
    8,
    0.78,
    "P31",
    "Q11315",
    "Named retail complex classified as a shopping center supports very high shopping value.",
  ],
];
const byQid = new Map(sources.records.map((row) => [row.qid, row]));
const approvedByKey = new Map();
for (const [
  qid,
  code,
  value,
  confidence,
  property,
  token,
  reason,
] of approved) {
  const source = byQid.get(qid);
  assert.ok(source && source.status === "FETCHED", qid);
  assert.ok(POI_FEATURE_CODES.includes(code), code);
  assert.ok(Number.isInteger(value) && value >= 0 && value <= 9);
  const claims =
    property === "P31"
      ? source.instanceOfIds
      : property === "P571"
        ? source.inception
        : source.heritageDesignationIds;
  assert.ok(claims.includes(token), qid + "/" + property + "/" + token);
  const key = source.internalId + "|" + code;
  assert.ok(!approvedByKey.has(key), key);
  approvedByKey.set(key, { value, confidence, property, token, reason });
}

const signalPatterns = {
  "02": /historic|archaeological|kofun|temple|shrine|palace|heritage|former|church/i,
  "03": /bridge|building|skyscraper|palace|church|temple/i,
  "06": /shopping center|commercial building/i,
  "07": /river|lake|mountain|island|forest|waterfall|beach|lagoon|valley|canyon|volcano/i,
  10: /art museum/i,
  11: /amusement park|theme park|water park/i,
  22: /museum|archaeological site/i,
  38: /ski resort/i,
};
const reasonByKind = {
  benefit:
    "Pinned entity claims do not establish this POI's 0–9 experiential magnitude.",
  suitability:
    "Pinned entity claims do not establish current visitor suitability or operating conditions.",
  cost: "No measured on-site walking or physical-load evidence in the pinned source.",
  risk: "No current crowd, queue, or weather-risk observation in the pinned source.",
};
const kindByCode = Object.fromEntries(
  POI_FEATURE_DEFINITIONS.map(([code, , kind]) => [code, kind]),
);
const decisions = [];
const overlayRecords = [];
const membership = [];
for (let index = 0; index < dataset.records.length; index += 1) {
  const poi = dataset.records[index];
  const source = sources.records[index];
  const member = sample.records[index];
  assert.equal(source.internalId, poi.internalId);
  assert.equal(source.masterCode, poi.masterCode);
  assert.equal(member.internalId, poi.internalId);
  assert.equal(member.allocatedMasterCode, poi.masterCode);
  assert.equal(source.qid, member.wikidataQid);
  assert.equal(source.revision, member.wikidataRevision);
  assert.equal(
    poi.sourceRefs.find((item) => item.sourceRef === source.sourceRef)?.rights
      .persistence,
    "allowed",
  );
  const labels = source.instanceOfIds.map(
    (id) => sources.entityLabels[id]?.en ?? "",
  );
  const sourceSignal = [
    source.descriptions.en ?? "",
    source.descriptions.ja ?? "",
    ...labels,
  ].join(" | ");
  const values = {};
  for (const code of POI_FEATURE_CODES) {
    const key = poi.internalId + "|" + code;
    const accepted = approvedByKey.get(key);
    const weakSignal = signalPatterns[code]?.test(sourceSignal) ?? false;
    const status = accepted
      ? "RESOLVED_INFERRED"
      : weakSignal
        ? "LOW_CONFIDENCE_REVIEW"
        : "UNRESOLVED_NO_EVIDENCE";
    values[code] = accepted?.value ?? null;
    decisions.push({
      reviewRef: "review:task-081-b:" + poi.masterCode + ":" + code,
      internalId: poi.internalId,
      masterCode: poi.masterCode,
      featureCode: code,
      state: status,
      value: accepted?.value ?? null,
      confidence: accepted?.confidence ?? (weakSignal ? 0.35 : null),
      sourceRefs: [source.sourceRef],
      inspectedSourceLocator: source.locator,
      inspectedSourceSha256: source.responseSha256,
      evidenceLocator: accepted
        ? source.locator + "#claims." + accepted.property
        : null,
      evidenceHash: accepted ? source.responseSha256 : null,
      evidenceClaim: accepted
        ? { property: accepted.property, value: accepted.token }
        : null,
      method: accepted
        ? "documented-evidence-inference"
        : "field-level-source-review",
      rubricVersion,
      decisionReason:
        accepted?.reason ??
        (weakSignal
          ? "Type or description signals relevance, but no defensible 0–9 magnitude; left null for review."
          : reasonByKind[kindByCode[code]]),
    });
  }
  const resolvedCount = Object.values(values).filter(
    (value) => value !== null,
  ).length;
  const features =
    resolvedCount === 0
      ? null
      : {
          contractVersion: "1.0",
          featureVersion: "1.0",
          poiRef: poi.internalId,
          values,
          sourceRefs: [source.sourceRef],
          confidence: Math.min(
            ...decisions
              .slice(-43)
              .filter((row) => row.value !== null)
              .map((row) => row.confidence),
          ),
          updatedAt: now,
        };
  const projected = { ...poi, features };
  const parsed = parseCanonicalPoiV1(projected);
  assert.equal(
    parsed.ok,
    true,
    poi.internalId + ":" + JSON.stringify(parsed.issues),
  );
  overlayRecords.push({
    internalId: poi.internalId,
    masterCode: poi.masterCode,
    features,
  });
  membership.push({
    sampleIndex: index + 1,
    internalId: poi.internalId,
    masterCode: poi.masterCode,
    nameJa: source.nameJa,
    wikidataQid: source.qid,
    wikidataRevision: source.revision,
    beforeNonNull: 0,
    afterNonNull: resolvedCount,
    delta: resolvedCount,
  });
}
assert.equal(decisions.length, 4300);
assert.equal(new Set(decisions.map((row) => row.reviewRef)).size, 4300);
assert.equal(new Set(overlayRecords.map((row) => row.internalId)).size, 100);
const resolved = decisions.filter((row) => row.value !== null);
const lowConfidence = decisions.filter(
  (row) => row.state === "LOW_CONFIDENCE_REVIEW",
);
const unresolved = decisions.filter((row) => row.value === null);
assert.equal(resolved.length, approved.length);
assert.equal(unresolved.length + resolved.length, 4300);
const sourceFileSha256 = sha(readFileSync(sourcePath));
const overlay = {
  schemaVersion: "1.0",
  task: "TASK-081-B",
  revision: "task-081-b-feature43-v1",
  baseDatasetRevision: dataset.datasetRevision,
  baseDatasetSha256: runtime.datasetSha256,
  sampleSelectionSha256: sample.selectionSha256,
  sourceFileSha256,
  rubricVersion,
  recordCount: 100,
  decisionCount: 4300,
  records: overlayRecords,
};
const overlayBody = await json(overlay);
const overlayManifest = {
  schemaVersion: "1.0",
  scope: "CANONICAL_POI_PILOT_100_FEATURE43_OVERLAY",
  runtimeImportAuthorized: true,
  authorizingTask: "TASK-081-B",
  candidateCorpusAuthorized: false,
  baseRuntimeManifestPath: runtimePath,
  baseDatasetSha256: runtime.datasetSha256,
  baseInternalIds: runtime.internalIds,
  baseMasterCodes: runtime.masterCodes,
  overlayPath,
  overlayRevision: overlay.revision,
  overlaySha256: sha(JSON.stringify(overlay)),
  overlayFileSha256: sha(overlayBody),
  recordCount: 100,
  decisionCount: 4300,
  sourceFileSha256,
};
const featureCoverage = POI_FEATURE_CODES.map((code) => ({
  featureCode: code,
  featureName: POI_FEATURE_DEFINITIONS.find(([key]) => key === code)[1],
  beforeNonNull: 0,
  afterNonNull: decisions.filter(
    (row) => row.featureCode === code && row.value !== null,
  ).length,
  delta: decisions.filter(
    (row) => row.featureCode === code && row.value !== null,
  ).length,
  lowConfidence: lowConfidence.filter((row) => row.featureCode === code).length,
  unresolved: unresolved.filter((row) => row.featureCode === code).length,
}));
const bins = { 0: 0, "1-9": 0, "10-19": 0, "20-29": 0, "30-42": 0, 43: 0 };
for (const row of membership) {
  const count = row.afterNonNull;
  bins[
    count === 0
      ? "0"
      : count === 43
        ? "43"
        : count < 10
          ? "1-9"
          : count < 20
            ? "10-19"
            : count < 30
              ? "20-29"
              : "30-42"
  ] += 1;
}
const coverage = {
  schemaVersion: "1.0",
  task: "TASK-081-B",
  sampleCount: 100,
  decisionCount: 4300,
  beforeNonNull: 0,
  afterNonNull: resolved.length,
  delta: resolved.length,
  resolvedCount: resolved.length,
  unresolvedCount: unresolved.length,
  lowConfidenceCount: lowConfidence.length,
  unexplainedDelta: resolved.length - approved.length,
  poiCoverageBins: bins,
  perFeature: featureCoverage,
  perPoi: membership,
};
const provenance = {
  schemaVersion: "1.0",
  task: "TASK-081-B",
  sourceRecordCount: sources.recordCount,
  fetchedSourceCount: sources.fetchedCount,
  sourceFailureCount: sources.failureCount,
  sourceFileSha256,
  inspectedDecisionCount: decisions.filter((row) => row.inspectedSourceSha256)
    .length,
  resolvedWithSourceRefCount: resolved.filter(
    (row) => row.sourceRefs.length > 0,
  ).length,
  resolvedWithLocatorCount: resolved.filter((row) => row.evidenceLocator)
    .length,
  resolvedWithHashCount: resolved.filter((row) => row.evidenceHash).length,
  unresolvedWithReviewRefCount: unresolved.filter(
    (row) => row.reviewRef && row.decisionReason,
  ).length,
  confidenceDistribution: {
    resolved: Object.fromEntries(
      [...new Set(resolved.map((row) => row.confidence))]
        .sort()
        .map((key) => [
          key,
          resolved.filter((row) => row.confidence === key).length,
        ]),
    ),
    lowConfidenceReview: { 0.35: lowConfidence.length },
  },
  duplicateInternalIdCount: 0,
  duplicateMasterCodeCount: 0,
  outOfManifestCount: 0,
};
const outputs = new Map([
  [overlayPath, overlayBody],
  [overlayManifestPath, await json(overlayManifest)],
  [
    qa + "pilot-membership.v1.json",
    await json({
      schemaVersion: "1.0",
      task: "TASK-081-B",
      selectionRule: sample.rule,
      sampleSelectionSha256: sample.selectionSha256,
      baseDatasetSha256: runtime.datasetSha256,
      records: membership,
    }),
  ],
  [
    qa + "field-decisions.v1.jsonl",
    decisions.map((row) => JSON.stringify(row)).join("\n") + "\n",
  ],
  [
    qa + "unresolved-ledger.v1.jsonl",
    unresolved.map((row) => JSON.stringify(row)).join("\n") + "\n",
  ],
  [qa + "coverage-statistics.v1.json", await json(coverage)],
  [qa + "provenance-audit.v1.json", await json(provenance)],
]);
for (const [path, body] of outputs) {
  if (check) assert.equal(readFileSync(path, "utf8"), body, path);
  else writeFileSync(path, body);
}
process.stdout.write(
  JSON.stringify({
    status: "PARTIAL",
    sampleCount: 100,
    decisionCount: decisions.length,
    resolved: resolved.length,
    unresolved: unresolved.length,
    lowConfidence: lowConfidence.length,
    bins,
    overlaySha256: overlayManifest.overlaySha256,
    check,
  }) + "\n",
);
