# TASK-017-B Result

## Status

Blocked — prerequisite audit only (2026-09-08). DB Foundation is available; WBS 4.17 Trip Plan / Planner Contract is not frozen. The direct implementation blocker is WBS 5.18. No implementation branch, migration, API or business code was created.

Issue #207 allows an independent Preference subset, but the remote Codex command permits creation of the implementation branch only after prerequisites pass. This run takes its explicit Blocked path; it does not invent an additional 4.17 dependency for 5.11/5.16 or claim those items implemented.

## Prerequisites

| Gate                   | Actual evidence                                                                                                                                                                | Result                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Latest fetched develop | `39890af8c2ed137712b90f3f9d2bfdef313cfef6`                                                                                                                                     | Recorded                                     |
| TASK-015-A / PR #186   | Merged 2026-09-08T08:06:08Z; merge `24dff4e3b74dfe01c369d2c149d37eba86ad6472` is an ancestor of develop                                                                        | PASS                                         |
| DB paths               | `supabase/config.toml`, `supabase/migrations/`, `src/db/index.ts`, `src/db/schema/index.ts`, `drizzle.config.ts`, `src/types/database.generated.ts` exist in develop           | PASS                                         |
| TASK-016-B             | PR #209 merged; latest develop includes its final accepted Result/WBS record                                                                                                   | Available; not a Preference model substitute |
| WBS 4.17               | Master WBS explicitly says 未开始; 4.16 says browser draft Core / server Contract incomplete                                                                                   | BLOCKED                                      |
| Canonical handoff      | No `src/shared/contracts/` files in develop; `planner-types.ts` identifies presentation fixtures, and `trip-model.ts` explicitly says NOT the final cross-module Trip Contract | Not dependable                               |
| WBS 8.5                | Main Trip Plan Schema remains A-owned and 未开始                                                                                                                               | Not implemented here                         |

Read the full remote command and Task at spec SHA `67587d5b55facfd0c773953e84daa9d3598a3ad5`, Issue #207, and all seven mandatory Preference, Trip Library, Planner, database, contract-handoff and Master WBS documents from develop. A module-local browser model is not a substitute for the Producer A review/fixture/versioned contract handoff required by `cross-module-contract-handoff.md`.

## Tracking

- Issue: [#207](https://github.com/kanzakimy0/TravelAssist/issues/207), remains Open / Blocked.
- Base commit: `39890af8c2ed137712b90f3f9d2bfdef313cfef6`.
- Spec branch: `task/b-step-preference-trip-draft-persistence` (not the implementation base).
- Audit-only branch: `codex/task-017-b-prerequisite-audit`, created from clean latest develop in an independent worktree.
- Implementation branch `feature/b-step-preference-trip-draft-persistence`: not created.
- Commit / Draft PR: pending publication of this docs-only audit; not an implementation PR.
- Existing preview worktree, untracked `.cache/`, original user worktree, local environment and browser drafts are untouched.

## Step Mapping

This is an audit of existing inputs, not a new frozen server schema or a claim that database persistence exists. Sources: `start-page.tsx`, `components/start-flow-shell.tsx`, `model/start-flow-draft.ts`, `model/generated-plans.ts` and current navigation tests under the start-flow/navigation features.

| Actual UI / field                                                                                       | Existing behavior                                                                                                     | Intended ownership / unresolved boundary                                                                                              |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Step 1 `familiarity`                                                                                    | first / some / experienced / local                                                                                    | Experience input; explicit reviewed Preference master-data mapping still needed, not a fabricated server enum                         |
| Step 2 `likes`, `dislikes`, `interestDetails`                                                           | 16 interests, max three likes and three dislikes; nested interest choices                                             | Long-term inclination baseline copied to Snapshot; this trip's edits are Overrides, never automatic long-term writeback               |
| Step 2 `travelStyle`                                                                                    | pace / depth / discovery / movement / coverage / priority, five-position values                                       | Snapshot + explicit trip Overrides; retain neutral versus unset distinction                                                           |
| Step 3 `dateMode`, `exactDeparture`, `exactReturn`, `plannedDeparture`, `plannedReturn`, `durationDays` | Exact/planned/undecided dates; exact date handler computes duration                                                   | Trip Draft facts                                                                                                                      |
| Step 3 `destinations`, `selectedPrefectures`                                                            | Destinations and prefecture selections                                                                                | Trip Draft references; no guessed final Trip identifier schema                                                                        |
| Step 3 `transport`, `transportDetails`                                                                  | Rail/bus/transfers/walking, highways, mountain/night/snow driving, max driving hours, intercity/suburban/auto-combine | Soft inclinations map to Snapshot/Override; trip-local driving constraints remain Draft constraints, not an unvalidated UI-state dump |
| Step 3 `party`                                                                                          | adults / children / infants / seniors                                                                                 | Trip-local participant summary, never Companion Master writeback                                                                      |
| Step 3 `travelerDetails`                                                                                | Ages, child seat, stroller, crib, senior walking/stairs/rest                                                          | Trip participant needs / constraints; not long-term companion records                                                                 |
| Step 3 `budget`, `budgetDetails`                                                                        | Level, total/per-person/lodging/dining amounts, paid-attraction and upgrade choices                                   | Actual amounts are Trip facts; soft spending tendencies may be Snapshot/Overrides after explicit master-data mapping                  |
| Step 3 `anchors`                                                                                        | flights / hotels / activities; input source fields and fixed/non-cancellable flags                                    | Trip-local fixed arrangements; not actual booking records or provider integrations                                                    |
| Step 4 `generationStatus`                                                                               | idle/generating/complete, activeStage, runId; six timed local stages                                                  | Progress vs temporary runtime must be separated by the future contract; local animation is not a server job                           |
| Step 5 `generatedPlans`, `selectedPlanId`                                                               | Three fixed generated-plan fixtures; temporary navigation mapping to Planner                                          | Not canonical server Trip Plans; cannot serialize as A's schema                                                                       |
| Shell `currentStep` / completion                                                                        | Indices 0–3; generation and results both use index 3 and UI 4/4                                                       | Trip Draft progress needs an explicit results/completion discriminator; do not assume a new 5/5 step                                  |
| Dining/lodging preferences                                                                              | No separate primary Step field; some interests and per-day/per-night budget inputs exist                              | Do not invent fields or copy English/UI labels as master IDs; integrate existing Preference System only after reviewed mapping        |

The active `/start` route renders `StartFlowShell` and `TripWizardDraft`. The smaller legacy `StartFlowDraft` type (destination/timing/companions/hardConstraintsNote) in the same file is not the active five-view state; do not design the database from that legacy type alone.

The current key is `travelassist.trip-wizard.v1`, stored envelope `version: 2`. Changes and explicit Save write localStorage. There is no server ownership/revision/idempotency mechanism in that shell. Generation uses static `GENERATED_PLANS` and a 720 ms timer, not AI or a server resume contract.

Historical TASK-005 / TASK-006 delivery Results are embedded in their Task files (PR #29 / #32); TASK-007 contains its implementation, QA and final merge records (PR #61). No separate RESULT-TASK-005/006/007 files were found. These historical localStorage/UI passes are not TASK-017 database validation. Existing calendar and main-flow navigation tests were inspected; they cover calendar behavior, temporary plan mapping, entry=step3 and preservation of the single browser store, not server persistence or RLS.

## Preference Persistence

Not implemented. No `travel_preferences` SQL, typed column/JSONB choice, indexes, constraints or API has been introduced. Preserve the frozen three-level Preference system, and keep Preference out of `profiles` / `profile_settings`. WBS 5.11 and 5.16 remain 未开始; this audit does not claim their independent scopes inherently require A's Trip schema.

## Trip Draft / Snapshot / Override

WBS 5.18 is Blocked on 4.17. No `trip_drafts`, `trip_preference_snapshots`, `trip_preference_overrides`, itinerary/day/item tables, migration history, Drizzle mirror or generated types were changed.

Deferred implementation requirements remain: copy the long-term Preference at trip creation; freeze existing Snapshots when long-term defaults change; compute Effective = Snapshot + sparse Overrides; preserve explicit false/0/neutral versus unset; never import another author's long-term preferences; use retry-safe draft creation and stale-revision rejection. These are requirements, not implemented guarantees. Authentication and anonymous-account lifecycle are not invented here.

## RLS / Security

No new policies, secrets, cloud connections, provider calls or ownership endpoints. TASK-017 two-user/anon isolation, authenticated ownership and stale-write tests are NOT RUN. Parent tasks' database passes are prerequisites only, not evidence for nonexistent TASK-017 tables.

## Validation

- Startup Git status/branch/fetch/develop SHA/log checks completed; original work retained and audit worktree started clean.
- GitHub PR #186 merge status, ancestry and required paths checked; 4.17 absence checked against WBS, contract path inventory and explicit Planner type comments.
- Full mandatory documentation and actual Step types/state/Mock/navigation/calendar test audit completed.
- New Result Prettier check and documentation whitespace validation: PASS. Existing WBS formatting is preserved rather than reformatted wholesale.
- `npm ci`, Local Supabase start/status/reset/types/stop, TASK-017 database tests, lint/typecheck/build and browser QA: NOT RUN because implementation is stopped at the prerequisite gate; no runtime or dependency changes exist to validate. Do not interpret this Blocked audit as Ready for review of an implementation.

## Changed Files

- `docs/tasks/RESULT-TASK-017-b-step-preference-trip-draft-persistence.md` — new audit and deferred-work record.
- `docs/project/WBS-TravelAssist.md` — TASK-017 tracking and 5.18 explicit Blocked status; 5.11/5.16 remain unstarted. A/B ownership, 4.17/8.5 and accepted parent statuses preserved.

## Known Limitations

No cross-device draft resume, server Preference persistence, Snapshot/Override storage, idempotent autosave or new RLS isolation is delivered. The existing localStorage flow remains unchanged. This documentation PR must stay Draft and must not close #207 or mark TASK-017 completed.

## Next Gate

Owner A must freeze and merge a dependable WBS 4.17 Trip Plan / Planner Contract with canonical versioned types, fixtures, ownership/lifecycle and consumer handoff evidence. Then re-fetch, re-check prerequisites and execute TASK-017 on latest clean develop. Do not implement A's 8.5 tables or start 5.14/5.19/AI/Planner work as a workaround. A separately scoped independent Preference-only run would need the current execution-gate ambiguity resolved first.
