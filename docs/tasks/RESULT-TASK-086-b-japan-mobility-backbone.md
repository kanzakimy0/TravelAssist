# RESULT — TASK-086-B Japan Mobility Backbone

## Final Acceptance / Closeout

**BLOCKED_CERTIFIED_NATIONAL_BACKBONE**

### Identity

- develop SHA: `5123966f62dbe9587a3bbe38e877ccf3ea959b80`
- Branch: `feature/b-transport-node-mobility-backbone`
- Final head: the enclosing commit of this result; its exact40-character SHA is independently recorded by the direct-head CI checkout receipt and the final response. No self-referential invented commit hash.
- Preserved starting head: `406d31f0a6b52f321b79fa4694f985709288407f`; requested old head `1236238c89e83088e0454d16c6eb86050e8f935c` advanced through the existing checkpoint203–220 commits. Existing uncommitted221–244 results are preserved and included.
- PR: [#466](https://github.com/kanzakimy0/TravelAssist/pull/466), existing Draft/Open; no second implementation, merge or auto-merge.
- Quality Gate: current enclosing-commit direct-head run is required. [Workflow/check receipts](https://github.com/kanzakimy0/TravelAssist/actions/workflows/quality-gate.yml) record branch HEAD, actual checkout SHA and immutable rebuild proof. Historical run37146405841 is a PR merge test (`797fb54...`), not direct HEAD certification. Local evidence below does not predeclare the future run PASS.

### Certified inventory

| Inventory | Certified | Quarantined |
|---|---:|---:|
| Nodes | 1174 | 2887 |
| Directed edges | 2460 | 6949 |
| Transfers | 37 | 1035 |

Certified passenger components: 476. Original required1038 + necessary3023 + optional0 =4061 preserved. Candidate graph contains 9409 edges; the legitimate one-way桜馬場 transfer is in the formal output and its original candidate direction root closes. No GTFS permissions changed. Certified source exclusions can still prevent national certification.

Source certification: {"certified_source_count": 47, "review_source_count": 685, "quarantined_source_count": 2, "rejected_source_count": 0, "affected_node_count": 2887, "affected_edge_count": 6949}. Full source/family permission evidence is in the QA directory. The certified-only artifact is an offline, fail-closed allowlist; raw/candidate data are not deleted. Runtime import remains unauthorized and no src runtime reader of the candidate graph was found. Unknown metrics stay unknown; no realtime service guarantee is claimed.

### National connectivity

| Region | Status |
|---|---|
| 北海道 | BLOCKED |
| 东北 | BLOCKED |
| 关东 | BLOCKED |
| 中部 | BLOCKED |
| 北陆 | BLOCKED |
| 近畿 | BLOCKED |
| 中国 | BLOCKED |
| 四国 | BLOCKED |
| 九州 | BLOCKED |
| 冲绳 | BLOCKED |

| Corridor | Status |
|---|---|
| 東京 ↔ 京都 | BLOCKED |
| 東京 ↔ 大阪 | BLOCKED |
| 東京 ↔ 河口湖 | BLOCKED |
| 大阪 ↔ 京都 | BLOCKED |
| 大阪 ↔ 三ノ宮 | BLOCKED |
| 大阪 ↔ 奈良 | BLOCKED |
| 博多 ↔ 熊本 | BLOCKED |
| 札幌 ↔ 旭川 | BLOCKED |
| 札幌 ↔ 函館 | BLOCKED |
| Hokkaido ↔ Honshu | BLOCKED |
| Tohoku ↔ Kanto | BLOCKED |
| Kanto ↔ Chubu / Tokyo ↔ Nagoya | BLOCKED |
| Tokyo ↔ Kansai | BLOCKED |
| Kansai ↔ Chugoku | BLOCKED |
| Honshu ↔ Shikoku | BLOCKED |
| Chugoku ↔ Kyushu | BLOCKED |

All applicable recorded national corridors retain their requirements. Flight booking/search and realtime route integration are OUT_OF_SCOPE. Certification exclusions break the national graph; candidate connectivity does not satisfy this gate.

### Technical validation

Focused TASK086/TransportNode v2/Route Schema tests:1050/1050 PASS. Lint, typecheck, local standalone build, deployment contract and artifact audit PASS. Formatting initially failed only in the new audit script, then scoped formatting passed. Diff whitespace check PASS. Production generation ran once with a55-minute timeout and normal exit0. A subsequent attempted refresh was rejected at the early CORRECTION_INPUT_CHANGED guard after a report notice altered the hash-bound originalTask; that notice alone was removed after byte-exact comparison to HEAD. OriginalTask is preserved; the new directive is separate. No graph was produced by that failed attempt. Git attributes preserve frozen snapshot/raw and three reviewed extractor versions exactly across operating systems; current frozen inputs are never silently normalized or manually rebound. Full repository regression, clean deterministic double rebuild plus stable resume and published-byte comparison execute once on the enclosing commit in direct-head CI, using a bounded90-minute job; the immutable actual exit result and proof are retained by that job, not borrowed from older receipts. Certified projection deterministic and serialization outcomes are in final-graph-integrity.json. A TIMEOUT is not a business assertion failure.

### Blockers

Unique recorded blockers: **251**, not0. Sources 684; affected candidate components 12; quarantined nodes 2887; edges 6949; transfers 1035. Prefectures explicitly verified1 (Nagasaki lower bound; other assignments unenumerated). Affected regions: 北海道, 东北, 关东, 中部, 北陆, 近畿, 中国, 四国, 九州, 冲绳. Exact IDs, corridor associations and required remediation: [Final Blocker Inventory](../qa/TASK-086/FINAL-BLOCKER-INVENTORY.md).

Legacy11 ledger preserved: {"DONE": 1, "MANUAL": 5, "TECH_BLOCKED": 5, "PENDING": 0}; candidate engineering closure is distinct from source-certified national acceptance. Each remaining external fact or technical dependency has its own record. Local global-review closures do not override the certified-only exclusions. Special/public-conditional review proof remains invalid specifically because its bound research/task-revision.v2.json changed under this final-closeout directive; no manual hash rebinding is performed.

WBS7.16: **B / 阻塞**. This closes execution and preserves a recoverable checkpoint; TASK086 acceptance is not complete. No next task, ordinary discovery, push to develop, merge or publication is authorized by the result. Normal closeout commit/push only goes to the existing feature branch.

### Evidence

- [Frozen inventory](../qa/TASK-086/FINAL-FROZEN-INVENTORY.md)
- [Source certification](../qa/TASK-086/FINAL-SOURCE-CERTIFICATION.md)
- [Node identity](../qa/TASK-086/FINAL-NODE-IDENTITY-AUDIT.md)
- [Transfer audit](../qa/TASK-086/FINAL-TRANSFER-AUDIT.md)
- [National connectivity](../qa/TASK-086/FINAL-NATIONAL-CONNECTIVITY.md)
- [Graph integrity](../qa/TASK-086/FINAL-GRAPH-INTEGRITY.md)
- [Blocking inventory](../qa/TASK-086/FINAL-BLOCKER-INVENTORY.md)
- Local backup:3320 files, readable CRC verified; hash `e5f90c5250483c1378bb51e2a9f15f108f01582daba8420fa9837470ea1370fe`. Backup itself remains local. Token/cost statistics are unknown; no savings percentage is claimed. New discovery/source HTTP requests:0.

### Actual final validation and publication outcome

- Tested local HEAD: `1d5b5165b8359d356eb33c3f06188a107ffb3a31`. Frozen input SHA: `a92b9e90bece0c016ab50e74fd501cf65023ca253b750f27b582102b946ea6d7`. Frozen inputs changed: [].
- Full Node regression: **TIMEOUT**, actual exit 124, elapsed 5400.12 seconds. Clean deterministic/recovery/published-artifact proof: **TIMEOUT**.
- Exact-head GitHub Quality Gate: **NOT_RUN**. Push rejected because retained `core-stage-acceptance.json` exceeds100MB. PR466 remains Draft/Open at `406d31f0a6b52f321b79fa4694f985709288407f`; local commits and full outputs remain preserved. No force push, reset or evidence rewrite.
- Unique blockers: **253** =251 certification roots +2 execution gate roots. Legacy11 final counts: {"DONE": 1, "MANUAL": 5, "TECH_BLOCKED": 5, "PENDING": 0}.
- Failures: ["✖ nightly --dry-run does not write canonical catalogs (30031.6185ms)"]. No baseline attribution is inferred merely from unchanged source files.
- [Final validation receipt](../qa/TASK-086/final-validation.json); [exact blockers](../qa/TASK-086/final-blocker-inventory.json). Earlier pre-CI local snapshots remain historical.
- Execution is closed and handed off; TASK086 acceptance is not complete. No further automatic task or validation run.

Independent successful checks retained: first clean/publication comparison27/27; two complete clean manifests andall27artifact hashes identical; certified-only all7exports identical. Resume/corruption andcompleteNode regression remainTIMEOUT/unverified. No result is borrowed from an older head.

## Closeout Publication Recovery

Task authority:97861ffd420dd7b5e26af7187233f6f13e1b64d2. Previous remote head406d31f0a6b52f321b79fa4694f985709288407f; preserved source1d5b5165b8359d356eb33c3f06188a107ffb3a31; later handoff894e57e903c4f14d28c8aef3927967a743d60f36also preserved. Recovery head is the enclosing publishable commit, auditable with the file-by-file and all-push-object receipts. Recovery does not change the historical253blocked finding or silently close251certification roots.

The156850452byte raw core-stage evidence remains local with SHA2564bb963ea8edc65a38e0cb4f089352fc05a1f08887ab8427f9b1d46e51c6694f6; Git tracks [compact evidence](../qa/TASK-086/core-stage-acceptance-compact.json). Reconstructed local-only range descends from the published PR head, preserving published history. [Blob audit](../qa/TASK-086/closeout-publication-blob-audit.md), [tree equivalence](../qa/TASK-086/closeout-tree-equivalence.md), [complete validation plan](../qa/TASK-086/closeout-validation-plan.md) and current receipts distinguish actual successes/failures/timeouts.

Publication status: awaiting actual final remote exact-head Quality Gate; not predeclaredPASS. Original nightly30s assertion is preserved, isolated dry-run passes; full regression uses all150files exactly once and original rebuild assertions bind complete new-head extraction/clean/replay/corruption/publication receipts. Final CI direct-head result is authoritative; old PR merge-testPASS does not certify recovery. PR466must remain Draft/Open. WBS7.16remainsB/阻塞 with251certification roots. No discovery, topology/source-rights remediation, merge, auto-merge or downstream work.

First publication push: d8e09f2ed70bc41269b3d3b27105deac2f80cfc8, normal fast-forward406d31→d8e09f2. First direct-head CI37300605866 recorded actual checkout equality and passed quality/assets/raw extraction plus regression0/2, but regression1/3 found two native fixture CRLF byte losses. The failures are retained; long failed-run generations cancelled. Recovery restores bytes from existing native archives with explicit Git attributes, keeps expected hashes/negative assertions, then reruns the full exact-head gate. This is validation fixture repair, not source/certification remediation. Current remote final outcome remains awaiting complete current-head receipt.
