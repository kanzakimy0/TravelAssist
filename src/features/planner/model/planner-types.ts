// TASK-008 presentation fixtures, not a business Trip Plan / provider contract.
export type RangeMode = "day" | "threeDays" | "all";
export type BottomTab =
  "itinerary" | "movement" | "booking" | "weather" | "stayFood" | "details";
export type StopKind = "sight" | "transport" | "stay" | "food" | "booking";
export type MockStop = {
  id: string;
  name: string;
  time: string;
  duration: string;
  kind: StopKind;
  x: number;
  y: number;
  next?: string;
  fixed?: boolean;
};
export type MockDay = {
  day: number;
  date: string;
  title: string;
  color: string;
  stops: MockStop[];
  movement: string[];
  booking: string[];
  weather: string[];
  stayFood: string[];
  details: string[];
};
export type MockPlan = {
  id: string;
  name: string;
  summary: string;
  days: MockDay[];
};
export type PlannerSettings = {
  travelers: string;
  startDate: string;
  sights: string;
  food: string;
  stay: string;
  budget: string;
  pace: string;
  movement: string;
  timing: string;
  queues: string;
  photography: string;
  bookings: string;
  needs: string;
  luggage: string;
  weather: string;
  constraints: string;
  filters: string;
};
export type PlannerUiState = {
  currentPlanId: string;
  rangeMode: RangeMode;
  selectedDay: number;
  threeDayStart: number;
  selectedStopId: string | null;
  activeBottomTab: BottomTab;
  isLayerToolbarCollapsed: boolean;
  isMoreSettingsOpen: boolean;
  isRightPanelOverlayOpen: boolean;
  isBottomPanelOverlayOpen: boolean;
};
