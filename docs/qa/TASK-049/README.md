# TASK-049-B QA

Real Local Supabase/Auth/PostgreSQL + Next production HTTP + Edge Cookie fetch acceptance.
No cloud DB, mocked Auth/RLS or skipped acceptance. Task-owned users and records are removed
in finally; the Next server and browser started by each suite are stopped by that suite.

## Reproduce

Use the pinned Node/npm dependencies, Docker and Local Supabase project travelassist.
Existing helpers validate the project label and localhost API54321/DB54322/Studio54323/mail54324.
The Local DSN is passed in memory to the task-owned Next process; no service-role environment
key is present in that process. Admin fixture setup exists only in tests.

```sh
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run db:types
npm run test:trip-library-api
npm run test:trip-persistence
npm run test:trip-persistence:db
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
npm run test:preferences:db
npm run test:companions:db
npm run build
npm run test:trip-library-api:local
npm run test:preference-api:local
npm run test:companion-api:local
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
node tests/task-016-client-bundle.mjs
git diff --check
```

Run DB/API suites sequentially because they require an empty Local Auth DB. Existing API
browser tests use CODEX_PLAYWRIGHT_PATH and the Companion suite's pre-existing
.artifacts/task047/baseline-browser/geometry.json. TASK-049 also requires real Playwright
Edge; no silent skip. Its browser test uses Cookie fetch, the bundled A save helper, reload,
GET/ETag, freeze/copy/delete. No UI diff means no new screenshot matrix is required.

## Actual evidence

- Baseline: npm ci395 packages, zero vulnerabilities; full tests1667/1667; typecheck/build PASS.
- Candidate: full tests1743/1743; TASK-049 pure76/76; real Local HTTP/Auth/DB/browser35/35.
- TASK-048 pure77/77, real DB29/29; Profile DB25/25; Preference DB505/505 and API/browser17/17;
  Companion DB147/147 and API/browser22/22, including its existing five-viewports regression.
- Real db:reset and db:types twice passed. Generated file SHA-256:
  c8914dc706c1ceb9383a56abb8a27a6fcc81e17010482355febf96fa473fac91.
- Local deploy verification:1831 files, no failures; browser chunk audit:34 checked.
  Local artifact metadata reflects the checked-out baseline while source was uncommitted;
  GitHub independently builds the committed PR head. See Result and PR checks for final CI.
- [runtime-acceptance.json](runtime-acceptance.json) records all 34 child scenarios, actual
  HTTP/storage byte counts, browser statuses and zero remaining Auth users/Trip records.
- [acceptance.json](acceptance.json) records gate counts, source boundary hashes and log hashes.
- [Legacy audit](legacy-pr221-audit.md) gives a disposition for all 23 historical files.

## Idempotency hardening and bounded SQL

The existing 16-field 5.18 record remains the canonical B content model. The aggregate gets
one nullable server-only creation_intent_hash column, an immutable SECURITY INVOKER guard,
and an index matching owner/updated_at DESC/id DESC. Legacy rows retain NULL; no guessing
or backfill from edited/snapshotted content. API create/copy always supplies a normalized
intent digest. No extra Trip/Day/Item table, direct client write grant or mutation RPC.
The 5.18 regression still compares the complete real column/check/index/RLS mirror. Its
shared fixture mapper only excludes new gateway metadata from the unchanged strict 5.18
record parser; no old invariant assertion was relaxed.

Tests exercise compatible/incompatible and concurrent creation/copy, retries after root
changes, draft editing and history transition, legacy NULL, metadata immutability, all
owner/cross-owner mutations, raw DML denial and History freeze. Timestamp tie fixtures use
SET LOCAL session_replication_role only inside a test-owned Local transaction to seed exact
microsecond ties; production uses ordinary owner-scoped queries and DB triggers.
List SQL projects selected scalars/name arrays with LIMIT+1, never full plan JSON. Real
pagination matches an independent owner SQL ordering and handles sub-millisecond pairs.
Concurrent edits between pages are not a repeatable snapshot; refresh from page one.

## HTTP versus storage bytes

HTTP caps: create/update524288, save4718592, copy16384 bytes; history/delete zero bytes.
Storage uses unchanged 5.18 PostgreSQL JSONB text accounting: draft262144, progress4096,
plan4194304, party131072, Preference snapshot/patch65536 bytes. Raw stream limits are
checked even without Content-Length; semantic canonical validation precedes every write.
Actual stress plan:4194304 JSONB bytes,3782809 HTTP bytes; save and exact readback PASS.
4194305 JSONB bytes and an excessive HTTP body fail413 with the original aggregate unchanged.
These limits are technical safety caps, not membership limits.

## Preserved baseline exception

The full local lint command reports the same7 pre-existing no-require-imports errors in
.cache/qa/task024-worktree/.cache/qa historical scripts. Baseline and candidate logs are
byte-identical; changed files pass ESLint. The cache is retained and lint rules unchanged.
The clean GitHub checkout must pass its full lint gate. A formatting issue found in the
new runtime test was corrected and the deployment format gate rerun.

The visible Trip Library fixture page, Planner, Start, CSS, canonical A types and current
Preference/Companion domain semantics remain unchanged. UI integration is explicitly
Deferred in the [handoff](../../contracts/trip-save-read-history-v1-handoff.md).

## GitHub / review state

Implementation head `0d749904d7d475b445d2049cc6a390179c413158` passed the
[complete GitHub Quality Gate](https://github.com/kanzakimy0/TravelAssist/actions/runs/34676228049),
including clean-checkout lint, tests, typecheck, format and standalone artifact checks.
[PR #334](https://github.com/kanzakimy0/TravelAssist/pull/334) stays Draft / Open;
Issue #333 stays Open; WBS 5.19 is 待审查. The delivery reply and Issue record the
final documentation head SHA and its separately verified gate. No merge or downstream task.
