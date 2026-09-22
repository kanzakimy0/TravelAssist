import type {
  AiConversationStreamEventV1,
  AiConversationV1,
  AiMessageV1,
  AiTurnV1,
} from "./index";

function replaceMessage(
  messages: readonly AiMessageV1[],
  message: AiMessageV1,
): readonly AiMessageV1[] {
  return messages.some((candidate) => candidate.id === message.id)
    ? messages.map((candidate) =>
        candidate.id === message.id ? message : candidate,
      )
    : [...messages, message];
}

export function applyAiConversationEventV1(
  current: AiConversationV1 | null,
  event: AiConversationStreamEventV1,
): AiConversationV1 {
  const conversation: AiConversationV1 =
    current ??
    Object.freeze({
      contractVersion: "1.0",
      id: event.conversationId,
      persistence: "session_only",
      turns: Object.freeze([]),
      messages: Object.freeze([]),
    });
  if (conversation.id !== event.conversationId) return conversation;
  if (event.type === "turn.started") {
    if (conversation.turns.some((turn) => turn.id === event.turnId))
      return conversation;
    const turn: AiTurnV1 = {
      contractVersion: "1.0",
      id: event.turnId,
      conversationId: event.conversationId,
      status: "running",
      userMessageId: event.userMessage.id,
      assistantMessageId: event.assistantMessageId,
      traceId: event.traceId,
      correlationId: event.correlationId,
      startedAt: event.occurredAt,
      completedAt: null,
    };
    return Object.freeze({
      ...conversation,
      turns: Object.freeze([...conversation.turns, Object.freeze(turn)]),
      messages: Object.freeze(
        replaceMessage(conversation.messages, event.userMessage),
      ),
    });
  }
  const turn = conversation.turns.find(
    (candidate) => candidate.id === event.turnId,
  );
  if (!turn) return conversation;
  if (event.type === "text.delta") {
    const existing = conversation.messages.find(
      (message) => message.id === event.messageId,
    );
    const text =
      existing?.blocks
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("") ?? "";
    const message: AiMessageV1 = {
      contractVersion: "1.0",
      id: event.messageId,
      role: "assistant",
      createdAt: event.occurredAt,
      blocks: [{ type: "text", text: text + event.delta }],
    };
    return Object.freeze({
      ...conversation,
      messages: Object.freeze(replaceMessage(conversation.messages, message)),
    });
  }
  if (event.type === "turn.completed")
    return Object.freeze({
      ...conversation,
      turns: Object.freeze(
        conversation.turns.map((candidate) =>
          candidate.id === event.turnId
            ? Object.freeze({
                ...candidate,
                status: "completed" as const,
                completedAt: event.occurredAt,
              })
            : candidate,
        ),
      ),
      messages: Object.freeze(
        replaceMessage(conversation.messages, event.message),
      ),
    });
  if (event.type === "turn.error")
    return Object.freeze({
      ...conversation,
      turns: Object.freeze(
        conversation.turns.map((candidate) =>
          candidate.id === event.turnId
            ? Object.freeze({
                ...candidate,
                status: "error" as const,
                completedAt: event.occurredAt,
              })
            : candidate,
        ),
      ),
    });
  return conversation;
}
