import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildAcceptanceInvariantCheck,
  writeAcceptanceInvariantCheck,
} from "../tools/qa/master-code-governance-acceptance.mjs";

const checkedIn = () =>
  JSON.parse(
    readFileSync(
      resolve("docs/qa/TASK-044/registry-invariant-check.json"),
      "utf8",
    ),
  );

test("TASK-044 independently reproduces the canonical registry invariants", () => {
  const result = buildAcceptanceInvariantCheck();
  assert.equal(result.registry.parsed, true);
  assert.equal(result.registry.totalEntries, 51);
  assert.equal(result.registry.reservedEntries, 1);
  assert.equal(result.registry.activeEntries, 50);
  assert.equal(result.registry.activeRegionEntries, 50);
  assert.equal(result.registry.uniqueMasterCodes, 51);
  assert.equal(result.registry.uniqueActiveEntities, 50);
  assert.equal(result.registry.fiveDigitAsciiGrammar, true);
  assert.equal(result.registry.rejectedIdentifierValues, 0);
  assert.equal(result.registry.invalidActiveResolverResults, 0);
});

test("all 50 TASK-041 Region identities are preserved and resolve active", () => {
  const result = buildAcceptanceInvariantCheck();
  assert.equal(result.regionAllocation.parsed, true);
  assert.equal(result.regionAllocation.sourceNodes, 50);
  assert.equal(result.regionAllocation.allocations, 50);
  assert.equal(result.regionAllocation.regionIdsPreserved, 50);
  assert.equal(result.regionAllocation.uniqueRegionIds, 50);
  assert.equal(result.regionAllocation.uniqueMasterCodes, 50);
  assert.equal(result.regionAllocation.activeResolved, 50);
  assert.equal(result.regionAllocation.nullMasterCodes, 0);
  assert.equal(result.regionAllocation.unknownRegionRefs, 0);
  assert.deepEqual(result.regionAllocation.graphTopologyFilesChangedByTask043, []);
});

test("Option A keeps null partial-only and proves a zero-null production projection", () => {
  const result = buildAcceptanceInvariantCheck();
  assert.equal(result.optionAReview.partialGraphNullCount, 50);
  assert.equal(result.optionAReview.projectedProductionNullCount, 0);
  assert.equal(result.optionAReview.projectedProductionActiveResolved, 50);
  assert.equal(
    result.optionAReview.recommendation,
    "accept_with_publication_gate",
  );
});

test("independent negative checks all fail closed", () => {
  const result = buildAcceptanceInvariantCheck();
  assert.equal(result.allRequiredNegativeChecksPassed, true);
  assert.ok(Object.keys(result.negativeChecks).length >= 15);
  for (const [name, passed] of Object.entries(result.negativeChecks))
    assert.equal(passed, true, name);
});

test("machine-readable acceptance evidence is deterministic and checked in", async () => {
  const before = checkedIn();
  const generated = await writeAcceptanceInvariantCheck();
  const after = checkedIn();
  assert.deepEqual(after, generated);
  assert.deepEqual(after, before);
  assert.equal(after.recommendation, "ACCEPT");
});
