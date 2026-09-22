# RESULT — TASK-077-A

## Status

PASS — implementation and required local acceptance gates are complete. Draft
PR #426 is open for human review against `develop`.

## Base / branch

- Base `origin/develop`: `f08daa9f8aa9b459fbd294f08e4bd29e16624647`
- Latest `origin/develop`: `f08daa9f8aa9b459fbd294f08e4bd29e16624647` (unchanged at final fetch)
- Branch: `codex/a-ai-conversation-orchestrator`
- Issue: #419
- Draft PR: #426 (`https://github.com/kanzakimy0/TravelAssist/pull/426`)

## Architecture and reuse

TASK-077 builds on the accepted TASK-076 server-only runtime, immutable Prompt
Registry, OpenAI configuration/error conventions and request-level Preference
Context Builder. It adds one application conversation contract, one bounded
Orchestrator, one read-only Tool Registry/Router, one app-level SSE transport and
wires those into the existing Home floating AI entry. It does not introduce a
second Preference, Trip, Planner, Planning AI or trace model.

The existing Trip Library read boundary returns a complete private record and
does not provide the minimum authorized AI summary required here. Therefore
`trip.summary.get` remains unavailable. No direct DB query or invented summary
API was added.

## Conversation / message runtime

- Versioned `Conversation`, `Turn`, `Message` and `Content Block` types.
- Exact, bounded request parser: 32 KiB input and at most 12 visible history messages.
- IDs are bounded and validated; browser cannot supply prompts, models or tool permissions.
- `applyAiConversationEventV1` builds an immutable, session-only projection from application events.
- No localStorage, sessionStorage, IndexedDB, durable AI table or migration.

## Orchestrator behavior

- Resolves `travel_assistant_conversation@1.0.0` from the checksum-backed registry.
- Sends only visible bounded history and the current user message.
- Offers only server-owned allowlisted tools.
- Limits execution to 3 tool rounds and 4 total calls.
- Rejects repeated signatures, repeated call IDs, unknown tools, invalid input and invalid output.
- Preserves generated trace ID and request correlation ID across every event and provider call.
- Normalizes usage across rounds without exposing provider response objects.

## Read-only Tool Registry

The only available V1 tool is `user.preference.get`. It reuses the validated
request-level `AiPreferenceContextV1`; it does not query the database. Its input
is the exact empty object and its normalized output is revalidated through the
canonical Preference parser.

Unavailable capabilities are explicit:

- `trip.summary.get`: no existing minimum safe summary boundary;
- `planning.context.get`: no authoritative Trip/Plan scope in the Home request.

There is no URL, shell, SQL, filesystem, raw provider, write, mutation, booking,
payment, external messaging or generic Action Router tool.

## Streaming event contract

The server emits `text/event-stream` using only versioned application events:

- `turn.started`
- `text.delta`
- `tool.started`
- `tool.completed`
- `turn.completed`
- `turn.error`

Every event contains sequence, event time, conversation/turn IDs, trace ID and
correlation ID. Provider stream events and raw tool output never cross the
browser boundary. The browser parser rejects unknown/provider event names and
malformed application events.

## UI integration

The existing floating Home AI panel now has a live bounded composer, semantic
message list, Enter/Shift+Enter/IME handling, stop control and application SSE
rendering. It reports connecting, actual tool reads, streaming, completion,
stopped and degraded/error states. Failed or stopped requests preserve the
input. It never claims a Planner change, live data lookup or successful action.

## Security and prompt-injection defense

- User, history, provider and tool text are explicitly untrusted in the registered prompt.
- Tool permissions are server-owned and cannot be changed by retrieved text.
- Strict tool schemas use `additionalProperties: false`; router validates both input and normalized output.
- OpenAI requests use `store: false`, `parallel_tool_calls: false` and only registered function tools.
- Browser bundles contain no OpenAI key, provider endpoint, server AI import or mutation tool.
- Error UI and events contain only stable safe codes, never provider messages, payloads, stacks or secrets.

## Tests

- `npm ci`: PASS; 396 packages installed, 397 audited, 0 vulnerabilities.
- TASK-077 focused conversation/tool/orchestrator/SSE/cancellation suite: PASS, 8/8.
- TASK-076 AI runtime regression: PASS, 14/14.
- Preference schema: PASS, 503/503.
- Preference public read contract: PASS, 540/540.
- Preference API boundary: PASS, 37/37.
- Planning contract: PASS, 21/21.
- Home AI UI: PASS, 17/17.
- Main-system truthful state UI: PASS, 37/37.
- TASK-077 client boundary scan: PASS, 2/2.
- TASK-076 production bundle leakage scan: PASS, 34 chunks.
- Full lint: PASS.
- Full typecheck: PASS.
- Production build: PASS; `/api/ai/conversation` is a dynamic server route.

Full evidence: `docs/qa/TASK-077/`.

## Live smoke

DEFERRED — the execution environment contained neither `OPENAI_API_KEY` nor
`OPENAI_MODEL`. No secret was read, printed, committed or uploaded. The complete
Fake Provider conversation/orchestrator/tool/SSE path passed offline.

## WBS

- 6.10: `待审查`; runtime Loading/Streaming/Tool/Error/Stop degradation is implemented and locally gated.
- 6.13: `部分完成`; base conversation/Orchestrator/read-only Tool/Streaming UI is implemented, while mutation confirmation and success feedback remain assigned to TASK-078-A.

## Blockers

None for TASK-077-A review. Real-provider UI smoke is deferred until an
authorized local key and model are configured.

## Scope stop

TASK-078-A and TASK-079-A were not started.
