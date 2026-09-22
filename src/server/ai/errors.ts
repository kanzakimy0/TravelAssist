import type { AiRuntimeErrorCode } from "./contracts";

export class AiRuntimeError extends Error {
  readonly code: AiRuntimeErrorCode;
  readonly retryable: boolean;

  constructor(code: AiRuntimeErrorCode, retryable = false) {
    super(code);
    this.name = "AiRuntimeError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function safeAiError(error: unknown): {
  code: AiRuntimeErrorCode;
  retryable: boolean;
} {
  if (error instanceof AiRuntimeError)
    return { code: error.code, retryable: error.retryable };
  return { code: "AI_PROVIDER_UNAVAILABLE", retryable: true };
}
