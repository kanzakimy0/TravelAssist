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
import { plannerMovementLegs } from "./planner-route";
import { routineSlotFor } from "./planner-timeline";
import { validateSchedule, scheduleConflicts } from "./schedule-check";

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
    ["returnDate", config.returnDate],
    ...Object.entries(config.travelers).map(([key, value]) => [
      "travelers." + key,
      String(value),
    ]),
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
    ["booking", "booked", "ticketed", "pay_on_site"].includes(
      item.reservationStatus,
    ) ||
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
    const legs = plannerMovementLegs(plan, day.day).map((leg) => ({
      ...leg,
      warning: leg.riskReason,
    }));
    return {
      day,
      items,
      legs,
      bookings: items.filter((i) => i.reservationRequired),
      stays: items.filter((i) => i.type === "hotel"),
      meals: items.filter((i) => i.type === "restaurant"),
      mealSlots: (["breakfast", "lunch", "dinner"] as const).map((slot) => ({
        slot,
        item: items.find(
          (i) => routineSlotFor(i) === slot && !i.planningPlaceholder,
        ),
      })),
      issues: items.flatMap((item) => {
        const invalid = validateSchedule(item);
        const overlaps = scheduleConflicts(item, items);
        const reason = [
          invalid ||
            (overlaps.length
              ? `与 ${overlaps.map((i) => i.title).join("、")} 重叠`
              : ""),
          item.planningPlaceholder ? "具体地点尚未确定" : "",
        ]
          .filter(Boolean)
          .join("；");
        return reason ? [{ id: item.id, title: item.title, reason }] : [];
      }),
      estimatedTravel: legs.reduce((n, i) => n + (i.duration ?? 0), 0),
      unknownLegs: legs.filter((i) => i.duration === null).length,
      tightLegs: legs.filter((i) => i.risk !== "normal"),
      span: items.length
        ? [
            items[0].startTime,
            items.reduce(
              (end, i) => (minutes(i.endTime) > minutes(end) ? i.endTime : end),
              items[0].endTime,
            ),
          ].join("–")
        : "尚未安排",
      outdoors: items.filter(
        (i) =>
          ["attraction", "activity"].includes(i.type) &&
          !/室内|博物馆|展馆|美术馆|艺廊|玻璃之森/.test(
            i.title +
              " " +
              (state.places.find((p) => p.id === i.placeId)?.tags.join(" ") ??
                ""),
          ),
      ),
      playMinutes: items
        .filter((i) => i.type !== "transport" && i.type !== "hotel")
        .reduce(
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
  const tickets = items.filter(
    (item) =>
      ["attraction", "activity", "transport"].includes(item.type) &&
      item.reservationRequired &&
      !item.planningPlaceholder &&
      !["not_required", "cancelled"].includes(item.reservationStatus),
  );
  return {
    plan,
    rows,
    items,
    bookings,
    tickets,
    scopeTitle:
      state.ui.rangeMode === "day"
        ? `第 ${days[0]?.day} 天 · ${days[0]?.city}`
        : state.ui.rangeMode === "threeDays"
          ? `连续 ${days.length} 日 · D${days[0]?.day}–D${days.at(-1)?.day}`
          : `全程 ${days.length} 日 · ${new Set(days.map((d) => d.city)).size} 城`,
    summary: {
      issues: rows.reduce((n, r) => n + r.issues.length, 0),
      unknownLegs: rows.reduce((n, r) => n + r.unknownLegs, 0),
      switches: days.slice(1).filter((d, i) => d.city !== days[i].city).length,
      pendingTickets: tickets.filter(
        (i) =>
          !["booked", "ticketed", "pay_on_site"].includes(i.reservationStatus),
      ).length,
      confirmedTickets: tickets.filter((i) =>
        ["booked", "ticketed", "pay_on_site"].includes(i.reservationStatus),
      ).length,
    },
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
