import "server-only";
import type { AiConversationRequestV1 } from "../../../shared/contracts/ai-conversation";
import type { AiPreferenceContextV1 } from "../contracts";
import type { AiConversationModel } from "./model";
import { orchestrateAiConversation } from "./orchestrator";

export const AI_CONVERSATION_STREAM_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store",
  "Content-Type": "text/event-stream; charset=utf-8",
  "X-Accel-Buffering": "no",
  "X-Content-Type-Options": "nosniff",
  Vary: "Authorization, Cookie",
});

export function createAiConversationStreamResponse(
  request: AiConversationRequestV1,
  dependencies: {
    readonly model: AiConversationModel;
    readonly preferenceContext: AiPreferenceContextV1;
    readonly finish?: <T extends Response>(response: T) => T;
  },
): Response {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of orchestrateAiConversation(request, {
          model: dependencies.model,
          preferenceContext: dependencies.preferenceContext,
          signal: abort.signal,
        }))
          if (!abort.signal.aborted)
            controller.enqueue(
              encoder.encode(
                `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
              ),
            );
        if (!abort.signal.aborted) controller.close();
      } catch {
        if (!abort.signal.aborted)
          controller.error(new Error("AI_CONVERSATION_STREAM_FAILED"));
      }
    },
    cancel() {
      abort.abort();
    },
  });
  const response = new Response(body, {
    headers: AI_CONVERSATION_STREAM_HEADERS,
  });
  return dependencies.finish ? dependencies.finish(response) : response;
}
