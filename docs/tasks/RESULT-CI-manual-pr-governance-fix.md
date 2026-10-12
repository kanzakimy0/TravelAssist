# CI / PR governance repair result

## Incident and scope

PR #445 was automatically created as a non-Draft PR after a `feature/**` push, then merged before user acceptance. This change preserves that historical merge and does not modify TASK-082-A business code.

Two independent merge paths existed: `.github/workflows/auto-create-pr.yml` called `gh pr merge` immediately after PR creation, and `.github/workflows/auto-merge.yml` retried `gh pr merge` for **every** open non-Draft PR on PR, review and check events. A non-Draft state was therefore incorrectly treated as merge authorization.

## New rule

`feature/**` auto-creation now uses `gh pr create --draft` and has no merge step. The generic auto-merge workflow is deleted. The Quality gate workflow remains unchanged. A PR may be merged only after its Quality gate succeeds, the user reviews and accepts it, and an explicitly authorized human performs the merge. Merely marking a PR ready for review does not authorize merging.

`tests/pr-governance.test.mjs` scans all workflows for merge paths and verifies Draft semantics for feature PR creation. It includes negative regression cases reproducing both old defects and checks that the Quality gate triggers and verification steps remain intact.

Local verification: governance and deployment tests 13/13; full repository Node suite 2,770/2,770 with the managed Python runtime on PATH; lint passed with nine existing warnings; typecheck, deployment-format check, workflow YAML parsing, standalone build/artifact audit (1,908 files) and `git diff --check` passed. The first full-suite attempt was 2,769/2,770 only because the Windows `python` alias could not start the existing offline Python subtest; the unchanged suite passed in full after selecting the installed Python runtime.

## Required GitHub administrator action

In **Settings → Rules → Rulesets → develop**, require a pull request before merging, require status checks with **Quality gate / Install, test and build** as the required check, block force pushes, and restrict deletions. Audit bypass actors so GitHub Actions cannot bypass human acceptance. This change does not call the GitHub Settings API and cannot certify that the remote Ruleset is configured.

## Publication and verification

Publish from `ci/manual-pr-governance-fix`, which does not match the existing `feature/**` auto-PR trigger, as an explicitly created **Draft** PR to `develop`. Do not enable auto-merge or merge the repair PR automatically. The merged `develop` workflow remains vulnerable until this repair is manually accepted and merged; the branch itself has no remaining workflow merge path.

Before publication, all 32 open PRs were confirmed Draft, so opening this Draft review PR cannot give the still-active legacy auto-merge workflow an open non-Draft target. Recheck this immediately before creating the PR.
