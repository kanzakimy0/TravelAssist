# TASK-066-B Design QA

## Scope and evidence class

This is a design/specification audit at develop `f5e3ca6fe2989c846be062b5921d0b9527753917`, not runtime implementation. The dedicated branch is `codex/b-wbs-1-20-main-system-state-design`; Issue [#389](https://github.com/kanzakimy0/TravelAssist/issues/389); accepted delivery [PR #390 — Merged](https://github.com/kanzakimy0/TravelAssist/pull/390).

The root workspace was detached with pre-existing untracked `outputs/`. It was preserved. The candidate worktree was created clean from the execution-time latest develop, not from the publication branch. Publication files were read from `02ec381f633eeb68b72962e35b46084d433a44c0`. The first commit records the authorized 1.20 start; only that numeric WBS row changed Owner/status.

## Deliverables and counts

- [Design specification](../../ui/main-system-loading-empty-error-skeleton.md): 10 surfaces, 62 state/surface rules, 34 Chinese copy intents and 48 acceptance rows.
- [Machine-readable matrix](design-matrix.json): every rule expands trigger, level, visible content, interactions, title/body, actions, retry scope, icon, geometry, motion/reduced motion, focus, keyboard, ARIA, responsive behavior and prohibited behavior.
- [Audit evidence](audit-evidence.json): start gate, audited source fingerprints, design checks, scope/WBS invariants and CI proof location.
- [Result](../../tasks/RESULT-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md).
- [Owner correction](../../project/WBS-1.20-owner-correction.md).

`SPECIFIED_AND_REVIEWED` means source/document review, not runtime PASS. All 48 acceptance rows retain `NOT_RUN_DESIGN_ONLY` for browser/runtime verification. Conditional rows cannot be activated until their owning feature and recovery action exist.

## Sources audited

The audit covered the relevant sections of current WBS, 1.13 closeout/tokens/v1.2 accessibility amendment, Home/Planner/Detail/AI/navigation design documents and the current runtime structures/styles cited in the specification. Fingerprints bind the inspected baseline; they do not imply every line of large source files was reviewed.

Findings and authoritative resolutions are CF-01 through CF-10 in the design specification:

- Current 1.13 closeout supersedes historical pending text; no parallel palette.
- Planner scoped token overrides are real; global color calculations do not prove local/browser contrast.
- Static Home is normal; missing optional video is not an error.
- Current Start stages generate local sample plans with a timer; they do not prove AI/Provider progress.
- Detail shares Planner and current browser-storage recovery; DB-backed missing/permission states remain conditional.
- Route query is development-gated; unknown/stale/no-route/error/disabled meanings remain distinct.
- AI current Shell cannot send; future sidecar, streaming and offline states are not installed.
- Modal/Drawer, interactive non-modal Popover and read-only Tooltip keep distinct focus/interaction models.
- Existing small controls do not waive the new state-action 44×44 requirement.
- Current JS/CSS geometry takes precedence over older breakpoint/phone-layout sketches.

## Checks actually required

1. Re-fetch/recheck latest develop and record SHA.
2. Scoped Prettier for changed Task/Codex/Owner/spec/QA/Result documents; preserve the master WBS's repository-exempt formatting.
3. Local Markdown link/reference sanity, JSON parse, matrix coverage and per-rule required attributes.
4. Verify all design token references exist in the audited CSS sources; verify no new palette/role alias is introduced.
5. Verify surface/copy/acceptance IDs and references, 10-surface coverage, at least 28 acceptance rows (actual 48).
6. Verify source hashes against the execution base; diff contains only this task's documents; non-1.20 WBS lines unchanged.
7. `git diff --check` / staged equivalent.
8. Record actual final branch-head CI status if CI runs; do not substitute a PR synthetic merge run for an exact branch-head claim.

The executed checker and stdout are retained under ignored `.artifacts/task066/` next to the worktree. The checker performs static assertions only, not tests of React or product behavior. Published check results and log hashes are in audit-evidence.json; final immutable branch SHA/CI run are attached to the Draft PR delivery JSON after the last commit.

Representative formatting command (repository-locked Prettier; this execution reuses the already installed TASK-065 toolchain):

```sh
prettier --check docs/ui/main-system-loading-empty-error-skeleton.md docs/project/WBS-1.20-owner-correction.md docs/tasks/*TASK-066*.md "docs/qa/TASK-066/**/*.{md,json}"
git diff --check
git diff --name-only f5e3ca6fe2989c846be062b5921d0b9527753917...HEAD
```

Relative Markdown links were resolved against each document; source file references and matrix case/copy IDs were checked for existence. Remote GitHub links identify the actual issue, branch and PR; no arbitrary web content is used as a design authority.

## Not executed and not claimed

- Browser screenshots or interactions at 1440/1024/390/320.
- Screen-reader, live region, real keyboard/focus or composed contrast measurements.
- New runtime state rendering, React components or business logic.
- Local Supabase start/reset/types/migrations, live/paid Provider, AI runtime or Engine runtime QA.
- Production/Staging DB mutation, hosting deployment or environment changes.

Repository CI may run its existing Node/lint/typecheck/artifact-build workflow. That is CI truth only, not browser state acceptance, Local DB acceptance or an actual deployment. No expensive Local runtime gates are run merely to decorate this design Result.

## Downstream handoff

Following explicit user acceptance and normal merge of PR #390, WBS 1.20 is B / 已完成 and the design is Frozen v0.1. WBS 3.7 remains A / 未开始. The separate future implementation task must map available owning-domain results to these states, then run paired geometry, keyboard, screen-reader, motion and real contrast QA. This document does not authorize starting that task.

## Accepted design closeout — 2026-09-17

The accepted candidate is ed80da99b56ae6dbbb93aef18aecf9432a9e6099; normal merge ded9a7cf017c43ea3df9624eb0de6eb10649c985 has the identical tree. [Exact accepted-head Quality Gate 35207004811](https://github.com/kanzakimy0/TravelAssist/actions/runs/35207004811) passed. The user authorized WBS completion only after this merge.

[Closeout record](../../project/WBS-1.20-acceptance-closeout.md) and [machine receipt](acceptance-closeout.json) are the current acceptance authority. Original design-matrix.json and audit-evidence.json remain unchanged as execution-time candidate evidence at that accepted SHA: their review labels and specification hash are historical, not current status or the hash of this closeout revision. Browser/runtime NOT_RUN claims remain unchanged.

Closeout verification is limited to task-owned formatting, local Markdown links, JSON parse, unchanged design rules and historical evidence, documentation-only diff, only the WBS 1.20 and TASK-066 tracking rows changed, and git diff checks. The final develop Quality Gate is checked against the post-closeout commit and reported with its exact SHA/run; the accepted-head PASS is not substituted for that result.
