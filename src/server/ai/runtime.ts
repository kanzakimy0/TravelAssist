import "server-only";
import type {
  AiPreferenceContextV1,
  AiProvider,
  AiRuntimeRequestV1,
  AiRuntimeResultV1,
  AiUsageRecordV1,
} from "./contracts";
import { AI_RUNTIME_MAX_INPUT_BYTES } from "./contracts";
import { AiRuntimeError, safeAiError } from "./errors";
import { resolvePrompt } from "./prompts/registry";

const TRACE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const REQUEST_KEYS = Object.freeze([
  "promptKey",
  "promptVersion",
  "input",
  "traceId",
  "correlationId",
]);

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function validatedRequest(input: unknown): AiRuntimeRequestV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    throw new AiRuntimeError("AI_RUNTIME_INVALID_REQUEST");
  const keys = Reflect.ownKeys(input);
  if (
    keys.some((key) => {
      if (typeof key !== "string" || !REQUEST_KEYS.includes(key)) return true;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      return !descriptor?.enumerable || !("value" in descriptor);
    })
  )
    throw new AiRuntimeError("AI_RUNTIME_INVALID_REQUEST");
  const value = input as Record<string, unknown>;
  if (
    !["promptKey", "promptVersion", "input", "traceId"].every((key) =>
      Object.hasOwn(value, key),
    ) ||
    typeof value.promptKey !== "string" ||
    typeof value.promptVersion !== "string" ||
    typeof value.input !== "string" ||
    typeof value.traceId !== "string" ||
    !TRACE_PATTERN.test(value.traceId) ||
    value.input.trim().length === 0 ||
    byteLength(value.input) > AI_RUNTIME_MAX_INPUT_BYTES ||
    (value.correlationId !== undefined &&
      value.correlationId !== null &&
      (typeof value.correlationId !== "string" ||
        !TRACE_PATTERN.test(value.correlationId)))
  )
    throw new AiRuntimeError("AI_RUNTIME_INVALID_REQUEST");
  return {
    promptKey: value.promptKey,
    promptVersion: value.promptVersion,
    input: value.input,
    traceId: value.traceId,
    correlationId: (value.correlationId as string | null | undefined) ?? null,
  };
}

function providerInput(
  input: string,
  preferenceContext: AiPreferenceContextV1,
): string {
  return JSON.stringify({
    contractVersion: "1.0",
    userInput: input,
    preferenceContext,
  });
}

function usageRecord(
  request: AiRuntimeRequestV1,
  prompt: ReturnType<typeof resolvePrompt>,
  provider: Awaited<ReturnType<AiProvider["generate"]>>,
): AiUsageRecordV1 {
  return {
    contractVersion: "1.0",
    providerClass: provider.metadata.providerClass,
    modelClass: provider.metadata.modelClass,
    promptKey: prompt.key,
    promptVersion: prompt.version,
    promptChecksum: prompt.checksum,
    inputTokens: provider.metadata.usage.inputTokens,
    outputTokens: provider.metadata.usage.outputTokens,
    cachedInputTokens: provider.metadata.usage.cachedInputTokens,
    latencyMilliseconds: provider.metadata.latencyMilliseconds,
    retryCount: provider.metadata.retryCount,
    status: provider.ok ? "ok" : "error",
    errorCode: provider.ok ? null : provider.error.code,
    providerRequestId: provider.metadata.requestId,
    traceId: request.traceId,
    correlationId: request.correlationId ?? null,
    pricingConfigVersion: null,
    estimatedCostMinor: null,
    currency: null,
  };
}

function invalidResult(
  preferenceContext: AiPreferenceContextV1,
  error: unknown,
): AiRuntimeResultV1 {
  const safe = safeAiError(error);
  return {
    ok: false,
    error: safe,
    preferenceContext,
    usage: null,
    fallback: { mode: "deterministic_only", reasonCode: safe.code },
  };
}

export async function runAiRuntime(
  input: unknown,
  dependencies: {
    readonly provider: AiProvider;
    readonly preferenceContext: AiPreferenceContextV1;
  },
): Promise<AiRuntimeResultV1> {
  let request: AiRuntimeRequestV1;
  let prompt: ReturnType<typeof resolvePrompt>;
  try {
    request = validatedRequest(input);
    prompt = resolvePrompt(request.promptKey, request.promptVersion);
  } catch (error) {
    return invalidResult(dependencies.preferenceContext, error);
  }
  let provider: Awaited<ReturnType<AiProvider["generate"]>>;
  try {
    provider = await dependencies.provider.generate({
      instructions: prompt.instructions,
      input: providerInput(request.input, dependencies.preferenceContext),
      traceId: request.traceId,
      correlationId: request.correlationId ?? null,
    });
  } catch (error) {
    return invalidResult(dependencies.preferenceContext, error);
  }
  const usage = usageRecord(request, prompt, provider);
  if (!provider.ok)
    return {
      ok: false,
      error: provider.error,
      preferenceContext: dependencies.preferenceContext,
      usage,
      fallback: {
        mode: "deterministic_only",
        reasonCode: provider.error.code,
      },
    };
  return {
    ok: true,
    outputText: provider.outputText,
    preferenceContext: dependencies.preferenceContext,
    usage,
    fallback: null,
  };
}
