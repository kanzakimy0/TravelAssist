import "server-only";
import OpenAI from "openai";
import { readOpenAiRuntimeConfig, type OpenAiRuntimeConfig } from "../config";
import { AiRuntimeError, safeAiError } from "../errors";
import type {
  AiProviderMetadataV1,
  AiProviderUsageV1,
  AiRuntimeErrorCode,
} from "../contracts";
import type {
  AiConversationModel,
  AiConversationModelRequestV1,
  AiConversationModelResultV1,
  AiModelToolCallV1,
} from "./model";
import { EMPTY_AI_USAGE } from "./model";

type OpenAiExecute = (
  config: OpenAiRuntimeConfig,
  request: AiConversationModelRequestV1,
) => Promise<unknown>;

export type OpenAiConversationModelOptions = {
  readonly environment?: NodeJS.ProcessEnv;
  readonly execute?: OpenAiExecute;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
};

function object(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function integer(input: unknown): number | null {
  return Number.isSafeInteger(input) && Number(input) >= 0
    ? Number(input)
    : null;
}

function safeId(input: unknown): string | null {
  return typeof input === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(input)
    ? input
    : null;
}

function usage(input: unknown): AiProviderUsageV1 {
  if (input === null || input === undefined) return EMPTY_AI_USAGE;
  const value = object(input);
  const details = object(value?.input_tokens_details);
  const inputTokens = integer(value?.input_tokens);
  const outputTokens = integer(value?.output_tokens);
  const cachedInputTokens = integer(details?.cached_tokens);
  if (inputTokens === null || outputTokens === null)
    throw new AiRuntimeError("AI_INVALID_PROVIDER_RESPONSE");
  return { inputTokens, outputTokens, cachedInputTokens };
}

function normalizeResponse(input: unknown): {
  outputText: string;
  toolCalls: readonly AiModelToolCallV1[];
  requestId: string | null;
  usage: AiProviderUsageV1;
} {
  const value = object(input);
  if (!value || !Array.isArray(value.output))
    throw new AiRuntimeError("AI_INVALID_PROVIDER_RESPONSE");
  const toolCalls: AiModelToolCallV1[] = [];
  for (const item of value.output) {
    const call = object(item);
    if (call?.type !== "function_call") continue;
    const callId = safeId(call.call_id);
    if (
      callId === null ||
      typeof call.name !== "string" ||
      !/^[a-z][a-z0-9_.-]{0,63}$/.test(call.name) ||
      typeof call.arguments !== "string" ||
      call.arguments.length > 16 * 1024
    )
      throw new AiRuntimeError("AI_INVALID_PROVIDER_RESPONSE");
    toolCalls.push({
      callId,
      name: call.name,
      arguments: call.arguments,
    });
  }
  const outputText =
    typeof value.output_text === "string" ? value.output_text : "";
  if (!outputText.trim() && toolCalls.length === 0)
    throw new AiRuntimeError("AI_INVALID_PROVIDER_RESPONSE");
  return {
    outputText,
    toolCalls: Object.freeze(toolCalls),
    requestId: safeId(value._request_id),
    usage: usage(value.usage),
  };
}

function status(error: unknown): number | null {
  const value = object(error)?.status;
  return Number.isInteger(value) ? Number(value) : null;
}

function classify(error: unknown): {
  code: AiRuntimeErrorCode;
  retryable: boolean;
} {
  if (error instanceof AiRuntimeError) return safeAiError(error);
  const code = status(error);
  const name = object(error)?.name;
  if (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    name === "APIConnectionTimeoutError" ||
    name === "AbortError"
  )
    return { code: "AI_PROVIDER_TIMEOUT", retryable: true };
  if (error instanceof OpenAI.RateLimitError || code === 429)
    return { code: "AI_PROVIDER_RATE_LIMITED", retryable: true };
  if (error instanceof OpenAI.APIConnectionError || (code && code >= 500))
    return { code: "AI_PROVIDER_UNAVAILABLE", retryable: true };
  return { code: "AI_PROVIDER_UNAVAILABLE", retryable: false };
}

async function defaultExecute(
  config: OpenAiRuntimeConfig,
  request: AiConversationModelRequestV1,
): Promise<unknown> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMilliseconds,
    maxRetries: 0,
  });
  const input = request.transcript.map((item) => {
    if (item.type === "message")
      return { role: item.role, content: item.text } as const;
    if (item.type === "tool_call")
      return {
        type: "function_call",
        call_id: item.callId,
        name: item.name,
        arguments: item.arguments,
      } as const;
    return {
      type: "function_call_output",
      call_id: item.callId,
      output: item.output,
    } as const;
  });
  return client.responses.create(
    {
      model: config.model,
      instructions: request.instructions,
      input,
      store: false,
      parallel_tool_calls: false,
      tools: request.tools.map((tool) => ({
        type: "function" as const,
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
        strict: true,
      })),
    },
    { signal: request.signal },
  );
}

function metadata(
  config: OpenAiRuntimeConfig | null,
  startedAt: number,
  endedAt: number,
  retryCount: number,
  normalized?: ReturnType<typeof normalizeResponse>,
): AiProviderMetadataV1 {
  return {
    providerClass: "openai_responses_conversation",
    modelClass: config?.modelClass ?? "unknown",
    requestId: normalized?.requestId ?? null,
    usage: normalized?.usage ?? EMPTY_AI_USAGE,
    latencyMilliseconds: Math.max(0, Math.round(endedAt - startedAt)),
    retryCount,
  };
}

export function createOpenAiConversationModel(
  options: OpenAiConversationModelOptions = {},
): AiConversationModel {
  const now = options.now ?? (() => performance.now());
  const execute = options.execute ?? defaultExecute;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  return Object.freeze({
    async generate(
      request: AiConversationModelRequestV1,
    ): Promise<AiConversationModelResultV1> {
      const startedAt = now();
      let config: OpenAiRuntimeConfig | null = null;
      try {
        config = readOpenAiRuntimeConfig(options.environment ?? process.env);
      } catch (error) {
        return {
          ok: false,
          error: safeAiError(error),
          metadata: metadata(config, startedAt, now(), 0),
        };
      }
      let retryCount = 0;
      while (true) {
        try {
          const normalized = normalizeResponse(await execute(config, request));
          return {
            ok: true,
            outputText: normalized.outputText,
            toolCalls: normalized.toolCalls,
            metadata: metadata(
              config,
              startedAt,
              now(),
              retryCount,
              normalized,
            ),
          };
        } catch (error) {
          const safe = classify(error);
          if (safe.retryable && retryCount < config.maxRetries) {
            retryCount += 1;
            await sleep(Math.min(500, 100 * 2 ** (retryCount - 1)));
            continue;
          }
          return {
            ok: false,
            error: safe,
            metadata: metadata(config, startedAt, now(), retryCount),
          };
        }
      }
    },
  });
}
