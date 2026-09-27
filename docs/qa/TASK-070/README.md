# TASK-070 P0 evidence review QA

322/322 complete: P0-0001 = 200, then P0-0002 = 122 automatically. Final outcomes: 246 REVIEWED_PARTIAL, 1 REVIEWED_NO_SUPPORTED_ATTRIBUTE, 72 REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT, 3 REVIEW_BLOCKED_IDENTITY. Processing errors: 0. The explicit review queue contains 76 candidates.

Added 778 supported feature values, 2 partial numeric-duration profiles, 180 unique scoped anchor nodes and 207 static access relations. Scored candidates increased from 26 to 272. Unknown values remain null. These editorial candidate annotations are not independent Human Gold, current operational facts, or authorization for production import.

## Reproduce

Use the locked Node/npm versions. Only one writing process may operate on this offline worktree at a time.

```sh
npm ci
node tools/poi/combine-corpus.mjs --check
node --import ./tests/register-route-ts.mjs tools/poi/review-p0.mjs --dry-run
node --import ./tests/register-route-ts.mjs tools/poi/review-p0.mjs --resume
node --import ./tests/register-route-ts.mjs tools/poi/review-p0.mjs --check
node --import ./tests/register-route-ts.mjs tools/poi/audit-p0.mjs
node --import ./tests/register-route-ts.mjs --test tests/task-070-p0-evidence-review.test.mjs
```

For the retained raw cache, append `--cache <local-jnto-records.json>` to the review command. Its frozen SHA must be `c7b10bc79391e30e0aad29697dbd7caf41d010d335634114122cc534c30b36d3`. This verifies all 861 source text hashes and 987 P0 fact locators against the actual retained bytes. Locator offsets and lengths use JavaScript UTF-16 code units, matching the retained verifier. The raw cache is deliberately not copied into Git. Without it, CI verifies the committed evidence/locator structure, hashes, sidecar correspondence and deterministic checkpoint; it does not claim to independently reread raw articles.

`--batch P0-0001` is bounded and cannot publish P0_COMPLETE. `--batch P0-0002` requires the first valid receipt. The unbounded command performs both in order. Completed identical batches skip; missing or corrupt receipt/output rebuilds from frozen inputs. Identity, rubric, raw-source or unsafe-linkage corruption fails closed. A single ordinary processing failure retains baseline nulls and enters the error queue while other candidates continue.

## Checkpoint interpretation

The current sidecars reuse TASK-068 contracts and generator functions. TASK-068 QA/manifests remain historical, immutable evidence of its accepted head; their output hashes intentionally describe the upstream snapshot. **Do not run the historical TASK-068 generator in write mode over P0 outputs.** Use `p0-current.v1.json` and the commands above for current certification.

P0 batches span original physical partitions, so each receipt hashes its ordered logical projection, including only its own source contributions to shared anchors. This lets P0-0002 append evidence without invalidating P0-0001. The aggregate current manifest additionally hashes every full current physical output file. Every receipt is written after successful output readback. A rebuild never parses corrupted sidecars as authoritative inputs.

`first-batch-proof.json` records the actual initial 200-row checkpoint before second-batch review. It is historical. `recovery-proof.json` records the final corrected dataset and real repair checks. Position 3's unsupported road relation was removed; position 201's bus-stop type was corrected. Position 320’s educational score was also removed because priest-guided access does not explicitly establish educational interpretation. Candidate identities remain unchanged.

## Evidence files

- `aggregate.json`: independently checked before/after totals and unchanged identity/Registry hashes.
- `P0-0001.json`, `P0-0002.json`: individual outcomes, metrics and batch QA.
- `review-error-queue.jsonl`: 75 blocked candidates and 1 no-supported-attribute candidate, with reasons.
- `independent-audit.json`: 208 partition preservation checks; 173 input/output hashes and credential scans; no findings.
- `recovery-proof.json`: exact retained-source validation and seven real execution events, including malformed output and incomplete receipt recovery.
- `gates.json`: actually executed commands, timestamps, exit codes and private local log hashes. GitHub CI provides remote exact-head evidence.
- Frozen population and receipts: `data/poi/full/manifests/p0-population.v1.json`, `P0-0001.json`, `P0-0002.json`, `p0-current.v1.json`.

The focused tests create an isolated temporary fixture, prove that a bounded first run leaves all second-batch candidates untouched, automatically continue, invalidate changed inputs, reject a non-date receipt completion time and recover damaged output. Fixture paths are checked before cleanup. No internet/provider calls are made.

## Limitations and acceptance

The source set overrepresents cultural sites. Editorial 0–9 values apply the existing rubric but are not an independently calibrated ranking; no claim of unbiased full-corpus coverage is made. Category-only metadata, off-target recommended places, inconsistent identity, vague durations and stale dynamic information are left unknown. The three identity conflicts require later review, with original keys and claims unchanged.

Full repository gates and Draft PR Quality Gate are tracked in the [Result](../../tasks/RESULT-TASK-070-b-p0-poi-evidence-review.md). P1 is not started. This task does not merge PRs, close Issue #396, allocate Master Codes, rebind Registry entries, import production data or modify Planner/runtime behavior.

Windows full-suite invocation (explicit file arguments avoid shell glob ambiguity):

```powershell
$task070Tests = Get-ChildItem tests -Filter *.test.mjs | Sort-Object Name | ForEach-Object FullName
node --import ./tests/register-route-ts.mjs --test $task070Tests
```
