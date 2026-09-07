export const ageGroupOptions = [
  { value: "adult", label: "成人" },
  { value: "child", label: "儿童" },
  { value: "infant", label: "幼儿" },
  { value: "senior", label: "长者" },
] as const;

export type AgeGroup = (typeof ageGroupOptions)[number]["value"];

export type CompanionViewModel = {
  id: string;
  displayName: string;
  relationship: string;
  dateOfBirth?: string;
  ageGroup: AgeGroup;
  gender?: string;
  avatarUrl?: string;
  mobilityNeeds: string[];
  diningNeeds: string[];
  activityPreferences: string[];
  diningNote?: string;
  privateNote?: string;
  isSelf?: boolean;
};

export type CompanionDraft = Omit<CompanionViewModel, "id" | "isSelf"> & {
  id?: string;
  isSelf?: boolean;
};

export type CompanionGroupViewModel = {
  id: string;
  name: string;
  companionIds: string[];
  description: string;
};

export type CompanionGroupDraft = Omit<CompanionGroupViewModel, "id"> & {
  id?: string;
};

export type CompanionCounts = Record<AgeGroup, number> & { total: number };

export const mobilityNeedOptions = [
  "少步行",
  "减少楼梯",
  "需要婴儿车",
  "需要儿童座椅",
  "需要无障碍路线",
  "需要更多休息",
] as const;

export const diningNeedOptions = [
  "饮食限制",
  "素食",
  "儿童餐需求",
  "其他饮食说明",
] as const;

export const activityPreferenceOptions = [
  "喜欢动物",
  "喜欢户外",
  "喜欢博物馆",
  "喜欢拍照",
  "喜欢游乐设施",
] as const;

export const ageGroupLabel = (ageGroup: AgeGroup) =>
  ageGroupOptions.find((option) => option.value === ageGroup)?.label ??
  ageGroup;

export function calculateCurrentAge(
  dateOfBirth: string | undefined,
  today = new Date(),
): number | null {
  if (!dateOfBirth) return null;
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  if (!year || !month || !day) return null;
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime()) || birth > today) return null;
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() < month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export function countCompanions(
  companions: CompanionViewModel[],
): CompanionCounts {
  const counts: CompanionCounts = {
    total: companions.length,
    adult: 0,
    child: 0,
    infant: 0,
    senior: 0,
  };
  for (const companion of companions) counts[companion.ageGroup] += 1;
  return counts;
}

export function companionSummaryTags(companion: CompanionViewModel) {
  const tags = [
    ...companion.mobilityNeeds,
    ...companion.diningNeeds,
    ...companion.activityPreferences,
  ];
  return { visible: tags.slice(0, 3), overflow: Math.max(0, tags.length - 3) };
}

export function validateCompanionDraft(draft: CompanionDraft) {
  const errors: { displayName?: string; ageGroup?: string } = {};
  if (!draft.displayName.trim()) errors.displayName = "请输入昵称或称呼。";
  if (!ageGroupOptions.some((option) => option.value === draft.ageGroup)) {
    errors.ageGroup = "请选择年龄层。";
  }
  return errors;
}

export function saveCompanion(
  companions: CompanionViewModel[],
  draft: CompanionDraft,
): CompanionViewModel[] {
  const saved: CompanionViewModel = {
    ...draft,
    id: draft.id ?? `companion-${Date.now()}`,
    displayName: draft.displayName.trim(),
    relationship: draft.relationship.trim(),
    isSelf: draft.isSelf ?? false,
  };
  const index = companions.findIndex((item) => item.id === saved.id);
  if (index < 0) return [...companions, saved];
  return companions.map((item) => (item.id === saved.id ? saved : item));
}

export function deleteCompanion(
  companions: CompanionViewModel[],
  companionId: string,
): CompanionViewModel[] {
  const target = companions.find((item) => item.id === companionId);
  if (!target || target.isSelf) return companions;
  return companions.filter((item) => item.id !== companionId);
}

export function validateGroupDraft(draft: CompanionGroupDraft) {
  const errors: { name?: string; companionIds?: string } = {};
  if (!draft.name.trim()) errors.name = "请输入组合名称。";
  if (draft.companionIds.length < 1) {
    errors.companionIds = "请至少选择 1 位成员。";
  }
  return errors;
}

export function saveCompanionGroup(
  groups: CompanionGroupViewModel[],
  draft: CompanionGroupDraft,
): CompanionGroupViewModel[] {
  const saved: CompanionGroupViewModel = {
    ...draft,
    id: draft.id ?? `group-${Date.now()}`,
    name: draft.name.trim(),
    description: draft.description.trim(),
    companionIds: [...draft.companionIds],
  };
  const index = groups.findIndex((group) => group.id === saved.id);
  if (index < 0) return [...groups, saved];
  return groups.map((group) => (group.id === saved.id ? saved : group));
}

export type SpecialNeedSummary = {
  label: string;
  companionIds: string[];
  people: string[];
};

export function summarizeSpecialNeeds(
  companions: CompanionViewModel[],
): SpecialNeedSummary[] {
  const summary = new Map<string, SpecialNeedSummary>();
  for (const companion of companions) {
    for (const label of [
      ...companion.mobilityNeeds,
      ...companion.diningNeeds,
    ]) {
      const current = summary.get(label) ?? {
        label,
        companionIds: [],
        people: [],
      };
      current.companionIds.push(companion.id);
      current.people.push(companion.displayName);
      summary.set(label, current);
    }
  }
  return [...summary.values()].sort(
    (left, right) => right.people.length - left.people.length,
  );
}

export function createTripCompanionSnapshot(
  companions: CompanionViewModel[],
  selectedIds: string[],
) {
  return companions
    .filter((companion) => selectedIds.includes(companion.id))
    .map((companion) => ({
      ...companion,
      mobilityNeeds: [...companion.mobilityNeeds],
      diningNeeds: [...companion.diningNeeds],
      activityPreferences: [...companion.activityPreferences],
    }));
}
