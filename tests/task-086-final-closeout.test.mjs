import test from "node:test";
import assert from "node:assert/strict";
import { classifySource } from "../tools/transport/task-086-final-closeout.mjs";
import { deriveExecutionState } from "../tools/transport/task-086-stage.mjs";

const source = {
  sourceId: "fixture",
  url: "https://example.org/open",
  observedAt: "2026-10-05T00:00:00Z",
  contentSha256: "a".repeat(64),
  rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
  rightsReview: {
    scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
    termsUrl: "https://example.org/terms",
    reason: "Internal minimal factual extraction decision, not a reuse grant",
  },
  rawPayloadRetained: false,
  derivedDataAllowed: true,
  redistributionAllowed: true,
  rightsDecision: "INTERNAL_FACTS_ONLY",
  attribution: "Example operator",
};
test("public accessibility and internal fact-only decision cannot certify source rights", () => {
  assert.equal(classifySource(source, true, true).status, "REVIEW_REQUIRED");
  assert.equal(
    classifySource({ ...source, license: "CC BY 4.0" }, true, true, true)
      .status,
    "CERTIFIED",
  );
  assert.equal(
    classifySource({ ...source, license: "CC BY 4.0" }, false, true).status,
    "QUARANTINED",
  );
  assert.equal(
    classifySource({ ...source, license: "CC BY 4.0" }, true, false).status,
    "QUARANTINED",
  );
  assert.equal(
    classifySource(
      { ...source, license: "ODbL 1.0", shareAlikeRequired: true },
      true,
      true,
    ).status,
    "REVIEW_REQUIRED",
  );
});
test("final closeout never restores automatic ordinary discovery or claims completion", () => {
  const state = deriveExecutionState({
    policy: { revisionId: "final", finalCloseoutOnly: true },
    stage: { status: "FAILED" },
    gate: { terminal: false },
    packages: [{ id: "still-open" }],
  });
  assert.equal(state.executionStatus, "FINAL_CERTIFICATION_ONLY");
  assert.equal(state.taskComplete, false);
  assert.equal(state.newSourceAcquisitionAuthorized, false);
  assert.equal(state.nextWorkPackage, null);
  assert.equal(state.ordinaryPackageCount, 1);
});
