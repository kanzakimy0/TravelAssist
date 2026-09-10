import type { TripItem, TripPlan, TripState } from "./trip-model";
import {
  plannerCandidates,
  plannerDayItems,
  protectedSight,
  reconcileMovementPlan,
} from "./planner-route";

export const routineSlots = [
  "departure",
  "breakfast",
  "lunch",
  "dinner",
  "return",
] as const;
export type RoutineSlot = (typeof routineSlots)[number];
export const routineLabels: Record<RoutineSlot, string> = {
  departure: "离开酒店",
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  return: "回到酒店",
};
export const timelineMinute = (time: string) =>
  Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]);
export const timelineClock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
// Beyond midnight stays explicitly on this draft day, so Detail can flag it.
// Never wrap silently to an earlier time or displace another day's bookings.
export const validDraftClock = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{2,3}:[0-5]\d$/.test(value) &&
  timelineMinute(value) <= 10079;
export function displayTimelineTime(time: string) {
  const value = timelineMinute(time);
  return value < 1440
    ? time
    : `+${Math.floor(value / 1440)}天 ${timelineClock(value % 1440)}`;
}
export const timelineDuration = (item: TripItem) =>
  Math.max(1, timelineMinute(item.endTime) - timelineMinute(item.startTime));
export const timelineProtected = (item: TripItem) =>
  protectedSight(item) || item.day !== item.endDay;
export function routineSlotFor(item: TripItem): RoutineSlot | undefined {
  if (item.planningSlot) return item.planningSlot;
  if (item.type === "hotel") return "return";
  if (item.type === "restaurant") {
    const hour = timelineMinute(item.startTime) / 60;
    return hour < 11 ? "breakfast" : hour < 16 ? "lunch" : "dinner";
  }
}
export function timelineTitle(item: TripItem) {
  const slot = routineSlotFor(item);
  return slot
    ? `${routineLabels[slot]}${item.planningPlaceholder ? " · 待选地点" : ` · ${item.title}`}`
    : item.title;
}

/** Canonical planned items plus movable held items, unchosen sights and honest
 * routine placeholders. Merely opening Planner does not mutate or save a trip. */
export function plannerTimeline(state: TripState, day: number) {
  const plan =
    state.plans.find((p) => p.id === state.ui.currentPlanId) ?? state.plans[0];
  const planned = plannerDayItems(plan, day);
  const reserve = (plan.reserveItems ?? []).filter((i) => i.day === day);
  const date = new Date(`${state.settings.startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  const dateString = date.toISOString().slice(0, 10);
  const make = (
    id: string,
    placeId: string,
    title: string,
    type: TripItem["type"],
    start: number,
    duration: number,
  ): TripItem => ({
    id,
    placeId,
    title,
    type,
    day,
    endDay: day,
    date: dateString,
    startTime: timelineClock(start),
    endTime: timelineClock(start + duration),
    locked: false,
    fixedTime: false,
    reservationRequired: false,
    reservationStatus: "not_required",
    planningDraft: true,
  });
  const candidates: TripItem[] = plannerCandidates(state, day)
    .filter((c) => !c.held)
    .map(({ place }) => ({
      ...make(
        `${plan.id}-shelf-${place.id}-day${day}`,
        place.id,
        place.name,
        place.type,
        8 * 60,
        place.duration,
      ),
      reservationRequired: place.bookingRequired,
      reservationStatus: place.bookingRequired
        ? ("pending" as const)
        : ("not_required" as const),
    }));
  const city = plan.days.find((d) => d.day === day)?.city;
  const defaults = {
    departure: [8 * 60, 15],
    breakfast: [7 * 60, 45],
    lunch: [12 * 60, 60],
    dinner: [18 * 60, 60],
    return: [21 * 60, 30],
  };
  for (const slot of routineSlots) {
    if ([...planned, ...reserve].some((item) => routineSlotFor(item) === slot))
      continue;
    const hotel = slot === "departure" || slot === "return";
    const place = state.places.find(
      (p) =>
        p.city === city &&
        p.id === `routine-${hotel ? "hotel" : "food"}-${city}`,
    );
    if (!place) continue;
    const [start, duration] = defaults[slot];
    candidates.push({
      ...make(
        `${plan.id}-routine-${day}-${slot}`,
        place.id,
        routineLabels[slot],
        slot === "departure" ? "transport" : hotel ? "hotel" : "restaurant",
        start,
        duration,
      ),
      planningSlot: slot,
      planningPlaceholder: true,
    });
  }
  return { plan, planned, reserve: [...reserve, ...candidates] };
}

export function timelineAxis(items: TripItem[]) {
  const starts = [
    ...new Set(items.map((i) => timelineMinute(i.startTime))),
  ].sort((a, b) => a - b);
  const start = starts[0] ?? 7 * 60;
  const end = Math.max(
    start + (items.length ? 1 : 60),
    ...items.map((i) => timelineMinute(i.endTime)),
  );
  const span = end - start;
  // Time remains proportional; close/overlapping drafts must not create a
  // multi-screen ruler. Their feasibility belongs to Detail, not canvas width.
  const width = Math.min(1440, Math.max(820, items.length * 100 + 116));
  return {
    start,
    end,
    span,
    width,
    ticks: Array.from({ length: 7 }, (_, i) => start + (span * i) / 6),
  };
}

export const timelineSplitMinute = 14 * 60;

export type TimelineDisplayBand = {
  key: "morning" | "afternoon";
  start: number;
  end: number;
  ticks: number[];
};

/** Optional presentation bands for the compact Planner canvas. The canonical
 * item remains one record; a card crossing 14:00 is only split visually. */
export function timelineDisplayBands(items: TripItem[]): TimelineDisplayBand[] {
  const axis = timelineAxis(items);
  const start = Math.min(7 * 60, axis.start);
  const end = Math.max(21 * 60, axis.end);
  const ticks = (from: number, to: number) =>
    Array.from(
      new Set(
        Array.from(
          { length: 5 },
          (_, index) => Math.round((from + ((to - from) * index) / 4) / 5) * 5,
        ),
      ),
    );
  return [
    {
      key: "morning",
      start,
      end: timelineSplitMinute,
      ticks: ticks(start, timelineSplitMinute),
    },
    {
      key: "afternoon",
      start: timelineSplitMinute,
      end,
      ticks: ticks(timelineSplitMinute, end),
    },
  ];
}

export function timelineBandSegments(
  item: TripItem,
  bands: TimelineDisplayBand[],
) {
  const start = timelineMinute(item.startTime);
  const end = timelineMinute(item.endTime);
  return bands.flatMap((band) => {
    const segmentStart = Math.max(start, band.start);
    const segmentEnd = Math.min(end, band.end);
    return segmentEnd > segmentStart
      ? [
          {
            band: band.key,
            start: segmentStart,
            end: segmentEnd,
            primary: segmentStart === start,
          },
        ]
      : [];
  });
}

type Scope = { planId: string; day: number; id: string };
export function initializeHotelEndpoints(
  state: TripState,
  planId: string,
): TripState {
  if (state.ui.currentPlanId !== planId) return state;
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan || plan.hotelEndpointsReady) return state;
  const added: TripItem[] = [];
  for (const day of plan.days) {
    const { planned, reserve } = plannerTimeline(state, day.day);
    for (const slot of ["departure", "return"] as const) {
      if (
        [
          ...planned,
          ...(plan.reserveItems ?? []).filter((i) => i.day === day.day),
        ].some((i) => routineSlotFor(i) === slot)
      )
        continue;
      const template = reserve.find((i) => i.planningSlot === slot);
      if (!template) continue;
      const start =
        slot === "departure"
          ? Math.max(
              0,
              Math.min(
                ...planned.map((i) => timelineMinute(i.startTime)),
                8 * 60,
              ) - 30,
            )
          : Math.max(
              ...planned.map((i) => timelineMinute(i.endTime)),
              20 * 60,
            ) + 15;
      if (!validDraftClock(timelineClock(start + timelineDuration(template))))
        continue;
      added.push({
        ...template,
        startTime: timelineClock(start),
        endTime: timelineClock(start + timelineDuration(template)),
      });
    }
  }
  const updated = reconcileMovementPlan(plan, {
    ...plan,
    items: [...plan.items, ...added],
    hotelEndpointsReady: true,
  });
  return {
    ...state,
    plans: state.plans.map((p) => (p.id === planId ? updated : p)),
    notice: added.length
      ? "已补齐酒店出发 / 返回时间占位，两页同步；地点待选，未保存，可拖回备用。"
      : state.notice,
  };
}
export type TimelineAction =
  | (Scope & {
      type: "timelineDrop";
      to: "planned" | "reserve";
      afterId: string | null;
      startMinute?: number;
    })
  | (Scope & { type: "timelineTime"; startTime: string; duration: number })
  | (Scope & { type: "timelineLock" });

export function applyTimelineAction(
  state: TripState,
  action: TimelineAction,
): TripState {
  if (state.ui.currentPlanId !== action.planId) return state;
  const { plan, planned, reserve } = plannerTimeline(state, action.day);
  if (!plan.days.some((d) => d.day === action.day)) return state;
  const original = planned.find((i) => i.id === action.id);
  const item = original ?? reserve.find((i) => i.id === action.id);
  if (!item) return { ...state, notice: "项目已变化，请重新选择。" };
  const commit = (updated: TripPlan, notice: string) => ({
    ...state,
    plans: state.plans.map((p) =>
      p.id === plan.id ? reconcileMovementPlan(plan, updated) : p,
    ),
    notice,
    ui: { ...state.ui, selectedTripItemId: null, inspection: null },
  });
  const put = (updated: TripItem) =>
    original
      ? {
          ...plan,
          items: plan.items.map((i) => (i.id === item.id ? updated : i)),
        }
      : {
          ...plan,
          reserveItems: [
            ...(plan.reserveItems ?? []).filter((i) => i.id !== item.id),
            updated,
          ],
        };
  if (action.type === "timelineLock") {
    if (
      item.fixedTime ||
      item.day !== item.endDay ||
      ["booking", "booked", "ticketed", "pay_on_site"].includes(
        item.reservationStatus,
      )
    )
      return { ...state, notice: "固定预约或跨日项目仍受保护，请在详情核对。" };
    return commit(
      put({ ...item, locked: !item.locked }),
      item.locked
        ? "已解锁，可拖动或编辑时间。"
        : "已锁定，禁止拖动和时间修改。未保存。",
    );
  }
  if (timelineProtected(item))
    return { ...state, notice: "此项目已锁定或有固定预约，未移动或改时。" };
  if (action.type === "timelineTime") {
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(action.startTime) ||
      !Number.isInteger(action.duration) ||
      action.duration < 1 ||
      action.duration > 720
    )
      return {
        ...state,
        notice: "请填写有效开始时间与 1–720 分钟的持续时间。",
      };
    return commit(
      put({
        ...item,
        startTime: action.startTime,
        endTime: timelineClock(
          timelineMinute(action.startTime) + action.duration,
        ),
        planningDraft: true,
        planningSlot: routineSlotFor(item),
      }),
      "时间草案已更新；冲突与可行性请在详情核对，未保存。",
    );
  }
  if (action.to === "reserve") {
    if (!original) return state;
    return commit(
      {
        ...plan,
        items: plan.items.filter((i) => i.id !== item.id),
        reserveItems: [
          ...(plan.reserveItems ?? []).filter((i) => i.id !== item.id),
          { ...item, planningSlot: routineSlotFor(item) },
        ],
      },
      `${item.title}已移到备用，项目资料保留，未保存。`,
    );
  }
  if (
    action.startMinute !== undefined &&
    (!Number.isInteger(action.startMinute) ||
      action.startMinute < 0 ||
      action.startMinute > 10075 ||
      action.startMinute % 5 !== 0)
  )
    return { ...state, notice: "请选择五分钟刻度内的有效时间。" };
  if (action.afterId === item.id && action.startMinute === undefined)
    return state;
  const others = planned.filter((i) => i.id !== item.id);
  const previous =
    action.afterId === null
      ? undefined
      : others.find((i) => i.id === action.afterId);
  if (action.startMinute === undefined && action.afterId !== null && !previous)
    return { ...state, notice: "插入位置已变化，请重新拖动。" };
  const start =
    action.startMinute ??
    (previous
      ? timelineMinute(previous.endTime) + 15
      : Math.min(7 * 60, timelineMinute(others[0]?.startTime ?? "07:00")));
  const moved = {
    ...item,
    startTime: timelineClock(start),
    endTime: timelineClock(start + timelineDuration(item)),
    planningDraft: true,
    planningSlot: routineSlotFor(item),
    next: undefined,
  };
  if (!validDraftClock(moved.endTime))
    return {
      ...state,
      notice: "草案已超出七天的单轨编辑范围，请在详情拆分日期。",
    };
  return commit(
    {
      ...plan,
      items: [...plan.items.filter((i) => i.id !== item.id), moved].sort(
        (a, b) =>
          a.day - b.day ||
          timelineMinute(a.startTime) - timelineMinute(b.startTime),
      ),
      reserveItems: (plan.reserveItems ?? []).filter((i) => i.id !== item.id),
    },
    `${item.title}已安排为 ${displayTimelineTime(moved.startTime)}；${action.startMinute !== undefined ? "按五分钟刻度放置" : previous ? "前一项结束 +15 分钟" : "放在当天开头"}，保留其他项目，详情再检查，未保存。`,
  );
}

export function snapTimelineMinute(ratio: number, start: number, span: number) {
  return Math.min(
    10075,
    Math.max(
      0,
      Math.round((start + Math.max(0, Math.min(1, ratio)) * span) / 5) * 5,
    ),
  );
}

export function snapTimelineBandMinute(
  ratio: number,
  start: number,
  end: number,
  exclusiveEnd = false,
) {
  const snapped = snapTimelineMinute(ratio, start, end - start);
  return exclusiveEnd ? Math.min(end - 5, snapped) : snapped;
}
export function timelineCollisionGroups(
  items: TripItem[],
  width: number,
  span: number,
) {
  const sorted = [...items].sort(
    (a, b) => timelineMinute(a.startTime) - timelineMinute(b.startTime),
  );
  const groups: TripItem[][] = [];
  for (const item of sorted) {
    const group = groups.at(-1),
      previous = group?.at(-1);
    if (
      previous &&
      ((timelineMinute(item.startTime) - timelineMinute(previous.startTime)) /
        span) *
        (width - 116) <
        116
    )
      group!.push(item);
    else groups.push([item]);
  }
  return groups.filter((group) => group.length > 1);
}
