import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildPr352DeltaRevalidation,
  MERGED_DEVELOP_HEAD,
  MERGE_COMMIT,
  OLD_ACCEPTED_HEAD,
  writePr352DeltaRevalidationOutputs,
} from "../tools/qa/pr352-develop-sync-delta-revalidation.mjs";

test("TASK-047 records the exact normal merge and zero conflict resolution", () => {
  const evidence = buildPr352DeltaRevalidation();
  assert.equal(OLD_ACCEPTED_HEAD, "3281a072e976e747256a0e73cbd2692f9a9915f7");
  assert.equal(MERGED_DEVELOP_HEAD, "fa74995dba42d40fa58dfd9e5900c09fc552340e");
  assert.equal(MERGE_COMMIT, "eb81291f38b7147873e76a96f3587ed36e648faa");
  assert.equal(evidence.sync.mergeParentsExact, true);
  assert.deepEqual(evidence.sync.conflictFiles, []);
  assert.deepEqual(evidence.sync.task047ConflictResolutionFiles, []);
  assert.deepEqual(evidence.sync.automaticallyMergedFiles, ["package.json"]);
  assert.equal(evidence.sync.upstreamOnlyFileCount, 25);
});

test("all TASK-046 numeric and authority gates remain valid after sync", () => {
  const evidence = buildPr352DeltaRevalidation();
  assert.equal(evidence.passed, true);
  assert.equal(evidence.recommendation, "ACCEPT_PRESERVED");
  assert.equal(evidence.invariants.regionNodes, 50);
  assert.equal(evidence.invariants.regionIdsPreserved, 50);
  assert.equal(evidence.invariants.canonicalMasterCodesPopulated, 50);
  assert.equal(evidence.invariants.productionNullMasterCodes, 0);
  assert.equal(evidence.invariants.activeCanonicalRegistryResolution, 50);
  assert.equal(evidence.invariants.duplicateMasterCodes, 0);
  assert.equal(evidence.invariants.invalidLifecycleAllocations, 0);
  assert.equal(evidence.invariants.unknownOrMismatchedAllocations, 0);
  assert.equal(evidence.invariants.legacyOrSideChannelSubstitutions, 0);
  assert.equal(evidence.invariants.runtimeQaManifestDependencies, 0);
  assert.equal(
    evidence.authority.canonicalRegistryPath,
    "src/shared/data/master-code-registry.v1.json",
  );
  assert.equal(evidence.authority.generatorUsesCanonicalResolver, true);
  assert.equal(
    evidence.authority.generatorUsesQaManifestAsRuntimeAuthority,
    false,
  );
});

test("Region semantics are byte-equivalent to the old accepted graph", () => {
  const evidence = buildPr352DeltaRevalidation();
  assert.equal(evidence.semanticDelta.oldToNewRegionSemanticChanges, 0);
  assert.equal(evidence.semanticDelta.regionContractChanged, false);
  assert.equal(evidence.semanticDelta.relationChanges, false);
  assert.equal(evidence.semanticDelta.travelEdgeOrVariantChanges, false);
  assert.equal(
    evidence.invariants.semanticTopologyChangesExcludingMasterCode,
    0,
  );
  assert.equal(evidence.semanticDelta.task046AcceptStillValid, true);
});

test("sync contains only upstream changes and no protected TASK-047 resolution", () => {
  const evidence = buildPr352DeltaRevalidation();
  assert.ok(evidence.sync.upstreamOnlyFiles.includes("package.json"));
  assert.deepEqual(evidence.scope.intentionalRegionOrMasterCodeChanges, []);
  assert.deepEqual(evidence.scope.plannerOrStepChanges, []);
  assert.deepEqual(evidence.scope.databaseSchemaOrMigrationChanges, []);
  assert.deepEqual(evidence.scope.candidatePipelineChanges, []);
  assert.deepEqual(evidence.scope.poiProductionAllocationChanges, []);
});

test("semantic drift and QA-manifest authority fail closed", () => {
  const base = buildPr352DeltaRevalidation();
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
  const drift = structuredClone(currentGraph);
  drift.nodes[0].names.nameEn = "Unexpected upstream mutation";
  assert.equal(
    buildPr352DeltaRevalidation({ currentGraph: drift }).passed,
    false,
  );
  assert.equal(
    buildPr352DeltaRevalidation({
      generatorSource: `${base.authority.canonicalRegistryPath}\ndocs/qa/TASK-043/region-allocation-50.json`,
    }).passed,
    false,
  );
});

test("TASK-047 evidence is deterministic", async () => {
  const first = await writePr352DeltaRevalidationOutputs();
  const firstJson = readFileSync(
    "docs/qa/TASK-047/delta-revalidation.json",
    "utf8",
  );
  const firstReport = readFileSync(
    "docs/qa/TASK-047/delta-revalidation-report.md",
    "utf8",
  );
  const second = await writePr352DeltaRevalidationOutputs();
  assert.deepEqual(second, first);
  assert.equal(
    readFileSync("docs/qa/TASK-047/delta-revalidation.json", "utf8"),
    firstJson,
  );
  assert.equal(
    readFileSync("docs/qa/TASK-047/delta-revalidation-report.md", "utf8"),
    firstReport,
  );
});
