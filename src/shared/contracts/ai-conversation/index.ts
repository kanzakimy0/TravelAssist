export const AI_CONVERSATION_CONTRACT_VERSION = "1.0" as const;
export const AI_CONVERSATION_MAX_INPUT_BYTES = 32 * 1024;
export const AI_CONVERSATION_MAX_HISTORY_MESSAGES = 12;
export const AI_CONVERSATION_MAX_MESSAGE_BYTES = 32 * 1024;

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const REQUEST_KEYS = Object.freeze([
  "contractVersion",
  "conversationId",
  "correlationId",
  "history",
  "input",
]);

export type AiConversationRoleV1 = "user" | "assistant";

export type AiContentBlockV1 =
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "tool_summary";
      readonly toolName: string;
      readonly status: "completed" | "unavailable";
    };

export type AiMessageV1 = {
  readonly contractVersion: "1.0";
  readonly id: string;
  readonly role: AiConversationRoleV1;
  readonly createdAt: string;
  readonly blocks: readonly AiContentBlockV1[];
};

export type AiTurnV1 = {
  readonly contractVersion: "1.0";
  readonly id: string;
  readonly conversationId: string;
  readonly status: "running" | "completed" | "error";
  readonly userMessageId: string;
  readonly assistantMessageId: string;
  readonly traceId: string;
  readonly correlationId: string | null;
  readonly startedAt: string;
  readonly completedAt: string | null;
};

export type AiConversationV1 = {
  readonly contractVersion: "1.0";
  readonly id: string;
  readonly persistence: "session_only";
  readonly turns: readonly AiTurnV1[];
  readonly messages: readonly AiMessageV1[];
};

export type AiConversationHistoryMessageV1 = {
  readonly role: AiConversationRoleV1;
  readonly text: string;
};

export type AiConversationRequestV1 = {
  readonly contractVersion: "1.0";
  readonly conversationId: string | null;
  readonly correlationId: string | null;
  readonly history: readonly AiConversationHistoryMessageV1[];
  readonly input: string;
};

export type AiConversationErrorCodeV1 =
  | "AI_CONVERSATION_INVALID_REQUEST"
  | "AI_PROVIDER_NOT_CONFIGURED"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_RATE_LIMITED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_INVALID_PROVIDER_RESPONSE"
  | "AI_TOOL_NOT_ALLOWED"
  | "AI_TOOL_UNAVAILABLE"
  | "AI_TOOL_INVALID_INPUT"
  | "AI_TOOL_INVALID_OUTPUT"
  | "AI_TOOL_DUPLICATE_CALL"
  | "AI_TOOL_LOOP_LIMIT";

type EventBase = {
  readonly contractVersion: "1.0";
  readonly eventId: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly traceId: string;
  readonly correlationId: string | null;
  readonly conversationId: string;
  readonly turnId: string;
};

export type AiConversationUsageV1 = {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly cachedInputTokens: number | null;
  readonly toolCalls: number;
  readonly toolRounds: number;
};

export type AiConversationStreamEventV1 =
  | (EventBase & {
      readonly type: "turn.started";
      readonly userMessage: AiMessageV1;
      readonly assistantMessageId: string;
    })
  | (EventBase & {
      readonly type: "text.delta";
      readonly messageId: string;
      readonly delta: string;
    })
  | (EventBase & {
      readonly type: "tool.started";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly label: string;
    })
  | (EventBase & {
      readonly type: "tool.completed";
      readonly toolCallId: string;
      readonly toolName: string;
      readonly status: "completed" | "unavailable";
    })
  | (EventBase & {
      readonly type: "turn.completed";
      readonly message: AiMessageV1;
      readonly usage: AiConversationUsageV1;
    })
  | (EventBase & {
      readonly type: "turn.error";
      readonly error: {
        readonly code: AiConversationErrorCodeV1;
        readonly retryable: boolean;
      };
      readonly degraded: true;
    });

export class AiConversationContractError extends Error {
  readonly code = "AI_CONVERSATION_INVALID_REQUEST" as const;
  constructor() {
    super("AI_CONVERSATION_INVALID_REQUEST");
    this.name = "AiConversationContractError";
  }
}

function invalid(): never {
  throw new AiConversationContractError();
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function plainObject(
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    invalid();
  const ownKeys = Reflect.ownKeys(input);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    invalid();
  return Object.fromEntries(
    keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) invalid();
      return [key, descriptor.value];
    }),
  );
}

function id(input: unknown, nullable = false): string | null {
  if (nullable && input === null) return null;
  if (typeof input !== "string" || !ID_PATTERN.test(input)) invalid();
  return input;
}

function messageText(input: unknown): string {
  if (
    typeof input !== "string" ||
    input.trim().length === 0 ||
    byteLength(input) > AI_CONVERSATION_MAX_MESSAGE_BYTES
  )
    invalid();
  return input;
}

function history(input: unknown): readonly AiConversationHistoryMessageV1[] {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    input.length > AI_CONVERSATION_MAX_HISTORY_MESSAGES ||
    Reflect.ownKeys(input).length !== input.length + 1
  )
    invalid();
  return Object.freeze(
    input.map((item) => {
      const value = plainObject(item, ["role", "text"]);
      if (value.role !== "user" && value.role !== "assistant") invalid();
      return Object.freeze({
        role: value.role,
        text: messageText(value.text),
      });
    }),
  );
}

export function parseAiConversationRequestV1(
  input: unknown,
): AiConversationRequestV1 {
  const value = plainObject(input, REQUEST_KEYS);
  if (value.contractVersion !== AI_CONVERSATION_CONTRACT_VERSION) invalid();
  const parsedInput = messageText(value.input);
  if (byteLength(parsedInput) > AI_CONVERSATION_MAX_INPUT_BYTES) invalid();
  return Object.freeze({
    contractVersion: AI_CONVERSATION_CONTRACT_VERSION,
    conversationId: id(value.conversationId, true),
    correlationId: id(value.correlationId, true),
    history: history(value.history),
    input: parsedInput,
  });
}

export function isAiConversationStreamEventV1(
  input: unknown,
): input is AiConversationStreamEventV1 {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const value = input as Partial<AiConversationStreamEventV1>;
  const baseValid =
    value.contractVersion === AI_CONVERSATION_CONTRACT_VERSION &&
    typeof value.type === "string" &&
    [
      "turn.started",
      "text.delta",
      "tool.started",
      "tool.completed",
      "turn.completed",
      "turn.error",
    ].includes(value.type) &&
    typeof value.eventId === "string" &&
    ID_PATTERN.test(value.eventId) &&
    Number.isSafeInteger(value.sequence) &&
    Number(value.sequence) >= 0 &&
    typeof value.occurredAt === "string" &&
    typeof value.traceId === "string" &&
    ID_PATTERN.test(value.traceId) &&
    (value.correlationId === null ||
      (typeof value.correlationId === "string" &&
        ID_PATTERN.test(value.correlationId))) &&
    typeof value.conversationId === "string" &&
    ID_PATTERN.test(value.conversationId) &&
    typeof value.turnId === "string" &&
    ID_PATTERN.test(value.turnId);
  if (!baseValid) return false;
  const idValue = (candidate: unknown) =>
    typeof candidate === "string" && ID_PATTERN.test(candidate);
  const message = (candidate: unknown): candidate is AiMessageV1 => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
      return false;
    const item = candidate as Partial<AiMessageV1>;
    return (
      item.contractVersion === "1.0" &&
      idValue(item.id) &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.createdAt === "string" &&
      Number.isFinite(Date.parse(item.createdAt)) &&
      Array.isArray(item.blocks) &&
      item.blocks.length > 0 &&
      item.blocks.every((block) => {
        if (!block || typeof block !== "object") return false;
        if (block.type === "text")
          return (
            typeof block.text === "string" &&
            block.text.length > 0 &&
            byteLength(block.text) <= AI_CONVERSATION_MAX_MESSAGE_BYTES
          );
        return (
          block.type === "tool_summary" &&
          typeof block.toolName === "string" &&
          (block.status === "completed" || block.status === "unavailable")
        );
      })
    );
  };
  switch (value.type) {
    case "turn.started":
      return message(value.userMessage) && idValue(value.assistantMessageId);
    case "text.delta":
      return (
        idValue(value.messageId) &&
        typeof value.delta === "string" &&
        value.delta.length > 0 &&
        byteLength(value.delta) <= AI_CONVERSATION_MAX_MESSAGE_BYTES
      );
    case "tool.started":
      return (
        idValue(value.toolCallId) &&
        typeof value.toolName === "string" &&
        typeof value.label === "string" &&
        value.label.length > 0
      );
    case "tool.completed":
      return (
        idValue(value.toolCallId) &&
        typeof value.toolName === "string" &&
        (value.status === "completed" || value.status === "unavailable")
      );
    case "turn.completed":
      return (
        message(value.message) &&
        !!value.usage &&
        [
          value.usage.inputTokens,
          value.usage.outputTokens,
          value.usage.cachedInputTokens,
        ].every(
          (number) =>
            number === null || (Number.isSafeInteger(number) && number >= 0),
        ) &&
        Number.isSafeInteger(value.usage.toolCalls) &&
        value.usage.toolCalls >= 0 &&
        Number.isSafeInteger(value.usage.toolRounds) &&
        value.usage.toolRounds >= 0
      );
    case "turn.error":
      return (
        value.degraded === true &&
        !!value.error &&
        typeof value.error.code === "string" &&
        typeof value.error.retryable === "boolean"
      );
  }
  return false;
}
