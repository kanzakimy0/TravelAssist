# Codex Command — TASK-035-A

Execute TASK-035-A from latest develop on `codex/a-test-baseline-freeze`.

Read current package scripts, test directories, browser harness docs, DB/Auth runtime tests, routing/security/observability test commands, CI workflows and latest WBS.

Inventory first; do not immediately install dependencies. Reuse the existing Node/browser/DB harnesses. Add only minimal missing canonical scripts/smokes if required.

Run the resulting baseline where the execution environment supports it. Mark real environment gaps Deferred, not PASS. Record commit-specific counts and timings as evidence, not as permanent assertions.

Update `docs/qa/test-baseline.md`, Result, WBS 9.1 → `待审查` if accepted by current evidence, Issue #265 and Draft PR. Do not merge.
