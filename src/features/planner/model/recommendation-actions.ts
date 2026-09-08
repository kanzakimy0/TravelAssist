import { plannerMockPlans } from "../data/planner-mock-data";
import { makePlannerCatalog } from "../data/planner-catalog";
import {
  isoDay,
  makeTripState,
  type TripPlan,
  type TripState,
} from "./trip-model";
import { initializeHotelEndpoints } from "./planner-timeline";

/** The original recommendation, using current trip dates, not the last save. */
export function originalRecommendation(
  state: TripState,
  id: string,
): TripPlan | undefined {
  const catalog = makePlannerCatalog(plannerMockPlans);
  const initial = makeTripState(
    plannerMockPlans,
    catalog.places,
    catalog.areas,
    state.settings,
  );
  initial.ui.currentPlanId = id;
  // Restore recommendation content, not the fixture's three-day date range.
  const count =
    Math.round(
      (Date.parse(state.configuration.returnDate) -
        Date.parse(state.settings.startDate)) /
        86400000,
    ) + 1;
  initial.plans = initial.plans.map((plan) => ({
    ...plan,
    days: Array.from({ length: count }, (_, index) => ({
      ...(plan.days[index] ?? {
        ...plan.days.at(-1)!,
        title: "自由安排（未生成路线）",
        movement: [],
        weather: ["天气未查询"],
      }),
      day: index + 1,
      date: isoDay(state.settings.startDate, index + 1),
    })),
    items: plan.items.filter(
      (item) =>
        item.endDay <= count && (item.type !== "hotel" || item.endDay < count),
    ),
    reserveItems: plan.reserveItems?.filter(
      (item) =>
        item.endDay <= count && (item.type !== "hotel" || item.endDay < count),
    ),
  }));
  return initializeHotelEndpoints(initial, id).plans.find((p) => p.id === id);
}
function comparable(plan: TripPlan) {
  return JSON.stringify(
    {
      ...plan,
      hotelEndpointsReady: true,
      // Day labels may be fixture display dates or ISO dates; neither is a route edit.
      days: plan.days.map((day) => ({ ...day, date: undefined })),
      items: [...plan.items].sort((a, b) => a.id.localeCompare(b.id)),
      reserveItems: [...(plan.reserveItems ?? [])].sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
      movementLegs: Object.entries(plan.movementLegs ?? {}).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    },
    (_key, value: unknown) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
          )
        : value,
  );
}
export function recommendationModified(state: TripState, id: string) {
  const initialized = initializeHotelEndpoints(
    { ...state, ui: { ...state.ui, currentPlanId: id } },
    id,
  );
  const current = initialized.plans.find((p) => p.id === id);
  const original = originalRecommendation(state, id);
  return Boolean(
    current && original && comparable(current) !== comparable(original),
  );
}
export function restoreRecommendation(state: TripState, id: string): TripState {
  const original = originalRecommendation(state, id);
  if (!original) return state;
  return {
    ...state,
    plans: state.plans.map((p) => (p.id === id ? original : p)),
    ui: { ...state.ui, selectedTripItemId: null, inspection: null },
    notice:
      "已还原此方案的推荐路线与名称；其他方案、个人偏好和独立详情项目保留。浏览器保存记录未改动，也未取消真实预约。",
  };
}
