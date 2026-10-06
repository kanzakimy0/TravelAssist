import "server-only";
import type { AiModelClass } from "./contracts";
import { AiRuntimeError } from "./errors";

export type OpenAiRuntimeConfig = {
  readonly apiKey: string;
  readonly model: string;
  readonly modelClass: AiModelClass;
  readonly timeoutMilliseconds: number;
  readonly maxRetries: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 1;

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value))
    throw new AiRuntimeError("AI_PROVIDER_NOT_CONFIGURED");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum)
    throw new AiRuntimeError("AI_PROVIDER_NOT_CONFIGURED");
  return parsed;
}

export function classifyOpenAiModel(model: string): AiModelClass {
  const normalized = model.toLowerCase();
  if (/mini|nano|low/.test(normalized)) return "low_cost";
  if (/pro|reason|o1|o3|o4/.test(normalized)) return "high_reasoning";
  return model ? "standard" : "unknown";
}

export function readOpenAiRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): OpenAiRuntimeConfig {
  const apiKey = environment.OPENAI_API_KEY?.trim() ?? "";
  const model = environment.OPENAI_MODEL?.trim() ?? "";
  if (!apiKey || !model) throw new AiRuntimeError("AI_PROVIDER_NOT_CONFIGURED");
  return Object.freeze({
    apiKey,
    model,
    modelClass: classifyOpenAiModel(model),
    timeoutMilliseconds: boundedInteger(
      environment.OPENAI_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      1_000,
      60_000,
    ),
    maxRetries: boundedInteger(
      environment.OPENAI_MAX_RETRIES,
      DEFAULT_MAX_RETRIES,
      0,
      2,
    ),
  });
}
