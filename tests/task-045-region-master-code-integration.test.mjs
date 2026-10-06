import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildRegionMasterCodeIntegrationEvidence,
  topologyProjection,
  writeRegionMasterCodeIntegrationOutputs,
} from "../tools/qa/region-master-code-integration.mjs";
import { regionGraph } from "../tools/qa/region-graph-pilot.mjs";
import {
  resolveActiveMasterCodeByEntity,
  resolveMasterCode,
} from "../src/shared/master-code/index.ts";

test("production Region graph has exactly 50 active canonical allocations", async () => {
  const evidence = await buildRegionMasterCodeIntegrationEvidence();
  assert.equal(evidence.passed, true);
  assert.equal(evidence.after.regionCount, 50);
  assert.equal(evidence.after.populatedMasterCodes, 50);
  assert.equal(evidence.after.nullMasterCodes, 0);
  assert.equal(evidence.canonicalResolution.activeResolvedCount, 50);
  assert.equal(evidence.canonicalResolution.duplicateMasterCodes, 0);
  assert.equal(evidence.canonicalResolution.invalidLifecycleCount, 0);
  assert.equal(evidence.canonicalResolution.unknownOrMismatchedCount, 0);
});

test("all Region identities resolve by entity and by canonical code", () => {
  for (const node of regionGraph.nodes) {
    assert.notEqual(node.masterCode, null);
    const entityType = `region.${node.regionType}`;
    const byEntity = resolveActiveMasterCodeByEntity(entityType, node.regionId);
    const byCode = resolveMasterCode(node.masterCode);
    assert.equal(byEntity?.masterCode, node.masterCode);
    assert.equal(byCode?.lifecycleStatus, "active");
    assert.equal(byCode?.entityType, entityType);
    assert.equal(byCode?.entityRef, node.regionId);
  }
});

test("Region IDs and topology are unchanged except Master Code population", async () => {
  const evidence = await buildRegionMasterCodeIntegrationEvidence();
  assert.equal(evidence.identity.preservedCount, 50);
  assert.equal(evidence.identity.orderPreserved, true);
  assert.equal(evidence.topology.semanticChangesExceptMasterCode, 0);
  assert.equal(topologyProjection(regionGraph).nodes.length, 50);
});

test("production generator consumes the registry rather than QA allocation rows", async () => {
  const source = await readFile("tools/qa/region-graph-pilot.mjs", "utf8");
  assert.match(source, /resolveActiveMasterCodeByEntity/);
  assert.doesNotMatch(source, /region-allocation-50\.json/);
  assert.doesNotMatch(source, /docs\/qa\/TASK-043/);
});

test("null, legacy, unknown and cross-entity allocations fail the integration gate", async () => {
  const nullGraph = structuredClone(regionGraph);
  nullGraph.nodes[0].masterCode = null;
  assert.equal(
    (await buildRegionMasterCodeIntegrationEvidence(nullGraph)).passed,
    false,
  );

  const legacyGraph = structuredClone(regionGraph);
  legacyGraph.nodes[0].masterCode = "JP-RG-JAPAN";
  assert.equal(
    (await buildRegionMasterCodeIntegrationEvidence(legacyGraph)).passed,
    false,
  );

  const crossEntityGraph = structuredClone(regionGraph);
  crossEntityGraph.nodes[0].masterCode = regionGraph.nodes[1].masterCode;
  assert.equal(
    (await buildRegionMasterCodeIntegrationEvidence(crossEntityGraph)).passed,
    false,
  );
});

test("generated TASK-041 and TASK-045 evidence is deterministic", async () => {
  await writeRegionMasterCodeIntegrationOutputs();
  const first = await readFile(
    "docs/qa/TASK-045/region-master-code-integration.json",
    "utf8",
  );
  await writeRegionMasterCodeIntegrationOutputs();
  const second = await readFile(
    "docs/qa/TASK-045/region-master-code-integration.json",
    "utf8",
  );
  assert.equal(first, second);
  assert.equal(JSON.parse(second).passed, true);
});
