import {
  applyPreferencePatch,
  parsePreferencePatchV1,
  parsePreferenceV1,
  type PreferencePatchV1,
  type PreferenceV1,
} from "../../../shared/contracts/preferences/core";

export type PreferencePresetCategory =
  "mobility" | "dining" | "accommodation" | "budget";
export type PreferencePresetV1 = Readonly<{
  id: string;
  category: PreferencePresetCategory;
  label: string;
  description: string;
  patch: Readonly<{
    schemaVersion: PreferencePatchV1["schemaVersion"];
    set: Readonly<PreferencePatchV1["set"]>;
    unset: readonly PreferencePatchV1["unset"][number][];
  }>;
}>;

function preset(
  id: string,
  category: PreferencePresetCategory,
  label: string,
  description: string,
  set: PreferencePatchV1["set"],
  unset: PreferencePatchV1["unset"] = [],
): PreferencePresetV1 {
  const patch = parsePreferencePatchV1({ schemaVersion: "1.0", set, unset });
  if (
    [...Object.keys(patch.set), ...patch.unset].some(
      (key) => !key.startsWith(category + "."),
    )
  )
    throw new Error("Preset must stay within its category");
  Object.freeze(patch.set);
  Object.freeze(patch.unset);
  return Object.freeze({
    id,
    category,
    label,
    description,
    patch: Object.freeze(patch),
  });
}

/** Explicit draft templates only. These presentation identifiers never belong to PreferenceV1. */
export const preferencePresets: readonly PreferencePresetV1[] = Object.freeze([
  preset(
    "mobility_easy",
    "mobility",
    "轻松移动",
    "少换乘、较低步行容忍度；清除交通方式限制。",
    {
      "mobility.fewerTransfers": true,
      "mobility.walkingTolerance": "low",
    },
    ["mobility.noPublicTransit", "mobility.noBus", "mobility.noFerry"],
  ),
  preset(
    "mobility_standard",
    "mobility",
    "标准移动",
    "标准步行容忍度；清除换乘偏好与交通方式限制。",
    {
      "mobility.walkingTolerance": "standard",
    },
    [
      "mobility.fewerTransfers",
      "mobility.noPublicTransit",
      "mobility.noBus",
      "mobility.noFerry",
    ],
  ),
  preset(
    "dining_local",
    "dining",
    "当地饮食优先",
    "优先当地料理与特色小店，排队接受程度中等。",
    {
      "dining.localCuisine": "prioritize",
      "dining.smallShops": "prioritize",
      "dining.queueTolerance": "medium",
    },
  ),
  preset(
    "dining_flexible",
    "dining",
    "灵活用餐",
    "当地料理与特色小店保持中性，排队接受程度较高。",
    {
      "dining.localCuisine": "neutral",
      "dining.smallShops": "neutral",
      "dining.queueTolerance": "high",
    },
  ),
  preset(
    "accommodation_comfort",
    "accommodation",
    "舒适省心",
    "优先交通方便、住宿舒适与少换酒店。",
    {
      "accommodation.transportConvenience": "prioritize",
      "accommodation.comfort": "prioritize",
      "accommodation.fewerHotelChanges": "prioritize",
    },
  ),
  preset(
    "accommodation_neutral",
    "accommodation",
    "保持中性",
    "明确将三项住宿偏好设为中性。",
    {
      "accommodation.transportConvenience": "neutral",
      "accommodation.comfort": "neutral",
      "accommodation.fewerHotelChanges": "neutral",
    },
  ),
  ...(["economical", "moderate", "flexible"] as const).map((value, i) =>
    preset(
      "budget_" + value,
      "budget",
      ["节省预算", "中等预算", "预算灵活"][i],
      "设置消费倾向；清除住宿与体验的预算优先项。",
      { "budget.spendingTendency": value },
      ["budget.prioritizeAccommodation", "budget.prioritizeExperience"],
    ),
  ),
]);

export function presetsForCategory(
  category: string,
): readonly PreferencePresetV1[] {
  return Object.freeze(
    preferencePresets.filter((p) => p.category === category),
  );
}
export function applyPreferencePreset(
  current: PreferenceV1,
  presetId: string,
): PreferenceV1 {
  const selected = preferencePresets.find((p) => p.id === presetId);
  if (!selected) throw new Error("Unknown preference preset");
  return parsePreferenceV1(applyPreferencePatch(current, selected.patch));
}
/** Exact set AND unset comparison. Uncontrolled categories never influence the match. */
export function matchPreferencePreset(
  current: PreferenceV1,
  category: string,
): PreferencePresetV1 | null {
  const { values } = parsePreferenceV1(current);
  return (
    presetsForCategory(category).find(
      ({ patch }) =>
        Object.entries(patch.set).every(
          ([key, value]) => values[key as keyof typeof values] === value,
        ) && patch.unset.every((key) => !Object.hasOwn(values, key)),
    ) ?? null
  );
}
