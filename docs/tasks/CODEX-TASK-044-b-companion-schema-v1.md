# CODEX — TASK-044-B / WBS 5.12 Companion Schema v1

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue: `#312`

Execute **TASK-044-B only**.

## 1. Fetch / inspect

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Read the canonical remote specification:

```bash
git show origin/task/b-wbs-5-12-companion-schema:docs/tasks/TASK-044-b-companion-schema-v1.md
git show origin/task/b-wbs-5-12-companion-schema:docs/architecture/companion-schema-v1.md
git show origin/task/b-wbs-5-12-companion-schema:docs/architecture/companion-schema-v1-freeze.md
git show origin/task/b-wbs-5-12-companion-schema:docs/tasks/CODEX-TASK-044-b-companion-schema-v1.md
```

Read latest WBS, DB standards, Companion UI/domain, Profile/Preference DB schemas and A Trip Contract. Check Issue #312 and verify no canonical WBS 5.12 implementation already merged.

## 2. Start safely

Start from the **latest clean `origin/develop` at execution time**.

Implementation branch:

```text
codex/b-account-wbs-5-12-companion-schema
```

Do **not** use `feature/**`; repository automation may auto-create/merge those PRs.

Do not stack on, modify or close PR #221 / Issue #207.

When actual work starts, change only WBS 5.12 to `进行中`.

## 3. Implement only WBS 5.12

Implement exactly:

```text
public.companions
public.companion_groups
public.companion_group_members
```

Frozen invariants:

- no self Companion row;
- group self membership = `includes_owner`;
- DOB XOR fallback age group;
- planning bands 0–2 infant / 3–17 child / 18–64 adult / 65+ senior;
- no age/gender/relationship → special-needs inference;
- gender is display-only;
- strict `travel_profile` v1.0, <=8 KiB;
- exact 6 mobility, 5 dining and 5 activity stable codes from the Task;
- no `diningNote` / `privateNote` / diagnosis / medication / specific-allergen free-text persistence;
- same-owner composite FKs;
- owner-only RLS;
- Companion and Group revision start at 1 and update exactly +1;
- hard-delete long-term master lifecycle;
- SQL migration authoritative;
- Drizzle mirror;
- real Local Supabase generated types.

Create a pure B-internal registry/parser and deterministic calendar-date age helper. Do not publish a shared Companion Contract in 5.12.

Do not wire current 5.6 UI to DB.

## 4. Do not implement downstream

Do not implement or mark complete:

```text
5.17 Companion Persistence API
5.18 Trip Companion Snapshot / temporary companion / override
8.6 Personal Center Migration
A Trip Contract changes
Planner / AI / Engine integration
Booking / Passenger identity
Companion sharing / invitation
```

## 5. Real DB acceptance is mandatory

Use real Local Supabase and at least two temporary real Auth users.

Run repository-supported categories:

```text
db:start
db:status
db:reset
db:types
Companion pure tests
Companion real DB/Auth/RLS tests
Profile regression
Preference regression
full repository tests
lint
typecheck
build
applicable deploy gates
changed-file format
git diff --check
db:stop
```

Prove owner operations, cross-user denial, anon denial, same-owner FK protection, Auth-delete cascade, Companion-membership cascade, revision/audit guards, DOB/fallback and age-boundary behavior, runtime/SQL travel-profile parity, and real generated types.

If Docker/Supabase Local is unavailable:

```text
Result = Partial/Blocked
WBS 5.12 must NOT become 待审查
```

Do not fake PASS.

## 6. Finish

Create:

```text
docs/tasks/RESULT-TASK-044-b-companion-schema-v1.md
```

Only after implementation + mandatory real DB QA:

```text
WBS 5.12 = 待审查
Issue #312 remains OPEN
```

Push and create/reuse a **Draft** PR:

```bash
gh pr create \
  --repo kanzakimy0/TravelAssist \
  --base develop \
  --head codex/b-account-wbs-5-12-companion-schema \
  --draft \
  --title "[TASK-044-B] Implement Companion Schema v1" \
  --body "Refs #312. WBS 5.12 Companion Schema implementation and real Local Supabase QA complete; awaiting user acceptance. Do not auto-merge."
```

Then stop.

Do not mark Ready, merge, close #312, or start 5.17 / 5.18 / 8.6.