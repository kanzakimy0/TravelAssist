import { mockPersonalUser } from "@/features/personal-center/constants/personal-navigation";

import type {
  CompanionGroupViewModel,
  CompanionViewModel,
} from "./companion-view-model";

export const initialCompanions: CompanionViewModel[] = [
  {
    id: "self-yuki",
    displayName: mockPersonalUser.name,
    relationship: "本人",
    dateOfBirth: "1995-08-12",
    ageGroup: "adult",
    gender: "女",
    avatarUrl: mockPersonalUser.avatar,
    mobilityNeeds: [],
    diningNeeds: [],
    activityPreferences: ["喜欢拍照", "喜欢博物馆"],
    isSelf: true,
  },
  {
    id: "haru",
    displayName: "Haru",
    relationship: "家庭成员",
    dateOfBirth: "2018-04-18",
    ageGroup: "child",
    mobilityNeeds: ["需要儿童座椅", "少步行"],
    diningNeeds: ["儿童餐需求"],
    activityPreferences: ["喜欢动物"],
  },
  {
    id: "sora",
    displayName: "Sora",
    relationship: "家庭成员",
    dateOfBirth: "2024-02-06",
    ageGroup: "infant",
    mobilityNeeds: ["需要婴儿车", "需要儿童座椅", "需要更多休息"],
    diningNeeds: [],
    activityPreferences: ["喜欢户外"],
  },
  {
    id: "aoi",
    displayName: "Aoi",
    relationship: "家人",
    ageGroup: "senior",
    mobilityNeeds: ["减少楼梯"],
    diningNeeds: ["素食"],
    activityPreferences: ["喜欢博物馆", "喜欢拍照"],
  },
];

export const initialCompanionGroups: CompanionGroupViewModel[] = [
  {
    id: "family",
    name: "家庭出游",
    companionIds: ["self-yuki", "haru", "sora"],
    description: "适合亲子旅行与轻松周末",
  },
  {
    id: "two-person",
    name: "双人旅行",
    companionIds: ["self-yuki", "aoi"],
    description: "适合文化体验与慢节奏旅程",
  },
];

export const createEmptyCompanionDraft = () => ({
  displayName: "",
  relationship: "",
  dateOfBirth: "",
  ageGroup: "adult" as const,
  gender: "",
  avatarUrl: undefined,
  mobilityNeeds: [],
  diningNeeds: [],
  activityPreferences: [],
  diningNote: "",
  privateNote: "",
});
