import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildPreferenceContext } from "../src/server/ai/context/preference.ts";
import { buildPreferenceContextForRequest } from "../src/server/ai/context/request-preference.ts";
import { NextRequest } from "next/server";
import { createFakeAiProvider } from "../src/server/ai/providers/fake.ts";
import { createOpenAiResponsesProvider } from "../src/server/ai/providers/openai.ts";
import {
  listRegisteredPrompts,
  resolvePrompt,
  verifyPromptChecksum,
} from "../src/server/ai/prompts/registry.ts";
import { runAiRuntime } from "../src/server/ai/runtime.ts";

const request = {
  promptKey: "travel_assistant_foundation",
  promptVersion: "1.0.0",
  input: "Suggest a quiet museum.",
  traceId: "trace-076",
  correlationId: "correlation-076",
};
const configured = {
  OPENAI_API_KEY: "test-only-secret",
  OPENAI_MODEL: "gpt-test",
  OPENAI_TIMEOUT_MS: "1000",
  OPENAI_MAX_RETRIES: "1",
};
const anonymous = buildPreferenceContext();

function providerMetadata(overrides = {}) {
  return {
    providerClass: "test",
    modelClass: "unknown",
    requestId: null,
    usage: {
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
    },
    latencyMilliseconds: 0,
    retryCount: 0,
    ...overrides,
  };
}

test("fake provider produces a normalized deterministic runtime response", async () => {
  const result = await runAiRuntime(request, {
    provider: createFakeAiProvider({
      outputText: "Visit the local history museum.",
      inputTokens: 11,
      outputTokens: 7,
      cachedInputTokens: 3,
    }),
    preferenceContext: anonymous,
  });
  assert.equal(result.ok, true);
  assert.equal(result.outputText, "Visit the local history museum.");
  assert.deepEqual(result.usage, {
    contractVersion: "1.0",
    providerClass: "fake",
    modelClass: "unknown",
    promptKey: request.promptKey,
    promptVersion: request.promptVersion,
    promptChecksum: resolvePrompt(request.promptKey, request.promptVersion)
      .checksum,
    inputTokens: 11,
    outputTokens: 7,
    cachedInputTokens: 3,
    latencyMilliseconds: 0,
    retryCount: 0,
    status: "ok",
    errorCode: null,
    providerRequestId: "fake-request-1",
    traceId: request.traceId,
    correlationId: request.correlationId,
    pricingConfigVersion: null,
    estimatedCostMinor: null,
    currency: null,
  });
});

test("prompt registry uses immutable versioned checksums and fails closed", () => {
  const prompts = listRegisteredPrompts();
  assert.equal(prompts.length, 1);
  assert.equal(Object.isFrozen(prompts), true);
  assert.equal(Object.isFrozen(prompts[0]), true);
  assert.equal(verifyPromptChecksum(prompts[0]), true);
  assert.match(prompts[0].checksum, /^sha256:[a-f0-9]{64}$/);
  assert.throws(
    () => resolvePrompt("travel_assistant_foundation", "99.0.0"),
    (error) => error.code === "AI_RUNTIME_INVALID_REQUEST",
  );
});

test("preference context distinguishes missing and preserves false and neutral", () => {
  const missing = buildPreferenceContext({
    ok: true,
    data: {
      contractVersion: "1.0",
      scope: "long_term",
      sourceRevision: 0,
      sourceUpdatedAt: null,
      preference: { schemaVersion: "1.0", values: {} },
    },
  });
  assert.equal(missing.status, "missing");
  const present = buildPreferenceContext({
    ok: true,
    data: {
      contractVersion: "1.0",
      scope: "long_term",
      sourceRevision: 3,
      sourceUpdatedAt: "2026-09-22T00:00:00Z",
      preference: {
        schemaVersion: "1.0",
        values: {
          "mobility.noBus": false,
          "dining.localCuisine": "neutral",
        },
      },
    },
  });
  assert.equal(present.status, "present");
  assert.equal(present.preference.values["mobility.noBus"], false);
  assert.equal(present.preference.values["dining.localCuisine"], "neutral");
  assert.equal(
    Object.hasOwn(present.preference.values, "mobility.noFerry"),
    false,
  );
  assert.equal(
    buildPreferenceContext({ ok: false, code: "AUTH_REQUIRED" }).status,
    "anonymous",
  );
  assert.deepEqual(
    buildPreferenceContext({ ok: false, code: "PREFERENCE_UNAVAILABLE" }),
    {
      profile: "preference_context_v1",
      status: "unavailable",
      contractVersion: null,
      sourceRevision: null,
      sourceUpdatedAt: null,
      preference: null,
      unavailableReason: "PREFERENCE_UNAVAILABLE",
    },
  );
});

test("runtime sends only structured preference context, never account or location data", async () => {
  let captured;
  const provider = {
    async generate(input) {
      captured = JSON.parse(input.input);
      return {
        ok: true,
        outputText: "ok",
        metadata: providerMetadata(),
      };
    },
  };
  const context = buildPreferenceContext({
    ok: true,
    data: {
      contractVersion: "1.0",
      scope: "long_term",
      sourceRevision: 2,
      sourceUpdatedAt: null,
      preference: {
        schemaVersion: "1.0",
        values: { "mobility.noPublicTransit": false },
      },
    },
  });
  await runAiRuntime(request, { provider, preferenceContext: context });
  assert.equal(
    captured.preferenceContext.preference.values["mobility.noPublicTransit"],
    false,
  );
  assert.equal("account" in captured.preferenceContext, false);
  assert.equal("profileData" in captured.preferenceContext, false);
  assert.equal("location" in captured.preferenceContext, false);
});

test("optional-user request stays anonymous without touching the authenticated reader", async () => {
  const built = await buildPreferenceContextForRequest(
    new NextRequest("http://localhost/api/ai-runtime"),
  );
  assert.equal(built.context.status, "anonymous");
  const response = new Response("ok");
  assert.equal(built.finish(response), response);
});
test("missing OpenAI configuration fails safely before network execution", async () => {
  let calls = 0;
  const provider = createOpenAiResponsesProvider({
    environment: {},
    execute: async () => {
      calls += 1;
      throw new Error("must not execute");
    },
  });
  const result = await runAiRuntime(request, {
    provider,
    preferenceContext: anonymous,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "AI_PROVIDER_NOT_CONFIGURED");
  assert.equal(result.fallback.mode, "deterministic_only");
  assert.equal(calls, 0);
});

for (const [label, thrown, expected] of [
  [
    "timeout",
    { name: "AbortError", raw: "do-not-leak" },
    "AI_PROVIDER_TIMEOUT",
  ],
  [
    "rate limit",
    { status: 429, raw: "do-not-leak" },
    "AI_PROVIDER_RATE_LIMITED",
  ],
  [
    "unavailable",
    { status: 503, raw: "do-not-leak" },
    "AI_PROVIDER_UNAVAILABLE",
  ],
]) {
  test(`OpenAI ${label} is normalized, retried once, and raw data is removed`, async () => {
    let calls = 0;
    const provider = createOpenAiResponsesProvider({
      environment: configured,
      execute: async () => {
        calls += 1;
        throw thrown;
      },
      sleep: async () => {},
      now: (() => {
        let value = 10;
        return () => value++;
      })(),
    });
    const result = await runAiRuntime(request, {
      provider,
      preferenceContext: anonymous,
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, expected);
    assert.equal(result.usage.retryCount, 1);
    assert.equal(calls, 2);
    assert.equal(JSON.stringify(result).includes("do-not-leak"), false);
  });
}

test("invalid provider response is rejected without raw object leakage", async () => {
  const provider = createOpenAiResponsesProvider({
    environment: { ...configured, OPENAI_MAX_RETRIES: "0" },
    execute: async () => ({
      _request_id: "unsafe request id with spaces",
      output_text: "",
      raw: "provider-secret-payload",
    }),
  });
  const result = await runAiRuntime(request, {
    provider,
    preferenceContext: anonymous,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "AI_INVALID_PROVIDER_RESPONSE");
  assert.equal(
    JSON.stringify(result).includes("provider-secret-payload"),
    false,
  );
});

test("OpenAI success normalizes text, safe request id, and usage", async () => {
  const provider = createOpenAiResponsesProvider({
    environment: { ...configured, OPENAI_MAX_RETRIES: "0" },
    execute: async () => ({
      _request_id: "req_safe-123",
      output_text: "normalized",
      usage: {
        input_tokens: 20,
        output_tokens: 5,
        input_tokens_details: { cached_tokens: 12 },
      },
    }),
    now: (() => {
      const values = [100, 109];
      return () => values.shift() ?? 109;
    })(),
  });
  const result = await runAiRuntime(request, {
    provider,
    preferenceContext: anonymous,
  });
  assert.equal(result.ok, true);
  assert.equal(result.outputText, "normalized");
  assert.equal(result.usage.providerRequestId, "req_safe-123");
  assert.equal(result.usage.inputTokens, 20);
  assert.equal(result.usage.outputTokens, 5);
  assert.equal(result.usage.cachedInputTokens, 12);
  assert.equal(result.usage.estimatedCostMinor, null);
  assert.equal(result.usage.pricingConfigVersion, null);
});

test("unexpected provider throws are normalized without raw leakage", async () => {
  const result = await runAiRuntime(request, {
    provider: {
      async generate() {
        const error = new Error("provider-raw-secret");
        error.raw = { authorization: "Bearer secret" };
        throw error;
      },
    },
    preferenceContext: anonymous,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "AI_PROVIDER_UNAVAILABLE");
  assert.equal(result.usage, null);
  assert.equal(JSON.stringify(result).includes("provider-raw-secret"), false);
  assert.equal(JSON.stringify(result).includes("Bearer secret"), false);
});
test("request envelope is exact and bounded", async () => {
  for (const invalid of [
    null,
    { ...request, promptVersion: "unknown" },
    { ...request, extra: true },
    Object.create(
      { inherited: true },
      { promptKey: { value: request.promptKey, enumerable: true } },
    ),
    Object.defineProperty({ ...request }, "input", {
      get: () => "unsafe",
      enumerable: true,
    }),
    { ...request, traceId: "has space" },
    { ...request, input: "" },
    { ...request, input: "x".repeat(32 * 1024 + 1) },
  ]) {
    const result = await runAiRuntime(invalid, {
      provider: createFakeAiProvider(),
      preferenceContext: anonymous,
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "AI_RUNTIME_INVALID_REQUEST");
    assert.equal(result.usage, null);
  }
});

test("server-only secret boundary has no public OpenAI variable", () => {
  const env = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  const configSource = readFileSync(
    new URL("../src/server/ai/config.ts", import.meta.url),
    "utf8",
  );
  const adapterSource = readFileSync(
    new URL("../src/server/ai/providers/openai.ts", import.meta.url),
    "utf8",
  );
  assert.equal(env.includes("NEXT_PUBLIC_OPENAI"), false);
  assert.equal(configSource.includes("NEXT_PUBLIC_OPENAI"), false);
  assert.match(configSource, /OPENAI_API_KEY/);
  assert.match(adapterSource, /^import "server-only";/m);
  assert.match(adapterSource, /store: false/);
  assert.match(adapterSource, /tools: \[\]/);
});
