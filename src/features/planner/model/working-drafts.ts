import {
  parseSavedTrip,
  sameTrip,
  type SavedTrip,
  type TripSnapshot,
} from "./browser-trip";
import type { TripState } from "./trip-model";
export const WORKING_DRAFTS_KEY = "travelassist.working-drafts.v1";
export type WorkingDraft = SavedTrip & { id: string; name: string };
export function readWorkingDrafts(
  raw: string | null,
  seed: TripState,
): WorkingDraft[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > 50)
    throw new Error("草稿记录无法读取，未覆盖原始数据。");
  return parsed.map((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.id !== "string" ||
      typeof row.name !== "string" ||
      !parseSavedTrip(JSON.stringify(row), seed)
    )
      throw new Error("草稿记录未通过校验，未覆盖原始数据。");
    return row as WorkingDraft;
  });
}
export function archiveWorkingDraft(
  storage: Pick<Storage, "getItem" | "setItem">,
  snapshot: TripSnapshot,
  seed: TripState,
) {
  const previous = storage.getItem(WORKING_DRAFTS_KEY),
    drafts = readWorkingDrafts(previous, seed);
  if (drafts.at(-1) && sameTrip(drafts.at(-1)!.snapshot, snapshot))
    return drafts;
  if (drafts.length >= 50)
    throw new Error("草稿已达50份，请先备份清理；当前方案未切换。");
  const entry: WorkingDraft = {
    version: 1,
    id: crypto.randomUUID(),
    name:
      snapshot.plans.find((p) => p.id === snapshot.currentPlanId)?.name ??
      "旅行草稿",
    savedAt: new Date().toISOString(),
    snapshot: structuredClone(snapshot),
  };
  if (!parseSavedTrip(JSON.stringify(entry), seed))
    throw new Error("当前草稿未通过检查，未切换方案。");
  if (storage.getItem(WORKING_DRAFTS_KEY) !== previous)
    throw new Error("其他页面已修改草稿，请重新操作。");
  storage.setItem(WORKING_DRAFTS_KEY, JSON.stringify([...drafts, entry]));
  return [...drafts, entry];
}
