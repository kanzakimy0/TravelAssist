# WBS 7.4 Amendment — Canonical POI Schema

> Task: TASK-050-A  
> Issue: #399  
> Owner: A  
> Priority: P0  
> Responsibility: Main Travel System / Shared POI Architecture

## Current Master WBS

At publication time:

```text
7.2 Places / POI Provider Selection = completed
7.4 POI Standard Schema = not started
7.6 Places Search API = not started
7.7 POI Details API = not started
7.9 Recommendation Scoring v1 = not started
```

## Amendment

Add/start:

| WBS | Item | Owner | Priority | Dependency | Publication status |
|---|---|---|---|---|---|
| 7.4 | Canonical POI Schema / Validator / Candidate Admission Boundary | A | P0 | 7.2 | 未开始 / Task 已发布 |

## Status transitions

When Codex actually starts from latest `origin/develop`:

```text
未开始
-> 进行中（#399 / TASK-050-A）
```

After implementation + mandatory QA + Draft PR:

```text
-> 待审查（#399 / TASK-050-A；Draft PR #...）
```

Only after explicit user acceptance and merge to `develop`:

```text
-> 已完成
```

## Dependency meaning

WBS 7.2 completion provides provider-selection constraints only.

It does NOT authorize:

- provider activation;
- storing all provider fields;
- live API calls;
- photo caching;
- production credentials.

## Downstream gates

Do not mark these started merely because TASK-050 is published:

```text
7.6 Places Search API
7.7 POI Details API
7.9 Recommendation Scoring v1
```

They remain separate Tasks after 7.4 acceptance.

## B POI production boundary

Current B-owned POI corpus/recovery/enrichment work remains independent and candidate-only until a later explicit admission/import Task.

TASK-050 must not:

- renumber B candidates;
- allocate POI Master Codes in bulk;
- merge B Draft PRs;
- promote candidate data to production;
- overwrite evidence/review outcomes.

The 7.4 schema is the future admission target, not an implicit approval of current candidates.
