// Explicit opt-in: real dedicated Local Supabase/Auth; never discovered by pure full-Node runs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHarness } from "./task-065-local-harness.mjs";
import {
  applyConcurrency,
  rollbackConcurrency,
} from "./task-065-concurrency.mjs";
import { runtimeSoak } from "./task-065-runtime-soak.mjs";
import { faultMatrix } from "./task-065-faults.mjs";
import { refusalsAndSecurity, cascade } from "./task-065-security.mjs";
test("TASK-065 real Local concurrency, faults, runtime and rollback certification", async (t) => {
  const h = await createHarness(),
    smoke = process.env.TASK065_SMOKE === "1",
    rounds = smoke ? 2 : 20;
  h.evidence.smoke = smoke;
  const run = async (name, fn) => {
    let failure;
    await t.test(name, async () => {
      try {
        await fn();
        h.evidence.checks.push({ name, status: "PASS" });
      } catch (e) {
        failure = e;
        h.evidence.checks.push({ name, status: "FAIL" });
        throw e;
      } finally {
        await h.save();
      }
    });
    if (failure) throw failure;
  };
  try {
    await h.init();
    await run(
      "apply: six families, 16-session replay/stale-base and independent roots",
      () => applyConcurrency(h, rounds),
    );
    await run(
      "rollback: five families, both operations, deterministic normal-apply races",
      () => rollbackConcurrency(h, rounds),
    );
    await run("actual transaction boundary and ambiguous COMMIT matrix", () =>
      faultMatrix(h),
    );
    await run(
      "current authority, locks, history and internal metadata isolation",
      () => refusalsAndSecurity(h),
    );
    await run(
      "eight runtime workers, current-state recompute, lease recovery/fencing",
      () => runtimeSoak(h, smoke ? 16 : 120),
    );
    await run(
      "persistence minimization, aggregate graph and real account deletion",
      () => cascade(h),
    );
    assert.equal(h.evidence.network.nonLoopbackAttempts, 0);
    if (!smoke) {
      assert.ok(h.evidence.applyRounds.length >= 100);
      assert.ok(h.evidence.rollbackRounds.length >= 100);
      assert.ok(h.evidence.runtime.events >= 100);
    }
    h.evidence.status = smoke ? "SMOKE_PASS_NOT_CERTIFICATION" : "PASS";
  } catch (e) {
    h.evidence.status = "FAIL";
    throw e;
  } finally {
    await h.cleanup();
  }
});
