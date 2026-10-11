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

The repair was published from `ci/manual-pr-governance-fix` as Draft PR #446, without enabling auto-merge. Before publication, all 32 open PRs were confirmed Draft, so opening the review PR did not give the legacy global workflow an open non-Draft target.

The user explicitly accepted PR #446 and authorized a normal merge. Its exact head was `9ba1491c89448c9ac889f954ecc32a24489cb2c1`; Quality gate run #477 (`36396435128`) completed successfully on that head. After a fresh fetch confirmed the PR was ahead 1 / behind 0 against `develop`, the PR was marked Ready and immediately merged with method `merge` and an expected-head-SHA guard. The merge commit was `511508c9a59c3b94c7d72cedbf5ff559da69ded8`, with parents `45f8e78b3c74cfac9b78965caac38c63e3d49378` and `9ba1491c89448c9ac889f954ecc32a24489cb2c1`.

Post-merge `origin/develop` was `511508c9a59c3b94c7d72cedbf5ff559da69ded8`. The merge commit is in its history; `.github/workflows/auto-merge.yml` does not exist; `.github/workflows/auto-create-pr.yml` includes `--draft` and no `gh pr merge`; and the governance tests passed 3/3 on a checkout of that exact `origin/develop` commit. No TASK-082-A business code or PR #445 history was changed. GitHub Ruleset configuration remains the administrator action above.
