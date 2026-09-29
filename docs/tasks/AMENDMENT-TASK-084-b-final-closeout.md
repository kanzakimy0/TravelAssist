# AMENDMENT — TASK-084-B Final Closeout

Date: 2026-09-29  
Parent Task: TASK-084-B — Japan TransportNode Master  
Issue: #441  
PR: #448  
Owner: B

## 1. Purpose

This amendment exists to close TASK-084-B against its **original documented acceptance criteria** and stop uncontrolled scope expansion.

This amendment does not create a new Task, Issue, runtime contract, or data product. It narrows the closeout decision back to the original TASK-084-B contract.

The user explicitly requires this closeout run to finish TASK-084-B and make PR #448 mergeable. After all original gates pass and exact-head CI is green, normal merge of PR #448 is authorized in this closeout run.

## 2. Authoritative original-task interpretation

The following original TASK-084-B statements control closeout.

### 2.1 National means a planning backbone, not every stop

Original §3.3 states:

> 本 Task 的“全国”是全国可规划骨架覆盖，不是无边界抓取所有 stop。

Ordinary stations/stops may remain deferred. Node count is not a completion gate.

### 2.2 Administrative fields are optional in the original contract

Original §4 declares:

```ts
prefectureCode?: string;
municipalityCode?: string;
```

Therefore TASK-084-B does **not** require 244/244 current administrative assignment or a persisted N03 join in order to pass.

Administrative enrichment may remain unresolved/deferred if the accepted record explicitly says so.

### 2.3 Required node-type coverage

Original §3.1 requires first-stage support for:

- rail station
- Shinkansen station
- metro station
- major bus terminal
- airport
- ferry port

Tourism special transport is by need.

The current 244-node accepted master already contains all required first-stage node categories plus tourism funicular nodes.

### 2.4 Hub relationships need to be expressible, not universally resolved

Original §16 requires:

> hub/stop 关系可表达

It does not require every component to have a parent Hub.

Explicit states such as:

- ACCEPTED
- HUB_REVIEW_REQUIRED
- SELF_GATEWAY
- NOT_APPLICABLE

are acceptable when evidence and unresolved reasons are explicit.

Do not force all current HUB_REVIEW_REQUIRED records to zero.

### 2.5 N03/GSI does not block current accepted persistence

Original §17 blocks the Task when:

> source rights 不明确且会影响持久化

N03 is currently excluded from accepted-node persistence. No N03 polygon or N03-derived administrative assignment is stored in the accepted master.

Therefore the existing N03/GSI decision may remain:

```text
APPROVAL_REQUIRED
productionJoinAllowed=false
```

as a **deferred administrative-enrichment gate**, while TASK-084-B itself may PASS.

The assembler must continue to reject any future N03-derived assignment until the separate rights gate passes.

Do not delete or weaken the fail-closed N03 guard.

## 3. Original Acceptance checklist is the only TASK-084-B PASS gate

TASK-084-B may be marked PASS when all original §16 items are satisfied:

- [ ] 全国规划骨架所需 T0/T1 节点已形成
- [ ] TransportNode 不冒充 POI
- [ ] identity 可追溯
- [ ] IDs deterministic
- [ ] hub/stop 关系可表达
- [ ] 200/batch 可恢复
- [ ] 全部 accepted 记录有 provenance
- [ ] 动态数据没有冒充实时静态数据
- [ ] 未修改 A Route/Planner runtime
- [ ] WBS / Result / QA 已同步
- [ ] PR review state is controlled
- [ ] merge is performed only under this explicit closeout authorization after exact-head green

Do not invent additional PASS requirements such as:

- prefecture 244/244
- municipality 244/244
- 47/47 current administrative assignment
- every Hub review resolved
- every Japanese bus/ferry/ropeway ingested
- arbitrary node-count targets

Those may be tracked as deferred enhancements or later expansion work, but they do not redefine TASK-084-B.

## 4. Current accepted baseline to preserve

At the start of final closeout, preserve the accepted 244-node inventory unless a real original acceptance defect requires correction.

Expected current inventory:

- 244 NODE_ACCEPTED
- Shinkansen 110
- conventional rail 40
- metro 20
- private rail 9
- airport 47
- major bus terminal 5
- ferry gateway 7
- funicular 6
- 21 TransportHubs
- real batch split 200 + 44

Existing accepted TransportNode IDs and Hub IDs are immutable.

No broad node expansion is allowed during final closeout.

## 5. Known real contract defect to fix

A repository audit against the original §4 TransportNode contract found:

- required identity/core fields present for all 244 accepted nodes
- sourceRefs present for all 244
- confidence present for all 244
- coordinates present for all 244
- `generatedAt` missing from 134 accepted records

This is a real original-contract gap and must be fixed.

### 5.1 generatedAt rule

Backfill `generatedAt` deterministically from existing immutable provenance.

Preferred source order:

1. accepted identity-ledger `acceptedAt`
2. stage acceptance timestamp already committed for that same identity
3. deterministic artifact generation timestamp already committed and uniquely attributable to that accepted identity

Do **not** use current wall-clock time during routine rebuild.

Do not regenerate IDs.

If a record has no trustworthy deterministic timestamp source, fail that record and report the exact blocker rather than inventing a timestamp.

Add QA proving:

- all 244 accepted nodes have generatedAt
- rebuild preserves byte-identical generatedAt values
- no ID changes
- no source-reference changes caused solely by this backfill

## 6. Final original-contract audit

After the generatedAt fix, run a machine audit over all 244 accepted records.

Require zero failures for:

- transportNodeId present and unique
- valid nodeKind
- valid nodeLevel
- canonicalNameJa present
- finite valid Japan coordinates
- sourceRefs non-empty
- confidence valid
- generatedAt present
- no POI ID collision
- no Master Code rebind
- no duplicate accepted IDs
- parentHub does not self-reference
- no parent cycle
- accepted parentHub IDs exist
- no blind same-name merge
- immutable prior accepted IDs
- deterministic rebuild
- batch checksum repeat
- actual 200 + 44 receipts valid
- selected batch rerun works
- corruption detection works

Administrative fields may remain null with explicit unresolved/deferred semantics.

## 7. Coverage closeout

Do not evaluate TASK-084-B as an all-Japan stop census.

For the original “national planning backbone” acceptance, produce a concise closeout audit showing that the current accepted set contains:

- national / super-regional T0 gateways
- regional / tourism T1 gateways
- Shinkansen backbone
- major conventional rail / metro / private-rail hubs
- major airports
- at least admitted major bus-terminal capability
- admitted ferry-gateway capability
- admitted tourism special transport where already selected

Remaining bus/ferry/ropeway breadth may be listed as:

```text
DEFERRED_PLANNER_EXPANSION
```

not as a TASK-084 blocker, unless a missing node creates a concrete hole in the current T0/T1 national planning backbone.

## 8. N03/GSI closeout treatment

Keep the rights decision artifact.

Keep:

```text
decision=APPROVAL_REQUIRED
productionJoinAllowed=false
formalGsiConfirmationOnFile=false
```

Change its role in TASK-084 Result from:

```text
NATIONAL_MASTER_PASS blocker
```

to:

```text
DEFERRED_ADMINISTRATIVE_ENRICHMENT
```

because prefectureCode/municipalityCode are optional in the original contract and no N03-derived data is persisted.

Future work must still fail closed until GSI/alternative-source rights are resolved.

## 9. Latest-develop integration is mandatory before final PASS

Before final QA:

1. fetch latest origin/develop
2. normal merge latest origin/develop into the TASK-084-B branch
3. do not force-push
4. resolve WBS/POI tracking conflicts by preserving newer develop facts
5. preserve all accepted TransportNode/Hub IDs and ledgers
6. rerun the complete final QA on the merged head

PR #444 is already merged. Preserve the current formally authorized Canonical POI Pilot-100 facts from develop.

Do not reintroduce stale statements that develop has zero Canonical POIs.

## 10. Final status

If all original acceptance gates pass after latest-develop integration:

Set:

```text
TASK-084-B = PASS / READY_TO_MERGE
nationalMasterStatus = PASS
```

The Result must explicitly distinguish:

```text
TASK-084 national planning backbone = PASS
administrative N03 enrichment = DEFERRED / APPROVAL_REQUIRED
future node breadth expansion = DEFERRED_PLANNER_EXPANSION
```

WBS 7.14 should be staged for completion under the authorized merge closeout.

TASK-085-B and TASK-086-B do not start inside this Task.

## 11. Merge authorization

The user explicitly authorizes TASK-084-B final closeout and merge under these conditions.

After:

- latest develop has been integrated
- original Acceptance is all PASS
- final exact-head Quality Gate is SUCCESS
- PR is mergeable
- no unresolved review thread blocks merge

then:

1. mark PR #448 ready for review if still Draft
2. normal merge PR #448 into develop using the exact expected head SHA
3. do not use auto-merge
4. do not squash/rebase unless repository policy requires it
5. close Issue #441 as completed
6. update final Result/WBS tracking so 7.14 is 已完成; a docs-only post-merge closeout update on develop is authorized if needed, but no runtime/data behavior may change in that post-merge update
7. verify the merge commit is on origin/develop

If any **original** acceptance criterion fails, do not silently return PARTIAL.

Return exactly:

```text
MERGE_BLOCKED
```

and identify the specific original acceptance criterion that failed.

Do not block on criteria added after TASK-084-B was originally written.

## 12. Expected final response

Return one of only two top-level outcomes:

### A. MERGED / PASS

Include:

- final pre-merge PR head
- exact-head Quality Gate
- merge commit
- develop head
- 244 accepted-node count, or justified corrected count
- T0/T1/T2/T3
- nodeKind counts
- Hub status counts
- all-original-Acceptance checklist
- generatedAt coverage
- deterministic rebuild result
- source/license decision
- deferred N03 administrative enrichment
- WBS 7.14 = 已完成
- Issue #441 = closed
- TASK-085/086 = not started

### B. MERGE_BLOCKED

Include only genuine original acceptance failures and concrete evidence.

No further scope-expansion proposal is allowed in this closeout run.
