# TASK-074-B — POI Final Unattended Closure / Self-Healing Enrichment

## Status
Authorized for unattended overnight execution.

- Issue: #414
- Owner: B
- Upstream: TASK-073-B / Issue #411 / Draft PR #413
- Upstream exact head: `061da02ec86a8c3601aaee395f811a47c5846950`
- Upstream Quality Gate: #35615144458 SUCCESS
- Task branch: `task/b-task-074-poi-final-unattended-closure`
- Planned execution branch: `codex/b-task-074-poi-final-unattended-closure`

## Goal
This is the final self-healing closure task. It must finish the remaining POI work in one unattended run without repeated user feedback loops.

The task must:
1. reconcile the 48 TASK-073 batch-projected vs canonical-applied feature differences;
2. process all remaining 5,920 identity-blocked candidates;
3. immediately enrich every newly resolved candidate;
4. perform final null-targeted evidence expansion over all identity-resolved candidates with remaining null 43D fields;
5. preserve and expand Visit Profile / Access Anchor data;
6. diagnose and repair routine code/data/test/CI failures automatically;
7. rebuild the authoritative current-candidate view;
8. leave only evidence-exhausted residual queues;
9. produce a complete visible Result Markdown;
10. finish with exact current-head GitHub Quality Gate PASS.

No forced 43/43. Unsupported fields remain null with reason.

## Authoritative upstream baseline
Expected at task start:
- global population: 10,369
- working population: 10,097
- scored POIs: 2,516
- non-null 43D: 6,185
- Visit Profiles: 23
- Access/static links: 1,538
- remaining identity deep research: 5,755
- identity conflict hold: 165
- identity-blocked total: 5,920
- TASK-073 projected new non-null: 122
- canonical-applied new non-null: 74
- discrepancy to reconcile: 48

## Batch policy
- max 200 candidates per batch
- ordinary successful batch auto-next
- ordinary failures must be diagnosed/fixed/retried automatically
- no human confirmation between normal batches

Lifecycle:
`freeze → search/read → semantic annotation → identity/43D/Visit/Access projection → canonical apply → QA → reconcile → checkpoint → ordinary push → auto-next`

## Phase 0 — Canonical reconciliation
Before new candidate work:
1. reproduce the authoritative current-candidate view;
2. reconcile all 48 projected-vs-canonical differences;
3. every difference must receive exactly one disposition:
   - DUPLICATE_ALREADY_CANONICAL
   - REJECTED_IDENTITY_BLOCK
   - REJECTED_EVIDENCE_GATE
   - REJECTED_CONTRACT
   - SUPERSEDED
   - APPLY_MISSING_CANONICAL
   - OTHER_EXPLAINED
4. valid lost supported facts must be repaired/applied with provenance;
5. produce machine-readable and Markdown reconciliation outputs;
6. rerun canonical reader and focused POI tests;
7. do not begin Phase 1 until reconciliation is exact.

## Phase 1 — Identity closure
Initial frozen population:
- 5,755 DEEP_RESEARCH_REQUIRED
- 165 IDENTITY_CONFLICT_HOLD
- total 5,920

Expected initial batching: 29×200 + 120 = 30 batches.

For every candidate actively search:
- Japanese/local canonical name
- aliases/historical names
- prefecture/municipality/locality
- address
- coordinates/map context
- owner/operator
- official target site
- government/prefecture/municipality
- tourism/DMO
- cultural-property/museum/park/religious sources
- official operator
- verified official SNS
- authoritative secondary/reference
- cache/archive where appropriate

Allowed outcomes:
- RESOLVED_HIGH
- RESOLVED_MEDIUM
- EVIDENCE_EXHAUSTED_UNRESOLVED
- IDENTITY_CONFLICT_HOLD

RESOLVED_HIGH/MEDIUM must immediately enqueue same-candidate enrichment.

### Identity thresholds
RESOLVED_HIGH:
- official/authoritative source + discriminative geographic/organizational match; or
- multiple strong independent authoritative sources converge.

RESOLVED_MEDIUM:
- >=2 independent identity signals;
- >=1 discriminative signal beyond bare name;
- retained source refs;
- no unresolved credible competing target.

Otherwise remain evidence-exhausted unresolved/hold.

Each identity decision records:
- signals
- sourceRefs
- discriminativeSignal
- competingTargets
- rejectionReasons
- confidence
- searchTrace
- disposition

## Phase 2 — Immediate enrichment after resolution
Every newly resolved candidate must immediately:
- load current values/provenance
- enumerate null feature codes
- actively search targeted evidence
- retain target-scoped text
- semantically annotate
- apply frozen rubric
- write ADD/PRESERVE/SUPERSEDE
- write provenance
- attempt Visit Profile
- attempt Access Anchor/static access

Do not defer to a future task.

## Phase 3 — Final null-targeted expansion
After Phase 1:
- rebuild a deterministic queue of every identity-resolved candidate with >=1 null 43D field;
- include previously enrichment-ready candidates and newly resolved candidates;
- process 200 per batch until queue exhausted.

Search by feature families:
- history / architecture / art / local / educational
- scenery / nature / photo / seasonality
- food / shopping / entertainment / night / onsen
- family / senior / couple / solo / relax / adventure
- walking / physical / indoor-outdoor / weather sensitivity
- cost / reservation / duration / access
- unique / iconic / hidden only with comparative evidence

Every candidate still gets exactly 43 decisions.

## Source hierarchy
1. target-owned official website
2. government / prefecture / municipality
3. official tourism / DMO
4. official cultural / museum / park / religious source
5. official operator / rail / transit
6. verified official SNS
7. authoritative secondary/reference
8. general secondary only with explicit quality and target scope

Search snippets are discovery only.

Official SNS requires ownership proof and retained account/post evidence.

Temporary operational posts cannot become timeless static facts.

## 43D rules
- null = unsupported/unknown
- 0 = evidenced absence
- never default 5
- name/category/fame/AI memory/search snippet alone is insufficient
- nearby attraction is not target evidence
- comparative dimensions require comparative/calibration support

Every ADD/SUPERSEDE must include:
- featureCode
- value
- sourceRefs
- sourceTier
- confidence
- rationale
- rubricVersion
- annotationMethod
- contentHash
- locator/hash

## Visit / Access rules
Visit:
- preserve current authoritative supported facts
- only supported visit-duration/load evidence
- do not reinterpret opening hours, transport time, route segment, event or guide duration as whole-visit duration without explicit support

Access:
- preserve current supported links
- only supported named static access relationships
- live timetable/fare/delay/current accessibility remain runtime facts

## Self-healing policy

### Source/network failure
For timeout/404/JS-only/temporary failure:
1. bounded retry/backoff
2. cache/archive/alternate official source
3. government/tourism/owner/operator/SNS
4. authoritative secondary
5. if still unavailable, record evidence-exhausted and continue

### Candidate parsing/identity failure
- isolate candidate
- fallback parser/source strategy
- if still unresolved, write residual queue
- continue

### Projection/canonical mismatch
- diff projected vs canonical
- identify contract/ordering/dedup/evidence gate
- repair smallest responsible layer
- regenerate affected outputs
- rerun focused tests
- continue

### Test/CI failure
- capture exact failure/log
- classify task regression / stale fixture / baseline issue / resource flake
- repair according to evidence
- rerun targeted + full applicable tests
- continue
- do not declare completion until exact-head hosted Quality Gate PASS

### Artifact corruption/incomplete receipt
- invalidate affected checkpoint
- rebuild batch
- verify checksum/determinism
- continue

### Git push problem
- ordinary same-branch non-force push is pre-authorized
- retry transient network/auth failures boundedly
- non-fast-forward: fetch/inspect
- safe normal merge allowed when it preserves history
- force/history rewrite required => true hard blocker

## Residual queues
Final unresolved/null cases are allowed only when search policy is exhausted.

Required:
- `docs/qa/TASK-074-B/identity-evidence-exhausted.md`
- `docs/qa/TASK-074-B/identity-evidence-exhausted.jsonl`
- `docs/qa/TASK-074-B/null-evidence-exhausted.md`
- `docs/qa/TASK-074-B/null-evidence-exhausted.jsonl`

Every row must state:
- searches attempted
- sources opened
- evidence missing
- best candidate/field evidence
- blockers
- what future source/action could change the result

## Required telemetry
Per batch record at least:
- phase / batchId
- model / reasoning
- candidateCount
- queryCount
- officialSitePages
- governmentTourismPages
- officialSNSAccounts/posts
- authoritativeSecondaryPages
- retainedTextCount
- semanticAnnotationAttemptedCount
- identity HIGH/MEDIUM/unresolved/hold
- resolvedThenEnriched
- existingNonNullLoaded
- preservedNonNull
- newNonNull
- supersededNonNull
- provenanceWritten
- featureDecisionCount
- Visit attempted/added/preserved
- Access attempted/added/preserved
- canonicalAppliedCount
- canonicalRejectedCountByReason
- remainingNullDecisionCount
- candidateErrorCount
- retries/recoveryActions
- input/evidence/output checksums
- elapsed

## Hard batch gates
Batch cannot PASS if:
- membership/count mismatch
- candidate missing
- resolved identity lacks qualifying evidence
- existing supported value disappears silently
- ADD/SUPERSEDE lacks provenance
- semantic annotation skipped where enrichment is allowed
- search snippet used as evidence
- featureDecisionCount != candidateCount×43
- projected/canonical additions left unreconciled
- supported Visit/Access regresses silently
- Registry/Master Code/candidateKey changes
- deterministic rerun fails
- receipt written before outputs
- corruption/resume validation fails

## Final authoritative verification
Before completion:
1. rebuild/read authoritative current view
2. population = 10,369
3. all 10,097 working candidates have final disposition
4. all supported 43D/Visit/Access facts reconcile
5. every projected/canonical addition is accounted for
6. report scored/non-null before/after
7. report all 43 per-feature coverage before/after
8. report coverage bands >=1 / >=10 / >=20 / >=30 / 43/43
9. report identity outcomes and evidence-exhausted residual queues
10. deterministic final rebuild/check PASS
11. targeted POI tests PASS
12. full repository tests PASS
13. lint/typecheck/format/build/deployment/artifact/whitespace PASS as current CI requires
14. push final Result
15. exact current-head GitHub Quality Gate PASS

## Visible Result
Mandatory:
`docs/tasks/RESULT-TASK-074-b-poi-final-unattended-closure.md`

Update throughout execution.

Final Result must contain:
- baseline
- 48-item reconciliation
- phase/batch summaries
- self-healing incidents and fixes
- identity before/after
- residual identity queue
- 43D before/after and all 43 feature coverage
- coverage bands
- Visit/Access before/after
- provenance/source stats
- projected/canonical reconciliation
- errors/recovery log
- checksums
- Draft PR
- exact final-head Quality Gate receipt
- explicit COMPLETE/PARTIAL/BLOCKED

No complete Result Markdown = task failure.

## Unattended authorization
User explicitly authorizes overnight unattended execution.

Allowed:
- create/recreate one TASK-074 heartbeat automation
- auto-next
- automatic diagnosis/repair of routine failures
- rerun failed batch/checks
- bounded source/network retries
- ordinary non-force push to TASK-074 execution branch
- safe normal merge of expected upstream without history rewrite
- update Result/QA/PR comments
- delete heartbeat on completion/hard blocker

No per-batch confirmation.

Forbidden:
- force push
- history rewrite
- destructive reset/clean
- push develop/main
- auto-merge
- Master Code allocation
- Registry rebind
- production import
- credential bypass
- paid external service without existing authorization

## Git / stacked PR
While PR #413 remains unmerged:
- execution branch: `codex/b-task-074-poi-final-unattended-closure`
- Draft PR base: `codex/b-task-073-identity-deep-null-targeted-43d`

Do not auto-merge.

## Completion
TASK-074-B may be COMPLETE when:
- all phases executed
- all candidate work dispositioned
- all supported 43D/Visit/Access data preserved
- all new supported facts have provenance
- all projected/canonical differences explicitly reconciled
- residual queues contain only evidence-exhausted cases
- deterministic final verification PASS
- exact current-head GitHub Quality Gate PASS
- visible Result complete
- no forbidden/destructive action used

No forced 43/43 and no requirement to resolve identities lacking sufficient evidence.
