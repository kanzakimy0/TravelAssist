import {
  parseCompanionInputV1,
  parseCompanionGroupInputV1,
  derivePlanningAgeGroup,
  type MobilityNeedCode,
  type DiningNeedCode,
  type ActivityInterestCode,
} from "../domain/companion-v1";
import type {
  CompanionDraft,
  CompanionGroupDraft,
  CompanionViewModel,
  CompanionGroupViewModel,
} from "../companion-view-model";
import type {
  CompanionResource,
  CompanionGroupResource,
} from "./companion-resource";
export const OWNER_MEMBER_ID = "virtual-owner";
export const mobilityLabels: Record<MobilityNeedCode, string> = {
  reduce_walking: "少步行",
  reduce_stairs: "减少楼梯",
  stroller: "需要婴儿车",
  child_seat: "需要儿童座椅",
  accessible_route: "需要无障碍路线",
  more_rest: "需要更多休息",
};
export const diningLabels: Record<DiningNeedCode, string> = {
  dietary_restriction: "饮食限制",
  food_allergy_notice: "食物过敏提醒",
  vegetarian: "素食",
  child_meal: "儿童餐需求",
  other_dietary_need: "其他饮食说明",
};
export const activityLabels: Record<ActivityInterestCode, string> = {
  animals: "喜欢动物",
  outdoor: "喜欢户外",
  museums: "喜欢博物馆",
  photography: "喜欢拍照",
  rides: "喜欢游乐设施",
};
const genderLabels = { female: "女", male: "男", other: "其他" } as const;
function selected<T extends string>(
  labels: Record<T, string>,
  values: string[],
): T[] {
  return values.map((value) => {
    const entry = (Object.entries(labels) as [T, string][]).find(
      ([, label]) => value === label,
    );
    if (!entry) throw new Error("存在未识别的选项，请重新选择。");
    return entry[0];
  });
}
export function toCompanionView(
  resource: CompanionResource,
): CompanionViewModel {
  return {
    id: resource.id,
    displayName: resource.displayName,
    relationship: resource.relationshipLabel ?? resource.relationshipCode ?? "",
    dateOfBirth: resource.birthDate ?? undefined,
    ageGroup: resource.birthDate
      ? derivePlanningAgeGroup(
          resource.birthDate,
          new Date().toISOString().slice(0, 10),
        )
      : resource.ageGroupFallback!,
    gender: resource.genderCode ? genderLabels[resource.genderCode] : undefined,
    mobilityNeeds: resource.travelProfile.mobilityNeeds.map(
      (code) => mobilityLabels[code],
    ),
    diningNeeds: resource.travelProfile.diningNeeds.map(
      (code) => diningLabels[code],
    ),
    activityPreferences: resource.travelProfile.activityInterests.map(
      (code) => activityLabels[code],
    ),
  };
}
export function companionDraftInput(
  draft: CompanionDraft,
  previous?: CompanionResource,
) {
  if (draft.isSelf) throw new Error("本人资料请在个人资料页管理。");
  return parseCompanionInputV1(
    {
      displayName: draft.displayName.trim(),
      relationshipCode: previous?.relationshipCode ?? null,
      relationshipLabel:
        draft.relationship.trim() ===
        (previous?.relationshipLabel ?? previous?.relationshipCode ?? "")
          ? (previous?.relationshipLabel ?? null)
          : draft.relationship.trim() || null,
      birthDate: draft.dateOfBirth || null,
      ageGroupFallback: draft.dateOfBirth ? null : draft.ageGroup,
      genderCode: draft.gender
        ? selected(genderLabels, [draft.gender])[0]
        : null,
      avatarPath: previous?.avatarPath ?? null,
      travelProfile: {
        schemaVersion: "1.0",
        mobilityNeeds: selected(mobilityLabels, draft.mobilityNeeds),
        diningNeeds: selected(diningLabels, draft.diningNeeds),
        activityInterests: selected(activityLabels, draft.activityPreferences),
      },
    },
    new Date().toISOString().slice(0, 10),
  );
}
export function toGroupView(
  resource: CompanionGroupResource,
): CompanionGroupViewModel {
  return {
    id: resource.id,
    name: resource.name,
    description: "",
    companionIds: [
      ...(resource.includesOwner ? [OWNER_MEMBER_ID] : []),
      ...resource.memberIds,
    ],
  };
}
export function groupDraftInput(draft: CompanionGroupDraft) {
  return parseCompanionGroupInputV1({
    name: draft.name.trim(),
    includesOwner: draft.companionIds.includes(OWNER_MEMBER_ID),
    memberIds: draft.companionIds.filter((id) => id !== OWNER_MEMBER_ID),
  });
}
export const virtualOwner: CompanionViewModel = {
  id: OWNER_MEMBER_ID,
  displayName: "本人",
  relationship: "本人",
  ageGroup: "adult",
  mobilityNeeds: [],
  diningNeeds: [],
  activityPreferences: [],
  isSelf: true,
};
