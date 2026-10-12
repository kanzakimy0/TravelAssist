import assert from "node:assert/strict";
import fs from "node:fs";

// Run against the locally built server, never a production/provider endpoint.
const endpoint = "http://127.0.0.1:31080/api/pois/search";
const dataset = JSON.parse(
  fs.readFileSync("src/shared/data/canonical-poi-pilot100.v1.json", "utf8"),
);
const admitted = new Set(dataset.records.map((poi) => poi.internalId));
let visible = 0;
for (const poi of dataset.records) {
  const params = new URLSearchParams({
    q: poi.names.localized[0].value,
    limit: "50",
  });
  const response = await fetch(`${endpoint}?${params}`);
  assert.equal(response.status, 200, poi.internalId);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const body = await response.json();
  const card = body.data.items.find((item) => item.poiRef === poi.internalId);
  if (["active", "temporarily_closed"].includes(poi.lifecycle.status)) {
    visible++;
    assert.ok(card, poi.internalId);
    assert.equal(card.masterCode, poi.masterCode);
    assert.equal(card.lifecycleStatus, poi.lifecycle.status);
  } else assert.equal(card, undefined, poi.internalId);
  assert.ok(body.data.items.every((item) => admitted.has(item.poiRef)));
  assert.doesNotMatch(
    JSON.stringify(body),
    /providerRaw|candidateKey|sourceRefs|externalIds|features|facts|recommendationScore/,
  );
}
for (const suffix of [
  "",
  "?q=x&q=y",
  "?classification=invalid",
  "?q=x&cursor=YWJj",
]) {
  const response = await fetch(endpoint + suffix);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "invalid_request");
  assert.match(response.headers.get("cache-control"), /no-store/);
}
assert.equal((await fetch(endpoint + "?q=x", { method: "POST" })).status, 405);
const head = await fetch(endpoint + "?classification=cityscape_landmark", {
  method: "HEAD",
});
assert.equal(head.status, 200);
assert.equal(await head.text(), "");
assert.equal(visible, 98);
const report = {
  task: "TASK-080-A",
  status: "PASS",
  endpoint,
  server: "Next.js production build",
  datasetRevision: dataset.datasetRevision,
  identityChecks: 100,
  visible,
  permanentlyClosedExcluded: 2,
  invalidRequests: 4,
  postStatus: 405,
  headStatus: 200,
  cacheControl: "no-store",
  canonicalMembershipAndSafeProjection: "PASS",
};
fs.writeFileSync(
  "docs/qa/TASK-080/http-smoke.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
