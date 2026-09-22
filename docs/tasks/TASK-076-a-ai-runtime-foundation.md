# TASK-076-A — AI Runtime Foundation / Provider API / Preference Context / Error & Usage

> Issue: #418
> WBS: 6.4 / 6.5 / 6.10 / 6.11
> Owner: A
> Priority: P0
> Branch: `codex/a-ai-runtime-foundation`

## Goal

Implement the first real server-side AI runtime foundation from the frozen architecture.

Deliver:
- provider-independent AI provider contract;
- server-only OpenAI Responses API adapter;
- Prompt Registry runtime with explicit versions/checksums;
- authenticated/optional-user Context Builder that can read the existing Planner-readable Preference Contract;
- normalized provider/runtime errors and safe fallback semantics;
- usage/token/latency trace records and a versioned cost-accounting boundary;
- deterministic fake provider and full offline tests.

No Planner mutation or generic tool loop in this Task.

## Mandatory reuse

Read and reuse:
- AI Capability Boundary design
- Prompt/System Instruction v1 + AI API Layer design
- AI Orchestrator/Tool Router/Context Builder design
- Observability design
- existing Preference Contract v1 / public read boundary
- existing private HTTP/auth helpers
- existing Planning AI compact contracts and DecisionRun trace types
- existing environment/security conventions

Do not create a second Preference model, Trip model or Planning AI contract.

## Provider runtime

Implement a provider interface independent from OpenAI-specific response objects.

Production adapter:
- server-only;
- current official OpenAI Node SDK;
- Responses API;
- API key read only from `OPENAI_API_KEY`;
- model resolved from a server-only config such as `OPENAI_MODEL`;
- timeout/retry policy bounded and explicit;
- provider request IDs/usage normalized when available;
- no provider raw payload returned to browser.

Do not hardcode a pricing table as immutable code. If cost estimation is implemented, it must be an explicit versioned configuration; otherwise preserve token usage with cost = null/unknown.

## Prompt Registry

Implement:
- prompt key;
- prompt version;
- immutable instructions text;
- checksum;
- role/purpose;
- compatible context profile.

The runtime must resolve a known version; unknown prompt versions fail closed.

## Preference Context

Reuse the existing 5.14 Planner-readable Preference Contract.

Rules:
- authenticated user may receive their structured Preference context;
- missing preference is a valid empty state;
- explicit false/neutral/unknown semantics are preserved;
- do not pass entire account/profile data to the provider;
- no precise runtime location in this Task.

## Errors

Normalize at minimum:
- AI_PROVIDER_NOT_CONFIGURED
- AI_PROVIDER_TIMEOUT
- AI_PROVIDER_RATE_LIMITED
- AI_PROVIDER_UNAVAILABLE
- AI_INVALID_PROVIDER_RESPONSE
- AI_RUNTIME_INVALID_REQUEST

Errors returned to client must not leak secrets, stack traces or raw provider payload.

## Usage / monitoring

Record normalized:
- provider/model class;
- prompt version;
- input/output/cached tokens when available;
- latency;
- retry count;
- status;
- provider request ID if safe;
- trace/correlation ID.

This Task builds the AI usage event/record boundary. Export to external observability remains governed by WBS 9.11.

## Security

- no `NEXT_PUBLIC_OPENAI_*`;
- API key cannot enter client bundle, logs or AI message;
- no arbitrary tools;
- no arbitrary URL fetch;
- bounded body;
- structured validation;
- server-only module boundary.

## Tests

Must include:
- fake provider success;
- provider not configured;
- timeout/rate limit/unavailable mapping;
- prompt version resolution/checksum;
- preference present/missing/neutral/false;
- secret/client-boundary test;
- deterministic no-network suite;
- no provider raw object leakage.

Real provider smoke is optional and only when an authorized local key already exists. No key = Deferred, not failure.

## Acceptance

- AI runtime can produce a provider-normalized response using the fake adapter.
- Real OpenAI adapter is compile-time/runtime wired server-side.
- Preference Context is built from existing contract.
- prompt versions are explicit.
- usage/error data are normalized.
- zero secret exposure to browser.
- lint/typecheck/build and focused tests pass.
- Draft PR only; no auto-merge.
