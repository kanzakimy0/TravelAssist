# TASK-085-B Post-Canonical Final Replay QA

**READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS**. WBS 7.15 = 待审查（audited fixpoint exceptions）, not completed. Draft PR #464 only; no merge, auto-merge or TASK-086.

Raw membership/output coverage is 100/100. Authoritative assessment count is 95, confirmed coverage 94/95, >=3 useful nodes 86/95, mean 3.578947, median 3. All 5,200 admitted nodes, 344 HOLD, 340 relationships / 680 directed topology edges and candidate decisions are conserved. A/Canonical gates PASS. Twenty-one topology gates PASS, three remain FAIL exclusively for the nine audited fixpoint cases.

## Integration

Latest develop: `5123966f62dbe9587a3bbe38e877ccf3ea959b80`. Normal merge into B: `509c9fda40bb443b5a9c4a5e6ef36e875e713744`. Amendment `8ac80bf5d684a34145489f27c6cf2e6bd1e22e67` is included. Five owner-adjudicated records retain identity and raw outputs, with no new visitor endpoint or replacement. Pending Canonical adjudication count is zero.

The [Result](../../tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md) contains the full authority hashes, nine-case acceptance table, old/new proof hashes and exact failed-gate values. [Supporting-hash audit](canonical-supporting-hash-audit.md) preserves the historical CRLF diagnosis and records PR #465's authorized correction.

## Reproduce offline

~~~sh
node --import ./tests/register-route-ts.mjs tools/transport/task-085-canonical-replay.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --resume
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rerun-batch 1
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rebuild
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-gate0.test.mjs
~~~

No extractor or network discovery command is part of this replay. The receipt audit uses local Git history (fetch-depth 0) to verify the frozen B baseline and merged develop. `--write` is only for explicitly rebuilding that bridge from verified Git blobs; ordinary generation consumes and validates the committed receipt. All original input files remain byte-identical.

The replay bridge permits Canonical rebinding only after identity/coordinate/membership, all 95 unchanged records, new owner authority and all original source/review/license inputs validate. Source reviews retain their historical hash on disk. The new Canonical fingerprint invalidates the old intact batch receipt; subsequent resume checksum-skips. One batch contains 100 records under the configured 200 limit. Synthetic tests cover 200/201.

The generator returns exit 0 for a deterministic run reaching the explicitly authorized user-acceptance status. That exit code is not data PASS: final-acceptance-gate.json retains `allPass=false`, three failed hard gates and `userAcceptanceRequired=true`. `--check` checks exact artifact bytes without changing them. Unresolved metrics remain null and never delete confirmed topology.

## Evidence and tests

- [Replay audit](../../../data/transport/access/post-canonical-replay-audit.json): all nine proof validations, exact missing evidence, unchanged source/rights/admission/candidate hashes and no new blocker-releasing evidence from PR #465.
- [Replay bridge](../../../data/transport/access/inputs/post-canonical-replay.json): old/new authority, baseline record projections and every preserved input hash.
- [Final gate](../../../data/transport/access/final-acceptance-gate.json): 21 PASS / 3 FAIL, no silent exception-to-PASS conversion.
- [Completeness](../../../data/transport/access/poi-access-completeness.json): 100 explicit records, owner eligibility per record.
- [Under-target](../../../data/transport/access/under-target-pois.json): exactly nine assessed cases; no owner exclusions counted as pending failures.
- [Proofs](../../../data/transport/access/candidate-exhaustion-proofs.jsonl): nine SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF; zero physical exhaustion claims.
- [Owner cases](../../../data/transport/access/canonical-adjudication-required.json): five resolved owner decisions, zero pending.
- [Manifest](../../../data/transport/access/manifest.json): input/code hashes, separate raw/assessment counts, unresolved metric coverage and source-license decisions.

Twenty-one focused tests cover the original graph/rights/directional/topology/route/batch checks plus replay corruption, changed membership/coordinates/eligibility/source evidence, altered original reviews, a new non-fixpoint failure and exact preservation of nodes/edges/decisions. Actual temporary filesystem tests rebuild independently, compare every byte, skip valid receipts, invalidate changed input, inject corrupt receipts and artifacts, repair one batch, and reject unsafe receipt paths. No Provider metrics are synthesized.

## Validation receipt

[local-validation.json](local-validation.json) records final commands, exit status and local-log SHA256. Full regression uses --test-concurrency=4 on Windows to avoid unrelated child-process contention; no test timeout or public runtime behavior is changed. Focused checks are repeated within the final full suite after all code changes.

Exact final B head and workflow_dispatch Quality Gate run are published in existing Draft PR #464 after push. The workflow must report that exact head, not an earlier head or PR merge ref. The green code gate does not erase the three failed topology thresholds.

Stop at user acceptance of the nine factual data boundaries. No national S12/P11/GTFS rediscovery, rejected v1 usage, unreviewed v2 promotion, route-provider request, raw payload persistence, merge, auto-merge or TASK-086 execution.

Final full regression: **2,850/2,850 PASS**, including all **21/21** focused tests after final code changes. Lint: 0 errors / 10 existing warnings. Typecheck, format and deployment validation PASS.

Production build and standalone artifact re-verification: **PASS**, 1,908 files. Exact final-head CI receipt is in Draft PR #464.
