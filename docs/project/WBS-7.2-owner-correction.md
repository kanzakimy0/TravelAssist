# WBS 7.2 Owner Correction — B

- Date: 2026-09-13
- WBS: `7.2 Places / POI Provider 选型`
- Previous owner: A
- New canonical owner: **B**
- Priority: P0
- Dependency: `1.10`（已完成）
- Task: `TASK-058-B`
- Issue: `#361`
- Planned branch: `codex/b-wbs-7-2-poi-provider-selection`

## Decision

The user explicitly reassigned WBS 7.2 from A to B. This is a single-WBS exception only; WBS 7.3–7.11 keep their existing owners.

Until the monolithic Master WBS row is synchronized, this file is authoritative for WBS 7.2 ownership:

```text
Owner = B
Status = 未开始 / authorized
Tracking = #361 / TASK-058-B
```

At actual TASK-058-B execution start, update only the 7.2 row in `docs/project/WBS-TravelAssist.md` to B / 进行中. Preserve all unrelated WBS rows.

## Scope

B owns the evidence-backed Places / POI provider selection only. The task must evaluate Japan coverage, search/details capabilities, multilingual support, media, attribution, display restrictions, caching/retention, Web and future mobile rights, pricing/quota, freshness, operational constraints and compatibility with the existing Mapbox visual layer.

Do not start downstream 7.4 / 7.6 / 7.7 / 7.9 work automatically.

Only explicit user acceptance and merge may mark 7.2 completed.
