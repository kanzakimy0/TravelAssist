# CODEX — TASK-042-B / WBS 5.11 Preference Schema v1

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Execute **TASK-042-B only**.

## 1. Fetch latest state

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Do not discard any existing local work.

Forbidden:

```text
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
```

## 2. Read the authoritative Task and design

```bash
git show origin/task/b-wbs-5-11-preference-schema:docs/tasks/TASK-042-b-preference-schema-v1.md
git show origin/task/b-wbs-5-11-preference-schema:docs/architecture/preference-schema-v1.md
git show origin/develop:docs/project/WBS-TravelAssist.md
```

Read every mandatory source listed inside the Task.

Issue:

```text
#307
```

Related existing partial PR:

```text
#221
feature/b-step-preference-trip-draft-persistence
```

Check its live state:

```bash
gh pr view 221 --repo kanzakimy0/TravelAssist --json number,state,isDraft,headRefName,headRefOid,baseRefName,url
```

Do **not** merge or cherry-pick #221 wholesale.

## 3. Work from latest develop in an isolated branch/worktree

Use exactly:

```text
codex/b-account-wbs-5-11-preference-schema
```

Do not rename it to `feature/**`: current repository workflows auto-create a non-draft PR and attempt merge for `feature/**` pushes.

Preferred:

```bash
git worktree add ../TravelAssist-TASK-042-B -b codex/b-account-wbs-5-11-preference-schema origin/develop
cd ../TravelAssist-TASK-042-B
```

## 4. Implement only WBS 5.11

Required core:

```text
23-key Preference v1
strict sparse parser
stable InterestCode + DetailCode registry
field hard/soft metadata
five-level walkingTolerance
style.planning
pure patch set/unset semantics
travel_preferences SQL migration
strict DB payload validation
owner-only RLS
Drizzle mirror
real Local Supabase generated types
pure + DB/RLS tests
```

Old #221 candidate fields such as:

```text
mobility.preset
mobility.lessWalking
attractions.*
experience.photoExperience
interests.likes
interests.dislikes
Chinese Interest labels as IDs
```

must not survive as canonical v1 storage.

Do not create Trip Draft/Snapshot/Override tables in this Task.

Do not implement 5.13, 5.14, 5.16, 5.18, Planner, AI, Engine, scoring, or POI 43-field data.

## 5. Tracking

When implementation actually begins:

```text
WBS 5.11 = 进行中
```

After implementation + required real Local DB QA succeeds, before merge:

```text
WBS 5.11 = 待审查
```

Never set `已完成` yourself.

Create:

```text
docs/tasks/RESULT-TASK-042-b-preference-schema-v1.md
```

Update Issue #307 without overwriting unrelated Issue/Task records.

## 6. Validation

Run the Task's complete validation matrix, including real Local Supabase:

```text
db:start
db:status
db:reset
db:types
Preference pure tests
Preference DB/RLS tests with two real temporary Auth users
lint
typecheck
full tests
build
changed-file format checks
git diff --check
db:stop
```

If Docker/Supabase Local is unavailable, report Partial/Blocked honestly; do not fake PASS.

## 7. Publish safely

Push:

```text
codex/b-account-wbs-5-11-preference-schema
```

Then create a Draft PR only:

```bash
gh pr create \
  --repo kanzakimy0/TravelAssist \
  --base develop \
  --head codex/b-account-wbs-5-11-preference-schema \
  --draft \
  --title "[TASK-042-B] Implement Preference Schema v1" \
  --body "Refs #307. WBS 5.11 implementation and QA complete; awaiting user acceptance. Do not auto-merge."
```

Keep Issue #307 open. Do not merge the Draft PR. Do not start the next Task.

Return the complete `TASK-042-B Result`.
