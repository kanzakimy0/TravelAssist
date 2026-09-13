import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { format } from "prettier";

import { parseTravelRegionGraphV1 } from "../../src/shared/contracts/planning/index.ts";
import {
  masterCodeRegistry,
  parseMasterCodeRegistryV1,
  resolveActiveMasterCodeByEntity,
  resolveMasterCode,
} from "../../src/shared/master-code/index.ts";
import { regionGraph as generatedRegionGraph } from "./region-graph-pilot.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputDirectory = resolve(projectRoot, "docs/qa/TASK-046");

export const REVIEWED_HEAD = "3281a072e976e747256a0e73cbd2692f9a9915f7";
export const PRE_INTEGRATION_HEAD = "166f996eab3d75fb5afabc4ad7cb9f3d265c54c1";
export const CANDIDATE_BASE = "3559afad2edfcfdda766942652a9b5090b75369c";
export const REGISTRY_MERGE = "24d5718e47fa1a7f9996a3717c4bd35c7ab89db0";

const paths = {
  nodes: "docs/qa/TASK-041/region-nodes.json",
  relations: "docs/qa/TASK-041/region-relations.json",
  edges: "docs/qa/TASK-041/travel-edges.json",
  generator: "tools/qa/region-graph-pilot.mjs",
  registryRuntime: "src/shared/master-code/registry.ts",
  registryData: "src/shared/data/master-code-registry.v1.json",
  regionContract: "src/shared/contracts/planning/regions.ts",
};

const readText = (path) => readFileSync(resolve(projectRoot, path), "utf8");
const readJson = (path) => JSON.parse(readText(path));
const git = (...args) =>
  execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
const gitShow = (revision, path) =>
  execFileSync("git", ["show", `${revision}:${path}`], {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  });
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function assembleGraph(nodesDocument, relationsDocument, edgesDocument) {
  return {
    contractVersion: "1.0",
    graphSchemaVersion: "1.0",
    graphDataRevision: nodesDocument.graphDataRevision,
    nodes: nodesDocument.nodes,
    relations: relationsDocument.relations,
    travelEdges: edgesDocument.travelEdges,
  };
}

function loadCurrentGraph() {
  return assembleGraph(
    readJson(paths.nodes),
    readJson(paths.relations),
    readJson(paths.edges),
  );
}

function loadHistoricalGraph(revision = PRE_INTEGRATION_HEAD) {
  return assembleGraph(
    JSON.parse(gitShow(revision, paths.nodes)),
    JSON.parse(gitShow(revision, paths.relations)),
    JSON.parse(gitShow(revision, paths.edges)),
  );
}

function topologyProjection(graph) {
  return {
    contractVersion: graph.contractVersion,
    graphSchemaVersion: graph.graphSchemaVersion,
    graphDataRevision: graph.graphDataRevision,
    nodes: graph.nodes.map((node) => {
      const projected = { ...node };
      delete projected.masterCode;
      return projected;
    }),
    relations: graph.relations,
    travelEdges: graph.travelEdges,
  };
}

const entityTypeFor = (regionType) => `region.${regionType}`;
const isRejectedSideChannel = (node) =>
  node.masterCode === node.regionId ||
  /^JP-(?:RG|PREF|MACRO)-/i.test(node.masterCode ?? "") ||
  /^jp-/i.test(node.masterCode ?? "") ||
  node.masterCode === "JP" ||
  (node.masterCode !== null && !/^[0-9]{5}$/.test(node.masterCode));

function defaultInputs() {
  return {
    currentGraph: loadCurrentGraph(),
    historicalGraph: loadHistoricalGraph(),
    generatedGraph: generatedRegionGraph,
    generatorSource: readText(paths.generator),
    registryRuntimeSource: readText(paths.registryRuntime),
    currentRegionContract: readText(paths.regionContract),
    historicalRegionContract: gitShow(
      PRE_INTEGRATION_HEAD,
      paths.regionContract,
    ),
    candidateChangedFiles: git(
      "diff",
      "--name-only",
      CANDIDATE_BASE,
      REVIEWED_HEAD,
    )
      .split(/\r?\n/)
      .filter(Boolean),
    canonicalRegistryFiles: git(
      "ls-files",
      "src/shared/data/*master-code-registry*.json",
    )
      .split(/\r?\n/)
      .filter(Boolean),
  };
}

export function buildRegionMasterCodeAcceptanceCheck(overrides = {}) {
  const input = { ...defaultInputs(), ...overrides };
  const current = input.currentGraph;
  const historical = input.historicalGraph;
  const currentCodes = current.nodes.map(({ masterCode }) => masterCode);
  const populatedCodes = currentCodes.filter((code) => code !== null);
  const historicalIds = historical.nodes.map(({ regionId }) => regionId);
  const currentIds = current.nodes.map(({ regionId }) => regionId);
  const resolutionRows = current.nodes.map((node) => {
    const byCode =
      node.masterCode === null ? null : resolveMasterCode(node.masterCode);
    const byEntity = resolveActiveMasterCodeByEntity(
      entityTypeFor(node.regionType),
      node.regionId,
    );
    return {
      regionId: node.regionId,
      masterCode: node.masterCode,
      lifecycleStatus: byCode?.lifecycleStatus ?? null,
      activeResolved:
        byCode?.lifecycleStatus === "active" &&
        byCode.entityType === entityTypeFor(node.regionType) &&
        byCode.entityRef === node.regionId &&
        byEntity?.masterCode === node.masterCode,
    };
  });
  const currentTopology = topologyProjection(current);
  const historicalTopology = topologyProjection(historical);
  const graphParser = parseTravelRegionGraphV1(current);
  const registryParser = parseMasterCodeRegistryV1(masterCodeRegistry);
  const changedFiles = input.candidateChangedFiles;
  const uiChanges = changedFiles.filter(
    (path) =>
      path.startsWith("src/features/planner/") ||
      path.startsWith("src/features/start-flow/") ||
      path === "src/app/planner/page.tsx" ||
      path === "src/app/start/page.tsx",
  );
  const databaseChanges = changedFiles.filter(
    (path) =>
      path.startsWith("supabase/migrations/") ||
      path.startsWith("src/db/") ||
      path.includes("database.generated"),
  );
  const candidatePipelineChanges = changedFiles.filter((path) =>
    /candidate[-_/ ]pipeline|TASK-047/i.test(path),
  );
  const generatorUsesCanonicalResolver =
    input.generatorSource.includes("../../src/shared/master-code/index.ts") &&
    input.generatorSource.includes("resolveActiveMasterCodeByEntity") &&
    input.generatorSource.includes("requiredActiveMasterCode") &&
    input.generatorSource.includes(
      "Missing active canonical Master Code allocation",
    );
  const generatorUsesQaAuthority =
    /region-allocation-50\.json|docs\/qa\/TASK-043|docs\/qa\/TASK-045/.test(
      input.generatorSource,
    );
  const runtimeLoadsCanonicalJson =
    input.registryRuntimeSource.includes(
      'import registryData from "../data/master-code-registry.v1.json"',
    ) && input.registryRuntimeSource.includes("parseMasterCodeRegistryV1");
  const generatedMatchesCommitted =
    hash(input.generatedGraph) === hash(input.currentGraph);
  const currentTopologyHash = hash(currentTopology);
  const historicalTopologyHash = hash(historicalTopology);

  const check = {
    schemaVersion: "1.0",
    task: "TASK-046-A",
    issue: 365,
    recommendation: "ACCEPT",
    reviewedCandidate: {
      pullRequest: 352,
      branch: "codex/a-task-041-master-code-integration",
      headSha: REVIEWED_HEAD,
      baseSha: CANDIDATE_BASE,
      preIntegrationHead: PRE_INTEGRATION_HEAD,
      registryMerge: REGISTRY_MERGE,
    },
    independentMethod: {
      task045ResultUsedAsEvidence: false,
      task045QaEvidenceUsedAsEvidence: false,
      historicalGraphLoadedFromGitObject: PRE_INTEGRATION_HEAD,
      currentGraphLoadedFromProductionOutput: paths.nodes,
      registryLoadedThroughRuntime: paths.registryData,
    },
    graph: {
      parsed: graphParser.ok,
      regionCount: current.nodes.length,
      historicalRegionCount: historical.nodes.length,
      regionIdsPreserved: currentIds.filter(
        (regionId, index) => historicalIds[index] === regionId,
      ).length,
      regionIdOrderPreserved:
        JSON.stringify(currentIds) === JSON.stringify(historicalIds),
      populatedMasterCodes: populatedCodes.length,
      nullMasterCodes: currentCodes.filter((code) => code === null).length,
      duplicateMasterCodes:
        populatedCodes.length - new Set(populatedCodes).size,
      activeRegistryResolutions: resolutionRows.filter(
        ({ activeResolved }) => activeResolved,
      ).length,
      invalidLifecycleAllocations: resolutionRows.filter(
        ({ lifecycleStatus }) => lifecycleStatus !== "active",
      ).length,
      unknownOrMismatchedAllocations: resolutionRows.filter(
        ({ activeResolved }) => !activeResolved,
      ).length,
      legacyOrSideChannelSubstitutions: current.nodes.filter(
        isRejectedSideChannel,
      ).length,
      generatedMatchesCommitted,
      parserIssues: graphParser.ok ? [] : graphParser.issues,
      resolutionIssues: resolutionRows.filter(
        ({ activeResolved }) => !activeResolved,
      ),
    },
    topology: {
      historicalSha256: historicalTopologyHash,
      currentSha256: currentTopologyHash,
      semanticChangesExcludingMasterCode:
        historicalTopologyHash === currentTopologyHash ? 0 : 1,
      regionTaxonomyContractChanged:
        input.currentRegionContract !== input.historicalRegionContract,
      relationsChanged:
        JSON.stringify(current.relations) !==
        JSON.stringify(historical.relations),
      travelEdgesOrVariantsChanged:
        JSON.stringify(current.travelEdges) !==
        JSON.stringify(historical.travelEdges),
    },
    authority: {
      canonicalRegistryPath: paths.registryData,
      canonicalRegistryParsed: registryParser.ok,
      canonicalRegistryFileCount: input.canonicalRegistryFiles.length,
      canonicalRegistryFiles: input.canonicalRegistryFiles,
      generatorUsesCanonicalResolver,
      generatorUsesQaManifestAsRuntimeAuthority: generatorUsesQaAuthority,
      registryRuntimeLoadsCanonicalJson: runtimeLoadsCanonicalJson,
      failClosedWhenAllocationMissing: input.generatorSource.includes(
        "Missing active canonical Master Code allocation",
      ),
      registryIssues: registryParser.ok ? [] : registryParser.issues,
    },
    nullableBoundary: {
      sharedContractRemainsNullable: input.currentRegionContract.includes(
        "masterCode: string | null;",
      ),
      sharedContractChangedByIntegration:
        input.currentRegionContract !== input.historicalRegionContract,
      historicalPartialNullCount: historical.nodes.filter(
        ({ masterCode }) => masterCode === null,
      ).length,
      productionCompleteNullCount: current.nodes.filter(
        ({ masterCode }) => masterCode === null,
      ).length,
      productionGeneratorFailsClosedWhenUnallocated:
        input.generatorSource.includes(
          "Missing active canonical Master Code allocation",
        ),
    },
    scope: {
      candidateChangedFiles: changedFiles,
      plannerOrStepUiChanges: uiChanges,
      databaseSchemaOrMigrationChanges: databaseChanges,
      candidatePipelineChanges,
      poiProductionAllocationChanges: changedFiles.filter((path) =>
        /poi.*allocation|allocation.*poi/i.test(path),
      ),
    },
  };

  const accepted =
    check.graph.parsed &&
    check.graph.regionCount === 50 &&
    check.graph.historicalRegionCount === 50 &&
    check.graph.regionIdsPreserved === 50 &&
    check.graph.regionIdOrderPreserved &&
    check.graph.populatedMasterCodes === 50 &&
    check.graph.nullMasterCodes === 0 &&
    check.graph.duplicateMasterCodes === 0 &&
    check.graph.activeRegistryResolutions === 50 &&
    check.graph.invalidLifecycleAllocations === 0 &&
    check.graph.unknownOrMismatchedAllocations === 0 &&
    check.graph.legacyOrSideChannelSubstitutions === 0 &&
    check.graph.generatedMatchesCommitted &&
    check.topology.semanticChangesExcludingMasterCode === 0 &&
    !check.topology.regionTaxonomyContractChanged &&
    !check.topology.relationsChanged &&
    !check.topology.travelEdgesOrVariantsChanged &&
    check.authority.canonicalRegistryParsed &&
    check.authority.canonicalRegistryFileCount === 1 &&
    check.authority.generatorUsesCanonicalResolver &&
    !check.authority.generatorUsesQaManifestAsRuntimeAuthority &&
    check.authority.registryRuntimeLoadsCanonicalJson &&
    check.authority.failClosedWhenAllocationMissing &&
    check.nullableBoundary.sharedContractRemainsNullable &&
    !check.nullableBoundary.sharedContractChangedByIntegration &&
    check.nullableBoundary.historicalPartialNullCount === 50 &&
    check.nullableBoundary.productionCompleteNullCount === 0 &&
    check.nullableBoundary.productionGeneratorFailsClosedWhenUnallocated &&
    check.scope.plannerOrStepUiChanges.length === 0 &&
    check.scope.databaseSchemaOrMigrationChanges.length === 0 &&
    check.scope.candidatePipelineChanges.length === 0 &&
    check.scope.poiProductionAllocationChanges.length === 0;

  check.recommendation = accepted ? "ACCEPT" : "REJECT";
  check.passed = accepted;
  return check;
}

function report(check) {
  return `# TASK-046-A Region Master Code Integration Acceptance Report

## Recommendation

${check.recommendation}

## Independent method

The review loaded the pre-integration graph directly from Git object
\`${check.reviewedCandidate.preIntegrationHead}\` and compared it with the
production graph at reviewed PR head
\`${check.reviewedCandidate.headSha}\`. TASK-045 Result and TASK-045 QA evidence
were not used as proof.

## Acceptance gates

| Gate | Result |
| --- | ---: |
| Region nodes | ${check.graph.regionCount} |
| Region IDs preserved | ${check.graph.regionIdsPreserved}/50 |
| Canonical Master Codes populated | ${check.graph.populatedMasterCodes}/50 |
| Production null Master Codes | ${check.graph.nullMasterCodes} |
| Active registry resolution | ${check.graph.activeRegistryResolutions}/50 |
| Duplicate Master Codes | ${check.graph.duplicateMasterCodes} |
| Invalid lifecycle allocations | ${check.graph.invalidLifecycleAllocations} |
| Unknown/mismatched allocations | ${check.graph.unknownOrMismatchedAllocations} |
| Legacy/side-channel substitutions | ${check.graph.legacyOrSideChannelSubstitutions} |
| Semantic topology changes excluding Master Code | ${check.topology.semanticChangesExcludingMasterCode} |

## Authority and boundaries

- Runtime authority: \`${check.authority.canonicalRegistryPath}\`.
- Generator uses the canonical entity resolver: ${check.authority.generatorUsesCanonicalResolver}.
- Generator uses TASK-043/TASK-045 QA data as runtime authority: ${check.authority.generatorUsesQaManifestAsRuntimeAuthority}.
- Shared nullable contract changed: ${check.nullableBoundary.sharedContractChangedByIntegration}.
- Production-complete graph null count: ${check.nullableBoundary.productionCompleteNullCount}.
- Region taxonomy changed: ${check.topology.regionTaxonomyContractChanged}.
- Relations changed: ${check.topology.relationsChanged}.
- TravelEdge/TravelEdgeVariant changed: ${check.topology.travelEdgesOrVariantsChanged}.
- Planner/Step UI changed: ${check.scope.plannerOrStepUiChanges.length > 0}.
- DB schema/migration changed: ${check.scope.databaseSchemaOrMigrationChanges.length > 0}.
- Candidate Pipeline changed: ${check.scope.candidatePipelineChanges.length > 0}.

## Decision

${check.passed ? "All independent acceptance gates pass." : "One or more independent acceptance gates failed."}
`;
}

export async function writeRegionMasterCodeAcceptanceOutputs() {
  const check = buildRegionMasterCodeAcceptanceCheck();
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, "acceptance-check.json"),
    await format(`${JSON.stringify(check, null, 2)}\n`, { parser: "json" }),
  );
  writeFileSync(
    resolve(outputDirectory, "acceptance-report.md"),
    await format(report(check), { parser: "markdown" }),
  );
  return check;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const check = await writeRegionMasterCodeAcceptanceOutputs();
  console.log(
    `TASK-046-A ${check.recommendation}: ${check.graph.activeRegistryResolutions}/50 active canonical allocations`,
  );
  if (!check.passed) process.exitCode = 1;
}
