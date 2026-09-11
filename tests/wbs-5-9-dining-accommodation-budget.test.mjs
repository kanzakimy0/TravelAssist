import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  accommodationPreferenceOptions,
  accommodationPreferencesEqual,
  budgetPreferencesEqual,
  budgetSpendingOptions,
  cancelAccommodationPreferenceChanges,
  cancelBudgetPreferenceChanges,
  cancelDiningPreferenceChanges,
  createDefaultAccommodationPreferenceState,
  createDefaultBudgetPreferenceState,
  createDefaultDiningPreferenceState,
  diningPreferenceOptions,
  diningPreferencesEqual,
  restoreAccommodationPreferenceDefaults,
  restoreBudgetPreferenceDefaults,
  restoreDiningPreferenceDefaults,
  saveAccommodationPreference,
  saveBudgetPreference,
  saveDiningPreference,
  setAccommodationPreference,
  setBudgetSpendingTendency,
  setDiningPreference,
  summarizeAccommodationPreference,
  summarizeBudgetPreference,
  summarizeDiningPreference,
  toggleBudgetAllocation,
} from "../src/features/preferences/dining-accommodation-budget-preference-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("dining exposes only the three frozen presentation controls", () => {
  assert.deepEqual(Object.keys(diningPreferenceOptions), [
    "localCuisine",
    "smallShops",
    "queueTolerance",
  ]);
  assert.deepEqual(
    diningPreferenceOptions.localCuisine.map(({ label }) => label),
    ["优先", "一般", "不特别"],
  );
  assert.deepEqual(
    diningPreferenceOptions.smallShops.map(({ label }) => label),
    ["喜欢", "一般", "不特别"],
  );
  assert.deepEqual(
    diningPreferenceOptions.queueTolerance.map(({ label }) => label),
    ["较低", "中等", "较高"],
  );
});

test("default dining fixture and summary are stable", () => {
  const state = createDefaultDiningPreferenceState();
  assert.deepEqual(state, {
    localCuisine: "priority",
    smallShops: "like",
    queueTolerance: "medium",
  });
  assert.equal(
    summarizeDiningPreference(state),
    "当地料理 · 小店 · 排队接受中等",
  );
});

test("dining controls update independently and immutably", () => {
  const current = createDefaultDiningPreferenceState();
  const next = setDiningPreference(current, "queueTolerance", "high");
  assert.equal(current.queueTolerance, "medium");
  assert.equal(next.queueTolerance, "high");
  assert.equal(next.localCuisine, current.localCuisine);
  assert.equal(next.smallShops, current.smallShops);
  assert.equal(
    summarizeDiningPreference(next),
    "当地料理 · 小店 · 排队接受较高",
  );
});

test("dining save cancel restore and dirty equality use detached snapshots", () => {
  const original = createDefaultDiningPreferenceState();
  const draft = setDiningPreference(original, "localCuisine", "notSpecial");
  assert.equal(diningPreferencesEqual(original, draft), false);
  const saved = saveDiningPreference(draft);
  const cancelled = cancelDiningPreferenceChanges(saved);
  const restored = restoreDiningPreferenceDefaults();
  assert.deepEqual(saved, draft);
  assert.notStrictEqual(saved, draft);
  assert.deepEqual(cancelled, saved);
  assert.notStrictEqual(cancelled, saved);
  assert.deepEqual(restored, original);
});

test("accommodation exposes exactly one presentation-only three-level scale", () => {
  assert.deepEqual(
    accommodationPreferenceOptions.map(({ label }) => label),
    ["重视", "一般", "不特别"],
  );
});

test("default accommodation fixture and summary are stable", () => {
  const state = createDefaultAccommodationPreferenceState();
  assert.deepEqual(state, {
    transportConvenience: "value",
    comfort: "value",
    fewerHotelChanges: "value",
  });
  assert.equal(
    summarizeAccommodationPreference(state),
    "交通方便 · 舒适 · 少换酒店",
  );
});

test("accommodation dimensions update independently and do not create hotel enums", () => {
  const current = createDefaultAccommodationPreferenceState();
  const next = setAccommodationPreference(current, "comfort", "notSpecial");
  assert.equal(current.comfort, "value");
  assert.equal(next.comfort, "notSpecial");
  assert.equal(next.transportConvenience, "value");
  assert.equal(summarizeAccommodationPreference(next), "交通方便 · 少换酒店");
});

test("accommodation has an explicit no-prominent-preference summary", () => {
  let state = createDefaultAccommodationPreferenceState();
  state = setAccommodationPreference(state, "transportConvenience", "neutral");
  state = setAccommodationPreference(state, "comfort", "notSpecial");
  state = setAccommodationPreference(state, "fewerHotelChanges", "neutral");
  assert.equal(summarizeAccommodationPreference(state), "还没有明显的住宿偏好");
});

test("accommodation save cancel restore and dirty equality use detached snapshots", () => {
  const original = createDefaultAccommodationPreferenceState();
  const draft = setAccommodationPreference(original, "comfort", "neutral");
  assert.equal(accommodationPreferencesEqual(original, draft), false);
  const saved = saveAccommodationPreference(draft);
  const cancelled = cancelAccommodationPreferenceChanges(saved);
  assert.notStrictEqual(saved, draft);
  assert.notStrictEqual(cancelled, saved);
  assert.deepEqual(restoreAccommodationPreferenceDefaults(), original);
});

test("budget exposes exactly three overall spending tendencies", () => {
  assert.deepEqual(
    budgetSpendingOptions.map(({ label }) => label),
    ["较节省", "中等", "较宽松"],
  );
});

test("default budget fixture and summary are stable", () => {
  const state = createDefaultBudgetPreferenceState();
  assert.deepEqual(state, {
    spendingTendency: "moderate",
    prioritizeAccommodation: true,
    prioritizeExperience: true,
  });
  assert.equal(
    summarizeBudgetPreference(state),
    "中等预算 · 更愿意花在住宿和体验",
  );
});

test("budget allocations are independent and can both be off", () => {
  let state = createDefaultBudgetPreferenceState();
  state = toggleBudgetAllocation(state, "prioritizeAccommodation");
  assert.equal(summarizeBudgetPreference(state), "中等预算 · 更愿意花在体验");
  state = toggleBudgetAllocation(state, "prioritizeExperience");
  assert.equal(summarizeBudgetPreference(state), "中等预算");
});

test("budget tendency changes without creating a concrete amount", () => {
  const current = createDefaultBudgetPreferenceState();
  const next = setBudgetSpendingTendency(current, "flexible");
  assert.equal(current.spendingTendency, "moderate");
  assert.equal(
    summarizeBudgetPreference(next),
    "较宽松预算 · 更愿意花在住宿和体验",
  );
});

test("budget save cancel restore and dirty equality use detached snapshots", () => {
  const original = createDefaultBudgetPreferenceState();
  const draft = toggleBudgetAllocation(original, "prioritizeExperience");
  assert.equal(budgetPreferencesEqual(original, draft), false);
  const saved = saveBudgetPreference(draft);
  const cancelled = cancelBudgetPreferenceChanges(saved);
  assert.notStrictEqual(saved, draft);
  assert.notStrictEqual(cancelled, saved);
  assert.deepEqual(restoreBudgetPreferenceDefaults(), original);
});

test("all default factories return independent state", () => {
  const diningA = createDefaultDiningPreferenceState();
  const diningB = createDefaultDiningPreferenceState();
  diningA.localCuisine = "notSpecial";
  assert.equal(diningB.localCuisine, "priority");

  const accommodationA = createDefaultAccommodationPreferenceState();
  const accommodationB = createDefaultAccommodationPreferenceState();
  accommodationA.comfort = "neutral";
  assert.equal(accommodationB.comfort, "value");

  const budgetA = createDefaultBudgetPreferenceState();
  const budgetB = createDefaultBudgetPreferenceState();
  budgetA.prioritizeExperience = false;
  assert.equal(budgetB.prioritizeExperience, true);
});

test("the three routes replace generic shells while 5.7 and 5.8 stay split", () => {
  const route = read(
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
  );
  assert.match(route, /category === "dining"/);
  assert.match(route, /<DiningPreferencePage \/>/);
  assert.match(route, /category === "accommodation"/);
  assert.match(route, /<AccommodationPreferencePage \/>/);
  assert.match(route, /category === "budget"/);
  assert.match(route, /<BudgetPreferencePage \/>/);
  assert.match(route, /category === "mobility"/);
  assert.match(route, /<MobilityPreferencePage \/>/);
  assert.match(route, /category === "attractions"/);
  assert.match(route, /<AttractionActivityPreferencePage \/>/);
  assert.match(route, /<PreferenceCategoryPage/);
});

test("category pages delegate canonical controls and retain shared dirty guard", () => {
  const page = read(
    "src/features/preferences/persistence/canonical-preference-editor.tsx",
  );
  assert.match(page, /GuardedLink/);
  assert.match(page, /setIsDirty\(isDirty\)/);
  for (const level of ["large", "middle", "small"])
    assert.ok(page.includes('data-preference-level="' + level + '"'));
  assert.match(page, /usePreferenceResource/);
  assert.doesNotMatch(page, /createDefault|Mock \/ in-memory only/);
});

test("canonical category controls keep unsupported Trip and detailed fields out", () => {
  const page = read(
    "src/features/preferences/persistence/canonical-preference-editor.tsx",
  );
  assert.match(page, /本次旅行或同行人的临时选择不会覆盖这里/);
  assert.match(page, /keysForPage\(category\)/);
  assert.doesNotMatch(
    page,
    /hotelStar|roomType|bedType|dailyAmount|totalAmount|currencyInput|tripTemporary/,
  );
});

test("implementation uses all three repository assets", () => {
  const page =
    read(
      "src/features/preferences/dining-accommodation-budget-preference-page.tsx",
    ) +
    read(
      "src/features/preferences/persistence/canonical-preference-editor.tsx",
    ) +
    read("src/features/preferences/persistence/preference-adapter.ts");
  for (const asset of [
    "public/media/personal-center/preferences/category-dining.png",
    "public/media/personal-center/preferences/category-accommodation.webp",
    "public/media/personal-center/preferences/category-budget.png",
  ]) {
    assert.equal(
      existsSync(new URL(`../${asset}`, import.meta.url)),
      true,
      asset,
    );
    assert.match(
      page,
      new RegExp(asset.split("/").at(-1).replaceAll(".", "\\.")),
    );
  }
});

test("legacy category fixtures remain pure and unsupported fields stay absent", () => {
  const files = [
    read(
      "src/features/preferences/dining-accommodation-budget-preference-page.tsx",
    ),
    read(
      "src/features/preferences/dining-accommodation-budget-preference-model.ts",
    ),
  ].join("\n");
  assert.doesNotMatch(
    files,
    /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|indexedDB|supabase|prisma|drizzle/,
  );
  assert.doesNotMatch(
    files,
    /allergenSchema|cuisineEnum|hotelStar|roomType|bedType|dailyAmount|totalAmount|currencyInput|plannerWeight/,
  );
});
