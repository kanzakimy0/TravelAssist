import "server-only";
import type {
  AiProviderMetadataV1,
  AiProviderUsageV1,
  AiRuntimeErrorCode,
} from "../contracts";
import type { AiToolDefinitionV1 } from "../tools/registry";

export type AiModelTranscriptItemV1 =
  | {
      readonly type: "message";
      readonly role: "user" | "assistant";
      readonly text: string;
    }
  | {
      readonly type: "tool_call";
      readonly callId: string;
      readonly name: string;
      readonly arguments: string;
    }
  | {
      readonly type: "tool_output";
      readonly callId: string;
      readonly output: string;
    };

export type AiModelToolCallV1 = {
  readonly callId: string;
  readonly name: string;
  readonly arguments: string;
};

export type AiConversationModelRequestV1 = {
  readonly instructions: string;
  readonly transcript: readonly AiModelTranscriptItemV1[];
  readonly tools: readonly AiToolDefinitionV1[];
  readonly traceId: string;
  readonly correlationId: string | null;
  readonly signal?: AbortSignal;
};

export type AiConversationModelResultV1 =
  | {
      readonly ok: true;
      readonly outputText: string;
      readonly toolCalls: readonly AiModelToolCallV1[];
      readonly metadata: AiProviderMetadataV1;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: AiRuntimeErrorCode;
        readonly retryable: boolean;
      };
      readonly metadata: AiProviderMetadataV1;
    };

export interface AiConversationModel {
  generate(
    request: AiConversationModelRequestV1,
  ): Promise<AiConversationModelResultV1>;
}

export const EMPTY_AI_USAGE: AiProviderUsageV1 = Object.freeze({
  inputTokens: null,
  outputTokens: null,
  cachedInputTokens: null,
});
