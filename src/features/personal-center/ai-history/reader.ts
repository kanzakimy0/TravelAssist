import type {
  PersonalAiHistoryDetailV1,
  PersonalAiHistoryListItemV1,
} from "./projection";

export type HistoryReadResult<T> =
  | { status: "ready"; data: T }
  | { status: "empty" }
  | { status: "unavailable" }
  | { status: "error" };

/** Server-side port. WBS 8.8 must authorize every read with actorUserId. */
export interface PersonalAiHistoryReader {
  listHistory(
    actorUserId: string,
  ): Promise<HistoryReadResult<PersonalAiHistoryListItemV1[]>>;
  readHistoryDetail(
    actorUserId: string,
    conversationId: string,
  ): Promise<HistoryReadResult<PersonalAiHistoryDetailV1>>;
}
