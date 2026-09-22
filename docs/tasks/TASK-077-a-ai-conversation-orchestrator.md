# TASK-077-A — AI Conversation Runtime / Orchestrator / Read-only Tool Router / Streaming UI

> Issue: #419
> WBS: 6.13 base runtime
> Owner: A
> Priority: P0
> Branch: `codex/a-ai-conversation-orchestrator`
> Dependency: TASK-076-A accepted + merged.

## Goal

Build the main-system AI conversation runtime on TASK-076:
- Conversation/Turn/Message/Block runtime using the frozen message model;
- AI Orchestrator;
- read-only Tool Registry/Router;
- bounded tool loop;
- streaming server transport;
- integration with the existing AI main screen/floating entry;
- safe Loading/Error/Degraded presentation.

## Tool v1

Read-only only. Reuse existing authoritative services where available, e.g.:
- preference/effective-preference read;
- canonical trip/plan read summary for an authorized user;
- deterministic planning context reads.

Do not expose arbitrary URL, shell, SQL, filesystem or provider raw payload.

## Orchestrator

Must:
- resolve prompt version;
- build Context;
- present only allowed tools;
- validate tool input/output;
- cap tool rounds;
- preserve trace/correlation IDs;
- stop safely on repeated/invalid calls.

## Streaming

Use a stable application event contract such as:
- turn.started
- text.delta
- tool.started
- tool.completed
- turn.completed
- turn.error

UI should render existing frozen message/block semantics.

## Security

External/provider/tool text is untrusted and cannot alter System/Tool permissions.

## Persistence boundary

No durable personal AI history in this Task. WBS 8.7 / 6.14 remain separate. Session/browser state may exist only as a non-authoritative runtime projection.

## Acceptance

Basic conversation works with fake provider and configured real provider path; read-only tools work; UI streams; errors/degradation are truthful; no mutation path exists; tests/lint/typecheck/build pass.
