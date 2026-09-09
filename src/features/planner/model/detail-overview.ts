import { mealSlotFor, type MapView } from "./trip-model";
import {
  validDetailLocation,
  type DetailDraftItem,
  type DetailRailItem,
} from "./detail-workspace";

export type OverviewTone = "normal" | "warning" | "error" | "unknown";
export type OverviewEntry = {
  id: string;
  time: string;
  title: string;
  tone: OverviewTone;
  item?: DetailRailItem;
  missing?: "restaurant" | "hotel";
  slot?: "breakfast" | "lunch" | "dinner";
};
export function overviewEntries(
  items: DetailRailItem[],
  day: number,
  totalDays: number,
): OverviewEntry[] {
  const entries: OverviewEntry[] = items.map((item) => ({
    id: item.id,
    time: item.startTime,
    title:
      item.type === "restaurant"
        ? `${{ breakfast: "早餐", lunch: "午餐", dinner: "晚餐" }[mealSlotFor(item.startTime, item.planningSlot)]} · ${item.title}`
        : item.type === "hotel"
          ? `住宿 · ${item.title}`
          : item.title,
    tone:
      item.aiStatus === "error"
        ? "error"
        : item.reservation === "unknown"
          ? "unknown"
          : item.aiStatus,
    item,
  }));
  for (const [slot, time, label] of [
    ["breakfast", "07:00", "早餐"],
    ["lunch", "12:00", "午餐"],
    ["dinner", "18:00", "晚餐"],
  ] as const) {
    if (
      !items.some(
        (i) =>
          i.type === "restaurant" &&
          mealSlotFor(i.startTime, i.planningSlot) === slot,
      )
    )
      entries.push({
        id: `missing-${day}-${slot}`,
        time,
        title: `${label} · 尚未安排`,
        tone: "unknown",
        missing: "restaurant",
        slot,
      });
  }
  if (day < totalDays && !items.some((i) => i.type === "hotel"))
    entries.push({
      id: `missing-${day}-hotel`,
      time: "20:00",
      title: "住宿 · 尚未安排",
      tone: "unknown",
      missing: "hotel",
    });
  return entries.sort((a, b) => a.time.localeCompare(b.time));
}
export function overviewTone(entries: OverviewEntry[]): OverviewTone {
  return (
    (["error", "warning", "unknown"] as const).find((tone) =>
      entries.some((entry) => entry.tone === tone),
    ) ?? "normal"
  );
}

// Draft pins participate in the existing map lifecycle, never in invented route geometry.
export function withDraftMapPlaces(
  view: MapView,
  items: DetailDraftItem[],
  selectedId: string | null,
): MapView {
  const mapped = items.filter((item) => validDetailLocation(item.location));
  const selected = mapped.find((item) => item.id === selectedId);
  return {
    ...view,
    key: `${view.key}:draft:${mapped.map((i) => `${i.id}:${i.location!.coordinates.join(",")}`).join("|")}`,
    places: [
      ...view.places,
      ...mapped.map((item) => ({
        id: item.id,
        tripItemId: item.id,
        type:
          item.type === "parking" ||
          item.type === "task" ||
          item.type === "custom"
            ? ("activity" as const)
            : item.type,
        name: item.title,
        coordinates: item.location!.coordinates,
        day: item.day,
        tripStatus: "selected" as const,
        label: `${item.title} · ${item.location!.source === "manual" ? "手动位置" : "目录匹配"}`,
        color: "#e95b4b",
        focused: item.id === selectedId,
      })),
    ],
    focus: selected?.location?.coordinates ?? view.focus,
    selectedTripItemId: selected?.id ?? view.selectedTripItemId,
  };
}

export function makeConflictTest(
  items: DetailRailItem[],
  day: number,
  id: string,
): DetailDraftItem | null {
  const reference = items.find(
    (item) =>
      item.type !== "hotel" &&
      !item.title.startsWith("[测试]") &&
      item.startTime < item.endTime,
  );
  if (!reference) return null;
  return {
    id,
    day,
    type: "task",
    title: "[测试] 时间重叠检查",
    startTime: reference.startTime,
    endTime: reference.endTime,
    note: `主动添加的本地测试项目，与“${reference.title}”重叠。验证红色提醒后请删除，不代表真实安排。`,
  };
}
