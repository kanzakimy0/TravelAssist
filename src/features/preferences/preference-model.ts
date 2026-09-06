export const preferenceLevels = {
  veryLike: { label: "很喜欢", weight: 1 },
  like: { label: "喜欢", weight: 0.8 },
  neutral: { label: "一般", weight: 0.58 },
  low: { label: "较少", weight: 0.34 },
  unset: { label: "未设置", weight: 0.12 },
} as const;

export type PreferenceLevel = keyof typeof preferenceLevels;
export type RadarKind = "attractions" | "travelStyle";
export type CategoryKey =
  | "mobility"
  | "attractions"
  | "dining"
  | "accommodation"
  | "budget"
  | "experience";

export type RadarAxis = {
  id: string;
  label: string;
  level: PreferenceLevel;
};

export type PreferenceCategory = {
  key: CategoryKey;
  title: string;
  summary: string;
  route: `/personal-center/preferences/${CategoryKey}`;
  image: string;
  icon: CategoryKey;
};

export type PreferenceState = {
  attractions: RadarAxis[];
  travelStyle: RadarAxis[];
  categories: PreferenceCategory[];
};

export const attractionAxisLabels = [
  "自然",
  "历史",
  "人文",
  "艺术",
  "摄影",
  "活动体验",
] as const;

export const travelStyleAxisLabels = [
  "轻松",
  "经典",
  "计划",
  "探索",
  "参与",
  "深度",
] as const;

const defaultCategories: PreferenceCategory[] = [
  {
    key: "mobility",
    title: "移动",
    summary: "铁路优先 · 少换乘 · 步行中等",
    route: "/personal-center/preferences/mobility",
    image: "/media/personal-center/preferences/category-mobility.webp",
    icon: "mobility",
  },
  {
    key: "attractions",
    title: "景点与活动",
    summary: "自然 · 历史 · 摄影",
    route: "/personal-center/preferences/attractions",
    image: "/media/personal-center/preferences/category-attractions.webp",
    icon: "attractions",
  },
  {
    key: "dining",
    title: "餐饮",
    summary: "当地料理 · 小店 · 排队接受中等",
    route: "/personal-center/preferences/dining",
    image: "/media/personal-center/preferences/category-dining.png",
    icon: "dining",
  },
  {
    key: "accommodation",
    title: "住宿",
    summary: "交通方便 · 舒适 · 少换酒店",
    route: "/personal-center/preferences/accommodation",
    image: "/media/personal-center/preferences/category-accommodation.webp",
    icon: "accommodation",
  },
  {
    key: "budget",
    title: "预算",
    summary: "中等预算 · 更愿意花在住宿和体验",
    route: "/personal-center/preferences/budget",
    image: "/media/personal-center/preferences/category-budget.png",
    icon: "budget",
  },
  {
    key: "experience",
    title: "旅行体验",
    summary: "摄影 · 当地文化 · 日落夜景",
    route: "/personal-center/preferences/experience",
    image: "/media/personal-center/preferences/category-experience.png",
    icon: "experience",
  },
];

const defaultAttractions: RadarAxis[] = [
  { id: "nature", label: "自然", level: "veryLike" },
  { id: "history", label: "历史", level: "like" },
  { id: "culture", label: "人文", level: "like" },
  { id: "art", label: "艺术", level: "neutral" },
  { id: "photography", label: "摄影", level: "veryLike" },
  { id: "activities", label: "活动体验", level: "low" },
];

const defaultTravelStyle: RadarAxis[] = [
  { id: "relaxed", label: "轻松", level: "like" },
  { id: "classic", label: "经典", level: "like" },
  { id: "planned", label: "计划", level: "veryLike" },
  { id: "explore", label: "探索", level: "like" },
  { id: "participate", label: "参与", level: "neutral" },
  { id: "depth", label: "深度", level: "veryLike" },
];

const cloneState = (state: PreferenceState): PreferenceState => ({
  attractions: state.attractions.map((axis) => ({ ...axis })),
  travelStyle: state.travelStyle.map((axis) => ({ ...axis })),
  categories: state.categories.map((category) => ({ ...category })),
});

export function createDefaultPreferenceState(): PreferenceState {
  return cloneState({
    attractions: defaultAttractions,
    travelStyle: defaultTravelStyle,
    categories: defaultCategories,
  });
}

export function createResetPreferenceState(): PreferenceState {
  return {
    attractions: defaultAttractions.map((axis) => ({
      ...axis,
      level: "unset",
    })),
    travelStyle: defaultTravelStyle.map((axis) => ({
      ...axis,
      level: "unset",
    })),
    categories: defaultCategories.map((category) => ({
      ...category,
      summary: "未设置",
    })),
  };
}

export function levelWeight(level: PreferenceLevel): number {
  return preferenceLevels[level].weight;
}

export function levelLabel(level: PreferenceLevel): string {
  return preferenceLevels[level].label;
}

export function pointAt(
  index: number,
  total: number,
  radius: number,
  centerX = 170,
  centerY = 150,
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

export function radarPolygonPoints(
  axes: RadarAxis[],
  radius = 86,
  centerX = 170,
  centerY = 150,
): string {
  return axes
    .map((axis, index) => {
      const point = pointAt(
        index,
        axes.length,
        radius * levelWeight(axis.level),
        centerX,
        centerY,
      );
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(" ");
}

export function describePreference(state: PreferenceState): string | null {
  const candidates = [...state.attractions, ...state.travelStyle]
    .filter((axis) => axis.level !== "unset" && axis.level !== "low")
    .sort((a, b) => levelWeight(b.level) - levelWeight(a.level))
    .slice(0, 4)
    .map((axis) => axis.label);

  if (candidates.length === 0) return null;

  const attractionLabels = new Set(state.attractions.map((axis) => axis.label));
  const attractionTraits = candidates.filter((label) =>
    attractionLabels.has(label),
  );
  const styleTraits = candidates.filter(
    (label) => !attractionLabels.has(label),
  );
  const parts: string[] = [];

  if (attractionTraits.length > 0) {
    parts.push(`偏爱${attractionTraits.join("与")}相关的目的地`);
  }
  if (styleTraits.length > 0) {
    parts.push(`享受${styleTraits.join("、")}的旅行方式`);
  }

  return `${parts.join("，")}。`;
}

export function countConfiguredPreferences(state: PreferenceState): number {
  return [...state.attractions, ...state.travelStyle].filter(
    (axis) => axis.level !== "unset",
  ).length;
}

export function getCategory(
  state: PreferenceState,
  key: string,
): PreferenceCategory | undefined {
  return state.categories.find((category) => category.key === key);
}

export function applyTripTemporaryPreference(
  longTerm: PreferenceState,
  temporary: Partial<Record<RadarKind, RadarAxis[]>>,
): { longTerm: PreferenceState; tripTemporary: typeof temporary } {
  return {
    longTerm: cloneState(longTerm),
    tripTemporary: {
      attractions: temporary.attractions?.map((axis) => ({ ...axis })),
      travelStyle: temporary.travelStyle?.map((axis) => ({ ...axis })),
    },
  };
}

export const preferenceCategoryKeys = defaultCategories.map(
  (category) => category.key,
);
