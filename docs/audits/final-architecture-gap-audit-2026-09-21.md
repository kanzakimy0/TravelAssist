# TravelAssist — FINAL Architecture → Current Repository Gap Audit

> Date: 2026-09-21  
> Repository: kanzakimy0/TravelAssist  
> Target: develop  
> Architecture baseline: docs/design/ai-planner-realtime-final-architecture-freeze-and-implementation-order.md

## Executive conclusion

TravelAssist already has strong foundations in Auth/RLS, Trip persistence, Trip Library, Planner Store, Preferences, Planning contracts, 43D schema, Region Graph/Master Code and Route integration.

The major remaining gap is the transition from **contract architecture** to **production runtime architecture**, especially:

1. canonical POI + governed data serving;
2. large-scale Candidate Retrieval + Planner Solver / Validator / Ranking;
3. connected AI runtime;
4. generic Action / Execution / Event / Realtime runtime.

Top-level architecture design is sufficiently complete; the next phase is integration and implementation.

## Gap matrix

| Area | Status | Evidence / gap |
|---|---|---|
| Auth / Supabase / RLS | DONE | Existing authenticated repositories and Local runtime tests |
| Trip Plan schema / CAS | DONE | PR #227 merged |
| Trip repository | DONE | src/server/trips/repository.ts |
| Trip Library / History | DONE | PRs #331 / #334 merged |
| Planner Store | DONE | PR #401 merged |
| Planner Save/Read | REVIEW_READY_UNMERGED | PR #406 open Draft |
| Planning contract foundation | DONE | src/shared/contracts/planning/* |
| 43D feature contract | DONE | Frozen 43 keys, 0..9|null |
| 43D production dataset | IN_PROGRESS | Issue #407 |
| Canonical POI schema/admission | MISSING / OPEN | Issue #399 |
| Region Graph / Master Code | DONE | PRs #326 / #352 merged |
| Route contract | DONE | Provider-independent contract merged |
| Planner Route runtime | PARTIAL | PR #241 merged; development-only preview |
| POI access-anchor data | IN_PROGRESS | Issue #407 workstream |
| Candidate Pipeline runtime | REVIEW_READY_UNMERGED | PR #372 open Draft |
| 100k Candidate Retrieval | MISSING | No merged production geo/time/pre-filter runtime found |
| Planner constraint solver | MISSING | No merged production solver found |
| Planner Validator | PARTIAL | Strong parsers/types; full production validator missing |
| Candidate Ranking | PARTIAL | Score contracts exist; production engine missing |
| Trade-off / Explanation | PARTIAL | Trace/reason foundation exists; full runtime missing |
| Change Set runtime | PARTIAL | ReplanProposal has changeSetRef; apply pipeline incomplete |
| Data provenance/freshness | PARTIAL | Strong Fact/Freshness contracts; release pipeline incomplete |
| Data Bundle / Serving Bundle | MISSING | No unified active serving runtime found |
| Cache / Materialized View / Search Index | MISSING | FINAL design only |
| AI Conversation runtime | MISSING | Current main-system task evidence says AI is not connected |
| Prompt Registry | MISSING | Design only |
| AI API / Provider Gateway | MISSING | AI not connected |
| Context Builder | PARTIAL | Compact context contract exists; runtime builder missing |
| AI Orchestrator | MISSING | Design only |
| Generic Tool Router | PARTIAL | Route boundary exists; generic registry/router missing |
| Generic Action Router | PARTIAL | Trip write safety exists; generic action framework missing |
| Permission Model | PARTIAL | RLS/ownership strong; generic resource/action model missing |
| Confirmation Model | MISSING | Generic server-side lifecycle missing |
| Execution Adapter | PARTIAL | Trip transaction exists; generic provider adapters missing |
| Saga / Compensation | MISSING | No generic runtime found |
| Transactional Outbox / Event Bus | MISSING | No generic product runtime found |
| Background Worker | MISSING | No product event-worker framework found |
| Realtime Trip State | PARTIAL | Contract overlay exists; engine missing |
| Arrival / Delay / ETA | MISSING | Production engine missing |
| Realtime Impact / Replan | PARTIAL | Contracts exist; runtime missing |
| Notification service | MISSING | Unified in-app/push runtime missing |
| Planner Benchmark | PARTIAL | Contract soak/fuzz exists; Smoke/Core/Golden framework missing |
| Shadow / Experiment / Rollout | MISSING | Generic framework missing |
| Feature Flags | PARTIAL | Route env flag exists; general flag service missing |
| Security | REVIEW_READY_UNMERGED | PR #231 |
| Observability | REVIEW_READY_UNMERGED | PR #245 |
| API contract governance | PARTIAL | Strict versioned TS contracts; no central registry |
| Backup / DR | MISSING | No verified repo-level restore framework found |
| Deployment foundation | DONE | Deploy validation/build/artifact tooling exists |

## Important distinction

The repository is strong in strict contracts such as AiCompactContextV1, AiDecisionResponseV1, CandidateRunV1, PlanningFactRefV1, FactUsabilityV1, PlanningScoreSetV1, ReplanProposalV1, DecisionRunV1, TravelRegionGraphV1, PoiFeatureSetV1 and PoiVisitProfileV1.

These contracts must be reused, but they do not prove that the corresponding production engines are connected.

## Existing implementations that must NOT be duplicated

- PR #406 — Planner Save/Read: resync/review existing branch; do not create a second remote Planner persistence path.
- PR #372 — Candidate Pipeline: reuse/resync or explicitly supersede after review; do not silently rebuild a parallel pipeline.
- PR #231 — Security: finish the existing baseline; do not create another security stack.
- PR #245 — Observability: refresh and close out the existing branch; do not create another telemetry runtime.

## Critical blockers

1. **Canonical POI — Issue #399.** This is the next genuinely missing A-side runtime foundation.
2. **POI data — Issue #407.** Continue identity/evidence/43D; keep B artifacts candidate/evidence-only until canonical admission passes.
3. **Planner Save/Read — PR #406.** Resolve before AI/Realtime durable mutation work.
4. **Candidate Pipeline — PR #372.** Resolve before the final retrieval/solver runtime is built.

## Recommended execution waves

### Wave 0 — Existing PR closeout
- PR #406 Planner Save/Read
- PR #372 Candidate Pipeline
- PR #231 Security
- PR #245 Observability

### Wave 1 — Data foundation
**A:** Issue #399 Canonical POI v1; Data Bundle; POI Serving DTO; Active Dataset Pointer.
**B:** Issue #407 identity/evidence/43D; Visit Profiles; Access Anchors; QA/provenance/quarantine.

### Wave 2 — Planner runtime
Candidate Retrieval → Constraint Builder → Anchor-first Scheduler → Optimization → Validator → Ranking → Change Set → Smoke/Core Benchmark.

### Wave 3 — AI runtime
Conversation → Prompt Registry → AI API → Context Builder → Orchestrator → Tool Router → Structured Messages.

### Wave 4 — Safe write
Action Router → Permission → Confirmation → Idempotency → Execution → Audit → Outbox.

### Wave 5 — Realtime
Event Bus → Workers → Realtime Trip State → Arrival/Delay → Impact Analysis → Replan → Notification.

### Wave 6 — Production governance
Golden Benchmark → Shadow → Feature Flags → Progressive Rollout → SLO/Incident → Backup/Restore.

## Immediate priority order

1. Resolve PR #406.
2. Execute Issue #399.
3. Continue Issue #407.
4. Resolve PR #372.
5. Build Data Serving + Candidate Retrieval.
6. Build Planner Solver / Validator / Ranking.
7. Connect AI only after those runtime boundaries are stable.

In parallel, close out PR #231 and PR #245.

## Do not start yet

Do not start production AI autonomous Trip mutation, realtime auto-replan, Booking mutation, Payment action or multi-day automatic compensation before Action Router / Confirmation / Execution foundations exist.

Do not create a second Trip model, 43D schema, Region Graph, Master Code registry, Preference model, Route contract or Planner Store.

## Maturity summary

| Layer | Maturity |
|---|---|
| Contracts / schemas | High |
| Auth / DB safety | High |
| Trip persistence | High |
| Planner client state | High |
| Region / route priors | Medium-High |
| POI canonical production | Low / In Progress |
| Candidate retrieval runtime | Low |
| Planner solver runtime | Low |
| Connected AI runtime | Low |
| Action / execution framework | Low |
| Realtime / event runtime | Low |
| Security | Medium-High, unmerged |
| Observability | Medium, unmerged |
| Benchmark / rollout | Low-Medium |
| Backup / DR | Low |

## Final audit conclusion

Critical path:

Existing PR closeout → Canonical POI → POI production data → Data Serving → Candidate Retrieval → Planner Solver / Validator / Ranking → AI Runtime → Action / Realtime Runtime → Production Governance.

No additional top-level architecture design is required before implementation.