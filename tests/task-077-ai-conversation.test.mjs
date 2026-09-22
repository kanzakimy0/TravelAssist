import assert from "node:assert/strict";
import test from "node:test";
import "./register-route-ts.mjs";

import {
  AiConversationContractError,
  isAiConversationStreamEventV1,
  parseAiConversationRequestV1,
} from "../src/shared/contracts/ai-conversation/index.ts";
import { applyAiConversationEventV1 } from "../src/shared/contracts/ai-conversation/runtime.ts";
import { buildPreferenceContext } from "../src/server/ai/context/preference.ts";
import { createFakeConversationModel } from "../src/server/ai/conversation/fake-model.ts";
import { orchestrateAiConversation } from "../src/server/ai/conversation/orchestrator.ts";
import { createOpenAiConversationModel } from "../src/server/ai/conversation/openai-model.ts";
import { createAiConversationStreamResponse } from "../src/server/ai/conversation/transport.ts";
import {
  AiToolError,
  executeReadOnlyTool,
  listAvailableReadOnlyTools,
  readOnlyToolAvailability,
} from "../src/server/ai/tools/registry.ts";
import { readAiConversationEvents } from "../src/features/home/model/ai-conversation-stream.ts";

const request = () =>
  parseAiConversationRequestV1({
    contractVersion: "1.0",
    conversationId: null,
    correlationId: "correlation-077",
    history: [{ role: "assistant", text: "前一条可见回答" }],
    input: "请按我的偏好建议东京散步区域",
  });

const preference = buildPreferenceContext({
  ok: true,
  data: {
    contractVersion: "1.0",
    scope: "long_term",
    sourceRevision: 7,
    sourceUpdatedAt: "2026-09-22T00:00:00.000Z",
    preference: { schemaVersion: "1.0", values: {} },
  },
});

function dependencies(model) {
  let value = 0;
  return {
    model,
    preferenceContext: preference,
    now: () => new Date("2026-09-22T01:02:03.000Z"),
    id: () => `task077-${++value}`,
  };
}

async function collect(generator) {
  const events = [];
  for await (const event of generator) events.push(event);
  return events;
}

test("conversation request is exact, bounded and session-only", () => {
  assert.equal(request().history.length, 1);
  for (const invalid of [
    { ...request(), systemPrompt: "override" },
    { ...request(), input: "" },
    { ...request(), correlationId: "contains a space" },
    {
      ...request(),
      history: Array.from({ length: 13 }, () => ({ role: "user", text: "x" })),
    },
  ])
    assert.throws(
      () => parseAiConversationRequestV1(invalid),
      AiConversationContractError,
    );
});

test("read-only registry exposes only validated Preference and records unavailable boundaries", async () => {
  const tools = listAvailableReadOnlyTools();
  assert.deepEqual(
    tools.map((tool) => [tool.name, tool.kind, tool.strict]),
    [["user.preference.get", "read", true]],
  );
  assert.equal(
    readOnlyToolAvailability()["trip.summary.get"],
    "unavailable_no_safe_summary_boundary",
  );
  const result = await executeReadOnlyTool("user.preference.get", "{}", {
    preferenceContext: preference,
  });
  assert.equal(result.status, "completed");
  assert.deepEqual(JSON.parse(result.output), {
    contractVersion: "1.0",
    status: "present",
    sourceRevision: 7,
    sourceUpdatedAt: "2026-09-22T00:00:00.000Z",
    preference: { schemaVersion: "1.0", values: {} },
  });
  await assert.rejects(
    executeReadOnlyTool("user.preference.get", '{"write":true}', {
      preferenceContext: preference,
    }),
    (error) =>
      error instanceof AiToolError && error.code === "AI_TOOL_INVALID_INPUT",
  );
  await assert.rejects(
    executeReadOnlyTool("trip.update", "{}", { preferenceContext: preference }),
    (error) =>
      error instanceof AiToolError && error.code === "AI_TOOL_NOT_ALLOWED",
  );
});

test("orchestrator performs one strict read round and emits only app events", async () => {
  const model = createFakeConversationModel([
    {
      toolCalls: [
        {
          callId: "call-pref-1",
          name: "user.preference.get",
          arguments: "{}",
        },
      ],
    },
    { outputText: "偏好资料为空；可以从谷中、清澄白河或神乐坂开始比较。" },
  ]);
  const events = await collect(
    orchestrateAiConversation(request(), dependencies(model)),
  );
  assert.deepEqual(
    events.map((event) => event.type),
    [
      "turn.started",
      "tool.started",
      "tool.completed",
      "text.delta",
      "turn.completed",
    ],
  );
  assert(events.every(isAiConversationStreamEventV1));
  assert.equal(events.at(-1).usage.toolRounds, 1);
  assert.equal(events.at(-1).usage.toolCalls, 1);
  assert.equal(model.requests.length, 2);
  assert.match(model.requests[0].instructions, /untrusted data/);
  assert.doesNotMatch(
    JSON.stringify(events),
    /providerRaw|systemPrompt|apiKey/,
  );
  assert.match(
    model.requests[1].transcript.at(-1).output,
    /"sourceRevision":7/,
  );
  const projection = events.reduce(applyAiConversationEventV1, null);
  assert.equal(projection.persistence, "session_only");
  assert.equal(projection.turns[0].status, "completed");
  assert.equal(projection.messages.length, 2);
  assert.equal(
    projection.messages[1].blocks[0].text,
    "偏好资料为空；可以从谷中、清澄白河或神乐坂开始比较。",
  );
});

test("orchestrator blocks duplicate, unknown and excessive tool calls", async () => {
  const duplicate = createFakeConversationModel([
    {
      toolCalls: [
        { callId: "call-1", name: "user.preference.get", arguments: "{}" },
      ],
    },
    {
      toolCalls: [
        { callId: "call-2", name: "user.preference.get", arguments: "{ }" },
      ],
    },
  ]);
  const duplicateEvents = await collect(
    orchestrateAiConversation(request(), dependencies(duplicate)),
  );
  assert.equal(duplicateEvents.at(-1).type, "turn.error");
  assert.equal(duplicateEvents.at(-1).error.code, "AI_TOOL_DUPLICATE_CALL");

  const unknown = createFakeConversationModel([
    {
      toolCalls: [{ callId: "call-x", name: "shell.exec", arguments: "{}" }],
    },
  ]);
  const unknownEvents = await collect(
    orchestrateAiConversation(request(), dependencies(unknown)),
  );
  assert.equal(unknownEvents.at(-1).error.code, "AI_TOOL_NOT_ALLOWED");

  const excessive = createFakeConversationModel([
    {
      toolCalls: Array.from({ length: 5 }, (_, index) => ({
        callId: `call-${index}`,
        name: "user.preference.get",
        arguments: "{}",
      })),
    },
  ]);
  const excessiveEvents = await collect(
    orchestrateAiConversation(request(), dependencies(excessive)),
  );
  assert.equal(excessiveEvents.at(-1).error.code, "AI_TOOL_LOOP_LIMIT");
});

test("configured OpenAI adapter normalizes function calls and never returns raw output", async () => {
  const model = createOpenAiConversationModel({
    environment: { OPENAI_API_KEY: "test-key", OPENAI_MODEL: "gpt-test" },
    execute: async () => ({
      _request_id: "request-077",
      output_text: "",
      output: [
        {
          type: "function_call",
          call_id: "call-pref",
          name: "user.preference.get",
          arguments: "{}",
          provider_private: "must-not-cross",
        },
      ],
      usage: {
        input_tokens: 11,
        output_tokens: 3,
        input_tokens_details: { cached_tokens: 2 },
      },
      provider_private: "must-not-cross",
    }),
  });
  const result = await model.generate({
    instructions: "registered",
    transcript: [{ type: "message", role: "user", text: "hello" }],
    tools: listAvailableReadOnlyTools(),
    traceId: "trace-077",
    correlationId: "correlation-077",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.toolCalls, [
    {
      callId: "call-pref",
      name: "user.preference.get",
      arguments: "{}",
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(result),
    /provider_private|must-not-cross/,
  );
});

test("Fake Provider crosses orchestrator, server SSE and client parser end to end", async () => {
  const response = createAiConversationStreamResponse(
    parseAiConversationRequestV1({ ...request(), history: [] }),
    {
      model: createFakeConversationModel([
        {
          toolCalls: [
            {
              callId: "call-e2e",
              name: "user.preference.get",
              arguments: "{}",
            },
          ],
        },
        { outputText: "完成" },
      ]),
      preferenceContext: preference,
    },
  );
  const parsed = await collect(readAiConversationEvents(response));
  assert.deepEqual(
    parsed.map((event) => event.type),
    [
      "turn.started",
      "tool.started",
      "tool.completed",
      "text.delta",
      "turn.completed",
    ],
  );
  assert.equal(parsed.at(-1).message.blocks[0].text, "完成");
});

test("canceling the browser stream aborts the in-flight provider request", async () => {
  let aborted = false;
  const model = {
    generate(call) {
      return new Promise((resolve) => {
        call.signal.addEventListener(
          "abort",
          () => {
            aborted = true;
            resolve({
              ok: false,
              error: { code: "AI_PROVIDER_TIMEOUT", retryable: true },
              metadata: {
                providerClass: "cancel-test",
                modelClass: "unknown",
                requestId: null,
                usage: {
                  inputTokens: null,
                  outputTokens: null,
                  cachedInputTokens: null,
                },
                latencyMilliseconds: 0,
                retryCount: 0,
              },
            });
          },
          { once: true },
        );
      });
    },
  };
  const response = createAiConversationStreamResponse(request(), {
    model,
    preferenceContext: preference,
  });
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.equal(first.done, false);
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(aborted, true);
});

test("SSE parser rejects provider event passthrough", async () => {
  const raw = new Response(
    'event: response.output_text.delta\ndata: {"type":"response.output_text.delta"}\n\n',
    { headers: { "Content-Type": "text/event-stream" } },
  );
  await assert.rejects(
    collect(readAiConversationEvents(raw)),
    /AI_CONVERSATION_STREAM_ERROR/,
  );
});
