export const attractionPreferenceDimensions = [
  {
    key: "nature",
    label: "自然",
    description: "山川、湖泊、海岸、公园、自然景观",
  },
  {
    key: "history",
    label: "历史",
    description: "古迹、历史建筑、遗址、寺社、博物馆等历史内容",
  },
  {
    key: "culture",
    label: "人文",
    description: "街区、市场、当地生活、社区文化、传统生活方式",
  },
  {
    key: "art",
    label: "艺术",
    description: "美术馆、设计、建筑、演出、艺术空间",
  },
  {
    key: "photography",
    label: "摄影",
    description: "取景价值、摄影体验、光线 / 景观导向活动",
  },
  {
    key: "activityExperience",
    label: "活动体验",
    description: "手作、户外、节庆、娱乐、参与式体验",
  },
] as const;

export const attractionPreferenceLevels = [
  { key: "veryLike", label: "很喜欢" },
  { key: "like", label: "喜欢" },
  { key: "neutral", label: "一般" },
  { key: "dislike", label: "不喜欢" },
] as const;

export type AttractionDimensionKey =
  (typeof attractionPreferenceDimensions)[number]["key"];
export type AttractionPreferenceLevel =
  (typeof attractionPreferenceLevels)[number]["key"] | "unset";

export type AttractionActivityPreferenceState = {
  dimensions: Record<AttractionDimensionKey, AttractionPreferenceLevel>;
  photoExperience: boolean;
};

const defaultAttractionActivityPreference: AttractionActivityPreferenceState = {
  dimensions: {
    nature: "veryLike",
    history: "like",
    culture: "like",
    art: "neutral",
    photography: "veryLike",
    activityExperience: "neutral",
  },
  photoExperience: true,
};

export function cloneAttractionActivityPreference(
  state: AttractionActivityPreferenceState,
): AttractionActivityPreferenceState {
  return {
    dimensions: { ...state.dimensions },
    photoExperience: state.photoExperience,
  };
}

export function createDefaultAttractionActivityPreferenceState(): AttractionActivityPreferenceState {
  return cloneAttractionActivityPreference(defaultAttractionActivityPreference);
}

export function createUnsetAttractionActivityPreferenceState(): AttractionActivityPreferenceState {
  return {
    dimensions: {
      nature: "unset",
      history: "unset",
      culture: "unset",
      art: "unset",
      photography: "unset",
      activityExperience: "unset",
    },
    photoExperience: false,
  };
}

export function setAttractionPreferenceLevel(
  state: AttractionActivityPreferenceState,
  dimension: AttractionDimensionKey,
  level: Exclude<AttractionPreferenceLevel, "unset">,
): AttractionActivityPreferenceState {
  return {
    ...state,
    dimensions: {
      ...state.dimensions,
      [dimension]: level,
    },
  };
}

export function togglePhotoExperience(
  state: AttractionActivityPreferenceState,
): AttractionActivityPreferenceState {
  return { ...state, photoExperience: !state.photoExperience };
}

export function attractionActivityPreferencesEqual(
  left: AttractionActivityPreferenceState,
  right: AttractionActivityPreferenceState,
): boolean {
  return (
    left.photoExperience === right.photoExperience &&
    attractionPreferenceDimensions.every(
      ({ key }) => left.dimensions[key] === right.dimensions[key],
    )
  );
}

export function summarizeAttractionActivityPreference(
  state: AttractionActivityPreferenceState,
  maxItems = 3,
): string {
  const limit = Math.max(1, Math.min(3, maxItems));
  const preferred = ["veryLike", "like"].flatMap((level) =>
    attractionPreferenceDimensions.filter(
      ({ key }) => state.dimensions[key] === level,
    ),
  );

  if (preferred.length === 0) return "还没有明显的景点偏好";
  return preferred
    .slice(0, limit)
    .map(({ label }) => label)
    .join(" · ");
}

export function saveAttractionActivityPreference(
  draft: AttractionActivityPreferenceState,
): AttractionActivityPreferenceState {
  return cloneAttractionActivityPreference(draft);
}

export function cancelAttractionActivityPreferenceChanges(
  saved: AttractionActivityPreferenceState,
): AttractionActivityPreferenceState {
  return cloneAttractionActivityPreference(saved);
}

export function restoreAttractionActivityPreferenceDefaults(): AttractionActivityPreferenceState {
  return createDefaultAttractionActivityPreferenceState();
}
