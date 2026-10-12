import test from "node:test";
import assert from "node:assert/strict";
import { classifyCiRevision } from "../tools/qa/ci-revision.mjs";
const head = "1".repeat(40),
  merge = "2".repeat(40),
  base = "3".repeat(40);
const pr = {
  eventName: "pull_request",
  event: {
    number: 466,
    pull_request: { head: { sha: head }, base: { sha: base } },
  },
  eventSha: merge,
  checkoutSha: merge,
  checkoutParents: [base, head],
  ref: "refs/pull/466/merge",
};
test("TASK086 CI records PR branch HEAD separately from actual merge checkout", () => {
  const r = classifyCiRevision(pr);
  assert.equal(r.branchHeadSha, head);
  assert.equal(r.checkoutSha, merge);
  assert.equal(r.directBranchHeadTest, false);
  assert.equal(r.checkoutKind, "PULL_REQUEST_MERGE_TEST");
});
test("TASK086 CI reports direct checkout only when actual SHA matches branch HEAD", () => {
  const r = classifyCiRevision({
    ...pr,
    checkoutSha: head,
    checkoutParents: [base],
  });
  assert.equal(r.directBranchHeadTest, true);
  assert.equal(r.checkoutKind, "BRANCH_HEAD_DIRECT");
});
test("TASK086 CI rejects absent head or unrelated PR checkout", () => {
  assert.throws(() => classifyCiRevision({ ...pr, event: {} }), /SHA_MISSING/);
  assert.throws(
    () => classifyCiRevision({ ...pr, checkoutParents: [base] }),
    /DOES_NOT_BIND/,
  );
});
