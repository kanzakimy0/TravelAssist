# TASK-077-A QA Evidence

Date: 2026-09-22  
Branch: `codex/a-ai-conversation-orchestrator`  
Base: `f08daa9f8aa9b459fbd294f08e4bd29e16624647`

## Environment isolation

- Repository worktree: `K:\worktrees\TravelAssist-TASK-077-A`
- Runtime/build copy: `K:\CodexWork\TravelAssist\TASK-077-A-runtime-20260922`
- `node_modules` and `.next` were created only in the external runtime copy.
- No `.codex-artifacts`, `node_modules`, or `.next` directory was created in the Task worktree.

## Acceptance evidence

| Gate                                    | Result | Evidence                                                                                                                                                                                                |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                | PASS   | 396 packages installed; 397 audited; 0 vulnerabilities                                                                                                                                                  |
| TASK-077 focused tests                  | PASS   | 8/8; exact request, session projection, read-only registry/router, strict tool validation, duplicate/limit protection, OpenAI normalization, Fake Provider end-to-end SSE, provider cancellation, raw provider event rejection |
| TASK-076 AI runtime regression          | PASS   | 14/14                                                                                                                                                                                                   |
| Preference schema                       | PASS   | 503/503                                                                                                                                                                                                 |
| Preference public read contract         | PASS   | 540/540                                                                                                                                                                                                 |
| Preference API boundary                 | PASS   | 37/37                                                                                                                                                                                                   |
| Planning contract                       | PASS   | 21/21                                                                                                                                                                                                   |
| Home AI concept/UI                      | PASS   | 17/17                                                                                                                                                                                                   |
| Main-system truthful state UI           | PASS   | 37/37                                                                                                                                                                                                   |
| TASK-077 source/browser boundary scan   | PASS   | 2/2                                                                                                                                                                                                     |
| TASK-076 production bundle leakage scan | PASS   | 34 browser JS chunks                                                                                                                                                                                    |
| lint                                    | PASS   | full repository ESLint                                                                                                                                                                                  |
| typecheck                               | PASS   | Next route generation + TypeScript                                                                                                                                                                      |
| production build                        | PASS   | Next.js production build; `/api/ai/conversation` emitted as a dynamic server route                                                                                                                      |

## Fake Provider end-to-end path

The focused suite drives a deterministic Fake Provider through:

```text
Conversation request
  → registered prompt
  → Orchestrator
  → user.preference.get
  → normalized tool result
  → app-level SSE transport
  → browser SSE parser
  → completed Message projection
```

It observes only `turn.started`, `tool.started`, `tool.completed`, `text.delta`,
and `turn.completed`. A provider-specific event is rejected by the browser
parser.

## Live provider smoke

DEFERRED. `OPENAI_API_KEY` and `OPENAI_MODEL` were both absent. No credential
value was read, printed, committed, or uploaded. The configured adapter path is
covered with an injected normalized OpenAI Responses fixture.

## Scope evidence

- Available tool: `user.preference.get` only.
- `trip.summary.get` remains unavailable because develop has no reusable minimum safe summary boundary for the AI request.
- `planning.context.get` remains unavailable because the current Home request has no authoritative Trip/Plan scope.
- No mutation, Planner apply, booking, payment, external message, URL fetch, shell, SQL, filesystem, raw provider payload, durable history, or AI DB migration was added.
- TASK-078-A and TASK-079-A were not started.
