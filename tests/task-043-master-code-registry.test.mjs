import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  masterCodeRegistry,
  parseMasterCodeRegistryV1,
  resolveActiveMasterCodeByEntity,
  resolveMasterCode,
  validateMasterCodeRegistryTransitionV1,
  validateRegionAllocationManifestV1,
} from "../src/shared/master-code/index.ts";
import {
  buildRegionAllocationManifest,
  generatedOutputs,
  serialize,
} from "../tools/qa/master-code-registry.mjs";

const clone = (value) => structuredClone(value);
const issuesFor = (result) =>
  result.ok ? [] : result.issues.map(({ code }) => code);
const regionGraph = JSON.parse(
  readFileSync(resolve("docs/qa/TASK-041/region-nodes.json"), "utf8"),
);
const knownRegions = new Map(
  regionGraph.nodes.map(({ regionId, regionType }) => [regionId, regionType]),
);

test("canonical registry and all 50 TASK-041 allocations validate", () => {
  const registryResult = parseMasterCodeRegistryV1(masterCodeRegistry);
  assert.equal(registryResult.ok, true);
  const manifest = buildRegionAllocationManifest();
  assert.equal(manifest.allocations.length, 50);
  assert.equal(
    new Set(manifest.allocations.map(({ regionId }) => regionId)).size,
    50,
  );
  assert.equal(
    new Set(manifest.allocations.map(({ masterCode }) => masterCode)).size,
    50,
  );
  assert.deepEqual(
    manifest.allocations.map(({ regionId }) => regionId),
    regionGraph.nodes.map(({ regionId }) => regionId),
  );
  assert.equal(
    validateRegionAllocationManifestV1(
      manifest,
      masterCodeRegistry,
      knownRegions,
    ).ok,
    true,
  );
});

test("generated QA outputs are deterministic and checked in", async () => {
  for (const [name, value] of generatedOutputs) {
    assert.equal(
      readFileSync(resolve("docs/qa/TASK-043", name), "utf8"),
      await serialize(value),
    );
  }
});

test("resolvers find active allocations by code and entity identity", () => {
  assert.equal(resolveMasterCode("00110")?.entityRef, "region-tokyo");
  assert.equal(
    resolveActiveMasterCodeByEntity("region.travel_region", "region-tokyo")
      ?.masterCode,
    "00110",
  );
  assert.equal(resolveMasterCode("99998"), null);
  assert.equal(
    resolveActiveMasterCodeByEntity("region.travel_region", "unknown-region"),
    null,
  );
});

test("duplicate Master Code fails closed", () => {
  const value = clone(masterCodeRegistry);
  value.entries.push(clone(value.entries[1]));
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(value)).includes(
      "DUPLICATE_MASTER_CODE",
    ),
  );
});

test("duplicate active entity allocation fails closed", () => {
  const value = clone(masterCodeRegistry);
  value.entries.push({ ...clone(value.entries[1]), masterCode: "00199" });
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(value)).includes(
      "DUPLICATE_ACTIVE_ENTITY_ALLOCATION",
    ),
  );
});

test("deprecated Master Code cannot be recycled", () => {
  const previous = clone(masterCodeRegistry);
  previous.entries[1].lifecycleStatus = "deprecated";
  const next = clone(previous);
  next.entries[1].entityRef = "region-not-japan";
  assert.ok(
    issuesFor(validateMasterCodeRegistryTransitionV1(previous, next)).includes(
      "CODE_RECYCLING_AFTER_DEPRECATION",
    ),
  );
});

test("missing supersession target fails closed", () => {
  const value = clone(masterCodeRegistry);
  value.entries[1].lifecycleStatus = "superseded";
  value.entries[1].supersededBy = "00998";
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(value)).includes(
      "MISSING_SUPERSEDED_TARGET",
    ),
  );
});

test("supersession cycle fails closed", () => {
  const value = clone(masterCodeRegistry);
  value.entries.push({ ...clone(value.entries[1]), masterCode: "00198" });
  value.entries[1].lifecycleStatus = "superseded";
  value.entries[1].supersededBy = "00198";
  value.entries.at(-1).lifecycleStatus = "superseded";
  value.entries.at(-1).supersededBy = "00100";
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(value)).includes("SUPERSESSION_CYCLE"),
  );
});

test("unknown lifecycle fails closed", () => {
  const value = clone(masterCodeRegistry);
  value.entries[1].lifecycleStatus = "retired";
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(value)).includes("UNKNOWN_LIFECYCLE"),
  );
});

test("malformed and legacy side-channel codes fail closed", () => {
  for (const badCode of [
    "1234",
    "JP-RG-TOKYO",
    "JP-PREF-TOKYO",
    "JP-MACRO-KANTO",
  ]) {
    const value = clone(masterCodeRegistry);
    value.entries[1].masterCode = badCode;
    assert.ok(
      issuesFor(parseMasterCodeRegistryV1(value)).includes(
        "MALFORMED_MASTER_CODE",
      ),
    );
  }
});

test("entityRef whitespace and control characters fail closed", () => {
  for (const badRef of ["region japan", "region-japan\n"]) {
    const value = clone(masterCodeRegistry);
    value.entries[1].entityRef = badRef;
    assert.ok(
      issuesFor(parseMasterCodeRegistryV1(value)).includes(
        "INVALID_ENTITY_REF",
      ),
    );
  }
});

test("unknown Region allocation fails closed", () => {
  const manifest = buildRegionAllocationManifest();
  manifest.allocations[0].regionId = "region-not-in-task-041";
  assert.ok(
    issuesFor(
      validateRegionAllocationManifestV1(
        manifest,
        masterCodeRegistry,
        knownRegions,
      ),
    ).includes("UNKNOWN_REGION_ALLOCATION"),
  );
});

test("destination ID cannot masquerade as Master Code", () => {
  const value = clone(masterCodeRegistry);
  value.entries[1].masterCode = "jp-tokyo";
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(value)).includes(
      "MALFORMED_MASTER_CODE",
    ),
  );
});

test("administrative ID cannot masquerade as a Region Master Code", () => {
  const municipality = clone(masterCodeRegistry);
  municipality.entries.find(
    ({ entityRef }) => entityRef === "region-odawara",
  ).masterCode = "14206";
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(municipality)).includes(
      "MASTER_CODE_NAMESPACE_MISMATCH",
    ),
  );

  const prefecture = clone(masterCodeRegistry);
  prefecture.entries.find(
    ({ entityRef }) => entityRef === "prefecture-tokyo",
  ).masterCode = "00013";
  assert.ok(
    issuesFor(parseMasterCodeRegistryV1(prefecture)).includes(
      "ADMINISTRATIVE_ID_MASQUERADING_AS_MASTER_CODE",
    ),
  );
});

test("active allocation is immutable and registry is append-only", () => {
  const next = clone(masterCodeRegistry);
  next.entries[1].entityRef = "region-renamed";
  next.entries.pop();
  const issues = issuesFor(
    validateMasterCodeRegistryTransitionV1(masterCodeRegistry, next),
  );
  assert.ok(issues.includes("ACTIVE_ALLOCATION_MUTATED"));
  assert.ok(issues.includes("MASTER_CODE_REMOVED"));
});
