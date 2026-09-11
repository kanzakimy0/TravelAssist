# WBS 5.11 Completion Closeout

> Date: 2026-09-11
> Owner: B / Personal Center / Preference Data
> Task: TASK-042-B
> Issue: #307
> Implementation PR: #309

## Final status

**WBS 5.11 — Preference Schema = 已完成。**

User acceptance was explicitly granted on 2026-09-11 and PR #309 was merged into `develop`.

- Accepted head: `6475eacabf35a792580bac755dc9f388ee3eb110`
- Merge commit: `783f00cfe48565710203a952ab6dd5123e58a793`
- Canonical implementation branch: `codex/b-account-wbs-5-11-preference-schema`
- Canonical design: `docs/architecture/preference-schema-v1.md`
- Task: `docs/tasks/TASK-042-b-preference-schema-v1.md`
- Result: `docs/tasks/RESULT-TASK-042-b-preference-schema-v1.md`

## Accepted scope

The accepted WBS 5.11 implementation includes:

- canonical 23-key long-term Preference v1;
- sparse `schemaVersion: "1.0"` payload semantics;
- stable InterestCode / DetailCode master values;
- five-level `mobility.walkingTolerance`;
- `style.planning` and six other 1–5 style axes;
- exactly three `hard_when_true` transport exclusions;
- deterministic strict set/unset patch semantics;
- one-user-one-root `public.travel_preferences` persistence schema;
- SQL-authoritative migration, strict JSONB validation, owner-only RLS and revision guard;
- Drizzle mirror and real Local Supabase generated types;
- real Local Supabase/Auth/RLS validation and full repository regression evidence.

## Acceptance evidence

Evidence accepted from TASK-042-B before merge:

- pure Preference tests: `503/503 PASS`;
- real Local Supabase Preference/Auth/DB/RLS: `505/505 PASS`;
- TASK-016 Profile DB regression: `25/25 PASS`;
- full repository tests: `1332/1332 PASS`;
- lint / typecheck / build / deployment-local validation / changed-file format / diff checks: PASS;
- final documentation-only head `6475eac...` also passed GitHub Quality Gate.

The final pre-merge documentation change only clarified status and Snapshot/Override boundaries. It did not change runtime, SQL, Schema or tests, so the previously completed Local DB evidence remains applicable.

## Deferred boundaries

Completion of WBS 5.11 does **not** mean the following are implemented:

- WBS 5.13 Preference Preset / default expansion;
- WBS 5.14 Planner-readable Preference Contract;
- WBS 5.16 Preference persistence HTTP/API and UI wiring;
- WBS 5.18 Trip Draft / Snapshot / Override persistence runtime;
- WBS 8.6 B Personal Center data migration;
- Planner, AI, Engine, POI 43-feature mapping or scoring consumption.

Trip Preference Snapshot / Override semantics are frozen only as a data boundary in 5.11; actual tables/resolver/runtime remain Deferred to 5.18 / related work.

## PR #221 relationship

PR #221 / Issue #207 remain unchanged and are not closed or merged by this closeout. TASK-042-B supersedes the old Preference field semantics while leaving its unrelated deferred Trip Draft/persistence work for the proper later WBS.

## Completion rule

The project rule for `已完成` is satisfied:

1. implementation and required QA passed;
2. user explicitly accepted the Task;
3. PR #309 merged to `develop` at `783f00cfe48565710203a952ab6dd5123e58a793`.

No downstream Task is automatically started by this closeout.
