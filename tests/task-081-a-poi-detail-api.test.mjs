import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalPoiPositiveFixtures,
  mergedDuplicatePoiFixture,
  permanentlyClosedPoiFixture,
  templePoiFixture,
  temporarilyClosedPoiFixture,
  urbanAttractionPoiFixture,
} from "../src/shared/contracts/poi/index.ts";
import { POI_FEATURE_CODES } from "../src/shared/contracts/planning/index.ts";
import { handlePoiDetail } from "../src/server/poi-details/http.ts";
import {
  createFixturePoiDetailRepository,
  unavailablePoiDetailRepository,
} from "../src/server/poi-details/repository.ts";

const clone = (value) => structuredClone(value);
const fixtureRepository = () =>
  createFixturePoiDetailRepository(canonicalPoiPositiveFixtures);
const request = async (poiRef, repository = fixtureRepository()) => {
  const response = await handlePoiDetail(poiRef, repository);
  return { response, body: await response.json() };
};

const assertHeaders = (response) => {
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
};

test("active detail uses only canonical internalId and curated static fields", async () => {
  const { response, body } = await request(
    urbanAttractionPoiFixture.internalId,
  );
  assert.equal(response.status, 200);
  assertHeaders(response);
  assert.equal(body.data.poiRef, urbanAttractionPoiFixture.internalId);
  assert.equal(body.data.masterCode, "10001");
  assert.equal(body.data.names.localized[0].value, "東京駅");
  assert.equal(body.data.classification.primary, "cityscape_landmark");
  assert.deepEqual(
    body.data.location.point,
    urbanAttractionPoiFixture.location.point,
  );
  assert.equal(body.data.regionRelations.length, 2);
  assert.equal(
    body.data.accessAnchors[0].transportNodeRef,
    "transport-node:tokyo-station",
  );
  assert.deepEqual(body.data.evidence, [
    {
      sourceRef: "source:fixture-official",
      sourceKind: "official",
      authorityBand: "A",
      observedAt: "2026-09-21T00:00:00+09:00",
      attributionRequired: false,
    },
  ]);
  assert.equal(body.data.externalIds, undefined);
  assert.equal(body.data.facts, undefined);
  assert.equal(body.data.assetRefs, undefined);
  assert.equal(body.data.revision, undefined);
});

test("lifecycle is explicit, including historical, merged and superseded records", async () => {
  for (const fixture of [
    temporarilyClosedPoiFixture,
    permanentlyClosedPoiFixture,
    mergedDuplicatePoiFixture,
  ]) {
    const { response, body } = await request(fixture.internalId);
    assert.equal(response.status, 200);
    assert.deepEqual(body.data.lifecycle, fixture.lifecycle);
    assert.equal(body.data.poiRef, fixture.internalId);
  }
  const superseded = clone(urbanAttractionPoiFixture);
  superseded.internalId = "poi:retired-station";
  superseded.masterCode = null;
  superseded.facts = [];
  superseded.features = null;
  superseded.lifecycle = {
    status: "superseded",
    mergedIntoPoiRef: null,
    supersededByPoiRef: urbanAttractionPoiFixture.internalId,
    statusChangedAt: superseded.lifecycle.statusChangedAt,
  };
  const { response, body } = await request(
    superseded.internalId,
    createFixturePoiDetailRepository([superseded]),
  );
  assert.equal(response.status, 200);
  assert.equal(body.data.masterCode, null);
  assert.equal(
    body.data.lifecycle.supersededByPoiRef,
    urbanAttractionPoiFixture.internalId,
  );
  assert.equal(body.data.poiRef, superseded.internalId);
});

test("localized aliases, multiple visits, zero and null 43D values survive exactly", async () => {
  const poi = clone(templePoiFixture);
  poi.names.aliases = [{ locale: "en", value: "Asakusa Temple" }];
  poi.features.values["01"] = 0;
  poi.features.values["02"] = null;
  const second = clone(poi.visitProfiles[0]);
  second.profileId = "visit:sensoji-quick";
  second.visitMode = "quick_visit";
  second.minimumDurationMinutes = 0;
  second.recommendedDurationMinutes = 20;
  second.maximumUsefulDurationMinutes = 30;
  poi.visitProfiles.push(second);
  const { response, body } = await request(
    poi.internalId,
    createFixturePoiDetailRepository([poi]),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(body.data.names.aliases, poi.names.aliases);
  assert.equal(body.data.features.values["01"], 0);
  assert.equal(body.data.features.values["02"], null);
  assert.deepEqual(
    Object.keys(body.data.features.values).sort(),
    [...POI_FEATURE_CODES].sort(),
  );
  assert.equal(body.data.visitProfiles.length, 2);
  assert.equal(body.data.visitProfiles[1].minimumDurationMinutes, 0);
  assert.equal(body.data.visitProfiles[1].sourceRefs, undefined);
});

test("unknown point and absent feature set remain explicit null", async () => {
  const poi = clone(urbanAttractionPoiFixture);
  poi.location.supportStatus = "unresolved";
  poi.location.countryCode = null;
  poi.location.point = null;
  poi.location.geometryRef = null;
  poi.location.address = null;
  poi.features = null;
  const { response, body } = await request(
    poi.internalId,
    createFixturePoiDetailRepository([poi]),
  );
  assert.equal(response.status, 200);
  assert.equal(body.data.location.point, null);
  assert.equal(body.data.location.prefecture, null);
  assert.equal(body.data.features, null);
});

test("malformed, oversized and alternate identity families fail before repository access", async () => {
  let calls = 0;
  const repository = {
    async getByInternalId() {
      calls++;
      return null;
    },
  };
  for (const value of [
    "10001",
    "candidate:tokyo-station",
    "provider-123",
    "region-tokyo",
    "transport-node:tokyo",
    "poi:../secret",
    `poi:${"x".repeat(129)}`,
    "poi:%2Fbad",
    "poi:a",
  ]) {
    const { response, body } = await request(value, repository);
    assert.equal(response.status, 400, value);
    assert.equal(body.error.code, "INVALID_POI_REF");
    assertHeaders(response);
  }
  assert.equal(calls, 0);
  const externalLooking = await request("poi:fixture-provider", repository);
  assert.equal(externalLooking.response.status, 404);
  assert.equal(calls, 1);
  assert.equal((await request("poi:does-not-exist")).response.status, 404);
});

test("invalid canonical record, invalid 43D and invalid Visit fail closed", async () => {
  const invalidRecords = [];
  const wrongId = clone(urbanAttractionPoiFixture);
  wrongId.internalId = "poi:another-record";
  invalidRecords.push({ poiRef: "poi:tokyo-station", record: wrongId });
  const invalidFeature = clone(urbanAttractionPoiFixture);
  delete invalidFeature.features.values["43"];
  invalidRecords.push({
    poiRef: invalidFeature.internalId,
    record: invalidFeature,
  });
  const invalidVisit = clone(templePoiFixture);
  invalidVisit.visitProfiles[0].recommendedDurationMinutes = -1;
  invalidRecords.push({
    poiRef: invalidVisit.internalId,
    record: invalidVisit,
  });
  const rawProvider = clone(urbanAttractionPoiFixture);
  rawProvider.providerRaw = { apiKey: "secret" };
  invalidRecords.push({ poiRef: rawProvider.internalId, record: rawProvider });
  for (const { poiRef, record } of invalidRecords) {
    const { response, body } = await request(poiRef, {
      async getByInternalId() {
        return record;
      },
    });
    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      ok: false,
      error: { code: "POI_DETAIL_INVALID_CANONICAL_RECORD" },
    });
  }
});

test("restricted, transient, asset, locator, provider and live fields are not serialized", async () => {
  const poi = clone(urbanAttractionPoiFixture);
  poi.assetRefs = ["asset:private-photo"];
  poi.location.geometryRef = "internal:geometry";
  poi.location.address.postalCode = "100-0005";
  poi.sourceRefs.push({
    sourceRef: "source:transient",
    sourceKind: "provider",
    authorityBand: "C",
    locator: "secret-provider-payload",
    observedAt: poi.sourceRefs[0].observedAt,
    rights: {
      persistence: "transient_only",
      redistribution: "restricted",
      attributionRequired: true,
    },
  });
  const { response, body } = await request(
    poi.internalId,
    createFixturePoiDetailRepository([poi]),
  );
  assert.equal(response.status, 200);
  const serialized = JSON.stringify(body);
  for (const token of [
    "secret-provider-payload",
    "source:transient",
    "fixture-provider",
    "asset:private-photo",
    "internal:geometry",
    "100-0005",
    "locator",
    "externalIds",
    "sourceRefs",
    "rights",
    "timetable",
    "fare",
    "weather",
    "crowd",
    "providerRaw",
  ])
    assert.equal(serialized.includes(token), false, token);
  for (const extra of [
    "liveTimetable",
    "liveFare",
    "liveWeather",
    "liveCrowd",
    "providerRaw",
  ]) {
    const invalid = clone(poi);
    invalid[extra] = "secret-live-value";
    const result = await request(poi.internalId, {
      async getByInternalId() {
        return invalid;
      },
    });
    assert.equal(result.response.status, 503, extra);
  }
});

test("unavailable repository and unexpected storage failure return stable 503", async () => {
  for (const repository of [
    unavailablePoiDetailRepository,
    {
      async getByInternalId() {
        throw Error("secret");
      },
    },
  ]) {
    const { response, body } = await request("poi:tokyo-station", repository);
    assert.equal(response.status, 503);
    assert.deepEqual(body, {
      ok: false,
      error: { code: "POI_DETAIL_REPOSITORY_UNAVAILABLE" },
    });
  }
});

test("production route never imports fixture or candidate files", () => {
  const route = readFileSync("src/app/api/pois/[poiRef]/route.ts", "utf8");
  const repository = readFileSync(
    "src/server/poi-details/repository.ts",
    "utf8",
  );
  assert.match(route, /handlePoiDetail/);
  assert.doesNotMatch(route, /fixture|data\/poi|read-current-candidates/);
  assert.doesNotMatch(repository, /data\/poi|read-current-candidates/);
});

test("deterministic repeated projection", async () => {
  const first = await request("poi:tokyo-station");
  const second = await request("poi:tokyo-station");
  assert.deepEqual(first.body, second.body);
});
