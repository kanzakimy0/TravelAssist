# TASK-036-A — Trip Planning Contracts / Validators / Fixtures Foundation

> Issue: #291  
> WBS: **4.47 — Trip Planning Engine Contract / Validator / Fixtures Foundation**  
> Owner: **A — Main Travel System / Shared Planning Contracts**  
> Priority: **P0**  
> Status: **Ready for stacked implementation / Design Base Gate required**  
> Design branch: `design/a-trip-engine-poi-ai-architecture-v2`  
> Design PR: #266 (Draft at Task publication)  
> Planned implementation branch: `codex/a-trip-planning-contract-foundation`  
> Initial implementation PR target while #266 is unmerged: `design/a-trip-engine-poi-ai-architecture-v2`

---

# 1. Goal

Turn the completed Trip Planning Engine P0 design set into a **pure TypeScript contract foundation** that the later Planning Engine, Candidate Engine, AI Gateway, Replanning and QA tasks can consume safely.

This Task implements only:

```text
TypeScript public contracts
+
dependency-free validators / parsers
+
positive fixtures
+
negative fixtures
+
contract tests
+
public exports / compatibility guards
```

It does **not** implement the runtime Planning Engine.

The intended progression is:

```text
P0 Design Candidates
↓
TASK-036 Contract / Validator / Fixture Foundation
↓
100 POI Scoring Pilot
↓
Region Graph Pilot
↓
Itinerary Feasibility Pilot
↓
Candidate + AI Context / Decision Pilot
↓
Replanning Scenario Pilot
↓
parameter calibration
↓
selected contracts promoted to Frozen v1
```

---

# 2. Authoritative design inputs

Read all of the following from the Task base branch before coding:

```text
docs/architecture/poi-feature-preference-codebook-v0.1.md
docs/architecture/preference-state-v0.1.md
docs/architecture/poi-scoring-spec-v0.2.md
docs/architecture/poi-master-schema-v0.2.md
docs/architecture/itinerary-feasibility-spec-v0.1.md
docs/architecture/travel-region-graph-codebook-v0.1.md
docs/architecture/candidate-pipeline-contract-v0.1.md
docs/architecture/ai-compact-context-v1.md
docs/architecture/ai-decision-contract-v1.md
docs/architecture/replanning-contract-v0.1.md
docs/architecture/planning-fact-freshness-policy-v0.1.md
docs/architecture/planning-decision-trace-v0.1.md
```

Also read the existing canonical contracts that must be reused rather than duplicated:

```text
docs/architecture/trip-plan-contract.md
src/shared/contracts/trips/index.ts
src/shared/contracts/routes/**
docs/architecture/route-contract.md
docs/architecture/travelassist-engine-contract.md
```

Read repository conventions before choosing exact file layout:

```text
src/shared/contracts/**
tests/*contract*.test.mjs
tests/register-route-ts.mjs
package.json
```

If existing shared-contract conventions differ from the suggested structure below, preserve the existing repository convention and document the final structure in the Result.

---

# 3. Design Base Gate / stacked implementation rule

At Task publication:

```text
origin/develop = 2d3df8819da0e02b6b8449097dc2b95cd475f9d9
P0 design branch head before Task commit = 64807637646aa9dfb4796c2fc2b1274a317792e6
PR #266 = Open / Draft / unmerged
```

Do not assume those SHAs remain current. Re-fetch before implementation.

Because the P0 design PR may still be unmerged, this Task permits **stacked implementation** with the following rules:

1. Create `codex/a-trip-planning-contract-foundation` from the latest `origin/design/a-trip-engine-poi-ai-architecture-v2`.
2. Merge the latest `origin/develop` into the implementation branch using a normal merge if necessary for compatibility; resolve conflicts conservatively.
3. Do not rewrite, force-push, close, merge or retarget PR #266.
4. While #266 remains unmerged, the implementation Draft PR must target `design/a-trip-engine-poi-ai-architecture-v2`, not `develop`.
5. After #266 is accepted/merged through the normal project process, the implementation PR may be rebased/retargeted only through normal review procedures; no force push.
6. If latest `develop` contains a conflicting frozen contract that materially changes the P0 semantics, stop as `Blocked` and document the conflict instead of inventing a silent compromise.

This Task does not authorize merging #266 or any implementation PR.

---

# 4. Scope boundary

## 4.1 In scope

Implement public, provider-independent planning contracts and their validators for these P0 concepts:

```text
A. Feature / preference primitives
B. POI planning projection / Visit Profile primitives
C. Region Graph primitives
D. Scoring result / breakdown contracts
E. Itinerary Feasibility result contracts
F. Candidate Pipeline contracts
G. AI Compact Context V1
H. AI Decision / Patch V1
I. Replanning request / scope / proposal metadata
J. Planning Fact / Freshness metadata
K. Decision Trace / usage telemetry contracts
```

Implement positive and negative fixtures that exercise cross-contract invariants.

## 4.2 Explicitly out of scope

Do **not** implement in TASK-036:

```text
- live LLM / OpenAI API integration
- Prompt text / model router production logic
- real Provider requests
- Route search implementation
- POI database tables / migrations
- Trip Plan persistence / 8.5
- Preference persistence / B 5.11 / 5.14 / 5.16
- WBS 4.20+ Trip Mutation runtime
- actual scoring engine weights / gamma calibration
- Candidate search algorithms / beam search runtime
- real itinerary optimizer
- live Replanning worker / scheduler
- real Fact refresh jobs / cache
- Planner / Detail UI changes
- 100 real POI Pilot data production
- hotel / restaurant / booking actions
- payment / cancellation / rebooking execution
- Master Code renumbering
```

Passing this Task proves **contract shape and validation**, not that the Planning Engine is operational.

---

# 5. Required compatibility boundaries

## 5.1 Canonical Trip Contract must not be copied

`TripPlanSnapshotV1`, `PlanItemV1`, schedule/place/lock semantics and Trip/Plan revision remain owned by:

```text
src/shared/contracts/trips/index.ts
```

Planning contracts may reference/import canonical types where useful, but must not publish a second similar Trip schema.

## 5.2 Route Contract must not be copied

Provider-independent live route facts remain owned by:

```text
src/shared/contracts/routes/**
```

Planning contracts may hold a `routeRef`, normalized compact projection, or a planning-prior type where explicitly defined, but may not duplicate Provider raw types or redefine the canonical Route response.

## 5.3 Planning Engine ≠ Trip Mutation Engine

TASK-036 belongs to Planning Engine contracts.

Do not alter the meaning of WBS 4.20+:

```text
ChangeSet
→ validate
→ preview
→ permission / protection / revision
→ apply / rollback
```

`AiCompactOpV1` is not `EngineOperation`.

## 5.4 Master Code unchanged

Do not create a new numbering scheme and do not renumber POI, Region or Transport IDs.

Internal/domain references remain opaque strings unless an existing canonical type already defines otherwise.

---

# 6. Suggested source layout

Prefer a dedicated namespace such as:

```text
src/shared/contracts/planning/
├─ index.ts
├─ common.ts
├─ features.ts
├─ poi.ts
├─ regions.ts
├─ scoring.ts
├─ feasibility.ts
├─ candidates.ts
├─ ai-context.ts
├─ ai-decision.ts
├─ replanning.ts
├─ facts.ts
├─ trace.ts
├─ validation.ts
└─ fixtures.ts
```

This is a recommendation, not permission to fight an established repository convention. If a smaller file set is clearer, use it.

Hard rule:

> Public type ownership must remain unambiguous. Do not create multiple source files that define competing versions of the same enum or codebook.

---

# 7. Required contract semantics

## 7.1 POIFeatureV1

Freeze the complete 43-code keyspace from the codebook.

Canonical feature value:

```text
0..9 | null
```

Meaning:

```text
0    = known absent / extremely unsuitable
1..9 = valid strength
null = unknown
```

Requirements:

- Canonical Feature vector must explicitly cover all 43 dimensions.
- `0` must never be coerced to `null`.
- `null` must never be coerced to `0` or `5`.
- Unknown/extra feature codes must fail closed.
- Feature kind ownership is single-source: benefit / suitability / cost / risk.

## 7.2 Preference values

Effective Preference semantic value:

```text
1..9
5 = explicit neutral
```

Persistence-layer missing/unset behavior belongs to Preference State/B persistence and is not redefined here.

AI compact sparse preference:

```text
value 5 MUST be omitted
```

If a compact sparse preference entry explicitly contains `5`, validator should reject it rather than silently rewrite it.

Do not use `+/-` preference wire encoding.

## 7.3 walking / physical

Contract comments/types/fixtures must preserve the corrected meaning:

```text
POI walking / physical
= burden baseline under the standard recommended visit
```

Actual visit fatigue is not a static POI field.

Visit runtime load depends on:

```text
Visit Mode
+ planned / actual duration
+ fixed load
+ variable load
+ terrain / standing
+ Route walking
+ accumulated Day load
- rest recovery
```

A POI planning projection must not include a misleading `actualFatigue = walkingFeature` field.

## 7.4 Visit Profile

Represent at least the contract capability for:

```text
visitMode
minimumDurationMinutes
recommendedDurationMinutes
maximumUsefulDurationMinutes
fixedWalkingLoad
variableWalkingLoad
fixedPhysicalLoad
variablePhysicalLoad
```

Exact mode catalogue and load curves remain extensible/configurable where the design says Pilot is required.

Validation invariants:

```text
min <= recommended <= maxUseful
non-negative duration
load values in declared contract range
```

## 7.5 Region Graph

Implement contract types for:

```text
RegionNode
RegionType
RegionRelation
TravelEdge
TravelEdgeVariant
Gateway reference
```

Required rules:

- stored structural parent relation uses `contains`; `part_of` is derived, not a separately persisted duplicate;
- `adjacent` / `overlaps` are symmetric semantic relations and duplicate reverse records must be detectable;
- TravelEdge is directional;
- TravelEdgeVariant contains planning ranges/priors only;
- Gateway references transport identity rather than cloning a station/airport master;
- Planning Prior cannot carry fields that pretend to be a confirmed live timetable/route.

Graph-level validator/fixture coverage must include at least cycle and duplicate-relation detection.

## 7.6 Scoring contracts

Implement shapes for score outputs/breakdowns, not the full tuned scoring runtime.

At minimum represent:

```text
value 0..99
coverage 0..1
confidence 0..1 or null where allowed
status
configVersion
breakdown[]
```

Preserve separate components:

```text
matchScore
partyFit
seasonFit
weatherFit
dayFit
routeFit
currentSuitability
```

Do not define `overallValue` as an alias for `matchScore`.

## 7.7 Constraint / Feasibility statuses

Constraint gate:

```text
PASS
REJECT
NEEDS_FACT
```

Itinerary feasibility:

```text
PASS
WARNING
CRITICAL
NEEDS_FACT
```

Represent Item / Transition / Day / Trip issue structures with machine-readable reason codes.

Duration fixture must include the canonical reasoning example:

```text
full_visit
planned 30
minimum 60
recommended 90
→ CRITICAL / DURATION_TOO_SHORT
```

Do not encode a rule that `30min` has the same walking fatigue as the recommended 90min visit.

## 7.8 Candidate Pipeline

Represent at least:

```text
candidate identity/reference
candidate kind
stage
status
gate result
score refs
fact refs
reason codes
mustGo / locked / protected flags where applicable
```

Required stage/codebook must support the funnel:

```text
Region
→ Corridor
→ POI Expansion
→ Hard Filter
→ Scoring
→ Route Feasibility
→ Itinerary Feasibility
→ Pareto
→ Diversity
→ Top-N
→ AI
→ Revalidate
```

Hard reject and soft ranking must remain distinct.

## 7.9 AI Compact Context V1

Implement a versioned public DTO matching the design semantics:

```text
TaskType
ContextScope
TripCompactState
SparsePreference
ConstraintCompact
CandidateProjection
RouteCompact
WeatherCompact
DecisionRequest
precision
```

TaskType codebook must include the P0 v1 values from `ai-compact-context-v1.md`.

Rules:

- Local IDs are valid only for one Decision Run.
- LocalIdMap is Gateway-side and is not sent to the LLM by default.
- `precision` must distinguish normal vs fine.
- Candidate omission means “not projected for this Task”, not automatically unknown.
- Materially important unknown must be explicit via the appropriate status/reason/fact requirement.
- Provider Raw payloads are forbidden.

## 7.10 AI Decision / Patch V1

Top-level status must support exactly the P0 set:

```text
decision
need_more_context
no_valid_choice
abstain
```

Compact operations support the design-approved intent layer, such as:

```text
ADD
REMOVE
REPLACE
MOVE_BEFORE
MOVE_AFTER
REORDER
CHOOSE_ROUTE
SET_VISIT_MODE
```

These are **proposal intents**, not mutation operations.

Cross-validator must reject at least:

- runId mismatch;
- task mismatch;
- unknown Local ID;
- duplicate ID where uniqueness is required;
- selection of non-candidate ID;
- `decision` mixed with `contextRequest`;
- `need_more_context` mixed with mutation/choice payload;
- `no_valid_choice` or `abstain` containing Compact Ops;
- unsupported expansion code.

The AI response contract must not contain authoritative schedule, coordinates, fare, booking/payment mutation, role/permission or Trip revision write fields.

## 7.11 Replanning

Represent pure contracts for:

```text
Runtime Overlay reference/snapshot metadata
Replan Trigger
Affected Range
Earliest Mutable Boundary
Replan Scope
Protection state summary
Repair attempt/result metadata
Replan Proposal metadata
tripRevision / planRevision / runtimeRevision binding
```

Scope codebook must include:

```text
current_item
current_timeslot
rest_of_day
next_n_days
remaining_trip
macro_remaining_trip
```

Do not implement a scheduler/worker or mutation runtime.

`COMPLETED` semantics must remain immutable to ordinary replanning; `IN_PROGRESS` defaults protected.

## 7.12 Fact Freshness / Provenance

Implement contract types for:

```text
PlanningFactRefV1
FactKind
SourceKind
AuthorityBand
FreshnessState
FactUsability action
DecisionUse
```

Freshness states:

```text
CURRENT
AGING
STALE
EXPIRED
UNKNOWN
```

Actions:

```text
USE
USE_WITH_WARNING
REFRESH
FALLBACK
BLOCK
```

Do not hard-code final TTL values.

`expiresAt` must remain “decision safety horizon”, not an assertion that reality flips at expiry.

Planning Prior and Fact must be distinct types/identity.

## 7.13 Decision Trace / Telemetry

Implement structure for a `DecisionRun` correlation root and child references/spans covering:

```text
trigger
scope
input version refs
preference refs
runtime revision
fact refs + freshness
candidate stage counts
rejection reason aggregates
score refs
Pareto / Diversity records
repair attempts
AI usage
Provider usage
fallbacks
final proposal/decision
Engine validation ref
ChangeSet / Preview / Apply refs
user outcome
```

Hard privacy/safety boundary:

Never add contract fields intended to persist:

```text
hidden chain-of-thought
full system prompt
Provider Raw JSON
API tokens / cookies / secrets
booking confirmation code
payment token
unbounded full chat transcripts
unnecessary precise location history
```

Decision Trace is not Audit Log and not a copy of Canonical Trip Snapshot.

---

# 8. Validator requirements

Validators must follow repository public-contract style and be deterministic.

Required behavior:

```text
unknown contract version → reject
missing required field → reject
extra executable/critical field → reject according to strict schema boundary
wrong enum/code → reject
NaN/Infinity → reject
out-of-range number → reject
duplicate IDs where forbidden → reject
dangling/cross-reference failure where validator has required context → reject
```

Error output must use a safe machine-readable issue shape similar to existing contracts and must not echo secrets or arbitrary raw payloads.

Do not add a runtime schema dependency unless already approved in the repository. Prefer existing dependency-free parsing conventions.

---

# 9. Fixture requirements

Create synthetic fixtures only; no claim of real provider truth.

At minimum include positive fixtures for:

1. complete POIFeatureV1 containing both `0` and `null`;
2. Effective Preference with explicit `5`;
3. Sparse AI Preference with all `5` values omitted;
4. POI Visit Profile with `min=60`, `recommended=90`, `maxUseful>=90`;
5. Region Graph with directional TravelEdge and multiple variants;
6. Score result with coverage/confidence/breakdown;
7. itinerary feasibility PASS and CRITICAL examples;
8. Candidate Pipeline record that preserves Hard Reject reason;
9. AI Compact Context with Local IDs;
10. AI Decision `decision`;
11. AI Decision `need_more_context`;
12. Replan scope `rest_of_day` preserving completed/protected items;
13. FactRef examples for CURRENT and STALE metadata;
14. DecisionRun with Engine-only path (`aiUsed=false` or equivalent);
15. DecisionRun with AI/Provider usage child spans.

Negative fixtures/tests must include at least:

```text
feature value 10
unknown feature code
null coerced to zero attempt
compact preference explicitly containing 5
Visit Profile min > recommended
duplicate Local ID
AI output unknown Local ID
AI output wrong runId
AI output wrong task
AI decision mixed with context request
AI abstain with operations
Region contains cycle
symmetric relation reverse duplicate
TravelEdge prior pretending to carry live timetable truth
invalid freshness enum
invalid score >99
Decision Trace forbidden raw/provider/secret-like execution field
```

The last test should validate schema boundaries, not implement unreliable secret-content scanning.

---

# 10. Public exports and naming

All public contracts must be reachable from one stable planning-contract entry point, for example:

```ts
import { ... } from "@/shared/contracts/planning"
```

or the repository-equivalent relative convention.

Do not require Consumers to import internal validator implementation files directly.

Versioned names should be used for wire contracts where compatibility matters, e.g.:

```text
AiCompactContextV1
AiDecisionResponseV1
PlanningFactRefV1
DecisionRunV1
```

Avoid adding `V1` to every internal helper if it reduces clarity and is not a wire boundary.

---

# 11. Package/test integration

Add a focused script if consistent with repository conventions, for example:

```text
npm run test:planning-contracts
```

Use Node's existing test approach. Do not introduce Jest/Vitest solely for this Task.

Do not refactor unrelated test registration code unless required. If `tests/register-route-ts.mjs` is generic enough, reuse it; otherwise add a narrowly scoped equivalent without changing route behavior.

---

# 12. Mandatory tests / validation

Before final Result, run at least:

```text
npm run lint
npm run typecheck
npm run build
npm run test:planning-contracts
```

Also run the relevant existing canonical contract suites for Trip and Route, using the current repository commands/test files discovered at execution time.

Run the full existing Node test suite if the repository has a stable full-suite command or documented invocation. If there is no single full-suite script, enumerate what was run; do not claim unexecuted tests passed.

For `format:check`, compare failures against current base. Existing unrelated formatting debt may be recorded as baseline, but TASK-036 must introduce **zero new formatting failures**.

No live Provider credential is required for this Task.

---

# 13. Acceptance criteria

TASK-036 implementation is acceptable only when all are true:

- [ ] One unambiguous planning-contract public entry point exists.
- [ ] Full 43-dimensional Feature codebook/value contract is implemented and validated.
- [ ] `0` vs `null` Feature semantics are preserved.
- [ ] Effective Preference `5` semantics and Sparse Compact omit-5 semantics are both tested.
- [ ] walking/physical are documented/tested as standard-visit baselines, not fixed runtime fatigue.
- [ ] Visit Profile duration ordering is validated.
- [ ] Region graph structural and TravelEdge prior contracts are implemented without Live Route conflation.
- [ ] Score / coverage / confidence and Feasibility result contracts exist.
- [ ] Candidate Hard Reject / NEEDS_FACT / soft ranking boundaries are representable.
- [ ] AI Compact Context V1 validates TaskType, Scope, Local ID and precision semantics.
- [ ] AI Decision V1 cross-validation rejects illegal Local IDs/state combinations.
- [ ] AI output cannot directly encode authoritative Trip mutation, booking/payment, permission or Provider raw payload.
- [ ] Replanning scope / revision binding / protection metadata contracts exist.
- [ ] Fact Freshness / Provenance states/actions exist without hard-coded TTLs.
- [ ] DecisionRun Trace supports Engine-only and Engine+AI paths.
- [ ] Trace contract does not expose hidden reasoning/raw provider/secrets fields.
- [ ] Positive and negative fixtures cover the required cases.
- [ ] Existing Trip Plan and Route contract tests remain green.
- [ ] lint/typecheck/build and planning contract tests pass.
- [ ] No new unrelated formatting debt is introduced.
- [ ] Result file and Master WBS are updated before Codex returns.

---

# 14. WBS update requirement

The Master WBS currently has 4.20–4.24 reserved for the B-owned Trip Mutation Engine and 4.25–4.46 for Planner/UI work. TASK-036 introduces a new, non-conflicting row:

```md
| 4.47 | Trip Planning Engine Contract / Validator / Fixtures Foundation | A | P0 | 4.17,2.7；P0 Design Candidate set | 进行中 / 待审查 / 已完成按 Task 状态更新 |
```

Do not renumber 4.20–4.46.

At implementation start, add/update WBS 4.47 and the current Task tracking row in:

```text
docs/project/WBS-TravelAssist.md
```

Before final Codex Result, synchronize:

```text
Task ID
WBS ID
Owner
Status
Issue #291
Branch
Commit
Draft PR
Blockers / Deferred
```

Status rules remain:

```text
start implementation → 进行中
blocked → 阻塞
implementation complete, PR unmerged → 待审查
merged to develop + accepted → 已完成
```

Codex must not mark WBS 6.x, 7.4, 7.9, 8.5 or B 4.20–4.24 complete merely because this contract foundation passes.

---

# 15. Required Result

Create/update:

```text
docs/tasks/RESULT-TASK-036-a-trip-planning-contract-foundation.md
```

Result must include:

```text
Status
Base / Design Base / develop integration state
Issue
Branch
Commit
Draft PR
Files created/changed
Public contract entry point
Implemented contract groups
Validator coverage
Positive fixtures
Negative fixtures
Trip/Route compatibility
Commands/tests and exact outcomes
Known baseline failures
Deferred runtime work
WBS updated Yes/No
Recommended next Task
```

Do not call the P0 designs `Frozen v1` solely because TASK-036 code exists; they remain Freeze Candidates until Consumer Review + Pilot acceptance.

---

# 16. Git safety rules

Before modifying files:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/design/a-trip-engine-poi-ai-architecture-v2
git log --oneline -15 origin/develop
git log --oneline -15 origin/design/a-trip-engine-poi-ai-architecture-v2
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not delete or overwrite unrelated user/workstation changes.

If the working tree is dirty with unrelated changes, preserve them and use an isolated worktree/branch rather than destructive cleanup.

---

# 17. Stop conditions

Stop as `Blocked` rather than guessing if any of these occur:

- latest `develop` contains a conflicting **frozen** canonical contract that changes P0 semantics;
- canonical Trip/Route contracts cannot be imported without circular ownership or duplication;
- the implementation would require changing B Preference persistence semantics without a reviewed handoff;
- required P0 design files are missing from the Task base;
- implementation requires Provider secrets/live credentials;
- implementation would require bypassing WBS 4.20 Mutation Engine boundaries.

Do not treat ordinary compile/test errors as reasons to stop; fix Task-owned defects where possible.

---

# 18. Completion boundary

TASK-036 is complete when the **contract foundation** is reviewable and all acceptance gates pass.

It does not prove:

```text
Trip Planning Engine runtime implemented
AI works in production
POI data corpus complete
Region Graph corpus complete
routes are production licensed
replanning runs automatically
Fact refresh jobs exist
Trip persistence exists
```

Those belong to subsequent Tasks/Pilots.