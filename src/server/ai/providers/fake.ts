import "server-only";
import type {
  AiModelClass,
  AiProvider,
  AiProviderResultV1,
} from "../contracts";

export type FakeAiProviderOptions = {
  readonly outputText?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly cachedInputTokens?: number;
  readonly latencyMilliseconds?: number;
  readonly providerClass?: string;
  readonly modelClass?: AiModelClass;
  readonly requestId?: string | null;
};

export function createFakeAiProvider(
  options: FakeAiProviderOptions = {},
): AiProvider {
  return Object.freeze({
    async generate(): Promise<AiProviderResultV1> {
      return {
        ok: true,
        outputText: options.outputText ?? "deterministic fake response",
        metadata: {
          providerClass: options.providerClass ?? "fake",
          modelClass: options.modelClass ?? "unknown",
          requestId: options.requestId ?? "fake-request-1",
          usage: {
            inputTokens: options.inputTokens ?? 8,
            outputTokens: options.outputTokens ?? 4,
            cachedInputTokens: options.cachedInputTokens ?? 0,
          },
          latencyMilliseconds: options.latencyMilliseconds ?? 0,
          retryCount: 0,
        },
      };
    },
  });
}
