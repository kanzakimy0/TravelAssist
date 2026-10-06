import "server-only";
import {
  exactObject,
  fail,
  tripRecordId,
} from "../../features/trip-library/persistence/requests";
import { parseTripStorageTimestamp } from "../../features/trip-library/domain/trip-persistence-v1";
export type TripListQuery = {
  state: "all" | "draft" | "saved" | "history";
  limit: number;
  cursor: { updatedAt: string; id: string } | null;
};
export function encodeTripCursor(cursor: { updatedAt: string; id: string }) {
  return Buffer.from(JSON.stringify({ version: 1, ...cursor })).toString(
    "base64url",
  );
}
export function parseTripListQuery(params: URLSearchParams): TripListQuery {
  for (const key of params.keys())
    if (
      !["state", "limit", "cursor"].includes(key) ||
      params.getAll(key).length !== 1
    )
      return fail("INVALID_REQUEST");
  const state = params.get("state") ?? "all",
    limit = params.get("limit") ?? "20";
  if (
    !["all", "draft", "saved", "history"].includes(state) ||
    !/^(?:[1-9]|[1-4][0-9]|50)$/.test(limit)
  )
    return fail("INVALID_REQUEST");
  let cursor: TripListQuery["cursor"] = null;
  if (params.has("cursor")) {
    const encoded = params.get("cursor")!;
    if (encoded.length > 256 || !/^[A-Za-z0-9_-]+$/.test(encoded))
      return fail("INVALID_REQUEST");
    try {
      const bytes = Buffer.from(encoded, "base64url");
      if (bytes.toString("base64url") !== encoded)
        return fail("INVALID_REQUEST");
      const value = exactObject(
        JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
        ["version", "updatedAt", "id"],
      );
      if (value.version !== 1) return fail("INVALID_REQUEST");
      cursor = {
        updatedAt: parseTripStorageTimestamp(value.updatedAt),
        id: tripRecordId(value.id),
      };
    } catch {
      return fail("INVALID_REQUEST");
    }
  }
  return {
    state: state as TripListQuery["state"],
    limit: Number(limit),
    cursor,
  };
}
