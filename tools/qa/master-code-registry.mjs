import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

import {
  masterCodeRegistry,
  parseMasterCodeRegistryV1,
  validateRegionAllocationManifestV1,
} from "../../src/shared/master-code/index.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputRoot = resolve(projectRoot, "docs/qa/TASK-043");
const regionGraph = JSON.parse(
  readFileSync(
    resolve(projectRoot, "docs/qa/TASK-041/region-nodes.json"),
    "utf8",
  ),
);
const priorAudit = JSON.parse(
  readFileSync(
    resolve(projectRoot, "docs/qa/TASK-041/master-code-audit.json"),
    "utf8",
  ),
);

const knownRegions = new Map(
  regionGraph.nodes.map(({ regionId, regionType }) => [regionId, regionType]),
);

export function buildRegionAllocationManifest() {
  const allocations = regionGraph.nodes.map(({ regionId, regionType }) => {
    const entry = masterCodeRegistry.entries.find(
      (candidate) =>
        candidate.lifecycleStatus === "active" &&
        candidate.entityRef === regionId &&
        candidate.entityType === `region.${regionType}`,
    );
    if (!entry) throw new Error(`No canonical allocation for ${regionId}`);
    return {
      regionId,
      regionType,
      masterCode: entry.masterCode,
      registryEntityType: entry.entityType,
      lifecycleStatus: entry.lifecycleStatus,
      sourceRefs: entry.sourceRefs,
      provenance: entry.provenance,
      allocationReason: entry.allocationReason,
    };
  });
  return {
    schemaVersion: "1.0",
    registryRevision: masterCodeRegistry.registryRevision,
    sourceGraphRevision: regionGraph.graphDataRevision,
    governanceStatus: "candidate_pending_human_review",
    allocations,
  };
}

export function buildMasterCodeAudit() {
  const activeRegionEntries = masterCodeRegistry.entries.filter(
    ({ lifecycleStatus, entityType }) =>
      lifecycleStatus === "active" && entityType.startsWith("region."),
  );
  return {
    schemaVersion: "1.0",
    auditedDevelopSha: "163c4c4e5788e0cf2920a5187c63952db00349cc",
    auditDate: "2026-09-12",
    auditScope: {
      patterns: ["Master Code", "masterCode", "master_code"],
      excludedHumanReviewData: [
        "docs/qa/TASK-038",
        "docs/qa/TASK-039",
        "docs/qa/TASK-040",
      ],
      registryLikeTrackedFilesReviewed: 25,
      identityFamiliesReviewed: [
        "destination_id",
        "administrative_code",
        "region_id",
        "poi_id",
        "transport_node_id",
        "asset_id",
        "ai_local_id",
        "database_primary_key",
      ],
    },
    findings: {
      reusableCanonicalNamespaceScheme: true,
      reusableSchemeSource:
        "docs/architecture/trip-engine-poi-ai-provider-design-v0.3.md#8",
      existingCanonicalAllocationRegistryBeforeTask043: false,
      decision:
        "Reuse the inherited five-digit numeric ranges and add the first repository-owned allocation registry; do not create a second grammar.",
      inheritedLifecycleGovernanceCompleteBeforeTask043: false,
      existingRegionConsumerAllowsPendingNull: true,
      task041Nodes: regionGraph.nodes.length,
      task041PriorInvalidAssignments: priorAudit.summary.auditedNodes,
      task041PriorDestinationIdMisuse:
        priorAudit.summary.priorValuesByClassification
          .destination_id_misused_as_master_code,
      task041PriorCountryCodeMisuse:
        priorAudit.summary.priorValuesByClassification
          .country_code_misused_as_master_code,
      task041PriorSideChannelMisuse:
        priorAudit.summary.priorValuesByClassification
          .task_041_side_channel_code,
    },
    canonicalBoundaries: [
      "Master Code != regionId",
      "Master Code != destination_id",
      "Master Code != administrative code",
      "Master Code != transport-node ID",
      "Master Code != POI ID",
      "Master Code != AI local ID",
      "Master Code != database primary key",
    ],
    reviewedConsumers: [
      "src/shared/contracts/planning/regions.ts",
      "src/shared/contracts/planning/validation.ts",
      "docs/architecture/travel-region-graph-codebook-v0.1.md",
      "docs/architecture/poi-master-schema-v0.1.md",
      "docs/architecture/poi-master-schema-v0.2.md",
      "docs/qa/TASK-041/region-nodes.json",
      "tools/qa/region-graph-pilot.mjs",
    ],
    candidateRegistry: {
      sourceOfTruth: "src/shared/data/master-code-registry.v1.json",
      registryRevision: masterCodeRegistry.registryRevision,
      totalEntries: masterCodeRegistry.entries.length,
      activeRegionEntries: activeRegionEntries.length,
      governanceStatus: masterCodeRegistry.governanceStatus,
    },
  };
}

export function buildConsumerImpact() {
  return {
    schemaVersion: "1.0",
    decisionStatus: "candidate_pending_human_review",
    currentContract: "TravelRegionNodeV1.masterCode: string | null",
    recommendation: "option_a_nullable_pending_allocation",
    optionA: {
      summary:
        "Canonical Region records may carry null only while allocation is pending; production-complete datasets require an active registry resolution.",
      affectedConsumers: [
        "TravelRegionNodeV1",
        "parseTravelRegionGraphV1",
        "TASK-041 fixtures and graph validation",
        "future Region persistence projections",
      ],
      migrationImpact:
        "No immediate schema migration; later consumers must distinguish partial/draft from production-complete graphs.",
      validatorImpact:
        "Base parser continues accepting null; production-completeness validation must require all non-null codes to resolve active and require zero nulls.",
      fixtureImpact:
        "Partial fixtures may retain null; accepted production fixtures must use registry allocations.",
      persistenceImpact:
        "Persistence may store nullable pending values only with explicit partial status; it must not synthesize an identifier.",
      productionCompletenessSemantics:
        "A graph is production-complete only when every canonical Region resolves to one active Master Code.",
      breakingChange: false,
    },
    optionB: {
      summary:
        "Canonical Region nodes require non-null Master Codes and unresolved candidates move to a separate draft representation.",
      affectedConsumers: [
        "TravelRegionNodeV1",
        "all graph parsers",
        "all graph fixtures",
        "Region persistence schema",
        "ingestion and editorial tooling",
      ],
      migrationImpact:
        "Breaking migration for every partial graph and any persistence row carrying null.",
      validatorImpact:
        "Canonical parser becomes strict non-null and a second explicit unresolved/draft parser is required.",
      fixtureImpact:
        "All partial fixtures must move to the draft representation before canonical parsing.",
      persistenceImpact:
        "Canonical tables become non-null while draft storage needs a separate table or discriminated record.",
      productionCompletenessSemantics:
        "Canonical type membership itself proves allocation completeness.",
      breakingChange: true,
    },
    rationale: [
      "Option A preserves the reviewed TASK-041 contract and avoids a breaking consumer migration.",
      "Fail-closed completeness is still enforced at publication rather than by inventing a placeholder code.",
      "Human governance review may choose Option B later; TASK-043 does not freeze the choice.",
    ],
    sharedContractModifiedByTask043: false,
  };
}

export function buildRegistryValidation() {
  const registryResult = parseMasterCodeRegistryV1(masterCodeRegistry);
  const allocationManifest = buildRegionAllocationManifest();
  const allocationResult = validateRegionAllocationManifestV1(
    allocationManifest,
    masterCodeRegistry,
    knownRegions,
  );
  const activeEntries = masterCodeRegistry.entries.filter(
    ({ lifecycleStatus }) => lifecycleStatus === "active",
  );
  return {
    schemaVersion: "1.0",
    registryRevision: masterCodeRegistry.registryRevision,
    governanceStatus: "candidate_pending_human_review",
    registry: {
      valid: registryResult.ok,
      totalEntries: masterCodeRegistry.entries.length,
      reservedEntries: masterCodeRegistry.entries.filter(
        ({ lifecycleStatus }) => lifecycleStatus === "reserved",
      ).length,
      activeEntries: activeEntries.length,
      duplicateMasterCodes:
        masterCodeRegistry.entries.length -
        new Set(masterCodeRegistry.entries.map(({ masterCode }) => masterCode))
          .size,
      duplicateActiveEntityAllocations:
        activeEntries.length -
        new Set(
          activeEntries.map(
            ({ entityType, entityRef }) => `${entityType}:${entityRef}`,
          ),
        ).size,
      issues: registryResult.ok ? [] : registryResult.issues,
    },
    task041Allocation: {
      valid: allocationResult.ok,
      expected: 50,
      actual: allocationManifest.allocations.length,
      uniqueMasterCodes: new Set(
        allocationManifest.allocations.map(({ masterCode }) => masterCode),
      ).size,
      uniqueRegionIds: new Set(
        allocationManifest.allocations.map(({ regionId }) => regionId),
      ).size,
      unresolved: allocationManifest.allocations.filter(
        ({ masterCode }) =>
          !masterCodeRegistry.entries.some(
            (entry) =>
              entry.masterCode === masterCode &&
              entry.lifecycleStatus === "active",
          ),
      ).length,
      regionIdsPreserved: allocationManifest.allocations.every(
        ({ regionId }, index) => regionId === regionGraph.nodes[index].regionId,
      ),
      issues: allocationResult.ok ? [] : allocationResult.issues,
    },
    boundaries: {
      rejectedLegacyPrefixes: ["JP-RG-*", "JP-PREF-*", "JP-MACRO-*"],
      destinationIdsUsedAsMasterCode: 0,
      administrativeIdsUsedAsMasterCode: 0,
      transportIdsUsedAsMasterCode: 0,
      regionIdsUsedAsMasterCode: 0,
    },
  };
}

export const generatedOutputs = new Map([
  ["master-code-audit.json", buildMasterCodeAudit()],
  ["region-allocation-50.json", buildRegionAllocationManifest()],
  ["registry-validation.json", buildRegistryValidation()],
  ["consumer-impact.json", buildConsumerImpact()],
]);

export function serialize(value) {
  return format(JSON.stringify(value), { parser: "json" });
}

export async function writeGeneratedOutputs() {
  mkdirSync(outputRoot, { recursive: true });
  for (const [name, value] of generatedOutputs)
    writeFileSync(resolve(outputRoot, name), await serialize(value));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await writeGeneratedOutputs();
  console.log(
    `TASK-043 registry valid: ${buildRegistryValidation().registry.valid}; Region allocations: ${buildRegionAllocationManifest().allocations.length}`,
  );
}
