# RESULT — TASK-076-A

## Status

PASS — implementation and required local acceptance gates are complete. Awaiting review through one Draft PR to `develop`.

## Base / branch

- Base `origin/develop`: `2318143a60a10b22bbec03e7560164b66425016d`
- Latest `origin/develop`: `2318143a60a10b22bbec03e7560164b66425016d` (unchanged at final fetch)
- Branch: `codex/a-ai-runtime-foundation`
- Issue: #418

## Architecture and reuse

The implementation adds a server-only provider-independent AI runtime. It reuses the existing 5.14 Preference read contract and authenticated request reader, existing private auth behavior, and existing Planning AI/trace architecture. It does not add a second Preference, Trip, or Planning AI model.

The runtime validates an exact bounded request, resolves an immutable registered prompt, builds the existing structured Preference context, invokes either the deterministic fake or official OpenAI Responses adapter, and returns only normalized output/error/usage records.

## Provider / configuration boundary

- Official `openai@7.21.0` Node SDK and Responses API.
- Server-only `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Optional `OPENAI_TIMEOUT_MS` is bounded to 1000–60000 ms; default 15000.
- Optional `OPENAI_MAX_RETRIES` is bounded to 0–2; default 1.
- SDK retries are disabled; the adapter owns the bounded retry loop and exact retry count.
- `store: false`, no tools, no arbitrary URL fetch, no provider raw payload returned.
- Missing or invalid runtime configuration fails before any provider call.

## Prompt Registry

`travel_assistant_foundation@1.0.0` is registered with immutable instructions, SHA-256 checksum, role, purpose, and `preference_context_v1` compatibility. Unknown key/version and checksum mismatch fail closed as `AI_RUNTIME_INVALID_REQUEST`.

## Preference Context

The Context Builder consumes `PreferenceReadResultV1`. It distinguishes `anonymous`, valid `missing`, `present`, and `unavailable`; preserves explicit `false`, `neutral`, and omitted/unknown values; and excludes account/profile data, user ID, and precise location. The request-aware wrapper uses `readCurrentLongTermPreferenceForRequest` only when an authentication hint exists and retains its response finalizer.

## Error / fallback

The safe public error set is:

- `AI_PROVIDER_NOT_CONFIGURED`
- `AI_PROVIDER_TIMEOUT`
- `AI_PROVIDER_RATE_LIMITED`
- `AI_PROVIDER_UNAVAILABLE`
- `AI_INVALID_PROVIDER_RESPONSE`
- `AI_RUNTIME_INVALID_REQUEST`

Errors contain no raw body, stack, provider message, or secret. Failure returns `deterministic_only`; it never fabricates an AI answer. Unexpected provider throws are also normalized.

## Usage / token / cost

Usage records include provider/model class, prompt key/version/checksum, input/output/cached token counts when available, latency, retry count, status/error, safe OpenAI `x-request-id`, trace ID, and correlation ID.

No pricing table was hardcoded. Pricing config version, estimated cost, and currency remain null until an approved versioned pricing source exists. External export remains under WBS 9.11.

## Tests

- `npm ci`: PASS; 396 packages installed, 397 audited, 0 vulnerabilities.
- TASK-076 deterministic offline suite: PASS, 14/14.
- Existing Preference Contract: PASS, 540/540.
- Existing Preference API: PASS, 37/37.
- Existing Planning Contract: PASS, 21/21.
- Full lint: PASS.
- Full typecheck: PASS.
- Production build: PASS.
- TASK-076 AI browser bundle scan: PASS, 34 chunks.
- Existing client bundle scan: PASS, 34 chunks.

Full evidence: `docs/qa/TASK-076/`.

## Live smoke

DEFERRED — the execution environment contained neither `OPENAI_API_KEY` nor `OPENAI_MODEL`. No secret was read, printed, committed, or uploaded. Under the Task rule, absence of an authorized key is not a failure.

## WBS

Updated only 6.4, 6.5, 6.10, and 6.11. Rows 6.10 and 6.11 remain partial because streaming UI degradation and production telemetry export belong to later approved work.

## Blockers

None for TASK-076-A acceptance. Live provider smoke remains optional/deferred pending an authorized local key and model.

## Scope stop

TASK-077-A, TASK-078-A, and TASK-079-A were not started.
