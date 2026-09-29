import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifestPath =
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json";
const samplePath = "data/poi/canonical/pilot-100/sample-manifest.v1.json";
const datasetPath = "src/shared/data/canonical-poi-pilot100.v1.json";
const outputPath =
  "docs/qa/TASK-081-B/source-capsules.wikidata-revisions.v1.json";
const runtime = read(manifestPath);
const sample = read(samplePath);
const dataset = read(datasetPath);
assert.equal(runtime.runtimeImportAuthorized, true);
assert.equal(runtime.candidateCorpusAuthorized, false);
assert.equal(runtime.recordCount, 100);
assert.equal(sample.records.length, 100);
assert.equal(dataset.records.length, 100);
assert.deepEqual(
  dataset.records.map((poi) => poi.internalId),
  runtime.internalIds,
);
assert.deepEqual(
  dataset.records.map((poi) => poi.masterCode),
  runtime.masterCodes,
);

const agent =
  "TravelAssist-TASK-081-B-Pilot/1.0 (100 admitted entities; https://github.com/kanzakimy0/TravelAssist)";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": agent, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await pause(1000 * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error("HTTP_" + response.status);
      const body = await response.text();
      if (body.length > 2_000_000) throw new Error("SOURCE_TOO_LARGE");
      return body;
    } catch (error) {
      if (attempt === 2) throw error;
      await pause(1000 * (attempt + 1));
    }
  }
  throw new Error("SOURCE_RETRY_EXHAUSTED");
}
const values = (entity, property) =>
  (entity.claims?.[property] ?? [])
    .filter((claim) => claim.mainsnak?.snaktype === "value")
    .map((claim) => claim.mainsnak.datavalue?.value)
    .filter((value) => value !== undefined)
    .map((value) => {
      if (typeof value === "string" || typeof value === "number") return value;
      if (value && typeof value === "object") {
        if (typeof value.id === "string") return value.id;
        if (typeof value.time === "string") return value.time;
      }
      return null;
    })
    .filter((value) => value !== null);

async function capsule(poi, member) {
  assert.equal(member.internalId, poi.internalId);
  assert.equal(member.allocatedMasterCode, poi.masterCode);
  const qid = member.wikidataQid;
  const revision = member.wikidataRevision;
  const sourceRef = "source:wikidata:" + qid;
  const source = poi.sourceRefs.find((item) => item.sourceRef === sourceRef);
  assert.equal(source?.rights.persistence, "allowed");
  assert.equal(source?.rights.redistribution, "allowed");
  assert.equal(
    poi.externalIds.find((item) => item.provider === "wikidata")?.externalId,
    qid,
  );
  const locator =
    "https://www.wikidata.org/wiki/Special:EntityData/" +
    qid +
    ".json?revision=" +
    revision;
  try {
    const body = await request(locator);
    const response = JSON.parse(body);
    const entity = response.entities?.[qid];
    if (!entity || entity.id !== qid || entity.lastrevid !== revision)
      throw new Error("ENTITY_OR_REVISION_MISMATCH");
    return {
      internalId: poi.internalId,
      masterCode: poi.masterCode,
      nameJa:
        poi.names.localized.find((name) => name.locale === "ja")?.value ?? null,
      qid,
      revision,
      sourceRef,
      locator,
      responseSha256: sha256(body),
      status: "FETCHED",
      descriptions: {
        en: entity.descriptions?.en?.value ?? null,
        ja: entity.descriptions?.ja?.value ?? null,
      },
      instanceOfIds: values(entity, "P31"),
      inception: values(entity, "P571"),
      dissolved: values(entity, "P576"),
      officialWebsite: values(entity, "P856"),
      heritageDesignationIds: values(entity, "P1435"),
      imageCount: values(entity, "P18").length,
      sourcePropertyIds: Object.keys(entity.claims ?? {}).sort(),
      sitelinkCount: Object.keys(entity.sitelinks ?? {}).length,
    };
  } catch (error) {
    return {
      internalId: poi.internalId,
      masterCode: poi.masterCode,
      nameJa:
        poi.names.localized.find((name) => name.locale === "ja")?.value ?? null,
      qid,
      revision,
      sourceRef,
      locator,
      responseSha256: null,
      status: "SOURCE_FAILURE",
      errorCode: String(error?.message ?? error).slice(0, 120),
    };
  }
}

const labelsOnly = process.argv.includes("--labels-only");
const records = labelsOnly ? read(outputPath).records : [];
if (!labelsOnly) {
  for (let index = 0; index < dataset.records.length; index += 2) {
    const group = await Promise.all(
      dataset.records
        .slice(index, index + 2)
        .map((poi, offset) => capsule(poi, sample.records[index + offset])),
    );
    records.push(...group);
    if (index + 2 < dataset.records.length) await pause(300);
  }
}
const typeIds = [
  ...new Set(
    records.flatMap((row) =>
      row.status === "FETCHED"
        ? [...row.instanceOfIds, ...row.heritageDesignationIds]
        : [],
    ),
  ),
].sort();
const entityLabels = {};
for (let index = 0; index < typeIds.length; index += 4) {
  const ids = typeIds.slice(index, index + 4);
  await Promise.all(
    ids.map(async (id) => {
      const locator =
        "https://www.wikidata.org/wiki/Special:EntityData/" + id + ".json";
      try {
        const body = await request(locator);
        const entity = JSON.parse(body).entities?.[id];
        entityLabels[id] = {
          en: entity?.labels?.en?.value ?? null,
          ja: entity?.labels?.ja?.value ?? null,
          locator,
          responseSha256: sha256(body),
        };
      } catch (error) {
        entityLabels[id] = {
          en: null,
          ja: null,
          locator,
          errorCode: String(error?.message ?? error),
        };
      }
    }),
  );
  await pause(300);
}
const artifact = {
  schemaVersion: "1.0",
  task: "TASK-081-B",
  source: "Wikidata CC0 structured entity data, pinned to TASK-083 revisions",
  sampleSelectionSha256: sample.selectionSha256,
  datasetRevision: dataset.datasetRevision,
  manifestDatasetSha256: runtime.datasetSha256,
  fetchedAt: new Date().toISOString(),
  recordCount: records.length,
  fetchedCount: records.filter((row) => row.status === "FETCHED").length,
  failureCount: records.filter((row) => row.status === "SOURCE_FAILURE").length,
  entityLabels,
  records,
};
writeFileSync(
  outputPath,
  await format(JSON.stringify(artifact), {
    ...(await resolveConfig(outputPath)),
    parser: "json",
  }),
);
process.stdout.write(
  JSON.stringify({
    path: outputPath,
    records: artifact.recordCount,
    fetched: artifact.fetchedCount,
    failures: artifact.failureCount,
    labeledEntityTypes: Object.keys(entityLabels).length,
  }) + "\n",
);
