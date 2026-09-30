# TASK-085-B Round 2 QA

**Data status: BLOCKED_SOURCE_LICENSE_IDENTITY_FIXPOINT. WBS 7.15: 进行中.**

This corrects topology/metrics coupling on Draft PR #464 and preserves the original checkpoint. Current output has 680 directed topology edges, 94/100 POIs with access, nine explicit external source/identity fixpoint proofs and five Canonical owner cases. Walking/transit/taxi metrics remain unresolved. The 17 passing topology gates and five failing gates are individually recorded; this is not a data-acceptance PASS.

## Reproduce the frozen replay

Use the repository Node version and locked dependencies from the repository root:

~~~sh
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --resume
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rerun-batch 1
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rebuild
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-gate0.test.mjs
~~~

The generator has no network client. Generation/resume/rerun exits **2** for the current blocked acceptance; `--check` exits 0 only if all expected bytes match and still prints the blocked status. This is intentional, not successful data acceptance.

Receipts seal input fingerprints, exact POI membership and every batch artifact. Resume validates before skipping; input/config/code changes invalidate old receipts. Corrupt receipts/files fail closed; explicit single-batch rerun repairs that batch. Stale or unexpected task outputs also fail. Batch integrity PASS permits subsequent batches, independently of whole-corpus acceptance. The 200/201 test exercises actual two-batch behavior.

The frozen generatedAt value represents the source-review snapshot, not the wall-clock execution time. No nondeterministic fields are omitted from byte comparison. Code, source and Amendment file hashes are in the manifest.

## Source and review reproducibility

Only archives/entity snapshots with explicit grants in `data/transport/access/inputs/source-rights.json` may be downloaded. Verify pinned SHA-256 before extraction. Raw downloads are ignored local cache, not committed.

~~~sh
python tools/transport/task-085-source-extract.py --archive .cache/qa/task085-full/sources/S12-25_GML.zip
python tools/transport/task-085-gtfs-extract.py --source-dir .cache/qa/task085-full/sources
python tools/transport/task-085-p11-extract.py
python tools/transport/task-085-named-extract.py
python tools/transport/task-085-expanded-gtfs-extract.py --source-dir .cache/qa/task085-full/sources
python tools/transport/task-085-supplemental-extract.py
node --import ./tests/register-route-ts.mjs tools/transport/task-085-topology-review.mjs
~~~

P11/named extractors consume the pinned S12/P11 cache files; supplemental extraction consumes the four pinned CC0 entity JSON files. Expanded GTFS filenames/hashes are in `expanded-gtfs-sources.json`. The extractors validate archives and runtime-authorized Canonical membership; they do not fetch route metrics.

`gateway-fact-reviews.json` contains reviewed factual gateway assertions, source references, current-access decisions and join bounds. Topology review resolves names/kinds/locality/operator and emits approved or rejected identity decisions. Its seal binds the review implementation, facts, source rights, Canonical data, source records and derived outputs. A changed fact or identity cannot silently reuse old authorization.

`discovery-review-findings.json` and `discovery-review.json` are frozen evidence reviews, not automatically generated claims of Internet exhaustion. They bind each remaining POI to nine searched source categories, source URLs, named/candidate dispositions and concrete external changes required. When a source, fact, candidate inventory or rights decision changes, review the affected evidence and explicitly renew the review; the generator rejects stale review hashes. It never re-stamps a missing review to make a gate green.

## Evidence

- [Result](../../tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md): authority, hashes, counts, all nine remaining boundaries and Provider decision.
- [Manifest](../../../data/transport/access/manifest.json), [final gate](../../../data/transport/access/final-acceptance-gate.json): separate topology acceptance and metric coverage.
- [Baseline revalidation](../../../data/transport/access/baseline-revalidation.json): 1,887 original admissions, 245 original HOLD decisions and 772 candidate digests conserved.
- [Confirmed topology](../../../data/transport/access/topology-confirmed-edges.jsonl): 340 relationships, two records each.
- [Metric unresolved](../../../data/transport/access/route-metric-unresolved.jsonl): missing evidence remains null; no walking-distance substitution.
- [Completeness](../../../data/transport/access/poi-access-completeness.json), [under-target](../../../data/transport/access/under-target-pois.json): all 100 records retained, 86 reach the target.
- [Discovery proofs](../../../data/transport/access/candidate-exhaustion-proofs.jsonl): nine SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF, zero physical CANDIDATE_EXHAUSTION_PROOF; five owner cases.
- [Canonical cases](../../../data/transport/access/canonical-adjudication-required.json) and [hash audit](canonical-supporting-hash-audit.md): no upstream mutation.
- [Replay ledger](../../../data/transport/access/auto-fix-iterations.jsonl): observed expansions/replays and final closure, no invented earlier runs.

## Focused validation

17 tests cover local admission without national promotion; missing rights, duplicate/rebound identities; bounded selection and redundant gateways; both independently directed records; preserved topology with unresolved/asymmetric metrics or one prohibited route direction; geodesic/estimated-speed misuse; detour, river/rail/highway, mountain, gated and impossible-route failures; placeholders and growth guards; baseline preservation; stale/incomplete/fabricated proofs; and Canonical-only exception classification.

Filesystem tests independently rebuild and compare all bytes, skip valid receipts, invalidate changed sources, detect corrupted receipt/artifact contents, repair one batch and reject unsafe receipt paths. Synthetic fixture route observations exist only in tests. Production `route-observations.jsonl` remains empty.

## Local checks and exact-head CI

The current execution receipt is [local-validation.json](local-validation.json), including command results and local-log SHA-256 values. Round-1 failures/results remain available in the baseline Git history; they are not presented as Round-2 verification.

The full test command uses `--test-concurrency=4` on Windows to avoid the known unrelated asset-child timeout under machine-wide contention. No test timeout, runtime behavior or public contract was changed. Focused tests are also part of the full regression.

Final workflow_dispatch Quality Gate is run on the pushed branch head. Its exact head SHA, run URL and conclusion are published in the existing Draft PR body; an older commit or pull-request merge ref is not substituted. Code QA and topology acceptance remain separate.

No v1 consumption, unreviewed v2 promotion, route-provider batch request, raw route payload persistence, merge, auto-merge or TASK-086 work.

## Final local verification

| Check | Result |
| --- | --- |
| TASK-085 focused tests | 17/17 PASS, repeated in final full suite |
| Full regression | 2,841/2,841 PASS |
| Lint | PASS, 0 errors / 10 existing warnings |
| Typecheck / format:check:deploy | PASS / PASS |
| Deployment validation / production build | PASS / PASS |
| Standalone artifact verification | PASS, 1,908 files |
| Frozen artifact byte check / checksum resume | PASS / PASS |
| Topology data acceptance | FAIL, 17 gates PASS / 5 FAIL |
| Source/license/identity discovery fixpoint | PROVEN, nine explicit external boundaries |
| WBS 7.15 | 进行中 |
