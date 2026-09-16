# CODEX — TASK-049-B Launcher

Execute **TASK-049-B — WBS 5.19 Trip Save / Read / History Contract v1** in `kanzakimy0/TravelAssist`.

## Repository

```text
https://github.com/kanzakimy0/TravelAssist
```

## Tracking

```text
Issue: #333
WBS: 5.19
Owner: B
Spec branch: task/b-wbs-5-19-trip-save-read-history-contract
Implementation branch: codex/b-account-wbs-5-19-trip-save-read-history-contract
```

## Mandatory preflight

Run:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Do **not** implement from the spec branch. Create/sync the implementation branch from execution-time latest `origin/develop`.

Confirm WBS 5.18 is completed and PR #331/#332 closeout facts are already in `origin/develop`.

## Read these remote files in full

```bash
git show origin/task/b-wbs-5-19-trip-save-read-history-contract:docs/tasks/TASK-049-b-trip-save-read-history-contract.md
git show origin/task/b-wbs-5-19-trip-save-read-history-contract:docs/architecture/trip-save-read-history-contract-v1.md
git show origin/task/b-wbs-5-19-trip-save-read-history-contract:docs/project/WBS-5.19-trip-save-read-history-start.md
```

Then read the implementation sources and accepted 5.18 evidence required by the Task.

## Frozen rules

1. Reuse `public.trip_library_records`; no second Trip/Day/Item persistence model.
2. Verified Cookie/Bearer Auth only. Explicit Bearer never falls back to Cookie. Cookie mutations require trusted Origin.
3. Normal user requests must not use Supabase `service_role`.
4. Use trusted server `getDb()` only after verified Auth, with explicit owner predicates and CAS.
5. Direct authenticated table writes stay denied.
6. All writes must pass canonical TypeScript Trip/Preference/Companion parsers before DB mutation.
7. Required routes are exactly the `/api/trip-library` family defined in the design.
8. All mutations except create require exact `If-Match: "<storageRevision>"`; stale = 409, no last-write-wins.
9. Single-resource responses return ETag from storage revision.
10. Server captures creation Preference and selected Companion snapshots; clients cannot submit owner, creation Preference snapshot/source revision or raw party snapshot.
11. `creationKey` is owner-scoped idempotency for create/copy. Compatible retry returns existing record; incompatible reuse = 409.
12. Saved re-save cannot silently change the established canonical Trip ID.
13. History freeze time is DB-owned. History remains immutable.
14. List responses are bounded summaries and must not contain full multi-MiB plans or fabricated Reservation/Favorite data.
15. Publish browser-safe A/B handoff for future WBS 4.19, but do not wire Planner.
16. Do not revive `/api/travel-persistence` or merge/cherry-pick old PR #221.
17. No Reservation/Booking/Payment/Favorites persistence.
18. No Start Flow autosave implementation or Personal Center visual redesign.
19. No automatic history transition based on dates.
20. Do not start 4.19 / 5.21 / 8.5 / 9.8.

## WBS start

At actual implementation start, read the latest `docs/project/WBS-TravelAssist.md` and change **only WBS 5.19**:

```text
未开始
→ 进行中（#333 / TASK-049-B）
```

Preserve all concurrent A/B updates.

## Validation

Run the complete acceptance matrix in the Task/design, including:

- full repository before/after baseline;
- TASK-049 pure/contract tests;
- real Local Supabase/Auth/HTTP/CAS tests with User A/User B/Anon;
- 5.18 regression;
- Preference/Companion/Profile regressions;
- near-4MiB valid Plan API save and over-limit rejection;
- create/copy idempotency;
- concurrent same-revision race;
- cross-user 404 isolation;
- direct authenticated DML denial;
- no production service-role request path;
- client/server dependency leakage audit;
- lint/typecheck/build/deploy/diff;
- final GitHub Quality Gate on the final PR head.

## Final tracking

Before returning the Result:

```text
WBS 5.19 = 待审查
Issue #333 = Open
Implementation PR = Open / Draft → develop
```

Generate:

```text
docs/contracts/trip-save-read-history-v1-handoff.md
docs/tasks/RESULT-TASK-049-b-trip-save-read-history-contract.md
docs/qa/TASK-049/README.md
```

Update Issue #333 and Draft PR with actual commits/tests/limitations.

Do not merge, close the Issue, mark 5.19 completed, or start downstream work before explicit user acceptance.

## Forbidden Git operations

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Return the complete TASK-049-B Result to the user.