import test from "node:test";
import assert from "node:assert/strict";
import { verifyRebuild } from "../tools/transport/task-086-verify.mjs";

test(
  "TASK086 raw GTFS extraction and full deterministic graph rebuild",
  { timeout: 240000 },
  () => {
    // A local release regression may publish the same verified run once; CI remains isolated.
    const result = verifyRebuild({
      publish: process.env.TASK086_PUBLISH_VALIDATION === "1",
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.rawGtfsExtraction, "PASS");
    assert.equal(result.fullDeterministicRebuild, "PASS");
    assert.equal(result.resumeChecksumSkip, "PASS");
    assert.ok(result.batchCount > 0);
  },
);
