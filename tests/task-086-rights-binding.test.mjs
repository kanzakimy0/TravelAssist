import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { after } from "node:test";
import {
  acquireEvidence,
  reviewedFactAction,
  validateRightsBinding,
} from "../tools/transport/task-086-source-actions.mjs";
import {
  buildReviewedFactSourceRecord,
  buildSourceRightsRegistry,
} from "../tools/transport/task-086-remediate.mjs";
import { hash } from "../tools/transport/task-086-model.mjs";
const repo = process.cwd(),
  mirror = fs.mkdtempSync(path.join(os.tmpdir(), "task086-rights-test-"));
after(() => fs.rmSync(mirror, { recursive: true, force: true }));
const q = path.join(mirror, "private-test", "actions.jsonl");
fs.mkdirSync(path.dirname(q), { recursive: true });
const action = {
  actionId: "transfer:odbl:test",
  state: "PENDING_RESEARCH",
  attempts: [],
  sourcesChecked: [],
  rightsFindings: [],
  extractedFacts: [],
  affectedDeficits: ["MISSING_CONNECTION_CHAIN_EVIDENCE"],
  result: "OPEN",
  nextAction: "RESEARCH",
};
fs.writeFileSync(q, JSON.stringify(action) + "\n");
const topologyUrl = "https://overpass-api.de/api/interpreter",
  termsUrl = "https://www.openstreetmap.org/copyright";
const binding = {
  license: "ODbL 1.0",
  attribution: "© OpenStreetMap contributors",
  shareAlikeRequired: true,
  shareAlikeScope:
    "Only two OSM-derived transfer topology edges and a derived database containing them.",
};
const req = {
  actionId: action.actionId,
  urls: [
    { url: topologyUrl, purpose: "topology" },
    { url: termsUrl, purpose: "terms" },
  ],
  termsUrl,
  rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
  rightsFinding:
    "OpenStreetMap data under ODbL 1.0; attribution retained; publicly distributed derived databases containing these facts must use ODbL 1.0.",
  rightsBindingSchemaVersion: 1,
  rightsBinding: binding,
};
const now = "2026-10-03T13:01:18.261540Z";
const fetchMock = async (url) =>
  new Response("reviewed test response " + url, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
await acquireEvidence(req, {
  network: fetchMock,
  now: () => now,
  queuePath: q,
});
const actions = fs
    .readFileSync(q, "utf8")
    .trim()
    .split(/\r?\n/)
    .map(JSON.parse),
  reviewed = actions[0],
  right = reviewed.rightsFindings.at(-1);
assert.equal(right.rightsBindingSchemaVersion, 1);
assert.deepEqual(right.rightsBinding, binding);
const fact = {
  factId: "towada-test",
  sourceActionId: req.actionId,
  sourceUrl: topologyUrl,
  observedResponseSha256: reviewed.sourcesChecked.find(
    (s) => s.url === topologyUrl,
  ).contentSha256,
  rightsBindingSchemaVersion: 1,
  rightsBinding: binding,
};
const { observed, rights } = reviewedFactAction(fact, actions);
const source = buildReviewedFactSourceRecord({
  fact,
  observed,
  rights,
  recordSet: [fact],
});
for (const key of [
  "license",
  "attribution",
  "shareAlikeRequired",
  "shareAlikeScope",
])
  assert.deepEqual(source[key], binding[key]);
assert.deepEqual(source.rightsReview.license, binding.license);
assert.deepEqual(source.rightsReview.attribution, binding.attribution);
assert.deepEqual(
  source.rightsReview.shareAlikeRequired,
  binding.shareAlikeRequired,
);
assert.deepEqual(source.rightsReview.shareAlikeScope, binding.shareAlikeScope);
const registry = buildSourceRightsRegistry(
  { prior: "untouched" },
  new Map([[source.sourceId, source]]),
  actions,
);
const registryBytes = JSON.stringify(registry);
const restored = JSON.parse(registryBytes);
assert.deepEqual(restored.sources[0], source);
assert.deepEqual(
  restored.nationalSourceReviews[0].rightsFindings[0].rightsBinding,
  binding,
);
for (const key of [
  "license",
  "attribution",
  "shareAlikeRequired",
  "shareAlikeScope",
]) {
  const bad = structuredClone(fact);
  bad.rightsBinding[key] = key === "shareAlikeRequired" ? false : "conflicting";
  assert.throws(
    () => reviewedFactAction(bad, actions),
    /FACT_RIGHTS_BINDING_MISMATCH/,
  );
}
const partial = structuredClone(actions);
delete partial[0].rightsFindings[0].rightsBinding.license;
assert.throws(
  () => reviewedFactAction(fact, partial),
  /ACTION_RIGHTS_BINDING_LICENSE/,
);
const unversionedFact = { ...fact };
delete unversionedFact.rightsBindingSchemaVersion;
assert.throws(
  () => reviewedFactAction(unversionedFact, actions),
  /FACT_RIGHTS_BINDING_VERSION_REQUIRED/,
);
const badAttribution = { ...fact, sourceAttribution: "different attribution" };
assert.throws(
  () =>
    buildReviewedFactSourceRecord({
      fact: badAttribution,
      observed,
      rights,
      recordSet: [badAttribution],
    }),
  /FACT_SOURCE_ATTRIBUTION_MISMATCH/,
);
const fpNew = {
  actionId: req.actionId,
  urls: req.urls,
  termsUrl: req.termsUrl,
  rightsClass: req.rightsClass,
  sourceVersion: null,
  parserVersion: null,
  identityVersion: null,
  rightsVersion: null,
  rightsBindingSchemaVersion: 1,
  rightsBinding: binding,
};
assert.equal(reviewed.attempts[0].requestFingerprint, hash(fpNew));
const legacyAction = {
  actionId: "legacy:no-rights-binding",
  state: "PENDING_RESEARCH",
  attempts: [],
  sourcesChecked: [],
  rightsFindings: [],
  extractedFacts: [],
  affectedDeficits: ["MISSING_CONNECTION_CHAIN_EVIDENCE"],
  result: "OPEN",
  nextAction: "RESEARCH",
};
const legacyQ = path.join(mirror, "private-test", "legacy-actions.jsonl");
fs.writeFileSync(legacyQ, JSON.stringify(legacyAction) + "\n");
const legacyReq = {
  actionId: legacyAction.actionId,
  urls: req.urls,
  termsUrl,
  rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
  rightsFinding: "Legacy nonexpressive facts only",
};
await acquireEvidence(legacyReq, {
  network: fetchMock,
  now: () => now,
  queuePath: legacyQ,
});
const legacyResult = JSON.parse(fs.readFileSync(legacyQ, "utf8").trim());
const fpOld = {
  actionId: legacyReq.actionId,
  urls: legacyReq.urls,
  termsUrl,
  rightsClass: legacyReq.rightsClass,
  sourceVersion: null,
  parserVersion: null,
  identityVersion: null,
  rightsVersion: null,
};
assert.equal(legacyResult.attempts[0].requestFingerprint, hash(fpOld));
const legacyIds = [
  "bus:hinomaru:prefecture-licensed-loop",
  "bus:kumejima:ottop-ccby-current-airport-pair",
  "gtfs:nagasaki:retained-licensed-dataset",
  "bus:akanbus:licensed-current-kushiro-airport-cycle",
  "bus:tarama:licensed-current-airport-adjacent-pair",
  "bus:yonaguni:ottop-ccby-current-full-airport-loop",
  "bus:memanbetsu:licensed-active-airport-abashiri212",
];
const legacyRows = fs
  .readFileSync(
    path.join(repo, "data/transport/network/next-source-actions.jsonl"),
    "utf8",
  )
  .trim()
  .split(/\r?\n/)
  .map(JSON.parse);
const currentRegistry = JSON.parse(
  fs.readFileSync(
    path.join(repo, "data/transport/network/source-rights.json"),
    "utf8",
  ),
);
const packageDir = path.join(repo, "data/transport/network/sources");
const packages = fs
  .readdirSync(packageDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(packageDir, f), "utf8")))
  .filter((p) => p.source);
const packageSourceById = new Map(
  packages.map((p) => [p.source.sourceId, p.source]),
);
for (const actionId of legacyIds) {
  const oldAction = legacyRows.find((a) => a.actionId === actionId);
  assert.ok(oldAction, "legacy action " + actionId);
  const oldRights = oldAction.rightsFindings.at(-1);
  assert.ok(oldRights.license || oldRights.attribution);
  assert.equal(oldRights.rightsBindingSchemaVersion, undefined);
  assert.equal(validateRightsBinding(oldRights), null);
  const packaged = packages.find((p) =>
    oldAction.sourcesChecked.some((s) => s.url === p.source.url),
  )?.source;
  assert.ok(packaged, "licensed package source " + actionId);
  const source = currentRegistry.sources.find(
    (s) => s.sourceId === packaged.sourceId,
  );
  assert.ok(source, "current source registry row " + actionId);
  assert.deepEqual(
    source,
    packaged,
    "old package source record unchanged " + actionId,
  );
  const review = currentRegistry.nationalSourceReviews.find(
    (x) => x.actionId === actionId,
  );
  assert.deepEqual(
    review.rightsFindings,
    oldAction.rightsFindings,
    "old action review unchanged " + actionId,
  );
}
const base = { ...currentRegistry };
delete base.sources;
delete base.nationalSourceReviews;
const rebuiltCurrent = buildSourceRightsRegistry(
  base,
  new Map(currentRegistry.sources.map((x) => [x.sourceId, x])),
  legacyRows,
);
assert.deepEqual(
  rebuiltCurrent,
  currentRegistry,
  "existing registry records remain byte-shape stable",
);
console.log(
  JSON.stringify({
    status:
      "PASS_PRIVATE_VERSIONED_RIGHTS_ACTION_FACTSOURCE_REGISTRY_ROUNDTRIP",
    actualPatchedAcquireEvidence: true,
    actualPatchedReviewedFactAction: true,
    actualPatchedFactSourceBuilder: true,
    actualPatchedRegistryWriter: true,
    allFourMismatchNegatives: true,
    manualPartialBindingRejected: true,
    unversionedFactRejected: true,
    attributionOverrideRejected: true,
    newBindingFingerprintBound: true,
    legacyFingerprintShapeUnchanged: true,
    sevenUnmarkedLegacyActionsAndPackageSourcesUnchanged: true,
    legacyActions: legacyIds,
    sourceRightsRegistryRoundTrip: true,
    canonicalFilesTouched: 0,
  }),
);
