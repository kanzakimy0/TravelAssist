# CODEX — TASK-076-A AI Runtime Foundation

## Execution mode

Codex may handle Git for this Task.

**Strict rule: execute TASK-076-A only. Do not start TASK-077-A, TASK-078-A or TASK-079-A.**

Use one dedicated branch:
`codex/a-ai-runtime-foundation`

Before implementation:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Require a clean starting worktree. If unrelated local changes exist, do not delete/reset them; stop and report the conflict.

Create or switch to the designated Task branch from execution-time latest `origin/develop`. If the branch already exists remotely, inspect/reuse it rather than creating a competing branch.

During finalization:
- normally merge latest `origin/develop` into the Task branch if it advanced;
- resolve real conflicts without weakening Task semantics;
- stage only Task-owned changes;
- commit;
- push normally;
- create/update exactly one Draft PR → `develop`;
- update WBS/Result before final response.

Forbidden:
- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- rebase of published Task history
- automatic merge
- starting any subsequent AI Task.

## Read first

```text
AGENTS.md
docs/tasks/TASK-076-a-ai-runtime-foundation.md
docs/project/AI-WBS-6.4-6.13-runtime-completion-plan.md
docs/design/ai-orchestrator-tool-router-context-builder.md
docs/design/observability-sli-slo-alert-incident-runbook-model.md
```

Also locate/read the frozen AI Capability Boundary, Prompt/System Instruction/API Layer docs, existing Preference Contract/public read implementation, private HTTP/auth helpers, Planning AI compact/trace contracts and security conventions.

## Implement

Complete TASK-076-A exactly.

Use provider abstraction + server-only OpenAI adapter using the current official Node SDK Responses API.
Add the SDK dependency only if not already present.
Use `OPENAI_API_KEY` and server-only model/config. Never create a NEXT_PUBLIC secret.

Build:
- provider interface;
- OpenAI Responses adapter;
- deterministic fake provider;
- prompt registry/version/checksum;
- preference context reader;
- normalized runtime error model;
- usage/token/latency record model;
- focused tests and QA/Result docs.

No Planner mutation, no generic Tool Router, no Conversation UI, no DB migration, no Booking/Payment.

## Validation

At minimum:
```text
npm ci
TASK-076 focused tests
existing Preference contract/API tests directly affected
existing Planning contract tests directly affected
security/client-bundle boundary tests if available
npm run lint
npm run typecheck
npm run build
```

If an authorized local OPENAI_API_KEY already exists, a bounded live smoke may be run without printing the key or provider raw payload. Otherwise record live smoke as Deferred.

## Finalization

Before returning:
1. re-read the latest WBS;
2. update WBS 6.4 / 6.5 / 6.10 / 6.11 accurately;
3. create/update the Task Result;
4. ensure the branch is current with execution-time latest develop;
5. re-run required validation after any integration merge;
6. commit and push;
7. create/update one Draft PR → develop;
8. stop. Do not start TASK-077-A.

## Final output

Report:
- Status
- base/latest develop SHA
- branch
- final commit SHA
- Draft PR
- architecture/reuse summary
- complete changed file list
- provider/config boundary
- prompt registry
- preference context behavior
- error/fallback model
- usage/token/cost behavior
- tests
- live smoke status
- blockers
- WBS updated: Yes/No
- confirmation that no later AI Task was started
