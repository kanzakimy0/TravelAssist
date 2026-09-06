import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  calculateCurrentAge,
  companionSummaryTags,
  countCompanions,
  createTripCompanionSnapshot,
  deleteCompanion,
  saveCompanion,
  saveCompanionGroup,
  summarizeSpecialNeeds,
  validateCompanionDraft,
  validateGroupDraft,
} from "../src/features/companions/companion-view-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const initialCompanions = [
  {
    id: "self-yuki",
    displayName: "Yuki",
    relationship: "本人",
    ageGroup: "adult",
    mobilityNeeds: [],
    diningNeeds: [],
    activityPreferences: ["喜欢拍照"],
    isSelf: true,
  },
  {
    id: "haru",
    displayName: "Haru",
    relationship: "家庭成员",
    ageGroup: "child",
    mobilityNeeds: ["需要儿童座椅", "少步行"],
    diningNeeds: ["儿童餐需求"],
    activityPreferences: ["喜欢动物"],
  },
  {
    id: "sora",
    displayName: "Sora",
    relationship: "家庭成员",
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
    activityPreferences: ["喜欢博物馆"],
  },
];

const initialCompanionGroups = [
  {
    id: "family",
    name: "家庭出游",
    companionIds: ["self-yuki", "haru", "sora"],
    description: "亲子旅行",
  },
  {
    id: "two-person",
    name: "双人旅行",
    companionIds: ["self-yuki", "aoi"],
    description: "慢旅行",
  },
];
const cloneCompanions = () =>
  initialCompanions.map((item) => ({
    ...item,
    mobilityNeeds: [...item.mobilityNeeds],
    diningNeeds: [...item.diningNeeds],
    activityPreferences: [...item.activityPreferences],
  }));

test("self companion cannot be deleted", () => {
  const companions = cloneCompanions();
  assert.strictEqual(deleteCompanion(companions, "self-yuki"), companions);
  assert.equal(
    deleteCompanion(companions, "haru").some((item) => item.id === "haru"),
    false,
  );
});

test("cards expose at most three summary tags plus overflow", () => {
  const summary = companionSummaryTags(
    initialCompanions.find((item) => item.id === "haru"),
  );
  assert.equal(summary.visible.length, 3);
  assert.equal(summary.overflow, 1);
});

test("summary counts adult child infant and senior without gender split", () => {
  assert.deepEqual(countCompanions(initialCompanions), {
    total: 4,
    adult: 1,
    child: 1,
    infant: 1,
    senior: 1,
  });
});

test("DOB age is derived by a pure calendar function", () => {
  assert.equal(calculateCurrentAge("2018-04-18", new Date(2026, 3, 17)), 7);
  assert.equal(calculateCurrentAge("2018-04-18", new Date(2026, 3, 18)), 8);
  assert.equal(calculateCurrentAge(undefined, new Date(2026, 0, 1)), null);
});

test("age group never creates inferred travel needs", () => {
  const child = {
    id: "child-without-needs",
    displayName: "Mio",
    relationship: "家人",
    ageGroup: "child",
    mobilityNeeds: [],
    diningNeeds: [],
    activityPreferences: [],
  };
  assert.deepEqual(companionSummaryTags(child), { visible: [], overflow: 0 });
  assert.deepEqual(summarizeSpecialNeeds([child]), []);
});

test("companion add validation, create and edit are deterministic", () => {
  const invalid = {
    displayName: " ",
    relationship: "",
    ageGroup: "adult",
    mobilityNeeds: [],
    diningNeeds: [],
    activityPreferences: [],
  };
  assert.equal(
    validateCompanionDraft(invalid).displayName,
    "请输入昵称或称呼。",
  );
  const created = saveCompanion([], {
    ...invalid,
    displayName: "Ren",
    id: "ren",
  });
  const edited = saveCompanion(created, {
    ...created[0],
    relationship: "朋友",
  });
  assert.equal(edited.length, 1);
  assert.equal(edited[0].relationship, "朋友");
});

test("group requires one member and supports create/edit", () => {
  assert.equal(
    validateGroupDraft({ name: "家庭", description: "", companionIds: [] })
      .companionIds,
    "请至少选择 1 位成员。",
  );
  const created = saveCompanionGroup([], {
    id: "weekend",
    name: "周末",
    description: "散步",
    companionIds: ["self-yuki"],
  });
  const edited = saveCompanionGroup(created, {
    ...created[0],
    name: "周末双人",
    companionIds: ["self-yuki", "aoi"],
  });
  assert.equal(edited.length, 1);
  assert.equal(edited[0].name, "周末双人");
  assert.equal(edited[0].companionIds.length, 2);
});

test("special-needs summary counts people and exposes names only", () => {
  const summary = summarizeSpecialNeeds(initialCompanions);
  const seat = summary.find((item) => item.label === "需要儿童座椅");
  assert.deepEqual(seat?.people, ["Haru", "Sora"]);
  assert.equal(seat?.companionIds.length, 2);
});

test("private dining and health notes never enter list summaries", () => {
  const companion = {
    ...initialCompanions[1],
    diningNote: "private-allergen-detail",
    privateNote: "private-health-detail",
  };
  const summary = JSON.stringify(companionSummaryTags(companion));
  assert.doesNotMatch(summary, /private-allergen-detail|private-health-detail/);
});

test("Trip snapshots are isolated copies and never write back to long-term state", () => {
  const companions = cloneCompanions();
  const snapshot = createTripCompanionSnapshot(companions, ["haru"]);
  snapshot[0].mobilityNeeds.push("本次临时调整");
  snapshot[0].displayName = "Trip-only Haru";
  assert.equal(companions[1].displayName, "Haru");
  assert.equal(companions[1].mobilityNeeds.includes("本次临时调整"), false);
});

test("runtime stays page-scoped and mock-only", () => {
  const center = read("src/features/companions/companion-center.tsx");
  const route = read("src/app/(account)/personal-center/companions/page.tsx");
  assert.doesNotMatch(route, /PersonalPlaceholder/);
  assert.match(center, /usePersonalNavigationGuard/);
  assert.match(center, /beforeunload|setIsDirty/);
  assert.match(center, /恢复默认头像/);
  assert.match(center, /您还有尚未保存的修改/);
  assert.doesNotMatch(
    `${center}\n${read("src/features/companions/companion-view-model.ts")}`,
    /localStorage|sessionStorage|fetch\(|cookies?\(|supabase|prisma|route\.ts/i,
  );
  assert.equal(initialCompanionGroups.length >= 2, true);
});
