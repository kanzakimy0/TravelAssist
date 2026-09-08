# TASK-WBS-4.17-A Result

## Status

Completed (4.17 public-contract scope only). 项目负责人明确指示“合并并继续”，批准本次交接并接受取代独立 B 审查等待门槛。PR #216 merged `ec9b06240040881b6fdc249bf0967f820ac2406b`; merge tree equals the validated head `6e3c470`. WBS 4.17 is 已完成 / frozen v1.0. No independent B/GitHub APPROVED review is claimed. TASK-017 must freshly check this merged baseline before implementation; this closeout itself adds no database implementation.

下方待审查描述是原交付历史，已由本节负责人批准与实际合并记录覆盖。其技术限制与后续任务边界不变。

## Tracking

- Producer A; Consumers B TASK-017 / Trip Library / Engine.
- Issue [#215](https://github.com/kanzakimy0/TravelAssist/issues/215); related #207 / #201.
- Base `39890af8c2ed137712b90f3f9d2bfdef313cfef6`.
- Branch `codex/a-trip-plan-contract`, independent clean worktree. Original dirty worktree and live preview are untouched.
- Implementation commit: `2021343b2f160cfb1d91c05fdcc1d249a8b149ed`; tracking-only follow-up at [Draft PR #216](https://github.com/kanzakimy0/TravelAssist/pull/216) head. Target develop, not merged.
- User authorized contract work and merge after its required review gate, then TASK-017 continuation. The concrete contract still needs the repository-mandated B/designated reviewer review; authorization is not fabricated review evidence.

## Contract

Canonical proposed v1 is `src/shared/contracts/trips/`. Parser-defined wire shapes infer TypeScript types (no duplicated schema). Public facts/progress, Trip/Plan/Day/Item snapshots and revisioned resume descriptors are independent of React, SDK, database and private UI state. Pure summary projection demonstrates Consumer behavior.

Strict validators cover required/null/empty fields, bounded integers/text/arrays, opaque IDs, duplicate/dangling references, exact dates, approximate month/season input, instant/timezone agreement and DST boundaries, coordinates, minor-unit money, unknown versions/fields and conservative unknown-code fallback. Booking summary, assessment and lock are separate; schema acceptance never proves an actual booking or permission to mutate it.

`fixtures.ts` is synthetic and marked as such. No real ID/coordinate/provider/booking fact is fabricated. No typed contract status is presented as an actual deployed service or checked RLS policy.

## Mapping / Producer-Consumer Validation

The opt-in pure `trip-contract-adapter.ts` converts the real `TripWizardDraft` into trip-only facts and real four-step/five-view progress. Typed participant needs, seniors, manual anchor provenance/address, dates and numeric budget survive the mapping. Long-term preferences remain outside A's payload; no profile/Companion Master write occurs.

The current UI budget fields omit currency. Adapter callers must explicitly supply currency and minor-unit exponent; missing/invalid exponent, extra precision, malformed dates and unresolved required anchor identity reject without guessing or rewriting the source. Destination IDs can remain null, coordinates are not fabricated. Unsupported old planned-date labels reject instead of converting to a made-up date. No UI storage migration runs.

Canonical JSON round-trip → validated summary → revisioned resume is tested. This is executable contract integration, **not** a deployed B Trip Library, Planner resume endpoint, real booking or DB integration. No existing UI imports/calls the new producer adapter yet; adoption belongs to reviewed consumer integration.

## Validation

| Check                           | Result                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm ci`                        | PASS; locked dependencies; no package/package-lock changes; no vulnerabilities reported by install |
| New contract/actual-Step tests  | 47 PASS                                                                                            |
| Existing + new Node test suite  | 612 PASS / 0 failed / 0 skipped                                                                    |
| `npm run lint`                  | PASS                                                                                               |
| `npm run typecheck`             | PASS                                                                                               |
| `npm run build`                 | PASS, 21 static pages generated; no cloud DB/token configuration                                   |
| New-file Prettier               | PASS before final tracking; rechecked at commit                                                    |
| Full `npm run format:check`     | FAIL: 27 untouched baseline Markdown files (below); no unrelated reformat                          |
| `git diff --check`              | PASS                                                                                               |
| DB / RLS / migration / live API | NOT RUN / out of scope; no schema/service implemented                                              |
| Browser QA                      | NOT RUN; no existing rendered component, CSS, route or runtime call site changed                   |

First local test attempt exposed Node strip-only incompatibility with constructor parameter properties; fixed without compiler changes. First typecheck exposed runtime `.ts` import extensions incompatible with repository bundler settings; fixed via extensionless production imports and a scoped test resolver, no tsconfig/package edits. All subsequent checks above use the corrected implementation.

Baseline format failures (unchanged versus base):

- `docs/ai/trip-judgement-two-phase.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/db-foundation-bootstrap-plan.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/architecture/trip-plan-data-ai-takeover.md`
- `docs/assets/asset-library-strategy.md`
- `docs/assets/asset-variant-sizing-spec.md`
- `docs/assets/personal-center-generated-images-20260905.md`
- `docs/project/WBS-5.1-LOCAL-ASSET-COPY-MAP.md`
- `docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md`
- `docs/README.md`
- `docs/tasks/TASK-009-a-db-foundation.md`
- `docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`
- `docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md`
- `docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md`
- `docs/tasks/TASK-WBS-5.4-5.5-acceptance-closeout.md`
- `docs/tasks/TASK-WBS-5.4-b-personal-center-generated-assets-integration.md`
- `docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md`
- `docs/tasks/TASK-WBS-5.5-b-preference-center-ui-amendment-local-assets.md`
- `docs/ui/attraction-activity-tag-display-rules.md`
- `docs/ui/companion-management.md`
- `docs/ui/navigation-flow.md`
- `docs/ui/personal-center-design-freeze-v1.md`
- `docs/ui/personal-center-responsive-states.md`
- `docs/ui/planner-map-interaction-booking-mapbox.md`
- `docs/ui/planner-right-panel-secondary-tabs.md`
- `docs/ui/trip-detail.md`

## Review Gate / WBS

4.17: 待审查. 4.15/4.16 are still partial browser implementations; 8.5 not started, ownership unchanged. 5.18/#207 remains Blocked until concrete 4.17 Consumer review, accepted contract freeze and merge are recorded. 5.11/5.16 are not assigned an invented dependency on 4.17; the current TASK-017 remote command's implementation-branch gate is respected.

Required review: B or designated reviewer must check Step input completeness/Preference boundary, currency-context handling, plan snapshot/resume semantics and remaining producer runtime scope. Review comments are still pending; no automatic merge is enabled. This is the remaining external gate, not a failed code test.

## Files Changed

- `src/shared/contracts/trips/index.ts`
- `src/shared/contracts/trips/validation.ts`
- `src/shared/contracts/trips/fixtures.ts`
- `src/features/start-flow/model/trip-contract-adapter.ts` (new opt-in producer adapter)
- `tests/wbs-4-17-trip-contract.test.mjs`
- `docs/architecture/trip-plan-contract.md`
- `docs/tasks/TASK-WBS-4.17-a-trip-plan-contract.md`
- `docs/tasks/RESULT-WBS-4.17-a-trip-plan-contract.md`
- `docs/project/WBS-TravelAssist.md`

## Next Gate / Non-goals

Obtain the required integration review, resolve requested changes, record freeze evidence and merge this contract PR under the user's authorization. Then fetch latest develop and rerun TASK-017 prerequisites. Its final persistence PR still follows TASK-017's Draft/no-auto-merge rule.

No itinerary/day/item tables, authentication, Preference Master, Companion Master, B Engine implementation, production Supabase, actual booking/payment, Provider/AI call, local saved-trip migration or UI redesign was done. Existing preview, Mapbox local configuration and user drafts are unchanged.
