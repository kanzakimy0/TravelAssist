# TASK-071-A one-pass QA — 2026-10-10

**BLOCKED_TECHNICAL_AND_HOLD_OWNER**. A remains Canonical Owner; B is authorized execution support. This supersedes earlier status statements, not their historical evidence. Phase 0 was reused, not repeated.

## Revision identity

- Full independent network clone: I:/Codex/TravelAssist-task071-20261010; no depth/filter/shared/alternates. Initial checkout was clean. Original dirty workspace and earlier attempts were not cleaned.
- Local final candidate HEAD: 7e3160ac78cb3b1dbc27b4d2194bc98ca72f5bdb.
- Ordinary integration merge: b156425d66a04a6e13c96fe7ea01ad7e399beed8, parents a50239a72d7dacfdf3919222892469f55d350de5 and cfd51e42f96e43f84f406c6aab5aab6e408b713e.
- Latest execution-time develop: cfd51e42f96e43f84f406c6aab5aab6e408b713e; rechecked against remote.
- Text conflicts: package.json and docs/project/WBS-TravelAssist.md only; additive security commands retained alongside canonical test runner.
- Source candidate is local and unpublished. Remote PR #231 remains the original Draft. Documentation publication SHA and hosted receipts are recorded separately in its final comment.

## Actual final-head gates

| Gate                | Status                          | Receipt                                                                                      |
| ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| ai-bundle           | PASS                            | exit 0; timeout false; [receipt](ai-bundle-execution.json)                                   |
| ai-runtime          | PASS                            | exit 0; timeout false; [receipt](ai-runtime-execution.json)                                  |
| boundary            | PASS                            | exit 0; timeout false; [receipt](boundary-execution.json)                                    |
| bundle              | PASS                            | exit 0; timeout false; [receipt](bundle-execution.json)                                      |
| canary-build        | PASS                            | exit 0; timeout false; [receipt](canary-build-execution.json)                                |
| compatibility       | PASS                            | exit 0; timeout false; [receipt](compatibility-execution.json)                               |
| deploy-build        | PASS                            | exit 0; timeout false; [receipt](deploy-build-execution.json)                                |
| deploy-validate     | PASS                            | exit 0; timeout false; [receipt](deploy-validate-execution.json)                             |
| deploy-verify       | PASS                            | exit 0; timeout false; [receipt](deploy-verify-execution.json)                               |
| diff-check          | PASS                            | exit 0; timeout false; [receipt](diff-check-execution.json)                                  |
| format-deploy       | PASS                            | exit 0; timeout false; [receipt](format-deploy-execution.json)                               |
| full-node           | FAIL                            | exit 1; timeout false; [receipt](full-node-execution.json)                                   |
| inventory           | PASS                            | exit 0; timeout false; [receipt](inventory-execution.json)                                   |
| lint                | PASS                            | exit 0; timeout false; [receipt](lint-execution.json)                                        |
| python-fixture      | PASS                            | exit 0; timeout false; [receipt](python-fixture-execution.json)                              |
| security-tests      | PASS                            | exit 0; timeout false; [receipt](security-tests-execution.json)                              |
| tracked             | FAIL                            | exit 1; timeout false; [receipt](tracked-execution.json)                                     |
| typecheck           | PASS                            | exit 0; timeout false; [receipt](typecheck-execution.json)                                   |
| npm ci              | PASS                            | Locked install before local merge commit; npm-ci log hash in supplementary receipt           |
| History             | FINDINGS                        | 1875 commits; 66616 objects; 47 unresolved occurrences; [report](history.json)               |
| Hosted Quality Gate | BLOCKED / NOT_RUN for candidate | D1 prevents candidate publication; no borrowed CI results                                    |
| Hosted Security CI  | NOT_RUN for candidate           | Prior docs head run 38022648737 failed history; new docs-only run is separately recorded     |
| PR merge-result     | UNAVAILABLE for candidate       | Remote PR conflicts; stale ref 4d7e348a… has neither current head nor current develop parent |

Canonical ordinary regression: **FAIL**, 103/155 direct file summaries; observed No final summary; see failed canonical receipt and bounded process termination evidence. Actual failed files and their counts: [canonical-observed-counts.json](canonical-observed-counts.json). Original frozen TASK-086 assertions stay active. No failing test was removed from the required inventory, reclassified or allowed to pass.

Canonical child process timeout: true; budgets: 1800000 ms. The outer npm wrapper can return exit 1 without itself timing out; inspect the canonical receipt for the actual child timeout. A Windows ordinary-rebuild timeout is a technical blocker, not an Owner decision and not a passing test count.

Supplemental diagnostics after the canonical failure executed 51 previously unexecuted independent files using their current reviewed hashes. These do not replace the blocked rebuild test or turn the canonical gate green. See [supplemental receipt](supplemental-execution.json) and [actual counts/failures](supplemental-observed-counts.json).

Tracked scan: 12363 files / 10653 decoded text files / 984233362 bytes; 2 unresolved external-source findings remain. History metadata and content scan completed with zero scanner errors; coverage still excludes recorded binary/oversized content, reflog-only/dangling objects, inaccessible refs and external LFS payloads. History findings are 14 exact path/category/fingerprint groups, not 14 proven credentials.

## Remediation and review

Two numeric template values are blank, and runtime default behavior is explicitly tested. The synthetic URL test constructs the identical invalid credential URL at runtime before the same rejection assertion. The AI fixture constructs the same mock-only value; all configured OpenAI calls use injected execution, and original negative assertions remain.

The 9.1 supplement records reviewed previous/current hashes for assets, coral and AI tests, registers the original security suite, preserves immutable policy/assertion scripts and original round-robin partition, and adds negative tests against unrelated paths, stale hashes and duplicate additions. Inventory --write was used only after that per-file review validated. 155 direct + 4 indirect = 159 unique selected files. Formal D2 Owner reply is still pending; the current user explicitly authorized the technical work and is not represented as A's reply.

Security workflow now uses .nvmrc, Python 3.12, actual revision recording, canonical inventory/npm test and retained receipts. Original scan, history, boundary, lint, typecheck, build, bundle and format gates remain. Its job timeout accommodates the existing 30-minute canonical runner; scanner budgets/categories and the 102-entry allowlist are unchanged. Quality Gate's original workflow is preserved byte-for-byte; future exact-head proof uses its existing workflow_dispatch with expectedHead and task086FinalCloseout, and PR events produce separately classified merge-result receipts.

## Retained diagnostic attempts

The first local full-regression attempt at b156425d… was interrupted for remediation after identifying the overly broad Quality Gate push trigger, a 30-second asset dry-run timeout under concurrent I/O, and a .next read during concurrent build. Original test thresholds were not raised. The corrected final-head run above is serial with builds. A Python discovery invocation registered zero tests and exited 5; the actual file entrypoint was then run and is the applicable receipt. Initial concurrent fsck diagnostics reported missing objects; the stabilized full fsck and missing-object enumeration supersede them and report no missing objects. These diagnostics are never counted as passing gates.

## Owner holds

See [OWNER-DISPOSITION-AND-REMEDIATION-MATRIX.md](OWNER-DISPOSITION-AND-REMEDIATION-MATRIX.md), [source plan](source-disposition-plan.json), and [TASK-086 plan](task086-refresh-plan.json). No source redaction, manual credential decoding or online validation, new allowlist, frozen refresh, force push, history rewrite or merge was performed. Technical failure and pending Owner decisions keep WBS 9.10 blocked, not accepted.

## Final coverage and technical blockers

154 of 155 registered direct files produced file summaries across the canonical attempt and explicitly separate supplemental diagnostics. The required deterministic rebuild timed out and remains required. Supplemental execution observed **1123 tests: 1120 pass, 3 fail, 0 skip/cancel/todo**. Two failures directly compare stale certification bindings; the third compares generated versus published artifact-tree hashes after repeat scratch generation matched. Semantic equivalence has not been established by the authorized R035-05 refresh. See [remaining-technical-blockers.json](remaining-technical-blockers.json).

All four test review base hashes were checked against their actual base files, and every old assert.* AST remains in the new file; see [assertion-preservation-proof.json](assertion-preservation-proof.json). Local lint exits 0 with the existing 69 warnings, not zero warnings. AI bundle audit separately passes all 36 emitted browser JS chunks. The full canonical gate, tracked/history findings, frozen compatibility, and hosted candidate gates are not green.
