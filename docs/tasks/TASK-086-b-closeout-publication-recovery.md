# TASK-086-B — Closeout Publication Recovery

## 0. Identity

- Parent Task: `TASK-086-B`
- WBS: `7.16 TransportNode → TransportNode Japan Mobility Backbone`
- Owner: `B`
- Priority: `P0 closeout recovery`
- Existing implementation branch: `feature/b-transport-node-mobility-backbone`
- Existing Draft PR: `#466`
- Existing Issue: `#443`
- Current remote PR head at task publication: `406d31f0a6b52f321b79fa4694f985709288407f`
- Current develop at task publication: `5123966f62dbe9587a3bbe38e877ccf3ea959b80`
- Preserved local closeout head reported by Final Closeout: `1d5b5165b8359d356eb33c3f06188a107ffb3a31`
- Frozen input SHA reported by Final Closeout: `a92b9e90bece0c016ab50e74fd501cf65023ca253b750f27b582102b946ea6d7`

This task is a **publication/validation recovery of the existing TASK-086-B closeout only**.

It does **not** create a new WBS, a second Backbone implementation, or a new product scope.

---

## 1. Current accepted facts

The previous Final Closeout reached:

`BLOCKED_CERTIFIED_NATIONAL_BACKBONE`

The business/certification result remains authoritative for this recovery:

- Certified nodes: 1174
- Certified directed edges: 2460
- Certified transfers: 37
- Quarantined nodes: 2887
- Quarantined edges: 6949
- Quarantined transfers: 1035
- Certification blocker roots: 251
- Final execution blocker roots: 2
- Final total blocker roots: 253
- Full Node regression timed out after 5400.12 seconds with exit 124
- Clean deterministic/recovery/published-artifact proof timed out
- Exact-head GitHub Quality Gate did not run
- Push was rejected because retained `core-stage-acceptance.json` exceeds GitHub's 100 MB file limit
- PR #466 therefore remained Draft/Open at remote head `406d31f...`

The 251 certification roots are **not** in scope for this recovery.

---

# 2. Goal

Recover a **remote, auditable, exact-head closeout checkpoint** on the existing PR #466 without changing the certified Backbone business conclusion.

Final status must be exactly one of:

`PASS_CLOSEOUT_PUBLICATION_RECOVERY`

or

`BLOCKED_CLOSEOUT_PUBLICATION_RECOVERY`

A successful publication recovery does **not** change WBS 7.16 to completed or review-ready.

After successful recovery:

`WBS 7.16 = B / 阻塞`

with the remaining certification blockers explicitly preserved.

---

# 3. Mandatory safety rules

## 3.1 No business remediation

Do not:

- continue ordinary topology discovery;
- research new sources;
- repair any of the 251 certification roots;
- add new nodes, edges, transfers or corridors;
- change source-rights decisions;
- change certification classification to make the graph pass;
- change TASK-085;
- change POI / Feature43 / Recommendation / Planner / AI;
- start downstream WBS work.

## 3.2 No published-history rewrite

Do not:

- force push;
- rewrite any commit already present on remote PR #466;
- reset the remote branch backwards;
- delete historical remote evidence.

The unpublished local closeout range may be **reconstructed** because it never reached GitHub.

## 3.3 Preserve the local failed-publication checkpoint

Before recovery, preserve and record:

- exact local head SHA;
- exact remote PR head SHA;
- `git status`;
- commit range `origin/feature/b-transport-node-mobility-backbone..HEAD`;
- changed-file inventory;
- blob-size inventory;
- SHA-256 of the oversized artifact;
- current local backup location if available.

Do not destroy the local closeout source state.

---

# 4. Step A — Refresh and verify state

Run `git fetch origin`.

Read the latest:

- `origin/develop`
- `origin/feature/b-transport-node-mobility-backbone`
- PR #466 metadata
- TASK-086-B Task / Result
- `docs/qa/TASK-086/` and/or current TASK-086 QA directory actually used by the repository
- Master WBS

If the remote PR head is no longer `406d31f0a6b52f321b79fa4694f985709288407f`, do not assume this task text is current.

Instead:

1. record the new remote head;
2. compare it with the preserved local closeout head;
3. prove whether the new remote head already contains any recovery work;
4. adapt the publication base without overwriting remote work.

---

# 5. Step B — Identify every push-blocking blob

Inspect **all objects that would be introduced by the push**, not only the current working tree.

At minimum, inspect:

`origin/feature/b-transport-node-mobility-backbone..LOCAL_CLOSEOUT_HEAD`

Produce a machine-readable inventory of blobs near or above the GitHub limit.

The known blocker is:

`core-stage-acceptance.json`

but do not assume it is the only one.

Important:

**Deleting the file in a later commit is not sufficient if the >100 MB blob still exists in an unpublished commit being pushed.**

Acceptance requires that the complete to-be-pushed object range contains no GitHub-rejected blob.

Write:

- `docs/qa/TASK-086/closeout-publication-blob-audit.md`
- `docs/qa/TASK-086/closeout-publication-blob-audit.json`

using the repository's actual TASK-086 QA directory if naming differs.

---

# 6. Step C — Reconstruct only the unpublished closeout range

Use the current remote feature head as the clean publication base.

Preferred recovery shape:

1. keep the old local closeout branch/head untouched as evidence;
2. create a local recovery branch from the **current remote PR head**;
3. reproduce the final tree/diff represented by the preserved local closeout head;
4. omit Git-hostile raw artifacts from Git history;
5. replace omitted raw artifacts with compact auditable manifests;
6. commit the recovered closeout state on top of the remote PR head.

A squash/reconstruction of the **unpublished** local range is allowed.

It must remain a fast-forward descendant of the current remote PR head.

Before push prove:

`git merge-base --is-ancestor REMOTE_PR_HEAD RECOVERY_HEAD`

must succeed.

No force push.

---

# 7. Oversized evidence handling

For each omitted oversized raw evidence artifact, preserve at least:

- original repository-relative path;
- byte length;
- SHA-256;
- producing command / producing stage;
- source local closeout head;
- frozen input SHA where applicable;
- whether the artifact is reproducible;
- local backup/reference path if safely recordable;
- reason the raw artifact is not tracked;
- compact derived summary required for review.

Create an explicit compact manifest, for example:

`docs/qa/TASK-086/core-stage-acceptance.manifest.json`

or the repository's established equivalent.

Do **not** silently introduce Git LFS unless the repository already uses it for this evidence class and existing project policy explicitly permits it.

Do not upload the >100 MB raw artifact to the normal Git repository.

If a deterministic regeneration command exists, document it.

---

# 8. Final-tree equivalence gate

The recovered publishable tree must be equivalent to the preserved local closeout head except for:

1. intentionally excluded Git-hostile raw artifact(s);
2. their compact manifests/summaries;
3. publication/validation scripts or workflow fixes required by this task;
4. closeout documentation updates.

Generate a file-by-file equivalence report between:

- preserved local closeout head;
- recovered publication head.

Any other difference is a blocker until explained.

Output:

- `docs/qa/TASK-086/closeout-tree-equivalence.md`
- `docs/qa/TASK-086/closeout-tree-equivalence.json`

---

# 9. Step D — Recover validation without weakening it

The previous validation timed out after 5400.12 seconds.

Do not make the task pass by:

- deleting tests;
- skipping required tests;
- borrowing success from an older head;
- materially relaxing assertions;
- arbitrarily increasing test timeout until it passes;
- reducing required coverage.

Instead:

1. identify the actual test inventory and bottleneck;
2. isolate the recorded failure:
   `nightly --dry-run does not write canonical catalogs`;
3. run that test alone and record the result;
4. determine whether the full-suite timeout is caused by resource contention, serial scheduling, duplicate expensive rebuilds, or a real hang;
5. split the exact-head validation into bounded deterministic lanes/jobs if needed;
6. ensure the union of lanes still executes the full required regression;
7. keep clean rebuild / resume / corruption / publication-artifact proof independently auditable.

If CI sharding is introduced:

- every required test must belong to exactly one intentional lane or to a documented shared setup;
- no test may disappear from the full inventory;
- record lane membership and counts;
- preserve failure propagation.

Create:

- `docs/qa/TASK-086/closeout-validation-plan.md`
- `docs/qa/TASK-086/closeout-validation-receipt.json`

---

# 10. Step E — Push to the existing PR branch

Before push verify:

- recovery head descends from current remote PR head;
- no >100 MB blob exists in the push object range;
- no unexpected large raw caches are tracked;
- final-tree equivalence gate passes;
- focused TASK-086 tests pass;
- lint/typecheck/build and required artifact checks pass locally where supported.

Push the recovered head to:

`feature/b-transport-node-mobility-backbone`

using a normal fast-forward push.

Do not create a second implementation PR.

PR #466 must remain Draft/Open.

---

# 11. Step F — Exact-head CI

After the push, run/observe the Quality Gate that checks out the **actual branch HEAD**.

The final receipt must prove:

- expected branch head SHA;
- actual checked-out SHA;
- equality of expected and actual SHA;
- all required validation lanes completed;
- deterministic/published-artifact proof completed;
- no result was borrowed from a historical merge-test SHA.

A PR merge-test run is useful secondary evidence but is **not** a substitute for branch exact-head certification.

---

# 12. Acceptance rules

## PASS_CLOSEOUT_PUBLICATION_RECOVERY

Only if all are true:

1. closeout state is pushed to existing PR #466;
2. push is normal fast-forward;
3. no >100 MB blob exists in the pushed object range;
4. oversized evidence has compact hash-bound manifests;
5. recovered final tree is equivalent to the preserved local closeout head except documented publication-only differences;
6. focused validation passes;
7. the complete required regression finishes rather than timing out;
8. clean deterministic/recovery/published-artifact proof finishes;
9. the recorded nightly dry-run failure is resolved or correctly proven to be a pre-existing/non-TASK-086 baseline failure with evidence;
10. exact-head branch Quality Gate passes on the final remote head;
11. PR #466 remains Draft/Open;
12. the 251 certification blockers remain preserved and are not silently reclassified;
13. WBS 7.16 remains `B / 阻塞`.

## BLOCKED_CLOSEOUT_PUBLICATION_RECOVERY

Return this if any publication or validation gate above cannot be closed.

List exact remaining execution blockers separately from the 251 certification blockers.

---

# 13. Required result update

Update the existing TASK-086-B Result with:

`## Closeout Publication Recovery`

Include:

- previous remote head;
- preserved local closeout head;
- recovery head;
- final remote PR head;
- oversized blob audit;
- omitted raw evidence hashes;
- tree equivalence outcome;
- isolated nightly test outcome;
- full regression outcome;
- deterministic/recovery proof outcome;
- exact-head Quality Gate URL/result;
- remaining execution blocker count;
- remaining certification blocker count;
- WBS status.

Do not replace or erase the previous BLOCKED Final Closeout history.

---

# 14. WBS rule

Regardless of publication recovery PASS:

`WBS 7.16 = B / 阻塞`

until the certified national Backbone itself passes its certification and national-connectivity gates.

Publication recovery is **not** authorization to set:

- 待审查
- 已完成

for WBS 7.16.

---

# 15. Git/PR rules

Allowed:

- local preservation branch/tag/reference;
- reconstruction of never-published local commits;
- normal commits;
- normal fast-forward push to the existing feature branch;
- closeout-only CI/workflow repair;
- Result/QA/WBS synchronization.

Forbidden:

- force push;
- rewrite of published PR history;
- second implementation PR;
- merge / auto-merge;
- develop push;
- certification-root remediation;
- new discovery;
- downstream Task execution.

---

# 16. Final response format

First line must be exactly one of:

`PASS_CLOSEOUT_PUBLICATION_RECOVERY`

or

`BLOCKED_CLOSEOUT_PUBLICATION_RECOVERY`

Then report:

```text
DEVELOP_SHA=
REMOTE_HEAD_BEFORE=
PRESERVED_LOCAL_CLOSEOUT_HEAD=
RECOVERY_HEAD=
REMOTE_HEAD_AFTER=
PR=

PUSH_OBJECT_MAX_BLOB_BYTES=
OVERSIZED_RAW_ARTIFACTS_OMITTED=
TREE_EQUIVALENCE=

FOCUSED_TESTS=
NIGHTLY_DRY_RUN_TEST=
FULL_REGRESSION=
DETERMINISTIC_RECOVERY_PROOF=
EXACT_HEAD_QUALITY_GATE=

CERTIFICATION_BLOCKERS=
EXECUTION_BLOCKERS=
WBS_7_16_STATUS=
```

If blocked, include:

```text
EXACT_EXECUTION_BLOCKERS=
NEXT_MINIMUM_REMEDIATION=
```

Then provide paths/links to:

- updated TASK-086 Result;
- blob audit;
- oversized artifact manifest;
- tree equivalence report;
- validation plan/receipt;
- exact-head Quality Gate;
- PR #466.

After reporting, stop.

Do not automatically continue certification remediation or any other Task.
