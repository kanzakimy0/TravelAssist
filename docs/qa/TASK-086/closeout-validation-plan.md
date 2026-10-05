# Closeout publication recovery validation plan

Authority: TASK commit97861ffd420dd7b5e26af7187233f6f13e1b64d2; same TASK086-B/WBS7.16/PR466. No certification-root remediation. All251certification blockers and all traffic outputs remain unchanged.

## Inventory and bounded lanes

The existing full command selects every tests/*.test.mjs file. The generated closeout-validation-inventory.json assigns150files exactly once: assets5, four normal regression lanes36each, rebuild1. No file/assertion is deleted or skipped. New publication negative tests are included. Each file runs with the same import hook; concurrency1 prevents unrelated heavy graph jobs from consuming the asset subprocess's original30s deadline on the same machine. GitHub jobs have independent filesystems/runners.

The original heavy rebuild test remains. Without lane evidence it uses the original serial verifier. In CI it aggregates same-checkout/input/code/environment receipts from: raw retained extraction(20min command/25min job), first clean generation(40/45min), second clean generation(40/45min), complete checksum resume(40/45min), and original rebuild regression+all27actual published bytes+real-batch corruption/explicit repair(15/25min). First/second/resume seal every actual batch and receipt. Both full manifests, all27artifact hashes, proof inputs and1337checksum skips must match. Existing crash/corruption/changed-source focused tests still execute in the full inventory. No manual hash/rights/threshold changes.

Normal regression commands are bounded25min/job35min; lint/types/format/build/artifact gates25min. A final always-run aggregation propagates any failure, cancellation, timeout or missing job. Command launch or partial proof cannot pass.

## Nightly failure diagnosis

Prior full run reported dry-run failure at30031.6185ms, contemporaneous with heavy synchronous graph generation and default multi-file process concurrency. Old run did not retain a completed failure-detail stack; do not invent an exact error or call it baseline. Isolated preserved-head check passes22695.9586ms/actual exit0 with unchanged30s timeout. Recovery assets lane dry-run passes11802.2987ms; its initial unrelated verify/coverage errors were positively traced to the new QA filename ending .manifest.json, which the established asset inventory treats as a visual manifest. Rename to core-stage-acceptance-compact.json removes this publication-only collision, without changing asset code/catalogs. Revalidate all asset tests and CI; only actual exact-head success closes this gate.

## Bottleneck and environment

Previous full verifier serially recomputed244research phases over1337batch receipts three times even on checksum resume; two completed clean generations were observed at~31min each, then resume was killed by the90min aggregate deadline. Sharding runs the same production code; it does not replace the full graph with a tiny fixture. Windows diskF was insufficient for a second checkout; recovery usesI and preservesF source. Cross-drive node_modules junction caused explicit Turbopack filesystem-root rejection, so dependencies are copied insideI using the same package/lock/version; no Next/product configuration change. Preserve first failure logs and distinct post-fix receipts.

## Exact-head identity

Each job records branch event SHA and actual checkout SHA via tools/qa/ci-revision.mjs. workflow_dispatch expectedHead must equal GITHUB_SHA and checked-out HEAD. PR merge-test receipts are secondary and labelled as such. Final direct-head Quality Gate must succeed on the current remote SHA; historical PASS is never substituted. Tests/proof receipts and immutable logs are retained as GitHub artifacts. Final result will distinguish publication recovery from BLOCKED_CERTIFIED_NATIONAL_BACKBONE.

## First actual exact-head CI and fixture recovery

Run37300605866 explicitly checked out d8e09f2ed70bc41269b3d3b27105deac2f80cfc8. Quality/assets/raw-extraction and regression0/2 passed. Regression1 and3 failed real P04/CSV hash assertions: Git had converted two native hash-bound fixtures fromCRLF toLF. Original native ZIP and production retained CSV prove byte-only drift; no expectation/assertion changed. Exact native bytes restored with two precise -text attributes, related negative/positive tests pass. These two fixture paths are explicitly documented publication/validation exceptions to tree equivalence; all traffic/certification inputs and251roots unchanged. First failed CI's still-running heavy generations cancelled to avoid redundant work; they are CANCELLED, neverPASS. The replacement direct-head run must complete every lane.

## Actual serialized replay correction

Second direct-head run37301471450 onb0dda83 passed all149ordinary files, retained extraction, quality gates and both clean runs; resume failed only the new comparison of a returned JavaScript object to its persisted JSON. undefined attribution entries become null. Downloaded complete manifest andall27files are byte-identical before/after replay. Fix compares actual persisted bytes, then parsed metadata, retains all1337checksum skips/receipt seals. Negative tests reject metadata and formatting drift. Original failed run remainsFAIL; no old receipt is rebound. A fresh final exact-head run must complete the original rebuild test and allproofs.

The final always-run gate emits a compact immutable current-head receipt only after every required job succeeds and the original complete deterministic/recovery/published proof matches currentcheckout/run/attempt. This CI artifact records final SHA and actual result; tracked documents never invent an unknown future head/PASS. Each job remains bounded; no timeout was increased and no assertions removed. Local Nodev24.18.0/Windows and current GitHub Nodev24.21.0/Linux are recorded environments, not interchangeable performance evidence. Model/token/cost usage is unknown.
