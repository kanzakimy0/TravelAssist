# TASK-085-B full-coverage execution QA

**Data acceptance: FAIL. WBS 7.15: 进行中.**
Code verification and deterministic generation are separate from usable-access acceptance.
The old immediate Gate-0 audit at commit a815bf7 is superseded by this task-local attempt.

## Reproduce

Use the repository Node version and locked dependencies.

~~~sh
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --check
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --resume
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rerun-batch 1
node --import ./tests/register-route-ts.mjs tools/transport/task-085-access-generation.mjs --rebuild
node --import ./tests/register-route-ts.mjs --test tests/task-085-b-gate0.test.mjs
~~~

The generator has no network client and does not query a route Provider. Inputs are frozen,
attributed research/topology sources. Generation/resume/rerun exits **2** when data acceptance
fails. --check exits 0 only when the committed blocked/failed artifacts match their expected
bytes; it prints the failed acceptance status and never promotes that status.

Receipts seal the input fingerprint, POI IDs and artifact hashes. Resume validates before
skipping. Intact old receipts are invalidated when source/config/implementation hashes change.
Corrupted receipts or artifacts stop resume; --rerun-batch N is the explicit repair operation.
Unexpected or stale task artifacts also fail. Each batch has at most 200 POIs; integrity PASS
permits the next batch's scan, while corpus acceptance remains separate.

GeneratedAt is the configured, frozen 2026-09-30 evidence-snapshot date, not an execution
wall-clock timestamp. No nondeterministic timestamp or metadata is excluded from generated
artifact byte comparisons. Inputs and code hashes are recorded in manifest.json.

## Source rebuild

The raw ZIP files are local cache material and not committed. Obtain only the three explicitly
licensed static downloads from inputs/source-rights.json, verify the pinned archive SHA-256,
then run:

~~~sh
python tools/transport/task-085-source-extract.py --archive .cache/qa/task085-full/sources/S12-25_GML.zip
python tools/transport/task-085-gtfs-extract.py --source-dir .cache/qa/task085-full/sources
~~~

The extractors verify hashes and create bounded S12 evidence / GTFS stop evidence.
They do not admit nodes or infer access metrics. Initial identity bindings are committed
separately; a new or moved identity cannot silently inherit downstream authorization.

## Evidence and focused tests

- [Result](../../tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md):
  base, original PR #449, exact authorization fields, hashes, provider decision and required metrics.
- [Manifest](../../../data/transport/access/manifest.json) and
  [final acceptance](../../../data/transport/access/final-acceptance-gate.json):
  every data gate is explicit, including the pre-existing Canonical supporting hash failure.
- [Unresolved POIs](../../../data/transport/access/poi-access-unresolved.jsonl):
  all 100 exact IDs and source-specific gaps; 4 HUMAN_REVIEW_REQUIRED cases.
- [Scoped exhaustion proofs](../../../data/transport/access/candidate-exhaustion-proofs.jsonl):
  2 closed venues only. The other 98 under-target POIs do not have invented proofs.
- [Iteration ledger](../../../data/transport/access/auto-fix-iterations.jsonl):
  S12 discovery, official access/special-mode research, licensed GTFS expansion, then constrained
  replay. This is not evidence of exhaustive global discovery; that machine flag remains false.

The 14 TASK-085 tests exercise missing license, unregistered/rebound/duplicate identity,
ambiguous source components, spatial caps and rejection ranks, independent directions,
partial-pair quarantine, real walking distance/time requirements, estimates/straight distance,
extreme detours, river/rail/highway/mountain/gated/impossible-route checks, placeholder
concentration, and acceptance refusal with zero usable coverage.

Filesystem tests compare independent rebuilds byte-for-byte, validate checksum skip,
tamper with a receipt and a batch file, repair one batch, change the source fingerprint,
and exercise the 200/201 boundary. Fixture route sources use example.test and exist only
inside tests; production route-observations.jsonl is empty.

## Local checks and exact-head CI

[local-validation.json](local-validation.json) records final commands, outcomes and local log
SHA-256 values. The first default-concurrency full regression had one asset dry-run
ETIMEDOUT (30 seconds), preserved as a failure. The isolated file recheck also timed out (50/51); the complete rerun with --test-concurrency=4 passed **2,838/2,838**. The 14 final focused tests passed after LF normalization. Follow-up results are recorded separately.
No unrelated test timeout or public runtime behavior was changed to obtain a pass.

The final branch commit receives a separate workflow_dispatch Quality Gate run.
The Draft PR body records its exact head_sha, URL and conclusion after completion; a PR merge
ref or an older head is not substituted. Tests/build may pass while final data acceptance fails.

No rejected v1, automatic v2 candidate promotion, Provider bulk calls, raw route payload
persistence, Planner/API changes, 43D edge payload, merge, auto-merge or TASK-086 work.

## Final local verification summary

| Check | Result |
| --- | --- |
| Focused TASK-085 | 14/14 PASS |
| Full regression, bounded concurrency | 2,838/2,838 PASS |
| Lint | 0 errors; 10 existing warnings |
| Typecheck / format:check:deploy | PASS / PASS |
| Local deployment validation / build | PASS / PASS |
| Standalone artifact re-verification | PASS, 1,908 files |
| Source extractor deterministic comparison | PASS, 5 files byte-identical |
| Batch / receipt / generated-artifact checks | PASS |
| Data acceptance | FAIL |
| Global discovery fixpoint | NOT PROVEN |
