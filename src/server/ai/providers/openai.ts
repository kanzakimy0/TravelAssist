import "server-only";
import OpenAI from "openai";
import type {
  AiProvider,
  AiProviderMetadataV1,
  AiProviderRequestV1,
  AiProviderResultV1,
  AiProviderUsageV1,
  AiRuntimeErrorCode,
} from "../contracts";
import { readOpenAiRuntimeConfig, type OpenAiRuntimeConfig } from "../config";
import { AiRuntimeError, safeAiError } from "../errors";

const PROVIDER_CLASS = "openai_responses";
const EMPTY_USAGE: AiProviderUsageV1 = Object.freeze({
  inputTokens: null,
  outputTokens: null,
  cachedInputTokens: null,
});

type OpenAiResponseShape = {
  readonly _request_id?: unknown;
  readonly output_text?: unknown;
  readonly usage?: {
    readonly input_tokens?: unknown;
    readonly output_tokens?: unknown;
    readonly input_tokens_details?: { readonly cached_tokens?: unknown } | null;
  } | null;
};

type OpenAiExecute = (
  config: OpenAiRuntimeConfig,
  request: AiProviderRequestV1,
) => Promise<OpenAiResponseShape>;

export type OpenAiProviderOptions = {
  readonly environment?: NodeJS.ProcessEnv;
  readonly execute?: OpenAiExecute;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
};

function nonNegativeInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0
    ? Number(value)
    : null;
}

function safeRequestId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value)
    ? value
    : null;
}

function readStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const value = Object.getOwnPropertyDescriptor(error, "status")?.value;
  return Number.isInteger(value) ? Number(value) : null;
}

function classifyProviderError(error: unknown): {
  code: AiRuntimeErrorCode;
  retryable: boolean;
} {
  if (error instanceof AiRuntimeError) return safeAiError(error);
  const status = readStatus(error);
  const name =
    error && typeof error === "object"
      ? Object.getOwnPropertyDescriptor(error, "name")?.value
      : null;
  if (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    name === "APIConnectionTimeoutError" ||
    name === "AbortError"
  )
    return { code: "AI_PROVIDER_TIMEOUT", retryable: true };
  if (error instanceof OpenAI.RateLimitError || status === 429)
    return { code: "AI_PROVIDER_RATE_LIMITED", retryable: true };
  if (
    error instanceof OpenAI.APIConnectionError ||
    (status !== null && status >= 500)
  )
    return { code: "AI_PROVIDER_UNAVAILABLE", retryable: true };
  return { code: "AI_PROVIDER_UNAVAILABLE", retryable: false };
}

function normalizeResponse(response: OpenAiResponseShape): {
  outputText: string;
  requestId: string | null;
  usage: AiProviderUsageV1;
} {
  if (
    typeof response.output_text !== "string" ||
    response.output_text.trim().length === 0
  )
    throw new AiRuntimeError("AI_INVALID_PROVIDER_RESPONSE");
  const usage = response.usage;
  const inputTokens = nonNegativeInteger(usage?.input_tokens);
  const outputTokens = nonNegativeInteger(usage?.output_tokens);
  const cachedInputTokens = nonNegativeInteger(
    usage?.input_tokens_details?.cached_tokens,
  );
  if (
    usage !== null &&
    usage !== undefined &&
    (inputTokens === null || outputTokens === null)
  )
    throw new AiRuntimeError("AI_INVALID_PROVIDER_RESPONSE");
  return {
    outputText: response.output_text,
    requestId: safeRequestId(response._request_id),
    usage: {
      inputTokens,
      outputTokens,
      cachedInputTokens,
    },
  };
}

async function defaultExecute(
  config: OpenAiRuntimeConfig,
  request: AiProviderRequestV1,
): Promise<OpenAiResponseShape> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMilliseconds,
    maxRetries: 0,
  });
  return client.responses.create({
    model: config.model,
    instructions: request.instructions,
    input: request.input,
    store: false,
    tools: [],
  });
}

function metadata(
  config: OpenAiRuntimeConfig | null,
  startedAt: number,
  endedAt: number,
  retryCount: number,
  usage: AiProviderUsageV1 = EMPTY_USAGE,
  requestId: string | null = null,
): AiProviderMetadataV1 {
  return {
    providerClass: PROVIDER_CLASS,
    modelClass: config?.modelClass ?? "unknown",
    requestId,
    usage,
    latencyMilliseconds: Math.max(0, Math.round(endedAt - startedAt)),
    retryCount,
  };
}

export function createOpenAiResponsesProvider(
  options: OpenAiProviderOptions = {},
): AiProvider {
  const now = options.now ?? (() => performance.now());
  const execute = options.execute ?? defaultExecute;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  return Object.freeze({
    async generate(request: AiProviderRequestV1): Promise<AiProviderResultV1> {
      const startedAt = now();
      let config: OpenAiRuntimeConfig | null = null;
      try {
        config = readOpenAiRuntimeConfig(options.environment ?? process.env);
      } catch (error) {
        const safe = safeAiError(error);
        return {
          ok: false,
          error: safe,
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
            metadata: metadata(
              config,
              startedAt,
              now(),
              retryCount,
              normalized.usage,
              normalized.requestId,
            ),
          };
        } catch (error) {
          const safe = classifyProviderError(error);
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
