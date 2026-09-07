import type { TripState, TripPlan, TripItem, PlannerPlace } from "./trip-model";

export const transportModes = {
  train: "电车 / 铁路",
  bus: "巴士",
  walk: "步行",
  drive: "自驾",
  taxi: "出租车",
  shinkansen: "新干线",
  ferry: "渡轮",
  flight: "飞机",
  undecided: "待确定",
} as const;
export type MovementEdit = {
  day: number;
  fromId: string;
  toId: string;
  mode: keyof typeof transportModes;
  duration: number;
  buffer: number;
};
export type PlannerRouteAction =
  | { type: "reserveSight"; id: string }
  | { type: "promoteSight"; placeId: string; day: number }
  | { type: "editMovement"; edit: MovementEdit };
const minute = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
const clock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export const movementKey = (day: number, fromId: string, toId: string) =>
  `${day}:${fromId}>${toId}`;
export const isPlannerSight = (item: Pick<TripItem, "type">) =>
  item.type === "attraction" || item.type === "activity";
export const protectedSight = (item: TripItem) =>
  item.locked ||
  item.fixedTime ||
  ["booked", "ticketed", "pay_on_site", "booking"].includes(
    item.reservationStatus,
  );
export function validMovementEdit(value: unknown): value is MovementEdit {
  if (!value || typeof value !== "object") return false;
  const edit = value as MovementEdit;
  return (
    Number.isInteger(edit.day) &&
    edit.day >= 1 &&
    edit.day <= 60 &&
    typeof edit.fromId === "string" &&
    typeof edit.toId === "string" &&
    edit.fromId !== edit.toId &&
    Object.hasOwn(transportModes, edit.mode) &&
    Number.isInteger(edit.duration) &&
    edit.duration >= 0 &&
    edit.duration <= 720 &&
    Number.isInteger(edit.buffer) &&
    edit.buffer >= 0 &&
    edit.buffer <= 180
  );
}
export function plannerDayItems(plan: TripPlan, day: number) {
  return plan.items
    .filter((item) => item.day <= day && item.endDay >= day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
function inferMode(label: string): MovementEdit["mode"] {
  return /新干线/.test(label)
    ? "shinkansen"
    : /步行/.test(label)
      ? "walk"
      : /出租|打车/.test(label)
        ? "taxi"
        : /自驾|驾车|高速/.test(label)
          ? "drive"
          : /巴士|公交|接驳/.test(label)
            ? "bus"
            : /渡轮|船/.test(label)
              ? "ferry"
              : /航班|飞机/.test(label)
                ? "flight"
                : /电车|铁路|地铁/.test(label)
                  ? "train"
                  : "undecided";
}
// Local scheduling checks, not a live traffic forecast or provider validation.
export function movementAssessment({
  gap,
  duration,
  buffer,
  mode,
}: {
  gap: number;
  duration: number | null;
  buffer: number;
  mode: MovementEdit["mode"];
}): {
  risk: "normal" | "warning" | "error";
  riskLabel: string;
  riskReason: string;
} {
  if (gap < 0)
    return {
      risk: "error",
      riskLabel: "× 时间重叠",
      riskReason: `两项安排重叠 ${-gap} 分钟；尚未计入真实交通。`,
    };
  const remaining = duration === null ? null : gap - duration - buffer;
  if (remaining !== null && remaining < 0)
    return {
      risk: "error",
      riskLabel: "× 空档不足",
      riskReason: `本地预计移动与缓冲超出空档 ${-remaining} 分钟，需调整安排。`,
    };
  if (duration === null || mode === "undecided")
    return {
      risk: "warning",
      riskLabel: "! 路线待核对",
      riskReason: "移动方式或耗时尚未确认，不能当作已经可行；未查询路线服务。",
    };
  if (remaining !== null && remaining < 15)
    return {
      risk: "warning",
      riskLabel: "! 余量偏少",
      riskReason: `扣除预计移动与缓冲后仅余 ${remaining} 分钟，少于本地 15 分钟检查线；不代表实际延误。`,
    };
  return {
    risk: "normal",
    riskLabel: `余量 ${remaining} 分`,
    riskReason: "本地时间检查未发现冲突；真实路线、班次与路况仍需核对。",
  };
}
export function plannerMovementLegs(plan: TripPlan, day: number) {
  const items = plannerDayItems(plan, day);
  return items.slice(0, -1).map((from, index) => {
    const to = items[index + 1];
    const key = movementKey(day, from.id, to.id);
    const edit = plan.movementLegs?.[key];
    const match = from.next?.match(/(?:(\d+)\s*小时\s*)?(\d+)?\s*分/);
    const duration =
      edit?.duration ??
      (match ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : null);
    const gap = minute(to.startTime) - minute(from.endTime);
    const buffer = edit?.buffer ?? 0;
    const mode = edit?.mode ?? inferMode(from.next ?? "");
    const assessment = movementAssessment({ gap, duration, buffer, mode });
    return {
      id: from.id,
      day,
      key,
      from,
      to,
      minutes: Math.max(0, gap),
      gap,
      duration,
      buffer,
      edited: Boolean(edit),
      mode,
      label: edit
        ? `${transportModes[edit.mode]} · ${edit.duration} 分 · 缓冲 ${edit.buffer} 分（手动估计）`
        : (from.next ?? "移动方式待核对"),
      ...assessment,
      conflict: assessment.risk === "error",
    };
  });
}
export function plannerCandidates(
  state: TripState,
  day: number,
): { place: PlannerPlace; held?: TripItem }[] {
  const plan = state.plans.find((plan) => plan.id === state.ui.currentPlanId)!;
  const city = plan.days.find((d) => d.day === day)?.city;
  const chosen = new Set(
    plan.items.filter((i) => i.day === day).map((i) => i.placeId),
  );
  return state.places
    .filter(
      (place) =>
        place.city === city && isPlannerSight(place) && !chosen.has(place.id),
    )
    .map((place) => ({
      place,
      held: plan.reserveItems?.find(
        (i) => i.placeId === place.id && i.day === day,
      ),
    }))
    .sort((a, b) => Number(Boolean(b.held)) - Number(Boolean(a.held)));
}
// Any canonical itinerary edit must invalidate only connections whose endpoints
// changed, including same-ID place replacements. Unaffected manual estimates stay.
export function reconcileMovementPlan(
  before: TripPlan,
  after: TripPlan,
): TripPlan {
  const beforeLegs = before.days.flatMap((day) =>
    plannerMovementLegs(before, day.day),
  );
  const afterLegs = after.days.flatMap((day) =>
    plannerMovementLegs(after, day.day),
  );
  const signature = (leg: (typeof beforeLegs)[number]) =>
    JSON.stringify([leg.from.placeId, leg.to.placeId]);
  const oldSignatures = new Map(
    beforeLegs.map((leg) => [leg.key, signature(leg)]),
  );
  const stableKeys = new Set(
    afterLegs
      .filter((leg) => oldSignatures.get(leg.key) === signature(leg))
      .map((leg) => leg.key),
  );
  const changedFrom = new Set(
    [...beforeLegs, ...afterLegs]
      .filter((leg) => !stableKeys.has(leg.key))
      .map((leg) => leg.from.id),
  );
  return {
    ...after,
    items: after.items.map((item) =>
      before.items.some((old) => old.id === item.id) && changedFrom.has(item.id)
        ? { ...item, next: undefined }
        : item,
    ),
    ...(after.movementLegs
      ? {
          movementLegs: Object.fromEntries(
            Object.entries(after.movementLegs).filter(([key]) =>
              stableKeys.has(key),
            ),
          ),
        }
      : {}),
  };
}
function replacePlan(
  state: TripState,
  before: TripPlan,
  plan: TripPlan,
  notice: string,
): TripState {
  const reconciled = reconcileMovementPlan(before, plan);
  return {
    ...state,
    plans: state.plans.map((p) => (p.id === plan.id ? reconciled : p)),
    notice,
    ui: { ...state.ui, selectedTripItemId: null, inspection: null },
  };
}
export function applyPlannerRouteAction(
  state: TripState,
  action: PlannerRouteAction,
): TripState {
  const plan = state.plans.find((p) => p.id === state.ui.currentPlanId)!;
  if (action.type === "editMovement") {
    const edit = action.edit;
    if (!validMovementEdit(edit))
      return { ...state, notice: "交通设置无效，请核对方式、时长和缓冲。" };
    const leg = plannerMovementLegs(plan, edit.day).find(
      (leg) => leg.from.id === edit.fromId && leg.to.id === edit.toId,
    );
    if (!leg)
      return { ...state, notice: "这两个项目已不再相邻，未覆盖新的交通段。" };
    return {
      ...state,
      plans: state.plans.map((p) =>
        p.id === plan.id
          ? {
              ...p,
              movementLegs: { ...p.movementLegs, [leg.key]: { ...edit } },
            }
          : p,
      ),
      notice:
        edit.duration + edit.buffer > leg.gap
          ? "交通预计时长超出空档，已标记冲突；所有项目时间、锁定和预约保持不变。"
          : "已更新交通草案；尚未查询真实路线，也未改动项目时间。",
    };
  }
  if (action.type === "reserveSight") {
    const item = plan.items.find((item) => item.id === action.id);
    if (!item || !isPlannerSight(item)) return state;
    if (protectedSight(item))
      return {
        ...state,
        notice:
          "此景点已锁定或有已确认预约，请在详情核对后再调整，未移动该项目。",
      };
    return replacePlan(
      state,
      plan,
      {
        ...plan,
        items: plan.items.filter((i) => i.id !== item.id),
        reserveItems: [
          ...(plan.reserveItems ?? []).filter((i) => i.id !== item.id),
          item,
        ],
      },
      `${item.title}已移入备用；原项目资料保留，相邻交通待重新核对。`,
    );
  }
  const day = plan.days.find((day) => day.day === action.day);
  const candidate = plannerCandidates(state, action.day).find(
    (i) => i.place.id === action.placeId,
  );
  if (!day || !candidate)
    return { ...state, notice: "该景点已在当日行程中，或不属于当前地区。" };
  const { place, held } = candidate;
  const duration = held
    ? minute(held.endTime) - minute(held.startTime)
    : place.duration;
  const occupied = plannerDayItems(plan, action.day);
  const fits = (start: number, padding: number) =>
    start >= 0 &&
    start + duration <= 22 * 60 &&
    !occupied.some(
      (i) =>
        start < minute(i.endTime) + padding &&
        start + duration + padding > minute(i.startTime),
    );
  let start =
    held && fits(minute(held.startTime), 0) ? minute(held.startTime) : -1;
  if (start < 0)
    for (let time = 8 * 60; time <= 22 * 60 - duration; time += 15)
      if (fits(time, 15)) {
        start = time;
        break;
      }
  if (start < 0)
    return {
      ...state,
      notice:
        "当天没有足够空档，未添加景点；请先移出其他景点或到详情调整时间。",
    };
  const date = new Date(`${state.settings.startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + action.day - 1);
  const item: TripItem = held
    ? {
        ...held,
        next: undefined,
        startTime: clock(start),
        endTime: clock(start + duration),
        date: date.toISOString().slice(0, 10),
      }
    : {
        id: `${plan.id}-shelf-${place.id}-day${action.day}`,
        placeId: place.id,
        title: place.name,
        type: place.type,
        day: action.day,
        endDay: action.day,
        date: date.toISOString().slice(0, 10),
        startTime: clock(start),
        endTime: clock(start + duration),
        reservationRequired: place.bookingRequired,
        reservationStatus: place.bookingRequired ? "pending" : "not_required",
        fixedTime: false,
        locked: false,
      };
  return replacePlan(
    state,
    plan,
    {
      ...plan,
      items: [...plan.items, item].sort(
        (a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime),
      ),
      reserveItems: (plan.reserveItems ?? []).filter((i) => i.id !== held?.id),
    },
    `${place.name}已加入方案 · ${item.startTime}–${item.endTime} 为本地安排，请核对营业与接驳；未下单、未保存。`,
  );
}
