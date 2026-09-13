import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format as formatWithPrettier } from "prettier";

import {
  masterCodeRegistry,
  resolveActiveMasterCodeByEntity,
  resolveMasterCode,
} from "../../src/shared/master-code/index.ts";
import { regionGraph, writePilotOutputs } from "./region-graph-pilot.mjs";

const TASK_ID = "TASK-045-A";
const ISSUE = 349;
const BASE_SHA = "166f996eab3d75fb5afabc4ad7cb9f3d265c54c1";
const BASELINE_TOPOLOGY_SHA256 =
  "38990d5e45e888f1b4ee94c5ca928bb972086544fcc4a20efa7380fef8308b5b";
const BASELINE_REGION_IDS_SHA256 =
  "d1adc642db617da3afd50cf6ada59acf09b6b5aeb5e29108fcbaf934b3817a6a";
const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/TASK-045",
);
const ALLOCATION_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../docs/qa/TASK-043/region-allocation-50.json",
);

const sha256 = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const expectedEntityType = (regionType) => `region.${regionType}`;

export function topologyProjection(graph) {
  return {
    nodes: graph.nodes.map((node) => {
      const topologyNode = { ...node };
      delete topologyNode.masterCode;
      return topologyNode;
    }),
    relations: graph.relations,
    travelEdges: graph.travelEdges,
  };
}

function rejectedIdentifierFamily(value) {
  if (/^JP-(?:RG|PREF|MACRO)-/.test(value)) return true;
  if (/^jp-/.test(value)) return true;
  if (value === "JP") return true;
  return !/^\d{5}$/.test(value);
}

export async function buildRegionMasterCodeIntegrationEvidence(
  graph = regionGraph,
) {
  const allocationManifest = JSON.parse(
    await readFile(ALLOCATION_PATH, "utf8"),
  );
  const regionIds = graph.nodes.map(({ regionId }) => regionId);
  const masterCodes = graph.nodes.map(({ masterCode }) => masterCode);
  const nonNullCodes = masterCodes.filter((value) => value !== null);
  const resolutionRows = graph.nodes.map((node) => {
    const byCode =
      node.masterCode === null ? null : resolveMasterCode(node.masterCode);
    const byEntity = resolveActiveMasterCodeByEntity(
      expectedEntityType(node.regionType),
      node.regionId,
    );
    return {
      regionId: node.regionId,
      masterCode: node.masterCode,
      activeResolved:
        byCode !== null &&
        byCode.lifecycleStatus === "active" &&
        byCode.entityType === expectedEntityType(node.regionType) &&
        byCode.entityRef === node.regionId &&
        byEntity?.masterCode === node.masterCode,
      lifecycleStatus: byCode?.lifecycleStatus ?? null,
    };
  });
  const allocationByRegion = new Map(
    allocationManifest.allocations.map((row) => [row.regionId, row]),
  );
  const allocationMismatches = graph.nodes.flatMap((node) => {
    const allocation = allocationByRegion.get(node.regionId);
    return allocation?.masterCode === node.masterCode
      ? []
      : [
          {
            regionId: node.regionId,
            graphMasterCode: node.masterCode,
            allocationMasterCode: allocation?.masterCode ?? null,
          },
        ];
  });
  const topologySha256 = sha256(topologyProjection(graph));
  const regionIdsSha256 = sha256(regionIds);
  const duplicateMasterCodes = nonNullCodes.length - new Set(nonNullCodes).size;
  const invalidLifecycleAllocations = resolutionRows.filter(
    ({ lifecycleStatus }) => lifecycleStatus !== "active",
  );
  const inactiveOrUnknownAllocations = resolutionRows.filter(
    ({ activeResolved }) => !activeResolved,
  );
  const rejectedIdentifiers = nonNullCodes.filter(rejectedIdentifierFamily);

  const evidence = {
    schemaVersion: "1.0",
    task: TASK_ID,
    issue: ISSUE,
    baseSha: BASE_SHA,
    graphDataRevision: graph.graphDataRevision,
    registryRevision: masterCodeRegistry.registryRevision,
    integrationSource: {
      authority: "src/shared/data/master-code-registry.v1.json",
      resolver: "resolveActiveMasterCodeByEntity",
      qaAllocationUsedAsRuntimeAuthority: false,
      allocationManifestCrossCheck:
        "docs/qa/TASK-043/region-allocation-50.json",
    },
    before: {
      regionCount: 50,
      nullMasterCodes: 50,
      populatedMasterCodes: 0,
      regionIdsSha256: BASELINE_REGION_IDS_SHA256,
      topologySha256: BASELINE_TOPOLOGY_SHA256,
    },
    after: {
      regionCount: graph.nodes.length,
      nullMasterCodes: masterCodes.filter((value) => value === null).length,
      populatedMasterCodes: nonNullCodes.length,
      regionIdsSha256,
      topologySha256,
    },
    identity: {
      preservedCount:
        regionIdsSha256 === BASELINE_REGION_IDS_SHA256 ? regionIds.length : 0,
      expectedCount: 50,
      orderPreserved: regionIdsSha256 === BASELINE_REGION_IDS_SHA256,
    },
    canonicalResolution: {
      activeResolvedCount: resolutionRows.filter(
        ({ activeResolved }) => activeResolved,
      ).length,
      expectedCount: 50,
      duplicateMasterCodes,
      invalidLifecycleCount: invalidLifecycleAllocations.length,
      unknownOrMismatchedCount: inactiveOrUnknownAllocations.length,
      rejectedIdentifierCount: rejectedIdentifiers.length,
      allocationManifestMismatchCount: allocationMismatches.length,
    },
    topology: {
      beforeSha256: BASELINE_TOPOLOGY_SHA256,
      afterSha256: topologySha256,
      semanticChangesExceptMasterCode:
        topologySha256 === BASELINE_TOPOLOGY_SHA256 ? 0 : 1,
      comparison:
        "SHA-256 over ordered nodes without masterCode plus complete relations and travelEdges",
    },
    issues: {
      invalidLifecycleAllocations,
      inactiveOrUnknownAllocations,
      rejectedIdentifiers,
      allocationMismatches,
    },
  };

  evidence.passed =
    evidence.after.regionCount === 50 &&
    evidence.identity.preservedCount === 50 &&
    evidence.after.populatedMasterCodes === 50 &&
    evidence.after.nullMasterCodes === 0 &&
    evidence.canonicalResolution.activeResolvedCount === 50 &&
    evidence.canonicalResolution.duplicateMasterCodes === 0 &&
    evidence.canonicalResolution.invalidLifecycleCount === 0 &&
    evidence.canonicalResolution.unknownOrMismatchedCount === 0 &&
    evidence.canonicalResolution.rejectedIdentifierCount === 0 &&
    evidence.canonicalResolution.allocationManifestMismatchCount === 0 &&
    evidence.topology.semanticChangesExceptMasterCode === 0;

  return evidence;
}

export function assertRegionMasterCodeIntegration(evidence) {
  if (!evidence.passed) {
    throw new Error(
      `TASK-045 integration gate failed: ${JSON.stringify(evidence.issues)}`,
    );
  }
  return evidence;
}

const json = (value) =>
  formatWithPrettier(JSON.stringify(value), { parser: "json" });

function report(evidence) {
  return `# TASK-045-A Region Master Code Integration Report

## Outcome

Completed / TASK-041 Region Master Code integration ready for human review.

## Integration source

Production Region nodes resolve their canonical Master Code directly through
\`resolveActiveMasterCodeByEntity\` from
\`src/shared/data/master-code-registry.v1.json\`. The TASK-043 allocation manifest
is used only as an independent evidence cross-check and is not a runtime authority.

## Before / after

| Gate | Before | After |
| --- | ---: | ---: |
| Region nodes | ${evidence.before.regionCount} | ${evidence.after.regionCount} |
| Populated canonical Master Codes | ${evidence.before.populatedMasterCodes} | ${evidence.after.populatedMasterCodes} |
| Null Master Codes | ${evidence.before.nullMasterCodes} | ${evidence.after.nullMasterCodes} |
| Active registry resolutions | 0 | ${evidence.canonicalResolution.activeResolvedCount} |

## Integrity

- Region IDs preserved: ${evidence.identity.preservedCount}/${evidence.identity.expectedCount}.
- Duplicate Master Codes: ${evidence.canonicalResolution.duplicateMasterCodes}.
- Invalid lifecycle allocations: ${evidence.canonicalResolution.invalidLifecycleCount}.
- Unknown or mismatched allocations: ${evidence.canonicalResolution.unknownOrMismatchedCount}.
- Rejected identifier families: ${evidence.canonicalResolution.rejectedIdentifierCount}.
- TASK-043 allocation cross-check mismatches: ${evidence.canonicalResolution.allocationManifestMismatchCount}.
- Graph topology semantic changes except \`masterCode\`: ${evidence.topology.semanticChangesExceptMasterCode}.

The shared \`masterCode: string | null\` contract remains available for explicit
Partial/draft data. This production-complete graph has zero null values.

## Scope boundary

No Region ID, relation, TravelEdge, variant, ordering, name, alias, geometry,
gateway metadata, evidence reference, Planner/Step UI, database schema, POI
allocation, or Candidate Pipeline behavior was changed.
`;
}

export async function writeRegionMasterCodeIntegrationOutputs() {
  await writePilotOutputs();
  const evidence = assertRegionMasterCodeIntegration(
    await buildRegionMasterCodeIntegrationEvidence(),
  );
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(OUTPUT_DIR, "region-master-code-integration.json"),
      await json(evidence),
    ),
    writeFile(
      resolve(OUTPUT_DIR, "region-master-code-integration-report.md"),
      await formatWithPrettier(report(evidence), { parser: "markdown" }),
    ),
  ]);
  return evidence;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const evidence = await writeRegionMasterCodeIntegrationOutputs();
  console.log(
    `${TASK_ID} PASS: ${evidence.after.populatedMasterCodes}/50 canonical Master Codes, ${evidence.after.nullMasterCodes} null`,
  );
}
