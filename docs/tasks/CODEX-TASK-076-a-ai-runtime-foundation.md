# CODEX — TASK-076-A AI Runtime Foundation

The user prepares the worktree outside Codex.

## Git boundary

Execute zero Git commands.
Do not run git status/fetch/log/show/diff/add/commit/push/branch/merge/worktree or PR commands.
Do not modify .git.

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

## Final output

Report:
- Status
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
- `Git operations not performed by Codex`
