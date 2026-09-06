import {
  currentPlan,
  itemsForDay,
  minutes,
  rangeDays,
  visibleAreas,
  type TripConfiguration,
  type TripItem,
  type TripState,
} from "./trip-model";

export const settingsCategories = [
  { title: "预算与节奏", groups: [] },
  { title: "移动与体力", groups: ["movement"] },
  { title: "每日时间", groups: ["timing"] },
  { title: "人流与天气", groups: ["queues", "weather"] },
  { title: "摄影与体验", groups: ["photography"] },
  { title: "行李与无障碍", groups: ["luggage", "needs"] },
  { title: "锁定与预约", groups: ["bookings", "constraints"] },
] as const;

function settingsEntries(config: TripConfiguration) {
  return Object.fromEntries([
    ["budget", String(config.budget)],
    ["pace", String(config.pace)],
    ...Object.entries(config.preferences).flatMap(([group, value]) => [
      [group + ".quick", [...value.quick].sort().join("|")],
      ...Object.entries(value.details).map(([key, text]) => [
        group + "." + key,
        text.trim(),
      ]),
    ]),
  ]);
}
export function settingsDirtyCount(
  before: TripConfiguration,
  after: TripConfiguration,
) {
  const a = settingsEntries(before),
    b = settingsEntries(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
    (key) => (a[key] ?? "") !== (b[key] ?? ""),
  ).length;
}
export function pendingSettingsCount(state: TripState) {
  return state.pendingSettingsBaseline
    ? settingsDirtyCount(state.pendingSettingsBaseline, state.configuration)
    : 0;
}
export function isProtectedItem(item: TripItem) {
  return (
    item.fixedTime ||
    item.locked ||
    ["booked", "ticketed"].includes(item.reservationStatus) ||
    item.type === "hotel"
  );
}
export function settingsImpact(state: TripState) {
  const plan = currentPlan(state);
  return {
    changed: pendingSettingsCount(state),
    days: plan.days.map((d) => d.day),
    movable: plan.items.filter((i) => !isProtectedItem(i)),
    protected: plan.items.filter(isProtectedItem),
    estimates:
      "步行 / 换乘 / 费用 / 结束时间：本次 Mock 不计算新值，确认后仅刷新示例预览，正式路线不变。",
  };
}

// A single, derived view model: range / plan / selection always come from TripState.
export function secondaryPanelModel(state: TripState) {
  const plan = currentPlan(state),
    days = rangeDays(state);
  const rows = days.map((day) => {
    const items = itemsForDay(plan, day.day);
    const legs = items.slice(0, -1).map((from, index) => {
      const to = items[index + 1];
      const gap = Math.max(0, minutes(to.startTime) - minutes(from.endTime));
      return {
        id: from.id,
        from,
        to,
        minutes: gap,
        label: from.next ?? "接驳方式待核对",
        warning: gap < 15 ? "固定安排前请核对接驳缓冲" : "时刻与票价待核对",
      };
    });
    return {
      day,
      items,
      legs,
      bookings: items.filter((i) => i.reservationRequired),
      stays: items.filter((i) => i.type === "hotel"),
      meals: items.filter((i) => i.type === "restaurant"),
      outdoors: items.filter(
        (i) =>
          i.type === "attraction" &&
          !state.places
            .find((p) => p.id === i.placeId)
            ?.tags.some((t) => /室内|博物馆/.test(t)),
      ),
      playMinutes: items.reduce(
        (n, i) => n + Math.max(0, minutes(i.endTime) - minutes(i.startTime)),
        0,
      ),
      travelMinutes: legs.reduce((n, i) => n + i.minutes, 0),
    };
  });
  const items = [
    ...new Map(rows.flatMap((row) => row.items).map((i) => [i.id, i])).values(),
  ];
  const bookings = items
    .filter(
      (i) =>
        i.reservationRequired &&
        (state.ui.rangeMode !== "all" ||
          i.type !== "restaurant" ||
          i.fixedTime),
    )
    .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
  const selected = plan.items.find((i) => i.id === state.ui.selectedTripItemId);
  return {
    plan,
    rows,
    items,
    bookings,
    selected,
    areas: visibleAreas(state).filter((a) => days.some((d) => d.day === a.day)),
    protected: items.filter(isProtectedItem),
    travelers: Object.values(state.configuration.travelers).reduce(
      (n, v) => n + v,
      0,
    ),
    completed: bookings.filter((i) =>
      ["booked", "ticketed"].includes(i.reservationStatus),
    ).length,
  };
}
