import type { PersonalAiHistorySourceRecordV1 } from "./source-adapter";

/** Derived read-only Personal Center view, not a Conversation model. */
export type PersonalAiHistoryBlockV1 =
  { kind: "text"; text: string } | { kind: "citation"; label: string };

export type PersonalAiHistoryMessageV1 = {
  id: string;
  role: "user" | "assistant";
  createdAt: string | null;
  blocks: PersonalAiHistoryBlockV1[];
};

export type PersonalAiHistoryListItemV1 = {
  conversationId: string;
  title: string;
  preview: string | null;
  lastActivityAt: string | null;
  visibleMessageCount: number;
};

export type PersonalAiHistoryDetailV1 = {
  conversationId: string;
  title: string;
  messages: PersonalAiHistoryMessageV1[];
  partial: boolean;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function timestamp(value: unknown): string | null {
  const text = nonEmptyString(value);
  return text && !Number.isNaN(Date.parse(text)) ? text : null;
}

function bounded(text: string, limit: number): string {
  const collapsed = text.replace(/\s+/gu, " ").trim();
  const characters = Array.from(collapsed);
  return characters.length > limit
    ? `${characters.slice(0, limit).join("")}…`
    : collapsed;
}

function visibleMessages(source: JsonRecord) {
  const raw = Array.isArray(source.visibleMessages)
    ? source.visibleMessages
    : [];
  let partial =
    source.hadOmissions === true || !Array.isArray(source.visibleMessages);
  const messages: PersonalAiHistoryMessageV1[] = [];

  for (const candidate of raw) {
    const message = record(candidate);
    if (!message || !nonEmptyString(message.messageId)) {
      partial = true;
      continue;
    }
    if (message.speaker !== "user" && message.speaker !== "assistant") {
      partial = true;
      continue;
    }
    const rawBlocks = Array.isArray(message.content) ? message.content : [];
    if (!Array.isArray(message.content)) partial = true;
    const blocks: PersonalAiHistoryBlockV1[] = [];
    for (const candidateBlock of rawBlocks) {
      const block = record(candidateBlock);
      if (!block) {
        partial = true;
        continue;
      }
      if (block.kind === "plainText" && nonEmptyString(block.text)) {
        blocks.push({ kind: "text", text: block.text as string });
      } else if (
        block.kind === "citationLabel" &&
        nonEmptyString(block.label)
      ) {
        blocks.push({
          kind: "citation",
          label: bounded(block.label as string, 120),
        });
      } else {
        partial = true;
      }
    }
    if (blocks.length) {
      messages.push({
        id: message.messageId as string,
        role: message.speaker,
        createdAt: timestamp(message.sentAt),
        blocks,
      });
    } else if (rawBlocks.length) {
      partial = true;
    }
  }
  return { messages, partial };
}

export function projectHistoryDetail(
  source: PersonalAiHistorySourceRecordV1,
): PersonalAiHistoryDetailV1 | null {
  const conversation = record(source);
  if (!conversation || !nonEmptyString(conversation.conversationId))
    return null;
  const { messages, partial } = visibleMessages(conversation);
  const firstUserText = messages
    .filter((message) => message.role === "user")
    .flatMap((message) => message.blocks)
    .find((block) => block.kind === "text");
  const title = nonEmptyString(conversation.visibleTitle)
    ? bounded(conversation.visibleTitle as string, 64)
    : firstUserText?.kind === "text"
      ? bounded(firstUserText.text, 64)
      : "未命名对话";
  return {
    conversationId: conversation.conversationId as string,
    title,
    messages,
    partial,
  };
}

export function projectHistoryList(
  sources: readonly PersonalAiHistorySourceRecordV1[],
): PersonalAiHistoryListItemV1[] {
  return sources
    .flatMap((source) => {
      const detail = projectHistoryDetail(source);
      const raw = record(source);
      if (!detail || !raw) return [];
      const firstText = detail.messages
        .flatMap((message) => message.blocks)
        .find((block) => block.kind === "text");
      const lastActivityAt = timestamp(raw.lastActivityAt);
      return [
        {
          conversationId: detail.conversationId,
          title: detail.title,
          preview:
            firstText?.kind === "text" ? bounded(firstText.text, 140) : null,
          lastActivityAt,
          visibleMessageCount: detail.messages.length,
        },
      ];
    })
    .sort((a, b) => {
      const byDate =
        (b.lastActivityAt ? Date.parse(b.lastActivityAt) : -Infinity) -
        (a.lastActivityAt ? Date.parse(a.lastActivityAt) : -Infinity);
      return byDate || a.conversationId.localeCompare(b.conversationId);
    });
}
