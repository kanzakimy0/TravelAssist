# WBS 7.9 Amendment — TASK-039-A Independent Blind Human Review

> Date: 2026-09-11  
> WBS: **7.9 — POI Recommendation Scoring / Calibration**  
> Task: **TASK-039-A**  
> Issue: **#301**  
> Owner: **A — Main Travel System / Planning Engine QA**

## Purpose

TASK-038-A produced a 100-real-POI internal calibration candidate but its Feature annotations and machine-authored pairwise benchmark share a common archetype system. TASK-039-A adds the required independent human blind-validation layer before any production-freeze decision.

## Tracking rule

Do not create a second scoring WBS. Continue under 7.9:

```text
TASK-038-A
100 POI internal calibration
→ candidate-0457 eligible for human review only

TASK-039-A
independent blind human validation
→ external validity check

future explicit freeze decision
→ only then may production scoring configuration be frozen
```

## Status semantics

```text
Task publication
→ 待开始

blind-pack/tool implementation running
→ 进行中

blind packs/tooling complete, human labels absent
→ 待人工盲审

one reviewer only / adjudication outstanding
→ 部分完成 / 待补充人工审查

human review finished, Draft PR pending review
→ 待审查

merged evidence + explicit later production-freeze decision
→ production scoring may be marked complete in a separate decision
```

TASK-039 itself must never mark `candidate-0457` as production frozen merely because its validation gates pass.

## Human boundary

No Codex/AI-generated reviewer answers are valid evidence. A complete blind validation requires at least two independent real human reviewers, with disagreements adjudicated by a separate blind human process or left unresolved.

## Branching

At publication PR #300 is still Draft. TASK-039 may run stacked from `codex/a-100-poi-scoring-pilot` while preserving current `develop` compatibility. If #300 merges first, TASK-039 starts directly from latest `develop`.
