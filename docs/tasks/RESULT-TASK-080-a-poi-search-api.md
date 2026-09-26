# RESULT — TASK-080-A / WBS 7.6 Canonical POI Search API

Status: implementation and local QA complete; **Draft PR / review gate**. Issue [#430](https://github.com/kanzakimy0/TravelAssist/issues/430). TASK-081-A / WBS 7.7 and WBS 7.9 were not implemented or changed.

## Source and dependency

Started from execution-time `origin/develop@85f5c62361d93f897423e92232547863d46ab0d1` in a clean TASK-080-only worktree. Merged the current PR [#417](https://github.com/kanzakimy0/TravelAssist/pull/417) schema head `875caf9e9130514fa99da95ce11d63fca2bf3b1d` with a no-fast-forward merge; the only merge conflict was WBS status text, resolved by retaining both develop's unrelated task records and the accepted 7.4 section. No `CanonicalPoiV1` copy or parallel POI truth model was introduced.

## API and semantics

`GET /api/pois/search` accepts optional `q` (trimmed, ≤120 Unicode characters), `locale`, exact canonical `prefecture`/`municipality`, primary `classification`, exact `regionRef`, `limit` (default 20, 1–50), and an opaque cursor (≤2,048 characters). At least one name or meaningful filter is required. Unknown/duplicate parameters, controls, invalid enums/limits/cursors and oversized requests return 400.

Search only uses canonical primary/localized names and aliases; filtering uses validated canonical address, primary classification and Region relations. Names use Unicode NFKC plus conservative case/punctuation/spacing normalization, without invented romanization. Lexical order is exact primary, exact alternate, primary prefix, alternate prefix, substring, then normalized primary name and `internalId` tie-break. Filter-only results use the same stable tie-break. Only `active` and `temporarily_closed` Japan-supported POIs appear. A cursor is bound to the query and dataset revision; a stale/changed cursor is rejected.

Success returns search-card-safe fields: canonical `poiRef` (`internalId`), nullable `masterCode`, display/matched name and locale, primary classification, nullable prefecture/municipality/point, lifecycle, Region refs, and `nextCursor`. Unknown Master Code or point remains `null`. Provider IDs/raw payloads, source documents, full 43D, transient facts and recommendation scores/reasons are not exposed. Responses use `no-store` correctness headers; no new auth, cache, Provider or mutation path was added.

The storage-agnostic repository accepts a bounded search query and returns canonical candidates plus a dataset revision. The service validates every record through PR #417's `parseCanonicalPoiV1`, then applies filters, rank and cursor. The only in-memory scan is in tests using PR #417 fixtures; it is **not** a production indexing strategy. The production handler has no repository adapter because no runtime-authorized canonical dataset exists and returns `repository_unavailable` (503); an invalid canonical repository result returns `canonical_validation_failed` (500).

## Candidate isolation and scope

`data/poi/full/manifests/current-candidate-review.v1.json` still says `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` and `runtimeImportAuthorized: false`. No search runtime module imports candidate files or `read-current-candidates.mjs`. Identity separation remains `internalId != masterCode != candidateKey != Provider ID != Region ID != transportNodeRef`. No WBS 7.7 detail module, WBS 7.9 score/reason, DB migration or Provider integration was touched.

## Verification and gate

See [TASK-080 QA](../qa/TASK-080/README.md): focused tests 9/9, PR #417 contract tests 24/24, Planning tests 21/21, full Node regression 2,743/2,743, lint/typecheck/format/build/deployment artifact checks passed locally. Exact-head GitHub Quality Gate must be recorded after the final push.

PR #417 was Open/Draft and unmerged at execution; TASK-080 must remain Draft and cannot merge until PR #417 merges and TASK-080 refreshes onto that accepted `develop` with passing exact-head checks. WBS 7.6 is `待审查`, not `已完成`.
