import { currentPlan, mealSlotFor, type TripState } from "./trip-model";
import type { DetailRailItem } from "./detail-workspace";

const slots = [
  { kind: "hotel", label: "当晚住宿", slot: undefined, time: "20:00" },
  { kind: "restaurant", label: "早餐", slot: "breakfast", time: "07:00" },
  { kind: "restaurant", label: "午餐", slot: "lunch", time: "12:00" },
  { kind: "restaurant", label: "晚餐", slot: "dinner", time: "18:00" },
] as const;

// The visible empty cards and completion check must use the same requirements.
export function missingArrangements(
  state: TripState,
  day: number,
  items: DetailRailItem[],
) {
  return slots.filter(
    ({ kind, slot }) =>
      (kind !== "hotel" || day < currentPlan(state).days.length) &&
      !items.some(
        (item) =>
          item.day === day &&
          item.type === kind &&
          (!slot || mealSlotFor(item.startTime, item.planningSlot) === slot),
      ),
  );
}
