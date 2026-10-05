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

### Recovery verification correction and final-head receipt

Second actual branch-head CI [37301471450](https://github.com/kanzakimy0/TravelAssist/actions/runs/37301471450), checkout `b0dda83e958e97b011369ed22dd7e498cc46d7b4`, passed149ordinary test files, raw extraction, lint/typecheck/format/build/artifact gates and both complete clean generations. Resume failed the new verifier's memory-versus-JSON comparison: undefined attribution array entries serialize as null. The downloaded complete manifest and all27artifact bytes were identical before/after replay; the original failed gate remains FAIL, and the rebuild/proof aggregation was NOT_RUN. No timeout occurred in this run.

The validation-only correction compares the actual serialized manifest bytes before/after production replay, retains the full parsed-manifest check,1337batch checksum requirement and all actual artifact/receipt seals. New negative cases reject real metadata change and serialized byte drift; local tests, scoped lint and formatting exit0. Production generators, frozen inputs, published traffic artifacts and all251certification roots remain unchanged. The [repair receipt](../qa/TASK-086/closeout-serialized-manifest-repair.json) and [actual second CI](../qa/TASK-086/closeout-second-exact-head-ci.json) preserve the evidence.

Final recovery head and remote PR head are the enclosing fast-forward publication commit. Its actual final conclusion, SHA equality, complete regression count, proof checks, zero-or-nonzero execution result and Quality Gate URL are emitted by that commit's **TASK086 exact-head Quality Gate** as `task086-final-exact-head-<SHA>/closeout-publication-final-receipt.json`. This commit does not predeclare a future PASS: only a completed current-head receipt with `PASS_CLOSEOUT_PUBLICATION_RECOVERY` closes publication recovery; missing/failed/cancelled/timed-out lanes remain BLOCKED. The [validation receipt](../qa/TASK-086/closeout-validation-receipt.json) describes the binding and retains previous failures; CI is the immutable final-head receipt, avoiding an untestable self-referential Git SHA. The final response must report the actual final remote SHA and specific run URL after it completes.

PR466must remain Draft/Open; WBS7.16remains **B / 阻塞**, certification blockers **251**. This publication task does not remove historical acceptance failures or perform national certification remediation. No merge, auto-merge, downstream task or additional discovery.

## Final User-Directed Bounded Re-certification & Closeout

2026-10-06 JST. Authority: `03520a3a404ad0165664f46b9be6e2e98fd571ba` / [final acceptance amendment](TASK-086-b-final-unverifiable-quarantine-closeout.md).

Current product acceptance semantics: **COMPLETE_WITH_READMITTABLE_UNVERIFIED_EXCLUSIONS**. Implementation classification is complete; final exact-head technical gate and authorized normal merge are recorded separately below when actually observed. This supersedes the old national-connectivity completion rule without rewriting its historical BLOCKED results or evidence.

The bounded pass re-audited all 734 source/evidence descriptors and made 12 shared official terms observations, prioritizing major national corridors/gateways. Two retained MLIT P05-22 sources gained correct archive/catalog/CC BY 4.0/attribution bindings. Newly certified: **2 sources; 0 nodes; 0 edges; 0 transfers**. Recovered high-value corridors/gateways: **0**. No minimum-facts boolean was promoted into a legal rights grant.

Frozen candidates: 4,061 nodes, 9,409 directed edges, 1,072 transfers, 734 sources. Final route-enabled projection: **1,174 nodes, 2,460 edges, 37 transfers, 49 sources**, 476 passenger components. Route-disabled: **2,887 nodes, 6,949 edges, 1,035 transfers, 685 sources**, all future readmittable. Transfers are a subset of edges. All **251** historical roots have terminal dispositions: **1 source-binding root certified; 250 accepted exclusions; 0 pending decisions**. The five valid GTFS platform identities and true one-way/pickup/dropoff restrictions remain intact; missing extra connectivity stays unavailable. Special-scope obligation maps its retained 152 nodes rather than disappearing from the ledger.

All required graph integrity counts are **0**. National passenger-query results remain unavailable for all 16 named corridors and 86 gateway queries; no false national PASS. Dynamic unknown metrics remain unknown. No production routing/Planner/UI integration, automatic follow-on discovery or extra WBS is enabled. Future dedicated source/identity re-admission can recover excluded coverage without reopening TASK-086.

Canonical manifests and evidence: [Final bounded closeout](../qa/TASK-086/readmittable-closeout/FINAL-READMITTABLE-CLOSEOUT.md), [routing eligibility](../qa/TASK-086/readmittable-closeout/routing-eligibility.json), [route-disabled records](../qa/TASK-086/readmittable-closeout/route-disabled.jsonl), [251 terminal root records](../qa/TASK-086/readmittable-closeout/root-dispositions.jsonl), [counts and passenger coverage](../qa/TASK-086/readmittable-closeout/closeout-summary.json).

Validation: focused TASK-086, v2 compatibility and Route Schema tests; actual deterministic dual generation and excluded-entity leak tests; final exact-head Quality Gate requires every original bounded regression/build/recovery lane plus the same-run routing receipt. Exact final branch head and immutable Quality Gate URL/conclusion are emitted in `task086-final-exact-head-<SHA>` → `closeout-publication-final-receipt.json`. Historical prior-head PASS is not substituted. Push is normal automatic push if successful, otherwise explicitly reported manual publication. PR #466 merge and Issue #443 closure will be recorded only after their actual completion.

### Observed final acceptance and normal merge — 2026-10-06 JST

**COMPLETE_WITH_READMITTABLE_UNVERIFIED_EXCLUSIONS**. Exact-head Quality Gate: [run 37343069533](https://github.com/kanzakimy0/TravelAssist/actions/runs/37343069533) **SUCCESS**, event `workflow_dispatch`; requested branch head and actual checkout both `26644283ba6b4cb9f8fa259654fc347685ccfc1b`. All 151 repository Node test files ran exactly once. Lint, types, formatting, standalone build/artifact, all 27 generated artifacts, two clean deterministic rebuilds, checksum resume, raw GTFS extraction and actual recovery/corruption checks passed. Same-run routing receipt passed independent deterministic terminal generation, unknown metrics/GTFS restrictions and excluded-entity leak checks. Earlier failure/cancellation is preserved in `prior-exact-head-attempt.json`; it was not treated as PASS.

Frozen input/code SHA: `0575ae7e0f3a43ee3e7fe756a86561fb2aa98799f1d209dd788d885fdc6a6188`. Newly certified: 2 sources, 0 nodes/edges/transfers. Route enabled: 1174 nodes / 2460 edges / 37 transfers / 49 sources. Disabled/readmittable: 2887 nodes / 6949 edges / 1035 transfers / 685 sources. Historical roots: 251 terminal, 1 source-binding root certified, 250 accepted readmittable exclusions, pending 0. Integrity defects: 0. Recovered corridors/gateways: 0; 16 corridor and 86 gateway queries remain unavailable, not national PASS.

Publication was normal automatic fast-forward push, without force/squash/history rewrite. Existing [PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466) was normally merged after the actual gate. Merge SHA: `38f2f445fc4153e74832aaf9d4804d5220d2adc8`; accepted implementation head: `26644283ba6b4cb9f8fa259654fc347685ccfc1b`. [Issue #443](https://github.com/kanzakimy0/TravelAssist/issues/443) is CLOSED/completed. WBS 7.16 is B / 已完成 under the user-directed inventory/classification/export-boundary definition; all coverage exclusions remain visible. Future dedicated re-admission does not reopen TASK-086. No follow-on discovery, downstream task or production/Planner integration starts.

[Final compact observed receipt](../qa/TASK-086/readmittable-closeout/final-acceptance-receipt.json). This documentation-only post-merge record changes neither the accepted branch head nor frozen code/data/eligibility hashes. Official observation dates in the frozen review input are UTC; the user-facing closeout date is 2026-10-06 JST.

Primary exclusion reason counts (typed entities; transfers are also edges): `{"edge": {"ROUTE_DISABLED_IDENTITY_UNRESOLVED": 210, "ROUTE_DISABLED_RIGHTS_UNVERIFIED": 6739}, "node": {"ROUTE_DISABLED_RIGHTS_UNVERIFIED": 2887}, "source_dependency": {"ROUTE_DISABLED_RIGHTS_UNVERIFIED": 685}, "transfer": {"ROUTE_DISABLED_RIGHTS_UNVERIFIED": 1035}}`.
