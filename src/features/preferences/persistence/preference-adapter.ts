import {
  applyPreferencePatch,
  parsePreferenceV1,
  parsePreferencePatchV1,
  preferenceKeys,
  interestCodes,
  type PreferenceKey,
  type PreferenceV1,
  type PreferencePatchV1,
  type InterestCode,
} from "../domain/preference-v1";
import {
  createResetPreferenceState,
  type CategoryKey,
  type PreferenceLevel,
} from "../preference-model";
export type PreferencePageKey = CategoryKey | "advanced";
export function keysForPage(category: PreferencePageKey): PreferenceKey[] {
  if (category === "advanced") return [...preferenceKeys];
  const prefix =
    category === "attractions"
      ? "interests."
      : category === "experience"
        ? "style."
        : category + ".";
  return preferenceKeys.filter((key) => key.startsWith(prefix));
}
export function editPreferenceValue(
  current: PreferenceV1,
  key: PreferenceKey,
  value: unknown,
): PreferenceV1 {
  return applyPreferencePatch(current, {
    schemaVersion: "1.0",
    set: value === undefined ? {} : { [key]: value },
    unset: value === undefined ? [key] : [],
  });
}
export function preferenceDraftPatch(
  saved: PreferenceV1,
  draft: PreferenceV1,
): PreferencePatchV1 {
  const before = parsePreferenceV1(saved).values,
    after = parsePreferenceV1(draft).values;
  const set: Record<string, unknown> = {},
    unset: PreferenceKey[] = [];
  for (const key of preferenceKeys) {
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
    if (after[key] === undefined) unset.push(key);
    else set[key] = after[key];
  }
  return parsePreferencePatchV1({ schemaVersion: "1.0", set, unset });
}
export const interestLabels: Record<InterestCode, string> = {
  nature_scenery: "自然风景",
  history_culture: "历史文化",
  food: "美食",
  photography: "摄影",
  onsen_wellness: "温泉疗愈",
  art_museums: "艺术博物馆",
  anime_entertainment: "动漫娱乐",
  shopping: "购物",
  urban_exploration: "城市探索",
  outdoor_activity: "户外活动",
  night_experience: "夜间体验",
  family_activity: "亲子活动",
  traditional_experience: "传统体验",
  theme_parks: "主题乐园",
  rural_towns: "乡村小镇",
  seasonal_events: "季节活动",
};
export const fieldLabels: Record<PreferenceKey, string> = {
  "mobility.fewerTransfers": "少换乘",
  "mobility.walkingTolerance": "步行容忍度",
  "mobility.noPublicTransit": "不乘坐公共交通",
  "mobility.noBus": "不乘坐公交",
  "mobility.noFerry": "不乘坐游船",
  "dining.localCuisine": "当地料理",
  "dining.smallShops": "特色小店",
  "dining.queueTolerance": "排队接受程度",
  "accommodation.transportConvenience": "交通方便",
  "accommodation.comfort": "住宿舒适度",
  "accommodation.fewerHotelChanges": "少换酒店",
  "budget.spendingTendency": "消费倾向",
  "budget.prioritizeAccommodation": "更愿意花在住宿",
  "budget.prioritizeExperience": "更愿意花在体验",
  "interests.preferences": "兴趣偏好",
  "interests.details": "兴趣细分",
  "style.pace": "行程节奏",
  "style.depth": "体验深度",
  "style.discovery": "目的地探索",
  "style.movement": "移动倾向",
  "style.coverage": "行程覆盖",
  "style.priority": "预算与体验取舍",
  "style.planning": "计划程度",
};
export const valueLabels: Record<string, string> = {
  true: "是",
  false: "否",
  veryLow: "很低",
  low: "较低",
  standard: "标准",
  high: "较高",
  veryHigh: "很高",
  deprioritize: "降低优先级",
  neutral: "一般",
  prioritize: "优先",
  medium: "中等",
  economical: "较节省",
  moderate: "中等",
  flexible: "较宽松",
};
export function categorySummary(
  preference: PreferenceV1,
  category: PreferencePageKey,
): string {
  const values = parsePreferenceV1(preference).values;
  if (category === "attractions") {
    const signals = values["interests.preferences"] ?? {};
    const summaries = interestCodes
      .filter(
        (k) =>
          signals[k] !== undefined ||
          (values["interests.details"]?.[k]?.length ?? 0) > 0,
      )
      .map(
        (k) =>
          interestLabels[k] +
          (signals[k] === "dislike"
            ? " · 不喜欢"
            : signals[k] === "like"
              ? " · 喜欢"
              : " · 已细化"),
      );
    return summaries.slice(0, 3).join("；") || "未设置";
  }
  const keys = keysForPage(category).filter((key) => values[key] !== undefined);
  return (
    keys
      .slice(0, 3)
      .map(
        (key) =>
          fieldLabels[key] +
          "：" +
          (valueLabels[String(values[key])] ?? String(values[key])),
      )
      .join(" · ") || "未设置"
  );
}
export function preferenceOverview(preference: PreferenceV1) {
  const values = parsePreferenceV1(preference).values;
  const state = createResetPreferenceState();
  const groups: InterestCode[][] = [
    ["nature_scenery"],
    ["history_culture"],
    ["traditional_experience", "rural_towns"],
    ["art_museums"],
    ["photography"],
    ["outdoor_activity", "family_activity", "theme_parks", "seasonal_events"],
  ];
  state.attractions = state.attractions.map((axis, i) => {
    const signals = groups[i].map(
      (key) => values["interests.preferences"]?.[key],
    );
    const level: PreferenceLevel = signals.includes("like")
      ? "like"
      : signals.includes("dislike")
        ? "low"
        : "unset";
    return { ...axis, level };
  });
  const axes = [
    ["style.pace", "紧凑"],
    ["style.depth", "深度"],
    ["style.discovery", "小众"],
    ["style.movement", "移动"],
    ["style.coverage", "多地"],
    ["style.planning", "计划"],
  ] as const;
  state.travelStyle = axes.map(([id, label]) => {
    const value = values[id];
    const level: PreferenceLevel =
      value === undefined
        ? "unset"
        : value === 5
          ? "veryLike"
          : value === 4
            ? "like"
            : value === 3
              ? "neutral"
              : "low";
    return { id, label, level };
  });
  state.categories = state.categories.map((category) => ({
    ...category,
    summary: categorySummary(preference, category.key),
  }));
  return state;
}
