import type {
  PersonalAiHistoryDetailV1,
  PersonalAiHistoryListItemV1,
} from "./projection";

export type HistoryReadResult<T> =
  | { status: "ready"; data: T }
  | { status: "empty" }
  | { status: "unavailable" }
  | { status: "error" };

/**
 * Server-side view port. WBS 8.8 must authorize each read with actorUserId,
 * map its accepted canonical source into PersonalAiHistorySourceRecordV1,
 * then call projectHistoryList/projectHistoryDetail. This interface returns
 * view DTOs; it does not define canonical Conversation storage.
 */
export interface PersonalAiHistoryReader {
  listHistory(
    actorUserId: string,
  ): Promise<HistoryReadResult<PersonalAiHistoryListItemV1[]>>;
  readHistoryDetail(
    actorUserId: string,
    conversationId: string,
  ): Promise<HistoryReadResult<PersonalAiHistoryDetailV1>>;
}
