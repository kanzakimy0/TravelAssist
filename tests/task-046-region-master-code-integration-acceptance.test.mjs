import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildRegionMasterCodeAcceptanceCheck,
  REVIEWED_HEAD,
  writeRegionMasterCodeAcceptanceOutputs,
} from "../tools/qa/region-master-code-integration-acceptance.mjs";

const clone = (value) => structuredClone(value);

test("TASK-046 independently proves all numeric integration gates", () => {
  const check = buildRegionMasterCodeAcceptanceCheck();
  assert.equal(REVIEWED_HEAD, "3281a072e976e747256a0e73cbd2692f9a9915f7");
  assert.equal(check.passed, true);
  assert.equal(check.recommendation, "ACCEPT");
  assert.equal(check.independentMethod.task045ResultUsedAsEvidence, false);
  assert.equal(check.independentMethod.task045QaEvidenceUsedAsEvidence, false);
  assert.equal(check.graph.regionCount, 50);
  assert.equal(check.graph.regionIdsPreserved, 50);
  assert.equal(check.graph.populatedMasterCodes, 50);
  assert.equal(check.graph.nullMasterCodes, 0);
  assert.equal(check.graph.activeRegistryResolutions, 50);
  assert.equal(check.graph.duplicateMasterCodes, 0);
  assert.equal(check.graph.invalidLifecycleAllocations, 0);
  assert.equal(check.graph.unknownOrMismatchedAllocations, 0);
  assert.equal(check.graph.legacyOrSideChannelSubstitutions, 0);
});

test("runtime authority is the sole canonical registry and QA manifests are not consumed", () => {
  const check = buildRegionMasterCodeAcceptanceCheck();
  assert.equal(
    check.authority.canonicalRegistryPath,
    "src/shared/data/master-code-registry.v1.json",
  );
  assert.equal(check.authority.canonicalRegistryFileCount, 1);
  assert.equal(check.authority.generatorUsesCanonicalResolver, true);
  assert.equal(
    check.authority.generatorUsesQaManifestAsRuntimeAuthority,
    false,
  );
  assert.equal(check.authority.registryRuntimeLoadsCanonicalJson, true);
  assert.equal(check.authority.failClosedWhenAllocationMissing, true);
});

test("nullable contract remains partial-capable while production graph is complete", () => {
  const check = buildRegionMasterCodeAcceptanceCheck();
  assert.equal(check.nullableBoundary.sharedContractRemainsNullable, true);
  assert.equal(
    check.nullableBoundary.sharedContractChangedByIntegration,
    false,
  );
  assert.equal(check.nullableBoundary.historicalPartialNullCount, 50);
  assert.equal(check.nullableBoundary.productionCompleteNullCount, 0);
  assert.equal(
    check.nullableBoundary.productionGeneratorFailsClosedWhenUnallocated,
    true,
  );
});

test("all non-Master-Code graph semantics and protected scopes are unchanged", () => {
  const check = buildRegionMasterCodeAcceptanceCheck();
  assert.equal(check.topology.semanticChangesExcludingMasterCode, 0);
  assert.equal(check.topology.regionTaxonomyContractChanged, false);
  assert.equal(check.topology.relationsChanged, false);
  assert.equal(check.topology.travelEdgesOrVariantsChanged, false);
  assert.deepEqual(check.scope.plannerOrStepUiChanges, []);
  assert.deepEqual(check.scope.databaseSchemaOrMigrationChanges, []);
  assert.deepEqual(check.scope.candidatePipelineChanges, []);
  assert.deepEqual(check.scope.poiProductionAllocationChanges, []);
});

test("null, duplicate, mismatch and legacy substitutions fail closed", () => {
  const base = buildRegionMasterCodeAcceptanceCheck();
  const loadGraph = () =>
    JSON.parse(readFileSync("docs/qa/TASK-041/region-nodes.json", "utf8"));
  const nodesDocument = loadGraph();
  const currentGraph = {
    contractVersion: "1.0",
    graphSchemaVersion: "1.0",
    graphDataRevision: nodesDocument.graphDataRevision,
    nodes: nodesDocument.nodes,
    relations: JSON.parse(
      readFileSync("docs/qa/TASK-041/region-relations.json", "utf8"),
    ).relations,
    travelEdges: JSON.parse(
      readFileSync("docs/qa/TASK-041/travel-edges.json", "utf8"),
    ).travelEdges,
  };

  const nullGraph = clone(currentGraph);
  nullGraph.nodes[0].masterCode = null;
  assert.equal(
    buildRegionMasterCodeAcceptanceCheck({ currentGraph: nullGraph }).passed,
    false,
  );

  const duplicateGraph = clone(currentGraph);
  duplicateGraph.nodes[1].masterCode = duplicateGraph.nodes[0].masterCode;
  assert.equal(
    buildRegionMasterCodeAcceptanceCheck({ currentGraph: duplicateGraph })
      .passed,
    false,
  );

  const mismatchGraph = clone(currentGraph);
  mismatchGraph.nodes[0].masterCode = mismatchGraph.nodes[2].masterCode;
  assert.equal(
    buildRegionMasterCodeAcceptanceCheck({ currentGraph: mismatchGraph })
      .passed,
    false,
  );

  const legacyGraph = clone(currentGraph);
  legacyGraph.nodes[0].masterCode = "JP-RG-JAPAN";
  assert.equal(
    buildRegionMasterCodeAcceptanceCheck({ currentGraph: legacyGraph }).passed,
    false,
  );

  assert.equal(base.passed, true);
});

test("topology drift and QA-manifest runtime authority fail acceptance", () => {
  const check = buildRegionMasterCodeAcceptanceCheck();
  const nodesDocument = JSON.parse(
    readFileSync("docs/qa/TASK-041/region-nodes.json", "utf8"),
  );
  const currentGraph = {
    contractVersion: "1.0",
    graphSchemaVersion: "1.0",
    graphDataRevision: nodesDocument.graphDataRevision,
    nodes: nodesDocument.nodes,
    relations: JSON.parse(
      readFileSync("docs/qa/TASK-041/region-relations.json", "utf8"),
    ).relations,
    travelEdges: JSON.parse(
      readFileSync("docs/qa/TASK-041/travel-edges.json", "utf8"),
    ).travelEdges,
  };
  const topologyDrift = clone(currentGraph);
  topologyDrift.nodes[0].names.nameEn = "Changed";
  assert.equal(
    buildRegionMasterCodeAcceptanceCheck({ currentGraph: topologyDrift })
      .passed,
    false,
  );

  assert.equal(
    buildRegionMasterCodeAcceptanceCheck({
      generatorSource: `${check.authority.canonicalRegistryPath}\nregion-allocation-50.json`,
    }).passed,
    false,
  );
});

test("machine-readable and human-readable acceptance evidence is deterministic", async () => {
  const first = await writeRegionMasterCodeAcceptanceOutputs();
  const firstJson = readFileSync(
    "docs/qa/TASK-046/acceptance-check.json",
    "utf8",
  );
  const firstReport = readFileSync(
    "docs/qa/TASK-046/acceptance-report.md",
    "utf8",
  );
  const second = await writeRegionMasterCodeAcceptanceOutputs();
  assert.deepEqual(second, first);
  assert.equal(
    readFileSync("docs/qa/TASK-046/acceptance-check.json", "utf8"),
    firstJson,
  );
  assert.equal(
    readFileSync("docs/qa/TASK-046/acceptance-report.md", "utf8"),
    firstReport,
  );
});
