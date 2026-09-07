export const diningPreferenceOptions = {
  localCuisine: [
    { key: "priority", label: "优先" },
    { key: "neutral", label: "一般" },
    { key: "notSpecial", label: "不特别" },
  ],
  smallShops: [
    { key: "like", label: "喜欢" },
    { key: "neutral", label: "一般" },
    { key: "notSpecial", label: "不特别" },
  ],
  queueTolerance: [
    { key: "low", label: "较低" },
    { key: "medium", label: "中等" },
    { key: "high", label: "较高" },
  ],
} as const;

export type LocalCuisinePreference =
  (typeof diningPreferenceOptions.localCuisine)[number]["key"];
export type SmallShopPreference =
  (typeof diningPreferenceOptions.smallShops)[number]["key"];
export type QueueTolerance =
  (typeof diningPreferenceOptions.queueTolerance)[number]["key"];

export type DiningPreferenceState = {
  localCuisine: LocalCuisinePreference;
  smallShops: SmallShopPreference;
  queueTolerance: QueueTolerance;
};

const defaultDiningPreference: DiningPreferenceState = {
  localCuisine: "priority",
  smallShops: "like",
  queueTolerance: "medium",
};

export function cloneDiningPreference(
  state: DiningPreferenceState,
): DiningPreferenceState {
  return { ...state };
}

export function createDefaultDiningPreferenceState(): DiningPreferenceState {
  return cloneDiningPreference(defaultDiningPreference);
}

export function setDiningPreference<K extends keyof DiningPreferenceState>(
  state: DiningPreferenceState,
  key: K,
  value: DiningPreferenceState[K],
): DiningPreferenceState {
  return { ...state, [key]: value };
}

export function diningPreferencesEqual(
  left: DiningPreferenceState,
  right: DiningPreferenceState,
): boolean {
  return (
    left.localCuisine === right.localCuisine &&
    left.smallShops === right.smallShops &&
    left.queueTolerance === right.queueTolerance
  );
}

export function summarizeDiningPreference(
  state: DiningPreferenceState,
): string {
  const localCuisine = {
    priority: "当地料理",
    neutral: "当地料理一般",
    notSpecial: null,
  }[state.localCuisine];
  const smallShops = {
    like: "小店",
    neutral: "小店一般",
    notSpecial: null,
  }[state.smallShops];
  const queue = {
    low: "排队接受较低",
    medium: "排队接受中等",
    high: "排队接受较高",
  }[state.queueTolerance];
  return [localCuisine, smallShops, queue]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}

export function saveDiningPreference(
  draft: DiningPreferenceState,
): DiningPreferenceState {
  return cloneDiningPreference(draft);
}

export function cancelDiningPreferenceChanges(
  saved: DiningPreferenceState,
): DiningPreferenceState {
  return cloneDiningPreference(saved);
}

export function restoreDiningPreferenceDefaults(): DiningPreferenceState {
  return createDefaultDiningPreferenceState();
}

export const accommodationPreferenceOptions = [
  { key: "value", label: "重视" },
  { key: "neutral", label: "一般" },
  { key: "notSpecial", label: "不特别" },
] as const;

export type AccommodationPreferenceLevel =
  (typeof accommodationPreferenceOptions)[number]["key"];

export type AccommodationPreferenceState = {
  transportConvenience: AccommodationPreferenceLevel;
  comfort: AccommodationPreferenceLevel;
  fewerHotelChanges: AccommodationPreferenceLevel;
};

const defaultAccommodationPreference: AccommodationPreferenceState = {
  transportConvenience: "value",
  comfort: "value",
  fewerHotelChanges: "value",
};

export function cloneAccommodationPreference(
  state: AccommodationPreferenceState,
): AccommodationPreferenceState {
  return { ...state };
}

export function createDefaultAccommodationPreferenceState(): AccommodationPreferenceState {
  return cloneAccommodationPreference(defaultAccommodationPreference);
}

export function setAccommodationPreference<
  K extends keyof AccommodationPreferenceState,
>(
  state: AccommodationPreferenceState,
  key: K,
  value: AccommodationPreferenceState[K],
): AccommodationPreferenceState {
  return { ...state, [key]: value };
}

export function accommodationPreferencesEqual(
  left: AccommodationPreferenceState,
  right: AccommodationPreferenceState,
): boolean {
  return (
    left.transportConvenience === right.transportConvenience &&
    left.comfort === right.comfort &&
    left.fewerHotelChanges === right.fewerHotelChanges
  );
}

export function summarizeAccommodationPreference(
  state: AccommodationPreferenceState,
): string {
  const items = [
    state.transportConvenience === "value" ? "交通方便" : null,
    state.comfort === "value" ? "舒适" : null,
    state.fewerHotelChanges === "value" ? "少换酒店" : null,
  ].filter((item): item is string => Boolean(item));
  return items.length > 0 ? items.join(" · ") : "还没有明显的住宿偏好";
}

export function saveAccommodationPreference(
  draft: AccommodationPreferenceState,
): AccommodationPreferenceState {
  return cloneAccommodationPreference(draft);
}

export function cancelAccommodationPreferenceChanges(
  saved: AccommodationPreferenceState,
): AccommodationPreferenceState {
  return cloneAccommodationPreference(saved);
}

export function restoreAccommodationPreferenceDefaults(): AccommodationPreferenceState {
  return createDefaultAccommodationPreferenceState();
}

export const budgetSpendingOptions = [
  { key: "economical", label: "较节省" },
  { key: "moderate", label: "中等" },
  { key: "flexible", label: "较宽松" },
] as const;

export type BudgetSpendingTendency =
  (typeof budgetSpendingOptions)[number]["key"];

export type BudgetPreferenceState = {
  spendingTendency: BudgetSpendingTendency;
  prioritizeAccommodation: boolean;
  prioritizeExperience: boolean;
};

const defaultBudgetPreference: BudgetPreferenceState = {
  spendingTendency: "moderate",
  prioritizeAccommodation: true,
  prioritizeExperience: true,
};

export function cloneBudgetPreference(
  state: BudgetPreferenceState,
): BudgetPreferenceState {
  return { ...state };
}

export function createDefaultBudgetPreferenceState(): BudgetPreferenceState {
  return cloneBudgetPreference(defaultBudgetPreference);
}

export function setBudgetSpendingTendency(
  state: BudgetPreferenceState,
  spendingTendency: BudgetSpendingTendency,
): BudgetPreferenceState {
  return { ...state, spendingTendency };
}

export function toggleBudgetAllocation(
  state: BudgetPreferenceState,
  key: "prioritizeAccommodation" | "prioritizeExperience",
): BudgetPreferenceState {
  return { ...state, [key]: !state[key] };
}

export function budgetPreferencesEqual(
  left: BudgetPreferenceState,
  right: BudgetPreferenceState,
): boolean {
  return (
    left.spendingTendency === right.spendingTendency &&
    left.prioritizeAccommodation === right.prioritizeAccommodation &&
    left.prioritizeExperience === right.prioritizeExperience
  );
}

export function summarizeBudgetPreference(
  state: BudgetPreferenceState,
): string {
  const spending = {
    economical: "较节省预算",
    moderate: "中等预算",
    flexible: "较宽松预算",
  }[state.spendingTendency];
  const priorities = [
    state.prioritizeAccommodation ? "住宿" : null,
    state.prioritizeExperience ? "体验" : null,
  ].filter((item): item is string => Boolean(item));
  if (priorities.length === 0) return spending;
  return `${spending} · 更愿意花在${priorities.join("和")}`;
}

export function saveBudgetPreference(
  draft: BudgetPreferenceState,
): BudgetPreferenceState {
  return cloneBudgetPreference(draft);
}

export function cancelBudgetPreferenceChanges(
  saved: BudgetPreferenceState,
): BudgetPreferenceState {
  return cloneBudgetPreference(saved);
}

export function restoreBudgetPreferenceDefaults(): BudgetPreferenceState {
  return createDefaultBudgetPreferenceState();
}
