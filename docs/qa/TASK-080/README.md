# TASK-080-A — Canonical POI Search API QA

Date: 2026-09-27. Scope: WBS 7.6 only. Implementation branch: `codex/a-task-080-poi-search-api`. Base `origin/develop`: `85f5c62361d93f897423e92232547863d46ab0d1`; consumed PR #417 schema head: `875caf9e9130514fa99da95ce11d63fca2bf3b1d` (no publication-head drift). Schema merge commit: `2ce8f71db7d8d70e7f6e8ea16b0b5bc3ba83a72a`.

## Acceptance evidence

| Check | Result |
|---|---|
| TASK-080 focused API/contract tests | 9/9 pass; Japanese/English/alias, precedence, filters, lifecycle, cursor, nulls, safety and unavailable repository |
| TASK-050 / PR #417 canonical POI regression | 24/24 pass |
| Shared Planning contract regression | 21/21 pass |
| Full Node regression | 2,743/2,743 pass with workspace Python on PATH |
| `npm run lint` | pass; 0 errors, 9 pre-existing warnings in unrelated POI tooling |
| `npm run typecheck` | pass |
| `npm run format:check:deploy` | pass |
| `npm run deploy:validate:local` | pass; local target, no database/provider configuration |
| `npm run build` | pass; `/api/pois/search` appears as dynamic server route |
| `npm run deploy:build:local` and `deploy:verify-artifact` | pass; 1,883 files, no forbidden content |

The first full Node run had one environment-only failure: the Windows `python` command resolved to a broken alias. The same test passed with the bundled workspace Python on PATH; the subsequent full run passed 2,743/2,743. An earlier sandbox-only run could not write unrelated deterministic QA outputs and was repeated with isolated-worktree write permission. Neither failure required product-code changes.

## Boundary proof

- The current candidate manifest still declares `scope = CANDIDATE_ONLY_NO_CANONICAL_IMPORT` and `runtimeImportAuthorized = false`. `tools/poi/read-current-candidates.mjs` asserts both. Search server/route imports do not reference that tool or `data/poi/full/**`.
- Default HTTP handler has no canonical repository configured and returns stable `repository_unavailable` (503). Tests inject only strict PR #417 Canonical fixtures. No runtime 10,369-POI import, provider call, DB write, user preference weighting, 43D scoring, recommendation reason, cache, detail endpoint or Planner mutation exists.
- Each repository record passes `parseCanonicalPoiV1` before filtering or projection. Unknown/invalid canonical fields fail closed; safe search cards explicitly omit Provider IDs/raw payload, provenance, feature vector, facts and recommendation fields.
- Cursor binds normalized query/filters/limit to a dataset revision and stable lexical sort key. A changed query or revision fails with 400 instead of silently continuing a different result set.

## Remaining gates

PR #417 remains Open/Draft and unmerged as checked on 2026-09-27; TASK-080 must remain Draft and must not merge until 7.4 is merged, this branch is synced to the resulting latest `develop`, and exact-head Quality Gate passes. There is no accepted production canonical POI repository; the public route correctly stays unavailable until one is separately authorized.
