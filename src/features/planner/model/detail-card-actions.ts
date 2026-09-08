import {
  currentPlan,
  minutes,
  tripReducer,
  type TripAction,
  type TripState,
} from "./trip-model";
import {
  detailRailItems,
  type DetailDraftState,
  type DetailRailItem,
} from "./detail-workspace";
import { plannerMovementLegs, protectedSight } from "./planner-route";
import { scheduleConflicts, validateSchedule } from "./schedule-check";

// A dismissal is tied to the observed issue, not a permanent dismissal of the
// project. Changed schedules/booking state must expose fresh reminders again.
export function detailCardKey(
  state: TripState,
  item: DetailRailItem,
  kind: "advice" | "booking",
  items: DetailRailItem[],
) {
  const canonical = currentPlan(state).items.find((i) => i.id === item.id);
  const signature = JSON.stringify(
    kind === "advice"
      ? [
          item.aiStatus,
          item.aiReason,
          items.map((i) => [i.id, i.startTime, i.endTime]),
        ]
      : [canonical?.reservationStatus, canonical?.reservationId],
  );
  let hash = 2166136261;
  for (const char of signature)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${currentPlan(state).id}:${item.id}:${kind}:${hash >>> 0}`;
}

export function detailTimeSuggestion(
  state: TripState,
  item: DetailRailItem,
  items: DetailRailItem[],
) {
  const canonical = currentPlan(state).items.find((i) => i.id === item.id);
  if (
    item.aiStatus === "normal" ||
    item.type === "hotel" ||
    item.fixed ||
    item.locked ||
    (canonical && protectedSight(canonical)) ||
    validateSchedule(item)
  )
    return null;
  const others = items.filter(
    (i) => i.id !== item.id && i.type !== "hotel" && i.day === item.day,
  );
  if (others.some((other) => validateSchedule(other))) return null;
  const incoming = plannerMovementLegs(currentPlan(state), item.day).find(
    (leg) => leg.to.id === item.id && leg.edited && leg.conflict,
  );
  const shortBuffer = others.some(
    (other) =>
      minutes(other.endTime) <= minutes(item.startTime) &&
      minutes(item.startTime) - minutes(other.endTime) < 15,
  );
  if (!incoming && !shortBuffer && !scheduleConflicts(item, others).length)
    return null;
  const duration = minutes(item.endTime) - minutes(item.startTime);
  const earliest = Math.max(
    minutes(item.startTime) + 1,
    incoming
      ? minutes(incoming.from.endTime) +
          (incoming.duration ?? 0) +
          incoming.buffer
      : 0,
  );
  const clock = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  for (
    let start = Math.ceil(earliest / 5) * 5;
    start + duration <= 1439;
    start += 5
  ) {
    if (
      others.some(
        (other) =>
          start < minutes(other.endTime) + 15 &&
          start + duration + 15 > minutes(other.startTime),
      )
    )
      continue;
    return {
      title: item.title,
      startTime: clock(start),
      endTime: clock(start + duration),
    };
  }
  return null;
}

export function acceptDetailTimeSuggestion(
  state: TripState,
  draft: DetailDraftState,
  day: number,
  id: string,
): { action?: TripAction; draft?: DetailDraftState; notice: string } {
  const items = detailRailItems(state, day, draft.items, draft.completedIds);
  const item = items.find((i) => i.id === id);
  const suggestion = item && detailTimeSuggestion(state, item, items);
  if (!item || !suggestion)
    return { notice: "当前没有可安全直接应用的时间建议，请打开项目详情核对。" };
  if (item.draft)
    return {
      draft: {
        ...draft,
        items: draft.items.map((i) =>
          i.id === id ? { ...i, ...suggestion } : i,
        ),
      },
      notice: `已将${item.title}调整为 ${suggestion.startTime}–${suggestion.endTime}，未保存。`,
    };
  const action: TripAction = { type: "detailEdit", id, ...suggestion };
  const checked = tripReducer(state, action);
  return checked.plans === state.plans
    ? { notice: checked.notice }
    : {
        action,
        notice: `已将${item.title}调整为 ${suggestion.startTime}–${suggestion.endTime}，未保存；未更改预约。`,
      };
}
