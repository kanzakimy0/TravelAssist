export const mobilityPresets = {
  relaxed: {
    label: "轻松优先",
    description: "为从容体验保留更多移动余量",
  },
  balanced: {
    label: "平衡",
    description: "在舒适度与出行效率之间取得平衡",
  },
  efficient: {
    label: "效率优先",
    description: "更看重路线直接与时间利用率",
  },
} as const;

export type MobilityPreset = keyof typeof mobilityPresets;
export type MobilityToggleKey =
  "fewerTransfers" | "lessWalking" | "noPublicTransit" | "noBus" | "noFerry";

export type MobilityPreferenceState = {
  preset: MobilityPreset;
  fewerTransfers: boolean;
  lessWalking: boolean;
  noPublicTransit: boolean;
  noBus: boolean;
  noFerry: boolean;
};

export type MobilityNotice = {
  id: "walking-public-transit" | "public-transit-bus";
  tone: "warning" | "info";
  title: string;
  body: string;
};

const defaultMobilityPreference: MobilityPreferenceState = {
  preset: "balanced",
  fewerTransfers: true,
  lessWalking: true,
  noPublicTransit: false,
  noBus: false,
  noFerry: false,
};

export function cloneMobilityPreference(
  state: MobilityPreferenceState,
): MobilityPreferenceState {
  return { ...state };
}

export function createDefaultMobilityPreferenceState(): MobilityPreferenceState {
  return cloneMobilityPreference(defaultMobilityPreference);
}

export function setMobilityPreset(
  state: MobilityPreferenceState,
  preset: MobilityPreset,
): MobilityPreferenceState {
  return { ...state, preset };
}

export function toggleMobilityPreference(
  state: MobilityPreferenceState,
  key: MobilityToggleKey,
): MobilityPreferenceState {
  return { ...state, [key]: !state[key] };
}

export function mobilityPreferencesEqual(
  left: MobilityPreferenceState,
  right: MobilityPreferenceState,
): boolean {
  return (
    left.preset === right.preset &&
    left.fewerTransfers === right.fewerTransfers &&
    left.lessWalking === right.lessWalking &&
    left.noPublicTransit === right.noPublicTransit &&
    left.noBus === right.noBus &&
    left.noFerry === right.noFerry
  );
}

export function summarizeMobilityPreference(
  state: MobilityPreferenceState,
  maxItems = 3,
): string {
  const limit = Math.max(1, Math.min(3, maxItems));
  const details = [
    state.noPublicTransit ? "不乘坐公共交通" : null,
    state.noBus ? "不乘坐公交" : null,
    state.noFerry ? "不乘坐游船" : null,
    state.fewerTransfers ? "少换乘" : null,
    state.lessWalking ? "少步行" : null,
  ].filter((item): item is string => Boolean(item));

  return [mobilityPresets[state.preset].label, ...details]
    .slice(0, limit)
    .join(" · ");
}

export function getMobilityNotices(
  state: MobilityPreferenceState,
): MobilityNotice[] {
  const notices: MobilityNotice[] = [];

  if (state.lessWalking && state.noPublicTransit) {
    notices.push({
      id: "walking-public-transit",
      tone: "warning",
      title: "可用路线可能明显减少",
      body: "“少步行”和“不乘坐公共交通”同时启用时，部分目的地可能难以规划。系统会保留你的选择，不会自动修改。",
    });
  }

  if (state.noPublicTransit && state.noBus) {
    notices.push({
      id: "public-transit-bus",
      tone: "info",
      title: "“不乘坐公交”已被包含",
      body: "“不乘坐公共交通”已覆盖公交限制。两项选择都会保留，便于你以后单独调整。",
    });
  }

  return notices;
}

export function saveMobilityPreference(
  draft: MobilityPreferenceState,
): MobilityPreferenceState {
  return cloneMobilityPreference(draft);
}

export function cancelMobilityPreferenceChanges(
  saved: MobilityPreferenceState,
): MobilityPreferenceState {
  return cloneMobilityPreference(saved);
}

export function restoreMobilityPreferenceDefaults(): MobilityPreferenceState {
  return createDefaultMobilityPreferenceState();
}

export function applyTripTemporaryMobilityPreference(
  longTerm: MobilityPreferenceState,
  temporary: Partial<MobilityPreferenceState>,
): {
  longTerm: MobilityPreferenceState;
  tripTemporary: Partial<MobilityPreferenceState>;
} {
  return {
    longTerm: cloneMobilityPreference(longTerm),
    tripTemporary: { ...temporary },
  };
}
