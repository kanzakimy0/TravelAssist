# CODEX — TASK-077-A AI Conversation Runtime

## Execution mode

TASK-076-A is merged and accepted.

Execute **TASK-077-A only**. Do not start TASK-078-A or TASK-079-A.

Use the single implementation branch:

`codex/a-ai-conversation-orchestrator`

Before implementation:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Require a clean starting worktree. If unrelated local changes exist, do not delete/reset them; stop and report.

Create or reuse only the designated TASK-077 branch from execution-time latest `origin/develop`.

Forbidden:
- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- rebase of published Task history
- automatic merge
- starting TASK-078-A or TASK-079-A

## Read first

Read:

```text
AGENTS.md
docs/tasks/TASK-077-a-ai-conversation-orchestrator.md
docs/tasks/RESULT-TASK-076-a-ai-runtime-foundation.md
docs/project/AI-WBS-6.4-6.13-runtime-completion-plan.md
```

Also read the frozen:
- AI Conversation Message Model;
- AI Orchestrator / Tool Router / Context Builder design;
- AI UI/main-screen design;
- TASK-076 runtime foundation sources;
- current AI entry/components;
- existing private HTTP/auth helpers;
- Planning AI compact/trace contracts;
- current security and observability boundaries.

## Implement

Complete TASK-077-A exactly.

Deliver:

1. Conversation / Turn / Message / Content Block runtime based on the frozen model.
2. AI Orchestrator using the TASK-076 runtime.
3. Read-only Tool Registry / Router only.
4. Strict schema validation of tool input/output.
5. Bounded tool rounds and duplicate/repeated-call protection.
6. Streaming application event contract.
7. Server streaming endpoint/transport.
8. Integration with the existing AI main screen / floating entry.
9. Truthful loading / error / degraded UI.
10. Focused tests, QA evidence, Result and WBS update.

## Tool boundary

V1 tools are read-only only.

Prefer reusing existing authoritative services, such as:
- current user's long-term Preference read;
- authorized canonical Trip / active Plan read summary if already safely available on develop;
- deterministic planning/context reads already present.

Do not expose:
- arbitrary URL fetch;
- shell;
- SQL;
- filesystem;
- arbitrary provider calls;
- raw provider responses;
- any write/mutation tool.

If a candidate read-only capability does not have a safe authoritative server boundary yet, leave it unavailable rather than inventing one.

## Orchestrator rules

Must:
- resolve registered prompt version;
- build only necessary context;
- expose only allowlisted tools;
- validate tool args and results;
- cap rounds;
- preserve trace/correlation IDs;
- reject repeated/invalid calls safely;
- treat tool/provider/user text as untrusted data;
- never allow retrieved text to alter System/Tool permissions.

## Streaming contract

Implement stable app-level events, at minimum:

```text
turn.started
text.delta
tool.started
tool.completed
turn.completed
turn.error
```

Do not expose provider-specific stream events directly to the browser.

## Persistence boundary

No durable personal AI history in this Task.

WBS 8.7 / 6.14 remain separate.

Session/browser state may exist only as a non-authoritative runtime projection.

## Hard boundary

No:
- Trip mutation;
- Planner apply;
- booking/payment;
- external messaging;
- generic Action Router;
- DB migration solely for AI history;
- TASK-078/079 scope.

## Validation

At minimum run:

```text
npm ci
TASK-077 focused conversation/orchestrator/tool/streaming tests
TASK-076 AI runtime regression
directly affected Preference / Planning contract tests
directly affected AI UI tests
AI/client bundle leakage scan
npm run lint
npm run typecheck
npm run build
```

If configured real OpenAI credentials are absent, real-provider UI smoke remains Deferred. Fake provider streaming/orchestration must fully pass offline.

## Finalization

Before final response:

1. update only the relevant WBS rows accurately;
2. create/update TASK-077 Result + QA evidence;
3. fetch execution-time latest develop;
4. if develop advanced, normally merge it into the TASK-077 branch;
5. rerun affected validation after integration;
6. stage only TASK-077-owned changes;
7. commit;
8. push normally;
9. create/update exactly one Draft PR → `develop`;
10. stop.

Do not start TASK-078-A or TASK-079-A.

## Final output

Report:

- Status
- base/latest develop SHA
- branch
- final commit SHA
- Draft PR
- architecture/reuse summary
- complete changed file list
- conversation/message runtime
- orchestrator behavior
- read-only Tool Registry
- streaming event contract
- UI integration
- security/prompt-injection defenses
- tests
- live smoke status
- blockers
- WBS updated: Yes/No
- confirmation that TASK-078/079 were not started
