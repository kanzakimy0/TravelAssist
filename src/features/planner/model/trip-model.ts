import type {
  MockDay,
  MockPlan,
  MockStop,
  PlannerSettings,
  PlannerUiState,
  RangeMode,
} from "./planner-types";

// TASK-008.1 local interaction model, NOT the final cross-module Trip Contract.
export type Coordinates = [number, number];
export type PlaceType =
  "attraction" | "hotel" | "restaurant" | "transport" | "activity";
export type ReservationStatus =
  | "not_required"
  | "pending"
  | "booking"
  | "booked"
  | "ticketed"
  | "pay_on_site"
  | "failed"
  | "cancelled"
  | "changed";
export type BookingOption = {
  providerId: string;
  name: string;
  bookingMode: "redirect" | "embedded" | "api-book";
  price?: number;
  currency?: string;
  availabilityStatus: "available" | "limited" | "unknown";
  cancellationSummary?: string;
  deeplink?: string;
  lastCheckedAt?: string;
  official: boolean;
  affiliate: boolean;
};
export type PlannerPlace = {
  id: string;
  name: string;
  type: PlaceType;
  coordinates: Coordinates;
  city: string;
  image: string;
  duration: number;
  hours: string;
  why: string;
  advice: string;
  tags: string[];
  price: number;
  bookingRequired: boolean;
  structural?: boolean;
  providerIds: Record<string, string>;
  bookingOptions: BookingOption[];
};
export type PlannerArea = {
  id: string;
  name: string;
  type: "hotelArea" | "foodArea";
  city: string;
  day: number;
  coordinates: Coordinates;
  polygon: Coordinates[];
  recommendationIds: string[];
  reason: string;
  tradeoff: string;
  access: string;
  price: string;
};
export type TripItem = {
  id: string;
  placeId: string;
  day: number;
  endDay: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  type: PlaceType;
  reservationRequired: boolean;
  reservationStatus: ReservationStatus;
  reservationId?: string;
  providerId?: string;
  fixedTime: boolean;
  locked: boolean;
  next?: string;
};
export type TripDay = Omit<
  MockDay,
  "stops" | "booking" | "stayFood" | "details"
> & { city: string; coordinates: Coordinates };
export type TripPlan = {
  id: string;
  name: string;
  summary: string;
  days: TripDay[];
  items: TripItem[];
};
export type TripUi = Omit<PlannerUiState, "selectedStopId"> & {
  selectedTripItemId: string | null;
  focusedDay: number;
  focusRevision: number;
  inspection: { id: string; level: "quick" | "detail" | "area" } | null;
  bookingOpen: boolean;
};
export type TripState = {
  plans: TripPlan[];
  places: PlannerPlace[];
  areas: PlannerArea[];
  ui: TripUi;
  settings: PlannerSettings;
  configuration: TripConfiguration;
  notice: string;
};
export type PreferenceGroup =
  | "sights"
  | "food"
  | "stay"
  | "movement"
  | "timing"
  | "queues"
  | "photography"
  | "bookings"
  | "weather"
  | "luggage"
  | "needs"
  | "constraints";
export type TripConfiguration = {
  travelers: {
    adultMale: number;
    adultFemale: number;
    child: number;
    infant: number;
  };
  returnDate: string;
  preferences: Partial<
    Record<
      PreferenceGroup,
      { quick: string[]; details: Record<string, string> }
    >
  >;
  budget: number;
  pace: number;
  alternatives: string[];
};
export type TripAction =
  | {
      type: "travelers";
      key: keyof TripConfiguration["travelers"];
      value: number;
    }
  | { type: "dates"; departure: string; returning: string }
  | {
      type: "preference";
      group: PreferenceGroup;
      quick?: string[];
      detail?: { key: string; value: string };
    }
  | { type: "level"; key: "budget" | "pace"; value: number }
  | { type: "alternative"; id: string }
  | { type: "range"; mode: RangeMode; start?: number; totalDays?: number }
  | { type: "plan"; id: string }
  | { type: "focusDay"; day: number }
  | { type: "select"; id: string }
  | {
      type: "inspect";
      id: string;
      level?: "quick" | "detail" | "area";
      day?: number;
    }
  | { type: "ui"; patch: Partial<TripUi> }
  | { type: "setting"; key: keyof PlannerSettings; value: string }
  | {
      type: "add";
      placeId: string;
      day: number;
      reservation: boolean;
      nights?: number;
      replaceId?: string;
    }
  | { type: "remove"; id: string }
  | { type: "lock"; id: string }
  | { type: "provider"; id: string; providerId: string }
  | { type: "complete"; id: string; time: string }
  | { type: "replan" };

export const cityFixtures: { name: string; coordinates: Coordinates }[] = [
  { name: "东京", coordinates: [139.767, 35.681] },
  { name: "河口湖", coordinates: [138.764, 35.508] },
  { name: "箱根", coordinates: [139.047, 35.233] },
];
export function isoDay(startDate: string, day: number) {
  const date = new Date(`${startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date.toISOString().slice(0, 10);
}
export function minutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function timeAfter(time: string, duration: number) {
  const value = Math.min(1439, minutes(time) + duration);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function kindFor(type: PlaceType): MockStop["kind"] {
  return (
    {
      attraction: "sight",
      activity: "booking",
      hotel: "stay",
      restaurant: "food",
      transport: "transport",
    } as const
  )[type];
}
export function currentPlan(state: TripState) {
  return (
    state.plans.find((plan) => plan.id === state.ui.currentPlanId) ??
    state.plans[0]
  );
}
export function itemsForDay(plan: TripPlan, day: number) {
  return plan.items
    .filter((item) => item.day <= day && item.endDay >= day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function rangeDays(state: TripState) {
  const { rangeMode, selectedDay, threeDayStart } = state.ui;
  return currentPlan(state).days.filter(
    ({ day }) =>
      rangeMode === "all" ||
      (rangeMode === "day"
        ? day === selectedDay
        : day >= threeDayStart && day < threeDayStart + 3),
  );
}
export function pendingItems(plan: TripPlan) {
  return plan.items
    .filter(
      (item) =>
        item.reservationRequired &&
        ["pending", "booking", "changed", "failed"].includes(
          item.reservationStatus,
        ),
    )
    .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
}
export function cityStays(state: TripState, city: string) {
  return currentPlan(state).items.filter(
    (item) =>
      item.type === "hotel" &&
      state.places.find((place) => place.id === item.placeId)?.city === city,
  );
}
export function stayNights(items: TripItem[]) {
  return new Set(
    items.flatMap((item) =>
      Array.from(
        { length: item.endDay - item.day + 1 },
        (_, i) => item.day + i,
      ),
    ),
  ).size;
}
export function reservationLabel(
  item: Pick<TripItem, "type" | "reservationStatus">,
) {
  const ticket =
    item.type === "attraction" ||
    item.type === "activity" ||
    item.type === "transport";
  const labels: Record<ReservationStatus, string> = {
    not_required: "无需预约",
    pending: ticket ? "待购票" : "待预约",
    booking: "已选渠道 · 待确认",
    booked: "已预约",
    ticketed: "已购票",
    pay_on_site: "现场支付",
    failed: "需重试",
    cancelled: "已取消",
    changed: "待重新确认",
  };
  return labels[item.reservationStatus];
}
export function makeTripState(
  plans: MockPlan[],
  places: PlannerPlace[],
  areas: PlannerArea[],
  settings: PlannerSettings,
): TripState {
  return {
    places,
    areas,
    settings: { ...settings },
    configuration: {
      travelers: { adultMale: 1, adultFemale: 1, child: 0, infant: 0 },
      returnDate: isoDay(settings.startDate, plans[0].days.length),
      preferences: {
        sights: { quick: ["自然风光", "经典地标"], details: {} },
        food: { quick: ["当地料理", "日料"], details: {} },
        stay: { quick: ["舒适型", "靠近车站"], details: {} },
      },
      budget: 1,
      pace: 2,
      alternatives: [],
    },
    notice: "本地示例 · 路线、价格、天气及预约均为 Mock",
    ui: {
      currentPlanId: plans[0].id,
      rangeMode: "day",
      selectedDay: 1,
      threeDayStart: 1,
      selectedTripItemId: null,
      focusedDay: 1,
      focusRevision: 0,
      activeBottomTab: "itinerary",
      isLayerToolbarCollapsed: false,
      isMoreSettingsOpen: false,
      isRightPanelOverlayOpen: false,
      isBottomPanelOverlayOpen: false,
      inspection: null,
      bookingOpen: false,
    },
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      summary: plan.summary,
      days: plan.days.map(({ day, date, title, color, movement, weather }) => ({
        day,
        date,
        title,
        color,
        movement,
        weather,
        city: cityFixtures[(day - 1) % 3].name,
        coordinates: cityFixtures[(day - 1) % 3].coordinates,
      })),
      items: plan.days.flatMap((day) =>
        day.stops.map((stop) => {
          const place = places.find((p) => p.name === stop.name)!;
          return {
            id: stop.id,
            placeId: place.id,
            day: day.day,
            endDay: day.day,
            date: isoDay(settings.startDate, day.day),
            startTime: stop.time,
            endTime: timeAfter(stop.time, place.duration),
            title: place.name,
            type: place.type,
            reservationRequired: Boolean(stop.fixed),
            reservationStatus: stop.fixed
              ? stop.id === "classic-skytree"
                ? "ticketed"
                : "pending"
              : "not_required",
            fixedTime: Boolean(stop.fixed),
            locked: Boolean(stop.fixed),
            next: stop.next,
          } satisfies TripItem;
        }),
      ),
    })),
  };
}
export function presentationPlan(
  state: TripState,
  plan = currentPlan(state),
): MockPlan {
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      date:
        isoDay(state.settings.startDate, day.day).slice(5).replace("-", "月") +
        "日",
      stops: itemsForDay(plan, day.day).map((item) => {
        const place = state.places.find((p) => p.id === item.placeId)!;
        return {
          id: item.id,
          name: item.title,
          time: item.startTime,
          kind: kindFor(item.type),
          duration: `${minutes(item.endTime) - minutes(item.startTime)} 分 · ${reservationLabel(item)}`,
          fixed: item.fixedTime,
          next: item.next,
          x: (place.coordinates[0] - 138.4) * 500,
          y: (36 - place.coordinates[1]) * 600,
        };
      }),
      booking: itemsForDay(plan, day.day)
        .filter((item) => item.reservationRequired)
        .map(
          (item) =>
            `${item.startTime} ${item.title} · ${reservationLabel(item)}`,
        ),
      stayFood: [],
      details: [],
    })),
  };
}
function updatePlan(
  state: TripState,
  items: TripItem[],
  notice: string,
  ui: Partial<TripUi> = {},
): TripState {
  return {
    ...state,
    notice,
    ui: { ...state.ui, ...ui },
    plans: state.plans.map((plan) =>
      plan.id === state.ui.currentPlanId ? { ...plan, items } : plan,
    ),
  };
}
export function timeConflicts(plan: TripPlan, item: TripItem, time: string) {
  const duration = minutes(item.endTime) - minutes(item.startTime);
  const start = minutes(time),
    end = start + duration;
  return itemsForDay(plan, item.day)
    .filter(
      (other) =>
        other.id !== item.id &&
        other.type !== "hotel" &&
        minutes(other.startTime) < end + 15 &&
        minutes(other.endTime) + 15 > start,
    )
    .map((other) => other.title);
}
// An interval edit is atomic across plans. Never silently discard even an unlocked item.
export function changeTripDates(
  state: TripState,
  departure: string,
  returning: string,
): TripState {
  const valid = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  const fail = (notice: string) => ({ ...state, notice });
  if (!valid(departure) || !valid(returning))
    return fail("请输入有效的出发与返回日期。");
  const count =
    Math.round((Date.parse(returning) - Date.parse(departure)) / 86400000) + 1;
  if (count < 1 || count > 60)
    return fail("本地示例支持 1–60 天，返回日期不能早于出发日期。");
  if (
    departure !== state.settings.startDate &&
    state.plans.some((p) =>
      p.items.some(
        (i) =>
          i.fixedTime ||
          i.locked ||
          ["booked", "ticketed"].includes(i.reservationStatus),
      ),
    )
  )
    return fail("已有固定或已确认预约，改期需先核对；原日期与全部安排已保留。");
  const outside = state.plans
    .flatMap((p) => p.items)
    .find((i) => i.endDay > count || (i.type === "hotel" && i.endDay >= count));
  if (outside)
    return fail(
      `${outside.title} 的 Day / 酒店退房超出新日期范围；请先核对或调整安排，未删除任何数据。`,
    );
  const plans = state.plans.map((p) => ({
    ...p,
    days: Array.from({ length: count }, (_, index) => {
      const day = index + 1,
        existing = p.days[index],
        last = p.days.at(-1)!;
      return existing
        ? { ...existing, date: isoDay(departure, day) }
        : {
            ...last,
            day,
            date: isoDay(departure, day),
            title: "自由安排（未生成路线）",
            movement: [],
            weather: ["天气未查询"],
          };
    }),
    items: p.items.map((i) => ({ ...i, date: isoDay(departure, i.day) })),
  }));
  return {
    ...state,
    plans,
    settings: { ...state.settings, startDate: departure },
    configuration: { ...state.configuration, returnDate: returning },
    ui: {
      ...state.ui,
      selectedDay: Math.min(count, state.ui.selectedDay),
      focusedDay: Math.min(count, state.ui.focusedDay),
      threeDayStart: Math.min(Math.max(1, count - 2), state.ui.threeDayStart),
      rangeMode:
        count < 3 && state.ui.rangeMode === "threeDays"
          ? "day"
          : state.ui.rangeMode,
      inspection: null,
    },
    notice: `已同步 ${count} 天 ${count - 1} 晚；新增日期留空，未自动生成路线。`,
  };
}
export function confirmedStay(plan: TripPlan, night: number) {
  return plan.items.find(
    (i) =>
      i.type === "hotel" &&
      i.day <= night &&
      i.endDay >= night &&
      i.reservationStatus === "booked",
  );
}
export function visibleAreas(state: TripState) {
  const plan = currentPlan(state);
  return state.areas.filter(
    (a) =>
      a.day <= plan.days.length &&
      (a.type !== "hotelArea" ||
        (a.day < plan.days.length && !confirmedStay(plan, a.day))),
  );
}
export type MapObjectType =
  | "itinerary-point"
  | "recommended-poi"
  | "recommended-dining-area"
  | "recommended-stay-area"
  | "confirmed-stay-point"
  | "confirmed-restaurant-point"
  | "transport-node";
export function mapObjectType(state: TripState, id: string): MapObjectType {
  const area = state.areas.find((a) => a.id === id);
  if (area)
    return area.type === "hotelArea"
      ? "recommended-stay-area"
      : "recommended-dining-area";
  const item = currentPlan(state).items.find((i) => i.placeId === id);
  const place = state.places.find((p) => p.id === id);
  if (place?.type === "transport") return "transport-node";
  if (item?.reservationStatus === "booked" && item.type === "hotel")
    return "confirmed-stay-point";
  if (item?.reservationStatus === "booked" && item.type === "restaurant")
    return "confirmed-restaurant-point";
  return item ? "itinerary-point" : "recommended-poi";
}
export type TimeSegment = {
  id: string;
  itemId: string;
  kind: PlaceType | "movement";
  title: string;
  start: number;
  end: number;
  risk: boolean;
};
export function dayTimeBand(plan: TripPlan, day: number) {
  const items = itemsForDay(plan, day);
  const segments: TimeSegment[] = [];
  let walking = 0;
  items.forEach((item, index) => {
    const start = minutes(item.startTime),
      end = minutes(item.endTime);
    if (end <= start) return;
    const next = items[index + 1];
    const match = item.next?.match(/(?:(\d+)\s*小时\s*)?(\d+)?\s*分/);
    const travel = match
      ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)
      : 0;
    const risk = Boolean(next && end + travel > minutes(next.startTime));
    segments.push({
      id: item.id,
      itemId: item.id,
      kind: item.type,
      title: item.title,
      start,
      end,
      risk,
    });
    if (next && travel > 0) {
      // Keep the supplied duration, including conflicts; never compress to fit the next booking.
      segments.push({
        id: `${item.id}-movement`,
        itemId: item.id,
        kind: "movement",
        title: item.next!,
        start: end,
        end: end + travel,
        risk,
      });
      if (item.next?.includes("步行")) walking += travel;
    }
  });
  const start = segments.length ? Math.min(...segments.map((s) => s.start)) : 0;
  const end = segments.length ? Math.max(...segments.map((s) => s.end)) : 0;
  const movement = segments
    .filter((s) => s.kind === "movement" || s.kind === "transport")
    .reduce((sum, s) => sum + s.end - s.start, 0);
  const activity = segments
    .filter((s) => s.kind !== "movement" && s.kind !== "transport")
    .reduce((sum, s) => sum + s.end - s.start, 0);
  return {
    day,
    start,
    end,
    segments,
    movement,
    activity,
    walking,
    bookings: items.filter((i) =>
      ["booked", "ticketed"].includes(i.reservationStatus),
    ).length,
    intensity:
      segments.some((s) => s.risk) || activity + movement > 600
        ? "较紧"
        : "适中",
    suggestion: segments.some((s) => s.risk)
      ? "本地规则：核对重叠时段，保留固定预约。"
      : "本地规则：保留空档作为休息与弹性缓冲。",
  };
}
export function timeBandPosition(
  start: number,
  end: number,
  axisStart: number,
  axisEnd: number,
) {
  const span = Math.max(1, axisEnd - axisStart);
  return {
    left: `${(100 * (start - axisStart)) / span}%`,
    width: `${(100 * (end - start)) / span}%`,
  };
}
export function tripReducer(state: TripState, action: TripAction): TripState {
  const plan = currentPlan(state);
  if (action.type === "travelers") {
    if (
      !Number.isInteger(action.value) ||
      action.value < 0 ||
      action.value > 20
    )
      return state;
    const travelers = {
      ...state.configuration.travelers,
      [action.key]: action.value,
    };
    if (Object.values(travelers).every((n) => n === 0))
      return { ...state, notice: "至少保留一位同行人。" };
    const labels = {
      adultMale: "成人男性",
      adultFemale: "成人女性",
      child: "儿童",
      infant: "婴儿",
    };
    return {
      ...state,
      configuration: { ...state.configuration, travelers },
      settings: {
        ...state.settings,
        travelers: Object.entries(travelers)
          .filter(([, n]) => n)
          .map(([key, n]) => `${labels[key as keyof typeof labels]} ${n}`)
          .join(" · "),
      },
    };
  }
  if (action.type === "preference") {
    const previous = state.configuration.preferences[action.group] ?? {
      quick: [],
      details: {},
    };
    const next = {
      quick: action.quick ?? previous.quick,
      details: action.detail
        ? {
            ...previous.details,
            [action.detail.key]: action.detail.value.slice(0, 160),
          }
        : previous.details,
    };
    return {
      ...state,
      configuration: {
        ...state.configuration,
        preferences: {
          ...state.configuration.preferences,
          [action.group]: next,
        },
      },
      settings: {
        ...state.settings,
        [action.group]: next.quick.join(" · ") || "未限定",
      },
    };
  }
  if (action.type === "level") {
    const labels =
      action.key === "budget"
        ? ["节省", "中等", "宽松", "高预算"]
        : ["很轻松", "轻松", "适中", "紧凑", "很紧凑"];
    if (!Number.isInteger(action.value) || !labels[action.value]) return state;
    return {
      ...state,
      configuration: { ...state.configuration, [action.key]: action.value },
      settings: { ...state.settings, [action.key]: labels[action.value] },
    };
  }
  if (action.type === "alternative") {
    if (!state.places.some((p) => p.id === action.id)) return state;
    const ids = state.configuration.alternatives;
    return {
      ...state,
      configuration: {
        ...state.configuration,
        alternatives: ids.includes(action.id)
          ? ids.filter((id) => id !== action.id)
          : [...ids, action.id],
      },
      notice: "已更新本次旅行备选；未改变正式路线。",
    };
  }
  if (action.type === "dates")
    return changeTripDates(state, action.departure, action.returning);
  if (action.type === "ui")
    return { ...state, ui: { ...state.ui, ...action.patch } };
  if (action.type === "setting") {
    if (action.key === "startDate") {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(action.value) ||
        !Number.isFinite(Date.parse(action.value))
      )
        return state;
      return changeTripDates(
        state,
        action.value,
        isoDay(action.value, plan.days.length),
      );
    }
    return {
      ...state,
      settings: { ...state.settings, [action.key]: action.value },
    };
  }
  if (action.type === "range") {
    if (action.mode === "threeDays" && plan.days.length < 3) return state;
    const start = Math.max(
      1,
      Math.min(
        action.start ?? state.ui.selectedDay,
        plan.days.length - (action.mode === "threeDays" ? 2 : 0),
      ),
    );
    return {
      ...state,
      ui: {
        ...state.ui,
        rangeMode: action.mode,
        selectedDay: action.mode === "day" ? start : state.ui.selectedDay,
        threeDayStart:
          action.mode === "threeDays" ? start : state.ui.threeDayStart,
        focusedDay: start,
        selectedTripItemId: null,
        inspection: null,
      },
    };
  }
  if (action.type === "plan") {
    const next = state.plans.find((p) => p.id === action.id);
    if (!next) return state;
    return {
      ...state,
      notice: "已切换方案；各方案的预约与编辑独立保留。",
      ui: {
        ...state.ui,
        currentPlanId: next.id,
        selectedTripItemId: null,
        inspection: null,
        bookingOpen: false,
        selectedDay: Math.min(state.ui.selectedDay, next.days.length),
        focusedDay: Math.min(state.ui.focusedDay, next.days.length),
        threeDayStart: Math.min(
          state.ui.threeDayStart,
          Math.max(1, next.days.length - 2),
        ),
      },
    };
  }
  if (action.type === "focusDay")
    return {
      ...state,
      ui: {
        ...state.ui,
        focusedDay: action.day,
        focusRevision: state.ui.focusRevision + 1,
        selectedTripItemId: null,
      },
    };
  if (action.type === "select") {
    const item = plan.items.find((i) => i.id === action.id);
    return item
      ? {
          ...state,
          ui: {
            ...state.ui,
            selectedTripItemId: item.id,
            inspection: null,
            focusRevision: state.ui.focusRevision + 1,
            focusedDay: item.day,
            activeBottomTab: "itinerary",
          },
        }
      : state;
  }
  if (action.type === "inspect") {
    const item = plan.items.find((i) => i.placeId === action.id);
    return {
      ...state,
      ui: {
        ...state.ui,
        inspection: { id: action.id, level: action.level ?? "quick" },
        focusRevision: state.ui.focusRevision + 1,
        selectedTripItemId: item?.id ?? null,
        focusedDay:
          action.day ??
          item?.day ??
          state.areas.find((a) => a.id === action.id)?.day ??
          state.ui.focusedDay,
        activeBottomTab: item ? "itinerary" : state.ui.activeBottomTab,
      },
    };
  }
  if (action.type === "replan")
    return {
      ...state,
      notice: `示例路线预览已刷新；保留 ${plan.items.filter((i) => i.fixedTime || i.locked).length} 项固定安排与全部预约，未进行真实计算。`,
    };
  if (action.type === "add") {
    const place = state.places.find((p) => p.id === action.placeId);
    if (!place || !plan.days.some((d) => d.day === action.day)) return state;
    if (
      place.type === "hotel" &&
      (!Number.isInteger(action.nights ?? 1) ||
        (action.nights ?? 1) < 1 ||
        action.day + (action.nights ?? 1) > plan.days.length)
    )
      return {
        ...state,
        notice: "酒店退房不能晚于返回日期；请先延长旅行日期或减少晚数。",
      };
    const existing = plan.items.find(
      (item) =>
        item.placeId === place.id &&
        (place.type === "hotel" || item.day === action.day),
    );
    if (existing) {
      const items = plan.items.map((item) =>
        item.id === existing.id &&
        action.reservation &&
        !item.reservationRequired
          ? {
              ...item,
              reservationRequired: true,
              reservationStatus: "pending" as const,
              reservationId: `reservation-${item.id}`,
            }
          : item,
      );
      return updatePlan(state, items, "已同步现有安排，不重复创建预约。", {
        selectedTripItemId: existing.id,
        focusedDay: existing.day,
      });
    }
    const placeholder = action.replaceId
      ? plan.items.find((i) => i.id === action.replaceId)
      : plan.items.find(
          (i) =>
            i.day === action.day &&
            i.type === place.type &&
            (place.type === "hotel" || place.type === "restaurant"),
        );
    if (
      placeholder &&
      (placeholder.locked ||
        placeholder.fixedTime ||
        ["booked", "ticketed"].includes(placeholder.reservationStatus))
    )
      return {
        ...state,
        notice:
          "原安排已锁定或已确认，不能自动替换；请先核对预约并解除可编辑锁定。",
      };
    const time =
      placeholder?.startTime ??
      (place.type === "hotel"
        ? "20:00"
        : place.type === "restaurant"
          ? "18:30"
          : "11:30");
    const id = placeholder?.id ?? `${plan.id}-${place.id}-day${action.day}`;
    const required = action.reservation;
    const item: TripItem = {
      id,
      placeId: place.id,
      day: action.day,
      endDay:
        place.type === "hotel"
          ? Math.min(plan.days.length, action.day + (action.nights ?? 1) - 1)
          : action.day,
      date: isoDay(state.settings.startDate, action.day),
      startTime: time,
      endTime: timeAfter(time, place.duration),
      title: place.name,
      type: place.type,
      reservationRequired: required,
      reservationStatus: required ? "pending" : "not_required",
      reservationId: required ? `reservation-${id}` : undefined,
      fixedTime: false,
      locked: false,
      next: placeholder?.next,
    };
    const overlappingStays = plan.items.filter(
      (i) =>
        place.type === "hotel" &&
        i.type === "hotel" &&
        i.day <= item.endDay &&
        i.endDay >= item.day,
    );
    if (
      overlappingStays.some(
        (i) =>
          i.locked ||
          i.fixedTime ||
          ["booked", "ticketed"].includes(i.reservationStatus),
      )
    )
      return {
        ...state,
        notice: "入住日期与已确认或锁定的住宿重叠，未覆盖原预约。",
      };
    const items = [
      ...plan.items.filter(
        (i) => i.id !== placeholder?.id && !overlappingStays.includes(i),
      ),
      item,
    ];
    return updatePlan(
      state,
      items,
      `${place.name}已加入${required ? "预约清单" : "行程"}；时间为示例，请核对相邻安排。`,
      {
        selectedTripItemId: id,
        focusedDay: action.day,
        activeBottomTab: "itinerary",
      },
    );
  }
  const item = plan.items.find((i) => i.id === action.id);
  if (!item) return state;
  if (action.type === "lock")
    return updatePlan(
      state,
      plan.items.map((i) =>
        i.id === item.id ? { ...i, locked: !i.locked } : i,
      ),
      item.fixedTime
        ? "预约时间仍固定，重新规划会继续保护。"
        : "已更新行程锁定状态。",
    );
  if (action.type === "remove") {
    if (
      item.fixedTime ||
      item.locked ||
      ["booked", "ticketed"].includes(item.reservationStatus)
    )
      return {
        ...state,
        notice: "固定 / 已确认安排不会被移除；真实取消不在此演示范围。",
      };
    return updatePlan(
      state,
      plan.items.filter((i) => i.id !== item.id),
      "已从示例行程移出；未取消任何真实订单。",
      { selectedTripItemId: null },
    );
  }
  if (action.type === "provider") {
    const option = state.places
      .find((p) => p.id === item.placeId)
      ?.bookingOptions.find((o) => o.providerId === action.providerId);
    if (!option || !pendingItems(plan).some((i) => i.id === item.id))
      return state;
    return updatePlan(
      state,
      plan.items.map((i) =>
        i.id === item.id
          ? {
              ...i,
              providerId: option.providerId,
              reservationStatus: "booking",
            }
          : i,
      ),
      "已选择演示渠道。未跳转、未下单；完成后请手动确认。",
    );
  }
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(action.time) ||
    !item.providerId ||
    !pendingItems(plan).some((i) => i.id === item.id)
  )
    return state;
  const conflicts = timeConflicts(plan, item, action.time);
  const changed = {
    ...item,
    startTime: action.time,
    endTime: timeAfter(
      action.time,
      minutes(item.endTime) - minutes(item.startTime),
    ),
    fixedTime: true,
    locked: true,
    reservationStatus: (["attraction", "activity", "transport"].includes(
      item.type,
    )
      ? "ticketed"
      : "booked") as ReservationStatus,
  };
  return updatePlan(
    state,
    plan.items.map((i) => (i.id === item.id ? changed : i)),
    `手动确认：${item.title} ${item.startTime} → ${action.time}，已固定。${conflicts.length ? `注意：与 ${conflicts.join("、")} 的停留或 15 分缓冲冲突，请调整相邻安排。` : "已检查前后停留与 15 分缓冲，无示例冲突；交通时间仍需核对。"}`,
    { selectedTripItemId: item.id, focusedDay: item.day },
  );
}

// Explicit whitelist: renderer cannot see Provider raw data, prices or booking payloads.
export type PlannerMapPlace = {
  id: string;
  tripItemId?: string;
  type: PlaceType | "city";
  name: string;
  coordinates: Coordinates;
  day?: number;
  tripStatus: "recommended" | "selected";
  reservationStatus?: ReservationStatus;
  label: string;
  color: string;
  focused?: boolean;
};
export type MapRoute = {
  id: string;
  coordinates: Coordinates[];
  day?: number;
  label: string;
  color: string;
  context: boolean;
};
export type MapView = {
  key: string;
  range: RangeMode;
  places: PlannerMapPlace[];
  areas: Pick<
    PlannerArea,
    "id" | "name" | "type" | "coordinates" | "polygon"
  >[];
  routes: MapRoute[];
  focus: Coordinates | null;
  selectedTripItemId: string | null;
  focusRevision: number;
};
export function mapView(state: TripState): MapView {
  const plan = currentPlan(state),
    days = rangeDays(state),
    all = state.ui.rangeMode === "all";
  const placeById = new Map(state.places.map((p) => [p.id, p]));
  const routes: MapRoute[] = [],
    places: PlannerMapPlace[] = [];
  const colors = new Map(plan.days.map((day) => [day.day, day.color]));
  const point = (item: TripItem) => placeById.get(item.placeId)!.coordinates;
  if (all) {
    const groups = new Map<string, TripDay[]>();
    for (const day of days)
      groups.set(day.city, [...(groups.get(day.city) ?? []), day]);
    for (const [city, group] of groups) {
      const nights = stayNights(cityStays(state, city));
      places.push({
        id: `city-${city}`,
        type: "city",
        name: city,
        coordinates: group[0].coordinates,
        day: group[0].day,
        tripStatus: "selected",
        label: `${city} · D${group.map((d) => d.day).join("/")} · ${nights}晚`,
        color: group[0].color,
      });
    }
    for (let i = 1; i < days.length; i++)
      if (days[i - 1].city !== days[i].city)
        routes.push({
          id: `intercity-${days[i].day}`,
          coordinates: [days[i - 1].coordinates, days[i].coordinates],
          label: `${days[i - 1].city} → ${days[i].city} · 城际移动（示例）`,
          color: days[i].color,
          context: false,
        });
    for (const item of plan.items.filter(
      (i) => i.type === "transport" && placeById.get(i.placeId)?.structural,
    )) {
      const p = placeById.get(item.placeId)!;
      places.push({
        id: p.id + item.id,
        tripItemId: item.id,
        type: p.type,
        name: p.name,
        coordinates: p.coordinates,
        day: item.day,
        tripStatus: "selected",
        reservationStatus: item.reservationStatus,
        label: `${p.name} · D${item.day}`,
        color: colors.get(item.day)!,
      });
      routes.push({
        id: `gateway-${item.id}`,
        coordinates: [
          p.coordinates,
          plan.days.find((d) => d.day === item.day)!.coordinates,
        ],
        label: "机场接驳（示例）",
        color: colors.get(item.day)!,
        context: false,
      });
    }
  } else {
    for (const day of days) {
      const items = itemsForDay(plan, day.day);
      const departureStay = confirmedStay(plan, day.day - 1);
      if (departureStay && !items.some((i) => i.id === departureStay.id)) {
        const hotel = placeById.get(departureStay.placeId)!;
        places.push({
          id: `${hotel.id}-departure-d${day.day}`,
          tripItemId: departureStay.id,
          type: "hotel",
          name: hotel.name,
          coordinates: hotel.coordinates,
          day: day.day,
          tripStatus: "selected",
          reservationStatus: "booked",
          label: `D${day.day} 出发 · ${hotel.name}`,
          color: day.color,
        });
      }
      if (items.length > 1)
        routes.push({
          id: `day-${day.day}`,
          coordinates: [
            ...(departureStay ? [point(departureStay)] : []),
            ...items.map(point),
          ],
          day: day.day,
          label: `D${day.day} ${day.title}`,
          color: day.color,
          context: false,
        });
      const core =
        state.ui.rangeMode === "day"
          ? items
          : items.filter((i) => i.type !== "restaurant").slice(0, 3);
      const stay = items.find((i) => i.type === "hotel");
      if (state.ui.rangeMode === "threeDays" && stay && !core.includes(stay))
        core.push(stay);
      for (const item of core) {
        const p = placeById.get(item.placeId)!;
        places.push({
          id: `${p.id}-d${day.day}`,
          tripItemId: item.id,
          type: p.type,
          name: p.name,
          coordinates: p.coordinates,
          day: day.day,
          tripStatus: "selected",
          reservationStatus: item.reservationStatus,
          label: `D${day.day}${state.ui.rangeMode === "day" ? `·${items.indexOf(item) + 1}` : ""} ${p.name}`,
          color: day.color,
        });
      }
    }
    // Only the two boundary legs; never whole hidden-day routes or hidden-day pins.
    const first = days[0]?.day,
      last = days.at(-1)?.day;
    for (const [before, after] of [
      [(first ?? 1) - 1, first],
      [last, (last ?? 0) + 1],
    ]) {
      if (!before || !after) continue;
      const a = itemsForDay(plan, before).at(-1),
        b = itemsForDay(plan, after)[0];
      if (a && b)
        routes.unshift({
          id: `context-${before}-${after}`,
          coordinates: [point(a), point(b)],
          label: "相邻日期衔接",
          color: "#77716c",
          context: true,
        });
    }
    if (state.ui.rangeMode === "threeDays")
      for (let i = 1; i < days.length; i++) {
        const a = itemsForDay(plan, days[i - 1].day).at(-1),
          b = itemsForDay(plan, days[i].day)[0];
        if (a && b)
          routes.push({
            id: `cross-${days[i].day}`,
            coordinates: [point(a), point(b)],
            label: `D${days[i - 1].day} → D${days[i].day} · 城际接驳`,
            color: days[i].color,
            context: false,
          });
      }
    if (state.ui.rangeMode === "day")
      for (const p of state.places
        .filter(
          (p) =>
            p.id.startsWith("alternative-") &&
            p.city === days[0].city &&
            !plan.items.some((i) => i.placeId === p.id),
        )
        .slice(0, 3))
        places.push({
          id: p.id,
          type: p.type,
          name: p.name,
          coordinates: p.coordinates,
          day: first,
          tripStatus: "recommended",
          label: `备选 · ${p.name}`,
          color: "#84756e",
        });
  }
  const selected = plan.items.find((i) => i.id === state.ui.selectedTripItemId);
  if (
    selected &&
    !all &&
    days.some((d) => selected.day <= d.day && selected.endDay >= d.day) &&
    !places.some((p) => p.tripItemId === selected.id)
  ) {
    const p = placeById.get(selected.placeId)!;
    places.push({
      id: p.id,
      tripItemId: selected.id,
      type: p.type,
      name: p.name,
      coordinates: p.coordinates,
      day: selected.day,
      tripStatus: "selected",
      reservationStatus: selected.reservationStatus,
      label: `D${selected.day} ${p.name}`,
      color: colors.get(selected.day)!,
    });
  }
  return {
    key: `${plan.id}:${state.ui.rangeMode}:${days.map((d) => d.day).join()}`,
    range: state.ui.rangeMode,
    places: places.map((p) => ({
      ...p,
      focused:
        all &&
        state.ui.focusRevision > 0 &&
        p.type === "city" &&
        p.day === state.ui.focusedDay,
    })),
    routes,
    areas: all
      ? []
      : visibleAreas(state)
          .filter((a) => days.some((d) => d.day === a.day))
          .map(({ id, name, type, coordinates, polygon }) => ({
            id,
            name,
            type,
            coordinates,
            polygon,
          })),
    selectedTripItemId: state.ui.selectedTripItemId,
    focusRevision: state.ui.focusRevision,
    focus: state.ui.inspection
      ? (state.places.find((p) => p.id === state.ui.inspection?.id)
          ?.coordinates ??
        state.areas.find((a) => a.id === state.ui.inspection?.id)
          ?.coordinates ??
        null)
      : selected
        ? point(selected)
        : state.ui.rangeMode !== "day"
          ? (plan.days.find((d) => d.day === state.ui.focusedDay)
              ?.coordinates ?? null)
          : null,
  };
}
