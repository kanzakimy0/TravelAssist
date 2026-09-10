import type {
  CompanionViewModel,
  AgeGroup,
} from "../../companions/companion-view-model";
import type { TripState } from "./trip-model";
import type { DetailDraftState, DetailRailItem } from "./detail-workspace";
import { missingArrangements } from "./required-arrangements";
import { currentPlan, type MealSlot } from "./trip-model";

export type TravelMember = {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  temporary: boolean;
};
export type Flight = {
  id: string;
  direction: "outbound" | "return" | "connection";
  from: string;
  to: string;
  departure: string;
  arrival: string;
  departureZone: string;
  arrivalZone: string;
  number: string;
  note: string;
  status: "recorded" | "queued" | "confirmed";
};
export type Preparation = {
  members: TravelMember[];
  flights: Flight[];
  noFlight: boolean;
  completed?: { at: string; fingerprint: string; acknowledged: boolean };
};
export const emptyPreparation = (): Preparation => ({
  members: [],
  flights: [],
  noFlight: false,
});
export const preparationFor = (draft: DetailDraftState, id: string) =>
  draft.preparations?.[id] ?? emptyPreparation();
export const memberSnapshot = (c: CompanionViewModel): TravelMember => ({
  id: c.id,
  name: c.displayName,
  ageGroup: c.ageGroup,
  temporary: false,
});
export function mergeMembers(current: TravelMember[], next: TravelMember[]) {
  return [...new Map([...current, ...next].map((m) => [m.id, m])).values()];
}
export function memberMismatch(state: TripState, members: TravelMember[]) {
  const t = state.configuration.travelers;
  const expected = {
    adult: t.adultMale + t.adultFemale,
    senior: t.seniors,
    child: t.child,
    infant: t.infant,
  };
  const names = {
    adult: "成人",
    senior: "老人",
    child: "儿童",
    infant: "婴幼儿",
  };
  return (Object.keys(expected) as AgeGroup[])
    .filter(
      (k) => members.filter((m) => m.ageGroup === k).length !== expected[k],
    )
    .map(
      (k) =>
        `${names[k]}：计划 ${expected[k]} / 已选 ${members.filter((m) => m.ageGroup === k).length}`,
    );
}
const str = (x: unknown): x is string =>
  typeof x === "string" && x.length <= 1000;
export function flightInstant(local: string, zone: string) {
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local) ||
    !/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(zone)
  )
    return NaN;
  const date = local.slice(0, 10);
  if (
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    return NaN;
  return Date.parse(local + zone);
}
export function flightError(f: Flight): string {
  if (!f.from.trim() || !f.to.trim()) return "请填写出发与到达机场。";
  if (f.from.trim() === f.to.trim()) return "出发与到达机场不能相同。";
  const a = flightInstant(f.departure, f.departureZone),
    b = flightInstant(f.arrival, f.arrivalZone);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a)
    return "请核对当地日期、时间及时区；到达必须晚于出发。";
  if (b - a > 72 * 3600000) return "单航段超过72小时，请核对或拆分航段。";
  return "";
}
export function validPreparations(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    Object.entries(value).length <= 20 &&
    Object.entries(value).every(([key, p]) => {
      if (!str(key) || !p || typeof p !== "object") return false;
      const x = p as Preparation;
      return (
        typeof x.noFlight === "boolean" &&
        Array.isArray(x.members) &&
        x.members.length <= 100 &&
        new Set(x.members.map((m) => m?.id)).size === x.members.length &&
        x.members.every(
          (m) =>
            m &&
            str(m.id) &&
            str(m.name) &&
            ["adult", "senior", "child", "infant"].includes(m.ageGroup) &&
            typeof m.temporary === "boolean",
        ) &&
        Array.isArray(x.flights) &&
        x.flights.length <= 20 &&
        !(x.noFlight && x.flights.length) &&
        new Set(x.flights.map((f) => f?.id)).size === x.flights.length &&
        x.flights.every(
          (f) =>
            f &&
            [
              "id",
              "from",
              "to",
              "departure",
              "arrival",
              "departureZone",
              "arrivalZone",
              "number",
              "note",
            ].every((k) => str(f[k as keyof Flight])) &&
            ["outbound", "return", "connection"].includes(f.direction) &&
            ["recorded", "queued", "confirmed"].includes(f.status) &&
            !flightError(f),
        ) &&
        (x.completed === undefined ||
          (x.completed &&
            str(x.completed.at) &&
            Number.isFinite(Date.parse(x.completed.at)) &&
            typeof x.completed.fingerprint === "string" &&
            x.completed.fingerprint.length <= 1000000 &&
            typeof x.completed.acknowledged === "boolean"))
      );
    })
  );
}
export function preparationFingerprint(
  state: TripState,
  draft: DetailDraftState,
  p: Preparation,
) {
  // Excludes camera/UI and completion receipt. Any saved trip input change requires rechecking.
  return JSON.stringify({
    plan: state.plans.find((x) => x.id === state.ui.currentPlanId),
    settings: state.settings,
    configuration: state.configuration,
    draftItems: draft.items,
    members: p.members,
    flights: p.flights,
    noFlight: p.noFlight,
  });
}
export type PreparationIssue = {
  id: string;
  title: string;
  reason: string;
  tone: "error" | "warning" | "booking" | "missing";
  flightId?: string;
  itemId?: string;
  arrangement?: { day: number; kind: "hotel" | "restaurant"; slot?: MealSlot };
};
export function preparationIssues(
  state: TripState,
  items: DetailRailItem[],
  p: Preparation,
): PreparationIssue[] {
  const issues: PreparationIssue[] = [];
  for (const { day } of currentPlan(state).days) {
    for (const { kind, slot, label } of missingArrangements(
      state,
      day,
      items,
    )) {
      issues.push({
        id: `missing-${currentPlan(state).id}-${day}-${slot ?? kind}`,
        title: `第${day}天 · ${label}`,
        reason: "尚未安排，请选择地点或补充安排。",
        tone: "missing",
        arrangement: { day, kind, slot },
      });
    }
  }
  for (const i of items) {
    if (i.aiStatus !== "normal")
      issues.push({
        id: i.id,
        title: i.title,
        reason: i.aiReason,
        tone: i.aiStatus,
        itemId: i.id,
      });
    if (i.reservation === "unknown")
      issues.push({
        id: i.id,
        title: i.title,
        reason: "预约尚未确认",
        tone: "booking",
        itemId: i.id,
      });
    if ((!i.placeId && !i.location) || /待选地点|尚未安排/.test(i.title))
      issues.push({
        id: i.id,
        title: i.title,
        reason: "地点或安排待补齐",
        tone: "missing",
        itemId: i.id,
      });
  }
  if (!p.noFlight && !p.flights.length)
    issues.push({
      id: "flight-missing",
      title: "航班安排",
      reason: "录入航班，或明确选择不乘飞机。",
      tone: "missing",
    });
  for (const f of p.flights) {
    if (f.status !== "confirmed")
      issues.push({
        id: f.id,
        title: `${f.from} → ${f.to}`,
        reason:
          f.status === "queued"
            ? "购票需求已加入，尚未出票"
            : "已录入，预约状态待确认",
        tone: "booking",
        flightId: f.id,
      });
    const date =
      f.direction === "outbound"
        ? f.arrival.slice(0, 10)
        : f.departure.slice(0, 10);
    if (
      date < state.settings.startDate ||
      date > state.configuration.returnDate
    )
      issues.push({
        id: f.id,
        title: "航班日期",
        reason: "航班与行程日期不一致，请核对首末日及机场接驳。",
        tone: "warning",
        flightId: f.id,
      });
    const a = flightInstant(f.departure, f.departureZone),
      b = flightInstant(f.arrival, f.arrivalZone);
    for (const i of items) {
      const d = new Date(
        Date.parse(state.settings.startDate) + (i.day - 1) * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      const start = Date.parse(`${d}T${i.startTime}+09:00`),
        end = Date.parse(`${d}T${i.endTime}+09:00`);
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start < b &&
        end > a
      )
        issues.push({
          id: i.id,
          title: i.title,
          reason: `与航班 ${f.from} → ${f.to} 时间重叠（日本行程按UTC+09:00）。`,
          tone: "error",
          itemId: i.id,
        });
    }
  }
  const priority = { error: 0, missing: 1, booking: 2, warning: 3 };
  return issues.sort((a, b) => priority[a.tone] - priority[b.tone]);
}
