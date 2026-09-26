# WBS 7.6 / 7.7 POI API Parallel Start

Date: 2026-09-27  
User authorization: parallel start WBS 7.6 + 7.7.

## Current baseline

- `origin/develop` at publication: `85f5c62361d93f897423e92232547863d46ab0d1`.
- WBS 7.2 = completed.
- WBS 7.4 = implementation ready for review, Draft PR #417, observed head `875caf9e9130514fa99da95ce11d63fca2bf3b1d`.
- PR #417 is not merged at publication.
- TASK-068–075 POI data chain is in develop, but current candidate manifest remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` with `runtimeImportAuthorized: false`.
- TASK-075 task-scoped canonical state must not be treated as production runtime canonical truth by these API Tasks.

## Parallel Tasks

| Task | WBS | Issue | Owner | Implementation branch | Scope |
| --- | --- | --- | --- | --- | --- |
| TASK-080-A | 7.6 | #430 | A | `codex/a-task-080-poi-search-api` | canonical POI search only |
| TASK-081-A | 7.7 | #431 | A | `codex/a-task-081-poi-detail-api` | canonical POI details only |

## Dependency policy

Both may implement now against the current WBS 7.4 schema candidate.

Neither may merge before:

1. PR #417 is accepted and merged;
2. its branch is refreshed to the resulting latest develop;
3. canonical contract regression passes;
4. exact-head Quality Gate passes.

Runtime wiring to the real 10,369 POI corpus additionally requires a separately runtime-authorized canonical data source. Until that exists, tests use validated canonical fixtures/repository injection and the APIs report repository unavailable rather than reading candidate-only artifacts.

## Conflict avoidance

TASK-080 owns search modules and `/api/pois/search`.

TASK-081 owns detail modules and `/api/pois/[poiRef]`.

Neither should edit `src/shared/contracts/poi/**` except normal imports. Contract changes belong to WBS 7.4.

Neither implements WBS 7.9 scoring, WBS 7.10 caching, AI, Planner mutation, provider purchase or DB migration.

Implementation is parallel; merge/acceptance is serialized after WBS 7.4. Whichever API PR is accepted first may merge first; the second must sync latest develop and preserve the peer WBS/result records.

## WBS status interpretation

Publication authorizes both as **进行中**.

They may move to **待审查** when implementation/QA/Draft PR is complete, even if the 7.4 merge gate is still pending.

They become **已完成** only after user acceptance and merge to develop with the prerequisite gates satisfied.
