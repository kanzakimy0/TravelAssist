# WBS 7.9 Amendment — TASK-040-A Blind Review Excel Pack / Import Bridge

## Purpose

TASK-040-A is a support task under existing **WBS 7.9 — POI Recommendation Scoring / Calibration**.

It does not create a new scoring workstream and does not complete the human validation gate.

## Tracking

```md
| Task | WBS | Owner | Status | Issue | Purpose |
| --- | --- | --- | --- | --- | --- |
| TASK-040-A | 7.9 | A | 待开始 → 进行中 → 待审查 | #303 | Convert frozen TASK-039 R1/R2 blind-review packs to reviewer-friendly XLSX workbooks and provide deterministic validated XLSX→JSON import bridge. |
```

## Status rule

WBS 7.9 overall remains:

```text
待人工盲审
```

while TASK-040 is prepared or completed, because actual R1/R2 human judgments are still required.

TASK-040 must not mark any of the following complete:

- TASK-039 human review;
- Human Gold;
- candidate-0457 human validation;
- production scoring freeze.

## Boundary

TASK-040 may improve only the human-review interaction surface and response import tooling. It must not alter TASK-039 questions, blind IDs, A/B orientation, reviewer assignment, machine benchmark, scoring config, or candidate parameters.