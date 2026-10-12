# RESULT — TASK-080-A / WBS 7.6 Canonical POI Search API

Date: 2026-10-12. Canonical Owner: **A**. Implementation / QA: **B, explicitly delegated by A**. Tracking: [Issue #430](https://github.com/kanzakimy0/TravelAssist/issues/430), existing [Draft PR #433](https://github.com/kanzakimy0/TravelAssist/pull/433), original branch `codex/a-task-080-poi-search-api`. Status: implementation complete; Draft review candidate. Technical acceptance requires the final-head complete Quality Gate receipt linked below; not human-accepted or merged.

## Existing work and prerequisites

Reused original search implementation `8bea0f74e710553952cc29a0483a39ce1b32a549`, its repository/service/HTTP boundary and nine existing tests. Read both Task/launcher files from publication branch `task/a-task-080-081-poi-api-parallel` and the parallel ownership agreement. No duplicate PR or second POI model was created. Main workspace TASK-075 changes were preserved in place; work continued in an isolated worktree.

Normally merged execution-time develop `cfd51e42f96e43f84f406c6aab5aab6e408b713e` as `adcf3f20b`. The sole conflict was WBS Markdown; current develop records were retained and only 7.6 is updated by this Task.

PR #417 is now merged: accepted schema head `4417c9b64995abc52e756d611f9815aa55229367`, merge `0950d67a29a44820b7c311dbc4a4e4d8c620913d`. Its POI contract source is unchanged from the originally consumed `875caf9e9130514fa99da95ce11d63fca2bf3b1d`; accepted head and latest develop are ancestors of this branch. The original schema merge blocker is satisfied.

TASK-083 / PR #444 was independently accepted and merged at `3fab703d13694fd1205679c96fb8d1d2e8549fbc`. Owner correction PR #465 merged at `5123966f62dbe9587a3bbe38e877ccf3ea959b80`. Only its existing **Pilot-100** runtime repository is connected, with dataset revision `task-083-a-pilot100-owner-adjudication-v2`. Exact manifest/dataset hashes and isolation audit: [continuation-audit.json](../qa/TASK-080/continuation-audit.json).

## Remaining implementation completed

- Wire the existing `findCandidates` handoff through a search-owned lazy adapter. The existing loader retains all authorization, hash, registry and owner-adjudication checks; initialization/load failures are caught by the search service and return stable 503. The injected/unconfigured handler still supports explicit unavailable tests. No data loader, admission decision or runtime manifest was changed.
- Fix cursor round-tripping for valid canonical names that expand under NFKC. Cursor stores a compact canonical identity/rank anchor and binds the normalized query, all filters, locale, limit and dataset revision; missing anchors or stale/changed payloads return 400. Primary-name sorting remains unchanged. Cursors from the previous Draft implementation must be restarted.
- Resolve display names deterministically by name kind, locale and value; locale tag casing no longer prevents an exact match. Existing lexical ranking, strict parsing, lifecycle filtering and safe projection are preserved.
- Expand TASK-080 from 9 to 16 tests, including 100 actual authorized identities, full pagination across classifications, repeated/reversed repository order, compatibility expansion, locale order, malformed cursors, repository envelopes and request bounds.

## API and data boundary

`GET /api/pois/search`: optional trimmed `q` (120 Unicode characters), locale hint, exact canonical prefecture/municipality/classification/regionRef filters; `limit` defaults to 20 and is bounded 1–50. Requires a name query or meaningful filter. Unknown/duplicate parameters, controls, oversized requests and invalid cursors fail with 400.

NFKC/case/punctuation/spacing normalization operates only on canonical names/aliases. Order: exact primary, exact alternate, primary prefix, alternate prefix, substring; ties use normalized primary name then canonical internalId. No transliteration, personalization, popularity, Feature43 weighting or recommendation scoring.

Cards expose only canonical poiRef, nullable Master Code, display/matched names, classification, nullable address/point, lifecycle and region refs. Unknown remains null. Provider raw/IDs, restricted ratings, facts and provenance are absent. Only Japan-supported active/temporarily_closed identities appear: current Pilot has 98 searchable records and 2 permanently closed exclusions. Search visibility is not a visitor-access/routing eligibility decision.

The current candidate manifest remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` and `runtimeImportAuthorized=false`. Pilot authorization explicitly has `candidateCorpusAuthorized=false`. No direct or fallback import from `data/poi/full/**`, no candidate promotion, provider call, database write or purchase. Pilot scanning is bounded to 100 by the existing authorized adapter; this is not a nationwide indexing strategy. Responses use no-store headers.

## Scope, testing and delivery

Search-owned source/tests/QA/Result and WBS 7.6 only. The user separately authorized adding this test to `docs/qa/TASK-035/phase-2/execution-policy.json` and regenerating `core-fix/test-inventory.json`: one new offline entry and deterministic lane redistribution, no runner/CI/policy-rule changes. Current inventory: 155 direct + 4 indirect files. All prior required entries remain unchanged.

Focused tests: **94/94**, including search **16/16**, Canonical **24/24**, Planning/soak, existing runtime/owner-correction/trusted-baseline/detail regressions. Full regression and quality checks are recorded in [QA](../qa/TASK-080/README.md); final publication SHA and exact-head GitHub run are bound in the [PR #433 receipt](https://github.com/kanzakimy0/TravelAssist/pull/433), so earlier-head checks cannot substitute for the delivered head.

WBS 7.6 records **A / 待审查**, effective only after the final published HEAD passes the complete Quality Gate. Until that receipt exists, technical validation remains in progress. Draft PR stays open; Issue stays open. No merge, auto-merge or Issue closure is authorized. WBS 7.7/7.9, canonical/runtime data, Planner, transport, DB, provider and other business modules are unchanged from latest develop.

The Windows ordinary full-run reached the unchanged 1,800,000 ms timeout in existing TASK-086 graph reconstruction; it is not a full PASS. Hosted implementation checks at `a55195d3a89f169a48bad101dfef9b22bd597f53` passed all five regression shards, raw-source reproduction and quality. Complete final-head validation uses the existing full split workflow, including both clean graphs, resume, rebuild, ordinary full regression and the 12-receipt aggregate. Final SHA/run/counts are recorded in PR #433 after read-only `verify-exact-head.mjs` verification; intermediate or superseded runs are not final acceptance.
