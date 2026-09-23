import "server-only";
import type {
  AiConversationModel,
  AiConversationModelRequestV1,
  AiConversationModelResultV1,
} from "./model";

export type FakeConversationStepV1 = {
  readonly outputText?: string;
  readonly toolCalls?: readonly {
    readonly callId: string;
    readonly name: string;
    readonly arguments: string;
  }[];
};

export function createFakeConversationModel(
  steps: readonly FakeConversationStepV1[] = [
    { outputText: "这是离线 Fake Provider 的确定性回答。" },
  ],
): AiConversationModel & {
  readonly requests: readonly AiConversationModelRequestV1[];
} {
  const requests: AiConversationModelRequestV1[] = [];
  let index = 0;
  return {
    get requests() {
      return requests;
    },
    async generate(
      request: AiConversationModelRequestV1,
    ): Promise<AiConversationModelResultV1> {
      requests.push(structuredClone(request));
      const step = steps[index++] ?? steps.at(-1) ?? { outputText: "完成。" };
      return {
        ok: true,
        outputText: step.outputText ?? "",
        toolCalls: Object.freeze([...(step.toolCalls ?? [])]),
        metadata: {
          providerClass: "fake_conversation",
          modelClass: "unknown",
          requestId: `fake-conversation-${index}`,
          usage: {
            inputTokens: 8,
            outputTokens: 4,
            cachedInputTokens: 0,
          },
          latencyMilliseconds: 0,
          retryCount: 0,
        },
      };
    },
  };
}
