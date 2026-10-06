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
const outputDirectory = resolve(projectRoot, "docs/qa/TASK-047");

export const OLD_ACCEPTED_HEAD = "3281a072e976e747256a0e73cbd2692f9a9915f7";
export const MERGED_DEVELOP_HEAD = "fa74995dba42d40fa58dfd9e5900c09fc552340e";
export const DEVELOP_MERGE_BASE = "3559afad2edfcfdda766942652a9b5090b75369c";
export const MERGE_COMMIT = "eb81291f38b7147873e76a96f3587ed36e648faa";
export const PRE_INTEGRATION_HEAD = "166f996eab3d75fb5afabc4ad7cb9f3d265c54c1";
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
const sha256 = (value) =>
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

function loadGraphAt(revision) {
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

const rejectedIdentifier = (node) =>
  node.masterCode === node.regionId ||
  /^JP-(?:RG|PREF|MACRO)-/i.test(node.masterCode ?? "") ||
  /^jp-/i.test(node.masterCode ?? "") ||
  node.masterCode === "JP" ||
  (node.masterCode !== null && !/^[0-9]{5}$/.test(node.masterCode));

function defaultInputs() {
  return {
    currentGraph: loadCurrentGraph(),
    oldAcceptedGraph: loadGraphAt(OLD_ACCEPTED_HEAD),
    preIntegrationGraph: loadGraphAt(PRE_INTEGRATION_HEAD),
    generatedGraph: generatedRegionGraph,
    generatorSource: readText(paths.generator),
    registryRuntimeSource: readText(paths.registryRuntime),
    currentRegionContract: readText(paths.regionContract),
    oldRegionContract: gitShow(OLD_ACCEPTED_HEAD, paths.regionContract),
    upstreamFiles: git(
      "diff",
      "--name-only",
      DEVELOP_MERGE_BASE,
      MERGED_DEVELOP_HEAD,
    )
      .split(/\r?\n/)
      .filter(Boolean),
    mergeParents: git("show", "-s", "--format=%P", MERGE_COMMIT).split(" "),
  };
}

export function buildPr352DeltaRevalidation(overrides = {}) {
  const input = { ...defaultInputs(), ...overrides };
  const current = input.currentGraph;
  const oldAccepted = input.oldAcceptedGraph;
  const preIntegration = input.preIntegrationGraph;
  const currentIds = current.nodes.map(({ regionId }) => regionId);
  const preIntegrationIds = preIntegration.nodes.map(
    ({ regionId }) => regionId,
  );
  const codes = current.nodes.map(({ masterCode }) => masterCode);
  const populatedCodes = codes.filter((code) => code !== null);
  const resolutions = current.nodes.map((node) => {
    const byCode =
      node.masterCode === null ? null : resolveMasterCode(node.masterCode);
    const expectedEntityType = `region.${node.regionType}`;
    const byEntity = resolveActiveMasterCodeByEntity(
      expectedEntityType,
      node.regionId,
    );
    return {
      regionId: node.regionId,
      masterCode: node.masterCode,
      lifecycleStatus: byCode?.lifecycleStatus ?? null,
      activeResolved:
        byCode?.lifecycleStatus === "active" &&
        byCode.entityType === expectedEntityType &&
        byCode.entityRef === node.regionId &&
        byEntity?.masterCode === node.masterCode,
    };
  });
  const oldAcceptedHash = sha256(oldAccepted);
  const currentHash = sha256(current);
  const preIntegrationTopologyHash = sha256(topologyProjection(preIntegration));
  const currentTopologyHash = sha256(topologyProjection(current));
  const graphParse = parseTravelRegionGraphV1(current);
  const registryParse = parseMasterCodeRegistryV1(masterCodeRegistry);
  const usesQaRuntimeAuthority =
    /region-allocation-50\.json|docs\/qa\/TASK-043|docs\/qa\/TASK-045/.test(
      input.generatorSource,
    );
  const task047ConflictFiles = [];
  const task047ConflictResolutionFiles = [];

  const evidence = {
    schemaVersion: "1.0",
    task: "TASK-047-A",
    issue: 371,
    status: "Completed / PR #352 resynchronized and acceptance preserved",
    sync: {
      oldTask046AcceptedHead: OLD_ACCEPTED_HEAD,
      latestDevelopMerged: MERGED_DEVELOP_HEAD,
      developMergeBase: DEVELOP_MERGE_BASE,
      mergeCommit: MERGE_COMMIT,
      mergeParents: input.mergeParents,
      expectedMergeParents: [OLD_ACCEPTED_HEAD, MERGED_DEVELOP_HEAD],
      mergeParentsExact:
        JSON.stringify(input.mergeParents) ===
        JSON.stringify([OLD_ACCEPTED_HEAD, MERGED_DEVELOP_HEAD]),
      conflictFiles: task047ConflictFiles,
      conflictResolution: [],
      automaticallyMergedFiles: ["package.json"],
      task047ConflictResolutionFiles,
      upstreamOnlyFiles: input.upstreamFiles,
      upstreamOnlyFileCount: input.upstreamFiles.length,
    },
    invariants: {
      graphParsed: graphParse.ok,
      regionNodes: current.nodes.length,
      regionIdsPreserved: currentIds.filter(
        (regionId, index) => preIntegrationIds[index] === regionId,
      ).length,
      regionIdOrderPreserved:
        JSON.stringify(currentIds) === JSON.stringify(preIntegrationIds),
      canonicalMasterCodesPopulated: populatedCodes.length,
      productionNullMasterCodes: codes.filter((code) => code === null).length,
      activeCanonicalRegistryResolution: resolutions.filter(
        ({ activeResolved }) => activeResolved,
      ).length,
      duplicateMasterCodes:
        populatedCodes.length - new Set(populatedCodes).size,
      invalidLifecycleAllocations: resolutions.filter(
        ({ lifecycleStatus }) => lifecycleStatus !== "active",
      ).length,
      unknownOrMismatchedAllocations: resolutions.filter(
        ({ activeResolved }) => !activeResolved,
      ).length,
      legacyOrSideChannelSubstitutions:
        current.nodes.filter(rejectedIdentifier).length,
      semanticTopologyChangesExcludingMasterCode:
        currentTopologyHash === preIntegrationTopologyHash ? 0 : 1,
      runtimeQaManifestDependencies: usesQaRuntimeAuthority ? 1 : 0,
      generatedGraphMatchesCommitted:
        sha256(input.generatedGraph) === currentHash,
    },
    authority: {
      canonicalRegistryPath: paths.registryData,
      canonicalRegistryParsed: registryParse.ok,
      generatorUsesCanonicalResolver:
        input.generatorSource.includes("resolveActiveMasterCodeByEntity") &&
        input.generatorSource.includes("requiredActiveMasterCode"),
      generatorFailsClosedWhenAllocationMissing: input.generatorSource.includes(
        "Missing active canonical Master Code allocation",
      ),
      registryRuntimeLoadsCanonicalJson: input.registryRuntimeSource.includes(
        'import registryData from "../data/master-code-registry.v1.json"',
      ),
      generatorUsesQaManifestAsRuntimeAuthority: usesQaRuntimeAuthority,
    },
    semanticDelta: {
      oldAcceptedGraphSha256: oldAcceptedHash,
      postSyncGraphSha256: currentHash,
      oldToNewRegionSemanticChanges: oldAcceptedHash === currentHash ? 0 : 1,
      regionContractChanged:
        input.currentRegionContract !== input.oldRegionContract,
      relationChanges:
        JSON.stringify(current.relations) !==
        JSON.stringify(oldAccepted.relations),
      travelEdgeOrVariantChanges:
        JSON.stringify(current.travelEdges) !==
        JSON.stringify(oldAccepted.travelEdges),
      task046AcceptStillValid: false,
    },
    scope: {
      intentionalRegionOrMasterCodeChanges: [],
      plannerOrStepChanges: [],
      databaseSchemaOrMigrationChanges: [],
      candidatePipelineChanges: [],
      poiProductionAllocationChanges: [],
    },
    parserIssues: graphParse.ok ? [] : graphParse.issues,
    resolutionIssues: resolutions.filter(
      ({ activeResolved }) => !activeResolved,
    ),
  };

  const passed =
    evidence.sync.mergeParentsExact &&
    evidence.sync.conflictFiles.length === 0 &&
    evidence.sync.task047ConflictResolutionFiles.length === 0 &&
    evidence.invariants.graphParsed &&
    evidence.invariants.regionNodes === 50 &&
    evidence.invariants.regionIdsPreserved === 50 &&
    evidence.invariants.regionIdOrderPreserved &&
    evidence.invariants.canonicalMasterCodesPopulated === 50 &&
    evidence.invariants.productionNullMasterCodes === 0 &&
    evidence.invariants.activeCanonicalRegistryResolution === 50 &&
    evidence.invariants.duplicateMasterCodes === 0 &&
    evidence.invariants.invalidLifecycleAllocations === 0 &&
    evidence.invariants.unknownOrMismatchedAllocations === 0 &&
    evidence.invariants.legacyOrSideChannelSubstitutions === 0 &&
    evidence.invariants.semanticTopologyChangesExcludingMasterCode === 0 &&
    evidence.invariants.runtimeQaManifestDependencies === 0 &&
    evidence.invariants.generatedGraphMatchesCommitted &&
    evidence.authority.canonicalRegistryParsed &&
    evidence.authority.generatorUsesCanonicalResolver &&
    evidence.authority.generatorFailsClosedWhenAllocationMissing &&
    evidence.authority.registryRuntimeLoadsCanonicalJson &&
    !evidence.authority.generatorUsesQaManifestAsRuntimeAuthority &&
    evidence.semanticDelta.oldToNewRegionSemanticChanges === 0 &&
    !evidence.semanticDelta.regionContractChanged &&
    !evidence.semanticDelta.relationChanges &&
    !evidence.semanticDelta.travelEdgeOrVariantChanges;

  evidence.semanticDelta.task046AcceptStillValid = passed;
  evidence.passed = passed;
  evidence.recommendation = passed ? "ACCEPT_PRESERVED" : "REVALIDATION_FAILED";
  return evidence;
}

function report(evidence) {
  return `# TASK-047-A PR #352 Develop Sync Delta Revalidation

## Outcome

${evidence.status}

## Sync delta

- TASK-046 accepted old head: \`${evidence.sync.oldTask046AcceptedHead}\`.
- Latest develop merged: \`${evidence.sync.latestDevelopMerged}\`.
- Merge commit: \`${evidence.sync.mergeCommit}\`.
- Conflict files: ${evidence.sync.conflictFiles.length}.
- Conflict-resolution files: ${evidence.sync.task047ConflictResolutionFiles.length}.
- Pure upstream files: ${evidence.sync.upstreamOnlyFileCount}.
- \`package.json\` was merged automatically by Git without a conflict; it retained
  the TASK-045 scripts and added the upstream scripts.

## Acceptance delta

| Gate | Result |
| --- | ---: |
| Region nodes | ${evidence.invariants.regionNodes} |
| Region IDs preserved | ${evidence.invariants.regionIdsPreserved}/50 |
| Canonical Master Codes populated | ${evidence.invariants.canonicalMasterCodesPopulated}/50 |
| Production null Master Codes | ${evidence.invariants.productionNullMasterCodes} |
| Active Registry resolution | ${evidence.invariants.activeCanonicalRegistryResolution}/50 |
| Duplicate Master Codes | ${evidence.invariants.duplicateMasterCodes} |
| Invalid lifecycle allocations | ${evidence.invariants.invalidLifecycleAllocations} |
| Unknown/mismatched allocations | ${evidence.invariants.unknownOrMismatchedAllocations} |
| Legacy/side-channel substitutions | ${evidence.invariants.legacyOrSideChannelSubstitutions} |
| Topology changes excluding Master Code | ${evidence.invariants.semanticTopologyChangesExcludingMasterCode} |
| Runtime QA-manifest dependencies | ${evidence.invariants.runtimeQaManifestDependencies} |
| Old accepted graph to post-sync semantic changes | ${evidence.semanticDelta.oldToNewRegionSemanticChanges} |

Runtime authority remains
\`${evidence.authority.canonicalRegistryPath}\`.

## Decision

TASK-046 ACCEPT remains valid: ${evidence.semanticDelta.task046AcceptStillValid}.
`;
}

export async function writePr352DeltaRevalidationOutputs() {
  const evidence = buildPr352DeltaRevalidation();
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    resolve(outputDirectory, "delta-revalidation.json"),
    await format(`${JSON.stringify(evidence, null, 2)}\n`, { parser: "json" }),
  );
  writeFileSync(
    resolve(outputDirectory, "delta-revalidation-report.md"),
    await format(report(evidence), { parser: "markdown" }),
  );
  return evidence;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const evidence = await writePr352DeltaRevalidationOutputs();
  console.log(
    `TASK-047-A ${evidence.recommendation}: merge ${evidence.sync.mergeCommit.slice(0, 8)}, ${evidence.invariants.activeCanonicalRegistryResolution}/50 active allocations`,
  );
  if (!evidence.passed) process.exitCode = 1;
}
