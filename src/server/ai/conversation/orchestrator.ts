import "server-only";
import { randomUUID } from "node:crypto";
import type {
  AiContentBlockV1,
  AiConversationErrorCodeV1,
  AiConversationRequestV1,
  AiConversationStreamEventV1,
  AiConversationUsageV1,
  AiMessageV1,
} from "../../../shared/contracts/ai-conversation";
import type { AiPreferenceContextV1 } from "../contracts";
import { resolvePrompt } from "../prompts/registry";
import {
  AiToolError,
  executeReadOnlyTool,
  listAvailableReadOnlyTools,
  resolveReadOnlyTool,
} from "../tools/registry";
import type { AiConversationModel, AiModelTranscriptItemV1 } from "./model";

export const AI_CONVERSATION_MAX_TOOL_ROUNDS = 3;
export const AI_CONVERSATION_MAX_TOOL_CALLS = 4;
const TEXT_DELTA_CHARACTERS = 48;

export type AiConversationOrchestratorDependencies = {
  readonly model: AiConversationModel;
  readonly preferenceContext: AiPreferenceContextV1;
  readonly now?: () => Date;
  readonly id?: () => string;
  readonly signal?: AbortSignal;
};

function safeError(error: unknown): {
  code: AiConversationErrorCodeV1;
  retryable: boolean;
} {
  if (error instanceof AiToolError)
    return { code: error.code, retryable: error.retryable };
  return {
    code: "AI_PROVIDER_UNAVAILABLE",
    retryable: true,
  };
}

function providerError(error: {
  readonly code: string;
  readonly retryable: boolean;
}): { code: AiConversationErrorCodeV1; retryable: boolean } {
  return {
    code:
      error.code === "AI_RUNTIME_INVALID_REQUEST"
        ? "AI_INVALID_PROVIDER_RESPONSE"
        : (error.code as AiConversationErrorCodeV1),
    retryable: error.retryable,
  };
}

function signature(name: string, rawArguments: string): string {
  try {
    const value: unknown = JSON.parse(rawArguments);
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    )
      return `${name}:${JSON.stringify(
        Object.fromEntries(
          Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        ),
      )}`;
  } catch {
    // The router returns the strict invalid-input error after duplicate checks.
  }
  return `${name}:${rawArguments}`;
}

function addUsage(
  current: AiConversationUsageV1,
  next: {
    inputTokens: number | null;
    outputTokens: number | null;
    cachedInputTokens: number | null;
  },
): AiConversationUsageV1 {
  const sum = (left: number | null, right: number | null) =>
    left === null || right === null ? null : left + right;
  return {
    ...current,
    inputTokens: sum(current.inputTokens, next.inputTokens),
    outputTokens: sum(current.outputTokens, next.outputTokens),
    cachedInputTokens: sum(current.cachedInputTokens, next.cachedInputTokens),
  };
}

function chunks(value: string): readonly string[] {
  const characters = Array.from(value);
  const result: string[] = [];
  for (let index = 0; index < characters.length; index += TEXT_DELTA_CHARACTERS)
    result.push(
      characters.slice(index, index + TEXT_DELTA_CHARACTERS).join(""),
    );
  return result;
}

export async function* orchestrateAiConversation(
  request: AiConversationRequestV1,
  dependencies: AiConversationOrchestratorDependencies,
): AsyncGenerator<AiConversationStreamEventV1> {
  const now = dependencies.now ?? (() => new Date());
  const makeId = dependencies.id ?? randomUUID;
  const conversationId = request.conversationId ?? makeId();
  const correlationId = request.correlationId ?? makeId();
  const traceId = makeId();
  const turnId = makeId();
  const userMessageId = makeId();
  const assistantMessageId = makeId();
  let sequence = 0;
  const base = () => ({
    contractVersion: "1.0" as const,
    eventId: makeId(),
    sequence: sequence++,
    occurredAt: now().toISOString(),
    traceId,
    correlationId,
    conversationId,
    turnId,
  });
  const userMessage: AiMessageV1 = {
    contractVersion: "1.0",
    id: userMessageId,
    role: "user",
    createdAt: now().toISOString(),
    blocks: [{ type: "text", text: request.input }],
  };
  yield {
    ...base(),
    type: "turn.started",
    userMessage,
    assistantMessageId,
  };

  const prompt = resolvePrompt("travel_assistant_conversation", "1.0.0");
  const transcript: AiModelTranscriptItemV1[] = [
    ...request.history.map((message) => ({
      type: "message" as const,
      role: message.role,
      text: message.text,
    })),
    { type: "message", role: "user", text: request.input },
  ];
  const seenCalls = new Set<string>();
  const seenCallIds = new Set<string>();
  const toolBlocks: AiContentBlockV1[] = [];
  let usage: AiConversationUsageV1 = {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    toolCalls: 0,
    toolRounds: 0,
  };

  try {
    while (true) {
      if (dependencies.signal?.aborted) return;
      const result = await dependencies.model.generate({
        instructions: prompt.instructions,
        transcript,
        tools: listAvailableReadOnlyTools(),
        traceId,
        correlationId,
        signal: dependencies.signal,
      });
      if (dependencies.signal?.aborted) return;
      usage = addUsage(usage, result.metadata.usage);
      if (!result.ok) {
        yield {
          ...base(),
          type: "turn.error",
          error: providerError(result.error),
          degraded: true,
        };
        return;
      }
      if (result.toolCalls.length === 0) {
        if (!result.outputText.trim())
          throw new AiToolError("AI_INVALID_PROVIDER_RESPONSE");
        for (const delta of chunks(result.outputText))
          yield {
            ...base(),
            type: "text.delta",
            messageId: assistantMessageId,
            delta,
          };
        const message: AiMessageV1 = {
          contractVersion: "1.0",
          id: assistantMessageId,
          role: "assistant",
          createdAt: now().toISOString(),
          blocks: [{ type: "text", text: result.outputText }, ...toolBlocks],
        };
        yield {
          ...base(),
          type: "turn.completed",
          message,
          usage,
        };
        return;
      }
      if (usage.toolRounds >= AI_CONVERSATION_MAX_TOOL_ROUNDS)
        throw new AiToolError("AI_TOOL_LOOP_LIMIT");
      if (
        usage.toolCalls + result.toolCalls.length >
        AI_CONVERSATION_MAX_TOOL_CALLS
      )
        throw new AiToolError("AI_TOOL_LOOP_LIMIT");
      usage = { ...usage, toolRounds: usage.toolRounds + 1 };
      for (const call of result.toolCalls)
        transcript.push({
          type: "tool_call",
          callId: call.callId,
          name: call.name,
          arguments: call.arguments,
        });
      for (const call of result.toolCalls) {
        if (dependencies.signal?.aborted) return;
        const callSignature = signature(call.name, call.arguments);
        if (seenCalls.has(callSignature) || seenCallIds.has(call.callId))
          throw new AiToolError("AI_TOOL_DUPLICATE_CALL");
        seenCalls.add(callSignature);
        seenCallIds.add(call.callId);
        const definition = resolveReadOnlyTool(call.name);
        if (!definition) throw new AiToolError("AI_TOOL_NOT_ALLOWED");
        yield {
          ...base(),
          type: "tool.started",
          toolCallId: call.callId,
          toolName: definition.name,
          label: definition.label,
        };
        const executed = await executeReadOnlyTool(call.name, call.arguments, {
          preferenceContext: dependencies.preferenceContext,
        });
        usage = { ...usage, toolCalls: usage.toolCalls + 1 };
        transcript.push({
          type: "tool_output",
          callId: call.callId,
          output: executed.output,
        });
        toolBlocks.push({
          type: "tool_summary",
          toolName: executed.name,
          status: executed.status,
        });
        yield {
          ...base(),
          type: "tool.completed",
          toolCallId: call.callId,
          toolName: executed.name,
          status: executed.status,
        };
      }
    }
  } catch (error) {
    yield {
      ...base(),
      type: "turn.error",
      error: safeError(error),
      degraded: true,
    };
  }
}
