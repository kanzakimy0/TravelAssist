import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  readCurrentCandidateRows,
  applyEvidenceDelta,
} from "../tools/poi/read-current-candidates.mjs";
import { ROOT } from "../tools/poi/enrich-candidates.mjs";

const current = readCurrentCandidateRows();
const clone = (v) => structuredClone(v);

test("remaining candidate view preserves all previous scored rows and held identities", () => {
  const after = new Map(current.rows.map((r) => [r.candidateKey, r]));
  assert.equal(current.rows.length, 10369);
  const protectedRows = current.baseline.filter((r) => r.provenance.length);
  assert.equal(protectedRows.length, 272);
  for (const row of protectedRows)
    assert.deepEqual(after.get(row.candidateKey), row);
  const old = new Map(current.baseline.map((r) => [r.candidateKey, r]));
  const held = current.pending.filter((q) => q.identityHold);
  assert.equal(held.length, 165);
  for (const q of held)
    assert.deepEqual(after.get(q.candidateKey), old.get(q.candidateKey));
});

test("all 10097 unresolved records retain query, concrete reason and manual/retry actions", () => {
  assert.equal(current.pending.length, 10097);
  for (const q of current.pending) {
    assert.ok(
      q.name && q.prefectures.length && q.query && q.reason && q.nextAction,
    );
    assert.ok(q.unresolvedFeatureCodes.length);
    assert.equal(q.retryPolicy.automaticAt, null);
    assert.equal(q.searchResultsAreNotIdentityProof, true);
    assert.ok(
      ["SEARCH_EXECUTED", "NOT_YET_CHECKPOINTED"].includes(q.searchStatus),
    );
  }
});

test("generation uses the frozen 43-feature contract with only explicitly reviewed additions", () => {
  assert.ok(current.delta.length > 0);
  const scored = current.rows.filter((r) => r.provenance.length).length;
  assert.equal(scored, 272 + current.delta.length);
  for (const row of current.delta) {
    assert.equal(Object.keys(row.featureSet.values).length, 43);
    assert.equal(
      row.remainingReview.identityAssessment.status,
      "TARGET_CONFIRMED",
    );
    assert.equal(
      row.provenance.length,
      Object.values(row.featureSet.values).filter((v) => v !== null).length,
    );
  }
});

test("unsupported default 0/5, altered provenance and identity corruption fail closed", () => {
  const one = current.delta[0];
  for (const mutate of [
    (r) => {
      const key = Object.keys(r.featureSet.values).find(
        (k) => r.featureSet.values[k] === null,
      );
      r.featureSet.values[key] = 5;
    },
    (r) => {
      const key = Object.keys(r.featureSet.values).find(
        (k) => r.featureSet.values[k] === null,
      );
      r.featureSet.values[key] = 0;
    },
    (r) => {
      r.provenance[0].sourceRefs = ["invented"];
    },
    (r) => {
      r.provenance[0].confidence = 2;
    },
    (r) => {
      r.provenance[0].facts[0].locator.locatorSha256 = "0".repeat(64);
    },
    (r) => {
      r.identityInputChecksum = "0".repeat(64);
    },
  ]) {
    const row = clone(one);
    mutate(row);
    assert.throws(() =>
      applyEvidenceDelta(current.baseline, [row], current.ledger, new Set()),
    );
  }
});

test("duplicate, held, already-scored and unknown delta candidates are rejected", () => {
  const one = current.delta[0];
  assert.throws(
    () =>
      applyEvidenceDelta(
        current.baseline,
        [one, one],
        current.ledger,
        new Set(),
      ),
    /duplicate/,
  );
  assert.throws(
    () =>
      applyEvidenceDelta(
        current.baseline,
        [one],
        current.ledger,
        new Set([one.candidateKey]),
      ),
    /Identity hold/,
  );
  const known = current.baseline.find((r) => r.provenance.length);
  assert.throws(
    () =>
      applyEvidenceDelta(current.baseline, [known], current.ledger, new Set()),
    /protected/,
  );
  assert.throws(
    () =>
      applyEvidenceDelta(
        current.baseline,
        [{ ...one, candidateKey: "missing" }],
        current.ledger,
        new Set(),
      ),
    /Unknown/,
  );
});

test("Python source-cache and locator faults run offline in the repository gate", () => {
  const python = process.platform === "win32" ? "python" : "python3";
  const output = execFileSync(
    python,
    ["-X", "utf8", "tests/poi-remaining-review.test.py"],
    {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  assert.equal(output, "");
});
