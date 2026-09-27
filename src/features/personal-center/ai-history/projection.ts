/**
 * Derived read-only Personal Center view. This is neither the WBS 6.2
 * Conversation model nor a persistence schema. A future WBS 8.8 reader must
 * supply canonical IDs and only user-visible records to this allowlist.
 */
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
  const raw = Array.isArray(source.messages) ? source.messages : [];
  let partial = !Array.isArray(source.messages);
  const messages: PersonalAiHistoryMessageV1[] = [];

  for (const candidate of raw) {
    const message = record(candidate);
    if (!message || !nonEmptyString(message.id)) {
      partial = true;
      continue;
    }
    if (message.role !== "user" && message.role !== "assistant") continue;
    if (message.visibility !== undefined && message.visibility !== "user") {
      partial = true;
      continue;
    }
    const rawBlocks = Array.isArray(message.blocks) ? message.blocks : [];
    if (!Array.isArray(message.blocks)) partial = true;
    const blocks: PersonalAiHistoryBlockV1[] = [];
    for (const candidateBlock of rawBlocks) {
      const block = record(candidateBlock);
      if (!block || block.visibility !== "user") {
        partial = true;
        continue;
      }
      if (block.type === "text" && nonEmptyString(block.text)) {
        blocks.push({ kind: "text", text: block.text as string });
      } else if (block.type === "citation" && nonEmptyString(block.label)) {
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
        id: message.id as string,
        role: message.role,
        createdAt: timestamp(message.createdAt),
        blocks,
      });
    } else if (rawBlocks.length) {
      partial = true;
    }
  }
  return { messages, partial };
}

export function projectHistoryDetail(
  source: unknown,
): PersonalAiHistoryDetailV1 | null {
  const conversation = record(source);
  if (!conversation || !nonEmptyString(conversation.id)) return null;
  const { messages, partial } = visibleMessages(conversation);
  const firstUserText = messages
    .filter((message) => message.role === "user")
    .flatMap((message) => message.blocks)
    .find((block) => block.kind === "text");
  const title =
    conversation.titleVisibility === "user" &&
    nonEmptyString(conversation.title)
      ? bounded(conversation.title as string, 64)
      : firstUserText?.kind === "text"
        ? bounded(firstUserText.text, 64)
        : "未命名对话";
  return {
    conversationId: conversation.id as string,
    title,
    messages,
    partial,
  };
}

export function projectHistoryList(
  sources: readonly unknown[],
): PersonalAiHistoryListItemV1[] {
  return sources
    .flatMap((source) => {
      const detail = projectHistoryDetail(source);
      const raw = record(source);
      if (!detail || !raw) return [];
      const firstText = detail.messages
        .flatMap((message) => message.blocks)
        .find((block) => block.kind === "text");
      const lastActivityAt = timestamp(raw.updatedAt);
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
