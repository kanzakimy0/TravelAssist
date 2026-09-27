import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { NextRequest } from "next/server.js";
import "./register-route-ts.mjs";

const {
  urbanAttractionPoiFixture,
  templePoiFixture,
  naturePoiFixture,
  temporarilyClosedPoiFixture,
  permanentlyClosedPoiFixture,
  mergedDuplicatePoiFixture,
} = await import("../src/shared/contracts/poi/fixtures.ts");
const { parsePoiSearchQuery } =
  await import("../src/shared/contracts/poi-search/query.ts");
const { createPoiSearchHandler } =
  await import("../src/server/poi-search/http.ts");

const clone = (value) => structuredClone(value);
const repository = (records, revision = "test-revision-1") => ({
  async findCandidates() {
    return { datasetRevision: revision, records };
  },
});
const url = (query) =>
  `http://127.0.0.1:3000/api/pois/search${query ? `?${query}` : ""}`;
const request = (query) => new NextRequest(url(query));
const handler = (records, revision) =>
  createPoiSearchHandler({ repository: repository(records, revision) });
const fetchSearch = async (handle, query) => {
  const response = await handle(request(query));
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
};
const variant = (
  fixture,
  id,
  nameJa,
  nameEn = fixture.names.localized[1].value,
) => {
  const poi = clone(fixture);
  poi.internalId = id;
  poi.masterCode = null;
  poi.names.localized[0].value = nameJa;
  poi.names.localized[1].value = nameEn;
  poi.facts.forEach((fact, index) => {
    fact.subjectRef = id;
    fact.factId = `fact:${id.slice(4)}-${index}`;
  });
  if (poi.features) poi.features.poiRef = id;
  poi.visitProfiles.forEach((profile) => (profile.poiRef = id));
  return poi;
};

test("query contract rejects unconstrained, ambiguous, malformed and unsafe input", () => {
  const invalid = [
    "",
    "q=+",
    "q=%0Afoo",
    `q=${"x".repeat(121)}`,
    "q=%E3%80%82",
    "q=東京&q=大阪",
    "q=東京&candidateKey=candidate:x",
    "q=東京&providerId=abc",
    "classification=invalid",
    "prefecture=Tokyo&municipality=",
    "regionRef=bad%20ref",
    "q=東京&limit=0",
    "q=東京&limit=51",
    "q=東京&limit=01",
    "q=東京&cursor=!",
    `q=東京&cursor=${"a".repeat(2049)}`,
    "q=東京&locale=invalid_locale",
  ];
  for (const query of invalid)
    assert.equal(
      parsePoiSearchQuery(new URLSearchParams(query)).ok,
      false,
      query,
    );
  const filtered = parsePoiSearchQuery(new URLSearchParams("prefecture=Tokyo"));
  assert.equal(filtered.ok, true);
  assert.equal(filtered.value.limit, 20);
  assert.equal(filtered.value.q, null);
});

test("exact Japanese primary, English localized, alias and normalization remain lexical", async () => {
  const temple = clone(templePoiFixture);
  temple.names.aliases = [{ locale: "en", value: "Asakusa Kannon" }];
  const handle = handler([urbanAttractionPoiFixture, temple]);
  const ja = await fetchSearch(handle, "q=東京駅");
  assert.equal(ja.status, 200);
  assert.equal(ja.body.data.items[0].poiRef, "poi:tokyo-station");
  assert.equal(ja.body.data.items[0].match.kind, "exact_primary");
  const reordered = clone(urbanAttractionPoiFixture);
  reordered.names.localized.unshift({
    locale: "ja",
    value: "駅東京",
    kind: "common",
  });
  const reorderedResult = await fetchSearch(handler([reordered]), "q=東京駅");
  assert.equal(reorderedResult.body.data.items[0].match.kind, "exact_primary");
  assert.equal(reorderedResult.body.data.items[0].displayName.value, "東京駅");
  const en = await fetchSearch(handle, "q=tokyo%20station&locale=en-US");
  assert.equal(en.body.data.items[0].displayName.value, "Tokyo Station");
  assert.equal(en.body.data.items[0].match.kind, "exact_alternate");
  const alias = await fetchSearch(handle, "q=asakusa-kannon");
  assert.equal(alias.body.data.items[0].poiRef, "poi:sensoji-temple");
  assert.equal(alias.body.data.items[0].match.kind, "exact_alternate");
  const fullWidth = await fetchSearch(
    handle,
    "q=%EF%BC%B4%EF%BD%8F%EF%BD%8B%EF%BD%99%EF%BD%8F%20Station",
  );
  assert.equal(fullWidth.body.data.items[0].poiRef, "poi:tokyo-station");
});

test("exact, prefix, substring and stable tie-break order; no preference ranking", async () => {
  const exact = clone(urbanAttractionPoiFixture);
  const alias = variant(
    templePoiFixture,
    "poi:alias-match",
    "別施設",
    "Other facility",
  );
  alias.names.aliases = [{ locale: "ja", value: "東京駅" }];
  const prefix = variant(
    urbanAttractionPoiFixture,
    "poi:prefix-match",
    "東京駅前",
  );
  const altPrefix = variant(
    urbanAttractionPoiFixture,
    "poi:alt-prefix",
    "別名施設",
    "Other facility",
  );
  altPrefix.names.aliases = [{ locale: "ja", value: "東京駅北口" }];
  const substring = variant(
    urbanAttractionPoiFixture,
    "poi:substring-match",
    "新東京駅前",
  );
  const result = await fetchSearch(
    handler([substring, altPrefix, prefix, alias, exact]),
    "q=東京駅",
  );
  assert.deepEqual(
    result.body.data.items.map(({ poiRef }) => poiRef),
    [
      "poi:tokyo-station",
      "poi:alias-match",
      "poi:prefix-match",
      "poi:alt-prefix",
      "poi:substring-match",
    ],
  );
  const tied = [
    variant(urbanAttractionPoiFixture, "poi:tie-b", "東京駅前"),
    variant(urbanAttractionPoiFixture, "poi:tie-a", "東京駅前"),
  ];
  const first = await fetchSearch(handler(tied), "q=東京駅");
  assert.deepEqual(
    first.body.data.items.map(({ poiRef }) => poiRef),
    ["poi:tie-a", "poi:tie-b"],
  );
});

test("prefecture, municipality, classification and Region filters are exact", async () => {
  const tokyo = clone(urbanAttractionPoiFixture);
  tokyo.location.address.municipality = "千代田区";
  const other = variant(
    urbanAttractionPoiFixture,
    "poi:other-prefecture",
    "他県駅",
  );
  other.location.address.prefecture = "Osaka";
  other.location.address.municipality = "大阪市";
  other.regionRelations[0].regionRef = "region-osaka";
  other.regionRelations[1].regionRef = "district-namba-dotonbori";
  const nature = clone(naturePoiFixture);
  nature.location.address.prefecture = "Yamanashi";
  const handle = handler([tokyo, other, nature]);
  for (const filter of [
    "prefecture=Tokyo",
    "municipality=千代田区",
    "classification=cityscape_landmark&prefecture=Tokyo",
    "regionRef=district-central-tokyo",
  ]) {
    const result = await fetchSearch(handle, filter);
    assert.deepEqual(
      result.body.data.items.map(({ poiRef }) => poiRef),
      ["poi:tokyo-station"],
      filter,
    );
  }
  const unknownMunicipality = await fetchSearch(handle, "municipality=大阪市");
  assert.deepEqual(
    unknownMunicipality.body.data.items.map(({ poiRef }) => poiRef),
    ["poi:other-prefecture"],
  );
  const noGuess = await fetchSearch(handle, "municipality=Tokyo");
  assert.equal(noGuess.body.data.items.length, 0);
});

test("active and temporarily closed are visible; obsolete identities are excluded", async () => {
  const superseded = variant(
    urbanAttractionPoiFixture,
    "poi:superseded-site",
    "旧施設",
  );
  superseded.lifecycle = {
    status: "superseded",
    mergedIntoPoiRef: null,
    supersededByPoiRef: urbanAttractionPoiFixture.internalId,
    statusChangedAt: superseded.lifecycle.statusChangedAt,
  };
  const result = await fetchSearch(
    handler([
      urbanAttractionPoiFixture,
      temporarilyClosedPoiFixture,
      permanentlyClosedPoiFixture,
      mergedDuplicatePoiFixture,
      superseded,
    ]),
    "prefecture=Tokyo",
  );
  assert.deepEqual(
    result.body.data.items.map(({ lifecycleStatus }) => lifecycleStatus).sort(),
    ["active", "temporarily_closed"],
  );
  assert.ok(
    result.body.data.items.every(
      ({ poiRef }) =>
        !["poi:sensoji-alias", "poi:superseded-site"].includes(poiRef),
    ),
  );
});

test("stable cursor pagination binds query and revision and preserves nulls", async () => {
  const missing = variant(
    urbanAttractionPoiFixture,
    "poi:missing-point",
    "東京駅近く",
  );
  missing.location.point = null;
  missing.masterCode = null;
  const records = [
    urbanAttractionPoiFixture,
    missing,
    temporarilyClosedPoiFixture,
  ];
  const handle = handler(records);
  const first = await fetchSearch(handle, "prefecture=Tokyo&limit=1");
  assert.equal(first.body.data.items.length, 1);
  assert.ok(first.body.data.nextCursor);
  const second = await fetchSearch(
    handle,
    `prefecture=Tokyo&limit=1&cursor=${first.body.data.nextCursor}`,
  );
  assert.equal(second.body.data.items.length, 1);
  assert.notEqual(
    second.body.data.items[0].poiRef,
    first.body.data.items[0].poiRef,
  );
  const all = await fetchSearch(handle, "prefecture=Tokyo&limit=10");
  const pointless = all.body.data.items.find(
    ({ poiRef }) => poiRef === "poi:missing-point",
  );
  assert.equal(pointless.masterCode, null);
  assert.equal(pointless.point, null);
  const changed = await fetchSearch(
    handle,
    `prefecture=Osaka&limit=1&cursor=${first.body.data.nextCursor}`,
  );
  assert.equal(changed.status, 400);
  const stale = await fetchSearch(
    handler(records, "new-revision"),
    `prefecture=Tokyo&limit=1&cursor=${first.body.data.nextCursor}`,
  );
  assert.equal(stale.status, 400);
  const malformed = await fetchSearch(handle, "q=東京&cursor=YWJj");
  assert.equal(malformed.status, 400);
  assert.deepEqual(await fetchSearch(handle, "prefecture=Tokyo&limit=10"), all);
});

test("response is search-card-safe and cannot search candidate or Provider IDs", async () => {
  const handle = handler([urbanAttractionPoiFixture]);
  const result = await fetchSearch(handle, "q=東京駅");
  const card = result.body.data.items[0];
  assert.deepEqual(
    Object.keys(card).sort(),
    [
      "classification",
      "displayName",
      "lifecycleStatus",
      "masterCode",
      "match",
      "municipality",
      "poiRef",
      "point",
      "prefecture",
      "regionRefs",
    ].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(result.body),
    /provider-tokyo-station|sourceRefs|features|facts|externalIds|candidateKey|recommendationScore/,
  );
  const provider = await fetchSearch(handle, "q=provider-tokyo-station");
  assert.equal(provider.body.data.items.length, 0);
  const candidate = await fetchSearch(
    handle,
    "q=candidate%3Atokyo-station-001",
  );
  assert.equal(candidate.body.data.items.length, 0);
});

test("unconfigured, failed, and invalid canonical repositories fail closed", async () => {
  const unavailable = await fetchSearch(createPoiSearchHandler(), "q=東京駅");
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.body.error.code, "repository_unavailable");
  assert.match(unavailable.headers.get("cache-control"), /no-store/);
  const invalidWithoutRepository = await fetchSearch(
    createPoiSearchHandler(),
    "q=東京駅&cursor=YWJj",
  );
  assert.equal(invalidWithoutRepository.status, 400);
  const failed = await fetchSearch(
    createPoiSearchHandler({
      repository: {
        async findCandidates() {
          throw new Error("down");
        },
      },
    }),
    "q=東京駅",
  );
  assert.equal(failed.status, 503);
  const invalid = clone(urbanAttractionPoiFixture);
  invalid.providerRaw = { secret: "forbidden" };
  const bad = await fetchSearch(handler([invalid]), "q=東京駅");
  assert.equal(bad.status, 500);
  assert.equal(bad.body.error.code, "canonical_validation_failed");
  const substituted = clone(urbanAttractionPoiFixture);
  substituted.internalId = "candidate:tokyo-station-001";
  const rejected = await fetchSearch(handler([substituted]), "q=東京駅");
  assert.equal(rejected.status, 500);
});

test("candidate-only corpus remains excluded from runtime search imports", () => {
  const manifest = JSON.parse(
    readFileSync(
      "data/poi/full/manifests/current-candidate-review.v1.json",
      "utf8",
    ),
  );
  assert.equal(manifest.scope, "CANDIDATE_ONLY_NO_CANONICAL_IMPORT");
  assert.equal(manifest.runtimeImportAuthorized, false);
  for (const source of [
    "src/server/poi-search/repository.ts",
    "src/server/poi-search/service.ts",
    "src/server/poi-search/http.ts",
    "src/app/api/pois/search/route.ts",
  ])
    assert.doesNotMatch(
      readFileSync(source, "utf8"),
      /data\/poi\/full|read-current-candidates/,
    );
});
