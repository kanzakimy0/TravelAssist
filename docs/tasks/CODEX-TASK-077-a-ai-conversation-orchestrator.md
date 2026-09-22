# CODEX — TASK-077-A AI Conversation Runtime

Do not execute until TASK-076-A is merged/accepted.

Git operations are outside Codex; execute zero Git commands.

Read TASK-077-A, TASK-076 Result, frozen Conversation Message Model, Orchestrator/Tool Router/Context Builder design, AI UI design and current AI entry/components.

Implement conversation runtime, bounded read-only tool loop, streaming event contract and existing AI UI wiring.

Hard boundary: no Trip mutation, no booking/payment, no durable personal AI history, no arbitrary tools.

Run focused conversation/orchestrator/tool/streaming/UI tests plus lint/typecheck/build. Report changed files, tool registry, streaming events, security tests and `Git operations not performed by Codex`.
