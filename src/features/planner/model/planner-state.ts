import type {
  MockDay,
  MockPlan,
  PlannerUiState,
  RangeMode,
} from "./planner-types";

export function threeDayWindows(totalDays: number) {
  const count = Math.max(Math.floor(totalDays) - 2, 0);
  return Array.from({ length: count }, (_, index) => ({
    start: index + 1,
    end: index + 3,
  }));
}

export const initialPlannerState: PlannerUiState = {
  currentPlanId: "classic",
  rangeMode: "all",
  selectedDay: 1,
  threeDayStart: 1,
  selectedStopId: null,
  activeBottomTab: "itinerary",
  isLayerToolbarCollapsed: false,
  isMoreSettingsOpen: false,
  isRightPanelOverlayOpen: false,
  isBottomPanelOverlayOpen: false,
};

export function visibleDays(
  days: MockDay[],
  state: Pick<PlannerUiState, "rangeMode" | "selectedDay" | "threeDayStart">,
) {
  if (state.rangeMode === "day")
    return days.filter((day) => day.day === state.selectedDay);
  if (state.rangeMode === "threeDays")
    return days.filter(
      (day) =>
        day.day >= state.threeDayStart && day.day < state.threeDayStart + 3,
    );
  return days;
}

export type PlannerAction =
  | { type: "range"; mode: RangeMode; start?: number; totalDays: number }
  | { type: "plan"; plan: MockPlan }
  | { type: "stop"; id: string }
  | { type: "patch"; patch: Partial<PlannerUiState> };

export function plannerReducer(
  state: PlannerUiState,
  action: PlannerAction,
): PlannerUiState {
  if (action.type === "patch") return { ...state, ...action.patch };
  if (action.type === "stop")
    return {
      ...state,
      selectedStopId: action.id,
      activeBottomTab: "itinerary",
    };
  if (action.type === "plan")
    return {
      ...state,
      currentPlanId: action.plan.id,
      selectedStopId: null,
      selectedDay: Math.min(state.selectedDay, action.plan.days.length),
      threeDayStart: Math.min(
        state.threeDayStart,
        Math.max(1, action.plan.days.length - 2),
      ),
      rangeMode:
        state.rangeMode === "threeDays" && action.plan.days.length < 3
          ? "all"
          : state.rangeMode,
    };
  if (action.mode === "threeDays" && action.totalDays < 3) return state;
  const limit =
    action.mode === "threeDays" ? action.totalDays - 2 : action.totalDays;
  const start = Math.max(1, Math.min(action.start ?? 1, limit));
  return {
    ...state,
    rangeMode: action.mode,
    selectedStopId: null,
    ...(action.mode === "day" ? { selectedDay: start } : {}),
    ...(action.mode === "threeDays" ? { threeDayStart: start } : {}),
  };
}

export function mapBounds(days: MockDay[]) {
  const points = days.flatMap((day) => day.stops);
  if (!points.length) return { x: 0, y: 0, width: 1000, height: 600 };
  const x = Math.max(0, Math.min(...points.map((point) => point.x)) - 140);
  const y = Math.max(0, Math.min(...points.map((point) => point.y)) - 100);
  return {
    x,
    y,
    width:
      Math.min(1000, Math.max(...points.map((point) => point.x)) + 100) - x,
    height: Math.min(600, Math.max(...points.map((point) => point.y)) + 90) - y,
  };
}

export function dateForDay(startDate: string, day: number) {
  const date = new Date(`${startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}
