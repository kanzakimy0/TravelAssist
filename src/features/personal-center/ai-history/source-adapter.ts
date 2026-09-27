/**
 * WBS 8.8 source adapter output, not the WBS 6.2 Conversation JSON or a
 * persistence schema. The adapter owns actor-scoped reads and the explicit
 * mapping from the accepted canonical runtime/storage types into this shape.
 *
 * Only display-eligible data may cross this boundary. In particular, the
 * adapter must omit system/developer/tool messages, private reasoning, raw
 * provider/tool payloads, non-user-visible blocks, URLs and account data.
 * Preserve canonical conversation/message IDs and source timestamps; never
 * synthesize identity or time. Set hadOmissions when content was withheld or
 * could not be mapped, so the detail can disclose an incomplete rendering.
 */
export type PersonalAiHistorySourceBlockV1 =
  | { kind: "plainText"; text: string }
  | { kind: "citationLabel"; label: string };

export type PersonalAiHistorySourceMessageV1 = {
  messageId: string;
  speaker: "user" | "assistant";
  sentAt: string | null;
  content: readonly PersonalAiHistorySourceBlockV1[];
};

export type PersonalAiHistorySourceRecordV1 = {
  conversationId: string;
  lastActivityAt: string | null;
  visibleTitle: string | null;
  visibleMessages: readonly PersonalAiHistorySourceMessageV1[];
  hadOmissions: boolean;
};
