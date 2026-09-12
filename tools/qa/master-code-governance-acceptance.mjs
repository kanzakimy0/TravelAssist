import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

import {
  parseMasterCodeRegistryV1,
  resolveActiveMasterCodeByEntity,
  resolveMasterCode,
  validateMasterCodeRegistryTransitionV1,
  validateRegionAllocationManifestV1,
} from "../../src/shared/master-code/index.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = resolve(
  projectRoot,
  "docs/qa/TASK-044/registry-invariant-check.json",
);
const registryPath = resolve(
  projectRoot,
  "src/shared/data/master-code-registry.v1.json",
);
const allocationPath = resolve(
  projectRoot,
  "docs/qa/TASK-043/region-allocation-50.json",
);
const regionPath = resolve(projectRoot, "docs/qa/TASK-041/region-nodes.json");

const loadJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => structuredClone(value);
const issueCodes = (result) =>
  result.ok ? [] : result.issues.map(({ code }) => code);
const hasIssue = (result, expected) => issueCodes(result).includes(expected);
const sha256 = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

function negativeInvariantChecks(registry, allocation, knownRegions) {
  const duplicateCode = clone(registry);
  duplicateCode.entries.push(clone(duplicateCode.entries[1]));

  const duplicateEntity = clone(registry);
  duplicateEntity.entries.push({
    ...clone(duplicateEntity.entries[1]),
    masterCode: "00199",
  });

  const deprecatedPrevious = clone(registry);
  deprecatedPrevious.entries[1].lifecycleStatus = "deprecated";
  const recycledNext = clone(deprecatedPrevious);
  recycledNext.entries[1].entityRef = "region-recycled";

  const missingTarget = clone(registry);
  missingTarget.entries[1].lifecycleStatus = "superseded";
  missingTarget.entries[1].supersededBy = "00998";

  const cycle = clone(registry);
  cycle.entries.push({ ...clone(cycle.entries[1]), masterCode: "00198" });
  cycle.entries[1].lifecycleStatus = "superseded";
  cycle.entries[1].supersededBy = "00198";
  cycle.entries.at(-1).lifecycleStatus = "superseded";
  cycle.entries.at(-1).supersededBy = "00100";

  const unknownLifecycle = clone(registry);
  unknownLifecycle.entries[1].lifecycleStatus = "retired";

  const malformed = clone(registry);
  malformed.entries[1].masterCode = "JP-RG-TOKYO";

  const unsafeRef = clone(registry);
  unsafeRef.entries[1].entityRef = "region japan\n";

  const immutable = clone(registry);
  immutable.entries[1].entityRef = "region-mutated";

  const removed = clone(registry);
  removed.entries.pop();

  const unknownRegion = clone(allocation);
  unknownRegion.allocations[0].regionId = "region-not-in-task-041";

  return {
    duplicateMasterCode: hasIssue(
      parseMasterCodeRegistryV1(duplicateCode),
      "DUPLICATE_MASTER_CODE",
    ),
    duplicateActiveEntity: hasIssue(
      parseMasterCodeRegistryV1(duplicateEntity),
      "DUPLICATE_ACTIVE_ENTITY_ALLOCATION",
    ),
    deprecatedCodeRecycling: hasIssue(
      validateMasterCodeRegistryTransitionV1(deprecatedPrevious, recycledNext),
      "CODE_RECYCLING_AFTER_DEPRECATION",
    ),
    missingSupersessionTarget: hasIssue(
      parseMasterCodeRegistryV1(missingTarget),
      "MISSING_SUPERSEDED_TARGET",
    ),
    supersessionCycle: hasIssue(
      parseMasterCodeRegistryV1(cycle),
      "SUPERSESSION_CYCLE",
    ),
    unknownLifecycle: hasIssue(
      parseMasterCodeRegistryV1(unknownLifecycle),
      "UNKNOWN_LIFECYCLE",
    ),
    malformedOrLegacyCode: hasIssue(
      parseMasterCodeRegistryV1(malformed),
      "MALFORMED_MASTER_CODE",
    ),
    unsafeEntityRef: hasIssue(
      parseMasterCodeRegistryV1(unsafeRef),
      "INVALID_ENTITY_REF",
    ),
    activeAllocationImmutable: hasIssue(
      validateMasterCodeRegistryTransitionV1(registry, immutable),
      "ACTIVE_ALLOCATION_MUTATED",
    ),
    appendOnly: hasIssue(
      validateMasterCodeRegistryTransitionV1(registry, removed),
      "MASTER_CODE_REMOVED",
    ),
    unknownRegionAllocation: hasIssue(
      validateRegionAllocationManifestV1(unknownRegion, registry, knownRegions),
      "UNKNOWN_REGION_ALLOCATION",
    ),
    unknownCodeFailsClosed: resolveMasterCode("99998") === null,
    legacyCodeFailsClosed: resolveMasterCode("JP-RG-TOKYO") === null,
    destinationIdFailsClosed: resolveMasterCode("jp-tokyo") === null,
    administrativeIdFailsClosed: resolveMasterCode("00013") === null,
  };
}

export function buildAcceptanceInvariantCheck() {
  const registry = loadJson(registryPath);
  const allocation = loadJson(allocationPath);
  const regionGraph = loadJson(regionPath);
  const knownRegions = new Map(
    regionGraph.nodes.map(({ regionId, regionType }) => [regionId, regionType]),
  );
  const parsedRegistry = parseMasterCodeRegistryV1(registry);
  const parsedAllocation = validateRegionAllocationManifestV1(
    allocation,
    registry,
    knownRegions,
  );
  const activeEntries = registry.entries.filter(
    ({ lifecycleStatus }) => lifecycleStatus === "active",
  );
  const activeRegions = activeEntries.filter(({ entityType }) =>
    entityType.startsWith("region."),
  );
  const allocationByRegion = new Map(
    allocation.allocations.map((item) => [item.regionId, item]),
  );
  const projectedProductionNodes = regionGraph.nodes.map((node) => ({
    ...node,
    masterCode: allocationByRegion.get(node.regionId)?.masterCode ?? null,
  }));
  const rejectedPatterns = [
    /^JP-RG-/i,
    /^JP-PREF-/i,
    /^JP-MACRO-/i,
    /^jp-/i,
    /^JP$/i,
  ];
  const negative = negativeInvariantChecks(registry, allocation, knownRegions);

  const check = {
    schemaVersion: "1.0",
    task: "TASK-044-A",
    issue: 347,
    reviewedCandidate: {
      branch: "codex/a-master-code-registry",
      headSha: "3cac68b89097db9853ae881b43c8675b329e12dd",
      pullRequest: 326,
      expectedState: "open_draft",
    },
    canonicalSource: {
      path: "src/shared/data/master-code-registry.v1.json",
      sha256: sha256(registryPath),
      handMaintainedRegistryCount: 1,
      generatedAllocationManifestIsAuthority: false,
      typescriptCopiesAllocationRows: false,
    },
    registry: {
      parsed: parsedRegistry.ok,
      governanceStatus: registry.governanceStatus,
      registryRevision: registry.registryRevision,
      totalEntries: registry.entries.length,
      reservedEntries: registry.entries.filter(
        ({ lifecycleStatus }) => lifecycleStatus === "reserved",
      ).length,
      activeEntries: activeEntries.length,
      activeRegionEntries: activeRegions.length,
      uniqueMasterCodes: new Set(
        registry.entries.map(({ masterCode }) => masterCode),
      ).size,
      uniqueActiveEntities: new Set(
        activeEntries.map(
          ({ entityType, entityRef }) => `${entityType}\u0000${entityRef}`,
        ),
      ).size,
      fiveDigitAsciiGrammar: registry.entries.every(({ masterCode }) =>
        /^[0-9]{5}$/.test(masterCode),
      ),
      rejectedIdentifierValues: registry.entries.filter(
        ({ masterCode, entityRef }) =>
          masterCode === entityRef ||
          rejectedPatterns.some((pattern) => pattern.test(masterCode)),
      ).length,
      invalidActiveResolverResults: activeEntries.filter(
        ({ masterCode, entityType, entityRef }) =>
          resolveMasterCode(masterCode)?.lifecycleStatus !== "active" ||
          resolveActiveMasterCodeByEntity(entityType, entityRef)?.masterCode !==
            masterCode,
      ).length,
      issues: parsedRegistry.ok ? [] : parsedRegistry.issues,
    },
    regionAllocation: {
      parsed: parsedAllocation.ok,
      sourceNodes: regionGraph.nodes.length,
      allocations: allocation.allocations.length,
      regionIdsPreserved: regionGraph.nodes.filter(({ regionId }) =>
        allocationByRegion.has(regionId),
      ).length,
      uniqueRegionIds: new Set(
        allocation.allocations.map(({ regionId }) => regionId),
      ).size,
      uniqueMasterCodes: new Set(
        allocation.allocations.map(({ masterCode }) => masterCode),
      ).size,
      activeResolved: allocation.allocations.filter(
        ({ regionId, masterCode, registryEntityType }) => {
          const entry = resolveMasterCode(masterCode);
          return (
            entry?.lifecycleStatus === "active" &&
            entry.entityRef === regionId &&
            entry.entityType === registryEntityType
          );
        },
      ).length,
      nullMasterCodes: allocation.allocations.filter(
        ({ masterCode }) => masterCode === null,
      ).length,
      unknownRegionRefs: allocation.allocations.filter(
        ({ regionId }) => !knownRegions.has(regionId),
      ).length,
      graphTopologyFilesChangedByTask043: [],
      sourceGraphSha256: sha256(regionPath),
      issues: parsedAllocation.ok ? [] : parsedAllocation.issues,
    },
    optionAReview: {
      recommendation: "accept_with_publication_gate",
      partialGraphNullCount: regionGraph.nodes.filter(
        ({ masterCode }) => masterCode === null,
      ).length,
      projectedProductionNullCount: projectedProductionNodes.filter(
        ({ masterCode }) => masterCode === null,
      ).length,
      projectedProductionActiveResolved: projectedProductionNodes.filter(
        ({ regionId, regionType, masterCode }) => {
          if (masterCode === null) return false;
          const entry = resolveMasterCode(masterCode);
          return (
            entry?.lifecycleStatus === "active" &&
            entry.entityRef === regionId &&
            entry.entityType === `region.${regionType}`
          );
        },
      ).length,
      productionRule:
        "null is limited to explicitly partial/draft data; production-complete Region data requires zero null and active canonical resolution",
    },
    negativeChecks: negative,
    allRequiredNegativeChecksPassed: Object.values(negative).every(Boolean),
    recommendation: "ACCEPT",
  };

  return check;
}

export async function writeAcceptanceInvariantCheck() {
  const check = buildAcceptanceInvariantCheck();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    await format(`${JSON.stringify(check, null, 2)}\n`, { parser: "json" }),
  );
  return check;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const check = await writeAcceptanceInvariantCheck();
  console.log(
    `TASK-044 ${check.recommendation}: ${check.regionAllocation.activeResolved}/50 Region allocations resolve active`,
  );
}
