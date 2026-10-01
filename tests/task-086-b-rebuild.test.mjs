import test from "node:test";
import assert from "node:assert/strict";
import { verifyRebuild } from "../tools/transport/task-086-verify.mjs";

test(
  "TASK086 raw GTFS extraction and full deterministic graph rebuild",
  { timeout: 240000 },
  () => {
    const result = verifyRebuild();
    assert.equal(result.status, "PASS");
    assert.equal(result.rawGtfsExtraction, "PASS");
    assert.equal(result.fullDeterministicRebuild, "PASS");
    assert.equal(result.resumeChecksumSkip, "PASS");
    assert.ok(result.batchCount > 0);
  },
);
