# CODEX Launcher — TASK-048-B / WBS 5.18

Execute **TASK-048-B — Trip Draft / Saved / History Data Model v1** in the TravelAssist repository.

## Repository / tracking

```text
Repository: https://github.com/kanzakimy0/TravelAssist
Issue: #329
WBS: 5.18
Owner: B
Spec branch: task/b-wbs-5-18-trip-data-model
Implementation branch: codex/b-account-wbs-5-18-trip-data-model
```

## Start checks

Run first:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Working tree must be clean. Implementation must be based on the **latest `origin/develop` at execution time**.

Do not develop from the spec branch tree. Use the spec branch only to read the authoritative documents.

## Read authoritative documents

```bash
git show origin/task/b-wbs-5-18-trip-data-model:docs/architecture/trip-persistence-data-model-v1.md

git show origin/task/b-wbs-5-18-trip-data-model:docs/tasks/TASK-048-b-trip-persistence-data-model.md

git show origin/task/b-wbs-5-18-trip-data-model:docs/project/WBS-5.18-trip-data-model-start.md
```

Then read latest develop sources required by the Task, especially:

```text
src/shared/contracts/trips/**
src/features/preferences/domain/preference-v1.ts
src/features/companions/domain/companion-v1.ts
docs/ui/trip-library.md
docs/project/WBS-TravelAssist.md
```

## Legacy PR #221 rule

Issue #207 / Draft PR #221 are historical Partial references only.

Do **not** merge or cherry-pick that branch wholesale.

Perform the required file-by-file:

```text
REUSE / REWORK / DEFER / SUPERSEDE
```

audit. Old Preference semantics are superseded by current 5.11/5.16.

## Implementation branch

Create/switch from latest develop:

```text
codex/b-account-wbs-5-18-trip-data-model
```

## Critical implementation rules

1. Create one B-owned `trip_library_records` aggregate for `draft | saved | history`.
2. Reuse canonical `TripDraftFactsV1`, `WizardProgressV1`, `TripPlanSnapshotV1`; do not create itinerary/day/item copies.
3. B DB UUID and A canonical Trip string ID remain distinct.
4. Store immutable long-term `PreferenceV1` creation snapshot + source revision and a trip-only `PreferencePatchV1` override.
5. Store privacy-minimized `TripPartySnapshotV1`; no self Companion row, raw DOB, gender, avatar, relationship, private/dining notes, diagnosis, medication or religion fields.
6. History is immutable; copy creates a new record.
7. `storage_revision` is B persistence CAS revision and must never replace A Trip/Plan revisions.
8. No Reservation/Booking/Favorite persistence in this Task.
9. No HTTP API, Start autosave wiring, Planner save wiring or Trip Library server UI wiring; those are 5.19/later.
10. No direct authenticated DML shortcut just to make the schema writable; follow the frozen RLS/write-exposure design.
11. Real Local Supabase migration/reset/types/RLS QA is mandatory for completion.
12. Do not modify `src/shared/contracts/trips/**` unless a genuine blocker is found; if blocked, report Blocked rather than silently changing A's contract.

## WBS

At actual implementation start, reread latest Master WBS and change **only WBS 5.18** from the current startable state to:

```text
进行中（#329 / TASK-048-B）
```

Preserve every concurrent A/B WBS update.

After implementation + required QA + Draft PR:

```text
5.18 = 待审查
```

Do not set it to completed.

## Required QA / Result

Run the full TASK-048 requirements, including real Local Supabase/Auth/RLS/model checks, current repo gates, regressions and generated-type repeatability.

Generate:

```text
docs/tasks/RESULT-TASK-048-b-trip-persistence-data-model.md
docs/qa/TASK-048/README.md
```

Push branch and create a **Draft PR → develop** with:

```text
Relates to #329
```

Keep Issue #329 Open.

Do not start WBS 5.19.

## Forbidden commands

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Finally return the complete `TASK-048-B Result` to the user.
