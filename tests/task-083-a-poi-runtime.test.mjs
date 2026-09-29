import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { GET } from "../src/app/api/pois/[poiRef]/route.ts";
import {
  canonicalPoiRuntimeRepository,
  CanonicalPoiRuntimeIntegrityError,
  createCanonicalPoiRuntimeRepository,
} from "../src/server/poi-runtime/repository.ts";
import { admittedGraphNodes } from "../src/shared/poi-edge-graph/index.ts";

const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const dataset = read("src/shared/data/canonical-poi-pilot100.v1.json");
const manifest = read(
  "src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json",
);
const registry = read("src/shared/data/master-code-registry.v1.json");
const clone = (value) => structuredClone(value);
const request = async (poiRef) => {
  const response = await GET(
    new Request(`http://localhost/api/pois/${encodeURIComponent(poiRef)}`),
    {
      params: Promise.resolve({ poiRef }),
    },
  );
  return { response, body: await response.json() };
};

test("authorized server-only repository exposes exactly 100 canonical records", async () => {
  assert.equal(
    canonicalPoiRuntimeRepository.datasetRevision,
    manifest.datasetRevision,
  );
  const rows = await canonicalPoiRuntimeRepository.list();
  assert.equal(rows.length, 100);
  assert.deepEqual(
    rows.map((row) => row.internalId),
    manifest.internalIds,
  );
  assert.deepEqual(
    rows.map((row) => row.masterCode),
    manifest.masterCodes,
  );
  assert.ok(
    rows.every(
      (row) =>
        row.features !== null &&
        Object.values(row.features.values).length === 43 &&
        Object.values(row.features.values).every(
          (value) => Number.isInteger(value) && value >= 0 && value <= 9,
        ),
    ),
  );
  rows[0].names.localized[0].value = "tampered";
  assert.notEqual(
    (await canonicalPoiRuntimeRepository.getByInternalId(rows[0].internalId))
      .names.localized[0].value,
    "tampered",
  );
});

test("TASK-082 read-only admission boundary recognizes all 100 real Canonical POIs", () => {
  const activePoiCodes = registry.entries.filter(
    (entry) =>
      entry.lifecycleStatus === "active" && entry.entityType.startsWith("poi."),
  );
  assert.equal(activePoiCodes.length, 100);
  const { nodes, rejected } = admittedGraphNodes(dataset, registry, manifest);
  assert.equal(nodes.length, 100);
  assert.deepEqual(rejected, []);
  assert.deepEqual(
    nodes.map((node) => node.poiId),
    manifest.internalIds,
  );
  assert.deepEqual(
    nodes.map((node) => node.masterCode),
    manifest.masterCodes,
  );
});

test("unmerged TASK-080 search repository handoff returns a complete bounded candidate set", async () => {
  const query = {
    q: null,
    locale: null,
    prefecture: null,
    municipality: null,
    classification: null,
    regionRef: null,
    limit: 20,
    cursor: null,
  };
  const result = await canonicalPoiRuntimeRepository.findCandidates(query);
  assert.equal(result.datasetRevision, manifest.datasetRevision);
  assert.deepEqual(
    result.records.map((record) => record.internalId),
    manifest.internalIds,
  );
  assert.ok(result.records.every((record) => record.features === null));
});

test("all 100 real canonical internalIds succeed through the actual Detail route", async () => {
  for (const internalId of manifest.internalIds) {
    const { response, body } = await request(internalId);
    assert.equal(response.status, 200, internalId);
    assert.equal(body.data.poiRef, internalId);
    assert.equal(body.data.features, null);
    assert.equal(body.data.evidence.length, 1);
    assert.equal(body.data.evidence[0].sourceKind, "open_data");
    assert.equal(body.data.externalIds, undefined);
    assert.equal(body.data.sourceRefs, undefined);
  }
});

test("unknown canonical ID is 404; Master Code and candidateKey substitutions are 400", async () => {
  assert.equal((await request("poi:unknown-083-pilot")).response.status, 404);
  assert.equal((await request(manifest.masterCodes[0])).response.status, 400);
  assert.equal(
    (await request(`v166:${manifest.internalIds[0].slice(4)}`)).response.status,
    400,
  );
});

test("runtime authorization and payload tampering fail closed", () => {
  const unauthorized = clone(manifest);
  unauthorized.runtimeImportAuthorized = false;
  assert.throws(
    () => createCanonicalPoiRuntimeRepository(dataset, unauthorized, registry),
    CanonicalPoiRuntimeIntegrityError,
  );
  const wrongScope = clone(manifest);
  wrongScope.scope = "CANDIDATE_ONLY_NO_CANONICAL_IMPORT";
  assert.throws(
    () => createCanonicalPoiRuntimeRepository(dataset, wrongScope, registry),
    CanonicalPoiRuntimeIntegrityError,
  );
  const tamperedDataset = clone(dataset);
  tamperedDataset.records[0].location.point.longitude += 0.01;
  assert.throws(
    () =>
      createCanonicalPoiRuntimeRepository(tamperedDataset, manifest, registry),
    CanonicalPoiRuntimeIntegrityError,
  );
  const tamperedRegistry = clone(registry);
  tamperedRegistry.entries.at(-1).entityRef = "poi:wrong-083";
  assert.throws(
    () =>
      createCanonicalPoiRuntimeRepository(dataset, manifest, tamperedRegistry),
    CanonicalPoiRuntimeIntegrityError,
  );
});
