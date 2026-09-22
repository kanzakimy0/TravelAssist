# TASK-073-A — PR #406 Planner Save/Read Canonical Integrity + Latest-Develop Revalidation

> Issue: #412
> Existing implementation: TASK-069-A / Issue #403
> Existing PR: #406
> Existing remote branch: `codex/a-planner-save-read-wiring`
> WBS: 4.19 — Planner Save/Read 接线
> Priority: P0
> Rule: reuse existing implementation; no second implementation PR.

## Goal

Fix the Canonical data-integrity issue identified during review of PR #406, then integrate execution-time latest `develop` and revalidate the existing Planner Save/Read implementation.

## Blocking defect

Current `plannerTripFromCanonical()` may create visual fallback coordinates for a Canonical place whose coordinates are unknown. A new/reused Planner item can then flow through `canonicalPlace()` and potentially persist those fallback coordinates as Canonical facts.

Frozen rule:

```text
unknown Canonical coordinates
!=
visual UI fallback coordinates
```

UI fallback values must never become persisted business facts.

## Required implementation

1. Preserve existing TripRepository / RLS / transaction / root+plan CAS.
2. Preserve existing Canonical Trip contract.
3. Make coordinate provenance/known-vs-fallback state explicit enough that reverse projection cannot confuse UI geometry with Canonical facts.
4. Ensure Canonical → Planner → Canonical round-trip preserves unknown coordinates as unknown.
5. Ensure a newly added item that reuses an unknown-coordinate Canonical place does not persist fallback coordinates.
6. Preserve supported known coordinates unchanged.
7. Preserve late hydrate protection.
8. Preserve late save-acknowledgement protection.
9. Preserve browser recovery as a non-authoritative fallback.
10. Do not broaden the supported Planner→Canonical mutation surface beyond TASK-069 scope.
11. Where practical, authenticate/authorize before reading the bounded PUT body; if ordering cannot change safely, document why.

## Required regression

Add a focused negative test:

```text
Canonical place coordinates = null/unknown
↓
Planner receives a visual-safe fallback
↓
user adds/reuses that place in a supported new Planner item
↓
Canonical save
↓
saved coordinates remain null/unknown
↓
fallback latitude/longitude never persist
```

Also retain regression coverage for:

- known-coordinate semantic round-trip;
- UI/detail draft exclusion;
- stale revision 409;
- two writers at same revision: exactly one success;
- anonymous and foreign user fail closed;
- malformed/mismatched saves do not mutate;
- late canonical hydrate cannot overwrite dirty local state;
- late save acknowledgement cannot mark newer local work clean.

## Latest-develop refresh

All Git operations happen outside Codex when local AGENTS rules prohibit Git.

The final PR branch must contain execution-time latest `origin/develop` through a normal merge. No rebase/force push.

## QA

At minimum:

```text
npm ci
node --import ./tests/register-planner-ts.mjs --test tests/task-069-planner-save-read.test.mjs
npm run test:trip-plan
npm run test:trip-plan:runtime
TASK-073 focused regression
TASK-069 Local Supabase/Auth/HTTP/RLS/CAS runtime acceptance
npm run lint
npm run typecheck
npm run build
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
```

Also run directly affected Planner Store / Trip persistence regressions.

If latest `develop` has an independent baseline failure, reproduce it on the exact baseline and record evidence. Do not weaken tests.

## Deliverables

- code fix on existing PR #406 branch;
- focused regression test;
- `docs/qa/TASK-073-A/README.md`;
- machine-readable acceptance evidence;
- `docs/tasks/RESULT-TASK-073-a-pr406-planner-save-read-integrity-refresh.md`;
- WBS 4.19 remains `待审查` until explicit user acceptance.

## Boundaries

Do not:

- create a second Trip model;
- create a second Planner Save/Read API;
- create a second implementation PR;
- add DB migration without explicit re-authorization;
- modify Candidate Pipeline / POI / AI / Provider scopes;
- force push;
- hard reset;
- clean the worktree destructively;
- auto-merge PR #406.

## Final disposition

Update existing PR #406 and stop for human acceptance.
