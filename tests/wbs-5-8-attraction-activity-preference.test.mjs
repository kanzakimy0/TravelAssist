import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  attractionActivityPreferencesEqual,
  attractionPreferenceDimensions,
  attractionPreferenceLevels,
  cancelAttractionActivityPreferenceChanges,
  createDefaultAttractionActivityPreferenceState,
  createUnsetAttractionActivityPreferenceState,
  restoreAttractionActivityPreferenceDefaults,
  saveAttractionActivityPreference,
  setAttractionPreferenceLevel,
  summarizeAttractionActivityPreference,
  togglePhotoExperience,
} from "../src/features/preferences/attraction-activity-preference-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("six attraction dimensions are frozen in the required order", () => {
  assert.deepEqual(
    attractionPreferenceDimensions.map(({ label }) => label),
    ["自然", "历史", "人文", "艺术", "摄影", "活动体验"],
  );
});

test("there is no seventh formal attraction dimension", () => {
  assert.equal(attractionPreferenceDimensions.length, 6);
});

test("all dimension descriptions match the frozen meaning", () => {
  assert.deepEqual(
    attractionPreferenceDimensions.map(({ description }) => description),
    [
      "山川、湖泊、海岸、公园、自然景观",
      "古迹、历史建筑、遗址、寺社、博物馆等历史内容",
      "街区、市场、当地生活、社区文化、传统生活方式",
      "美术馆、设计、建筑、演出、艺术空间",
      "取景价值、摄影体验、光线 / 景观导向活动",
      "手作、户外、节庆、娱乐、参与式体验",
    ],
  );
});

test("quick presentation exposes exactly four preference levels", () => {
  assert.deepEqual(
    attractionPreferenceLevels.map(({ label }) => label),
    ["很喜欢", "喜欢", "一般", "不喜欢"],
  );
});

test("default UI fixture is stable", () => {
  assert.deepEqual(createDefaultAttractionActivityPreferenceState(), {
    dimensions: {
      nature: "veryLike",
      history: "like",
      culture: "like",
      art: "neutral",
      photography: "veryLike",
      activityExperience: "neutral",
    },
    photoExperience: true,
  });
});

test("default factory returns independent nested state", () => {
  const first = createDefaultAttractionActivityPreferenceState();
  const second = createDefaultAttractionActivityPreferenceState();
  first.dimensions.nature = "dislike";
  assert.equal(second.dimensions.nature, "veryLike");
});

test("unset is represented separately from dislike", () => {
  const unset = createUnsetAttractionActivityPreferenceState();
  assert.equal(unset.dimensions.nature, "unset");
  const disliked = setAttractionPreferenceLevel(unset, "nature", "dislike");
  assert.equal(disliked.dimensions.nature, "dislike");
  assert.notEqual(disliked.dimensions.nature, unset.dimensions.nature);
});

test("a single dimension can change without affecting the others", () => {
  const current = createDefaultAttractionActivityPreferenceState();
  const next = setAttractionPreferenceLevel(current, "art", "veryLike");
  assert.equal(next.dimensions.art, "veryLike");
  assert.equal(next.dimensions.nature, current.dimensions.nature);
  assert.equal(next.dimensions.history, current.dimensions.history);
});

test("dimension updates are immutable", () => {
  const current = createDefaultAttractionActivityPreferenceState();
  const next = setAttractionPreferenceLevel(current, "nature", "dislike");
  assert.equal(current.dimensions.nature, "veryLike");
  assert.equal(next.dimensions.nature, "dislike");
  assert.notStrictEqual(next.dimensions, current.dimensions);
});

test("multiple dimensions can be edited independently", () => {
  let state = createUnsetAttractionActivityPreferenceState();
  state = setAttractionPreferenceLevel(state, "nature", "like");
  state = setAttractionPreferenceLevel(state, "photography", "veryLike");
  state = setAttractionPreferenceLevel(state, "history", "dislike");
  assert.deepEqual(
    [
      state.dimensions.nature,
      state.dimensions.photography,
      state.dimensions.history,
    ],
    ["like", "veryLike", "dislike"],
  );
});

test("default summary contains no more than three entries", () => {
  assert.equal(
    summarizeAttractionActivityPreference(
      createDefaultAttractionActivityPreferenceState(),
    ),
    "自然 · 摄影 · 历史",
  );
});

test("summary prioritizes veryLike before like", () => {
  let state = createUnsetAttractionActivityPreferenceState();
  state = setAttractionPreferenceLevel(state, "nature", "like");
  state = setAttractionPreferenceLevel(state, "history", "like");
  state = setAttractionPreferenceLevel(state, "art", "veryLike");
  assert.equal(
    summarizeAttractionActivityPreference(state),
    "艺术 · 自然 · 历史",
  );
});

test("summary uses fixed dimension order within the same level", () => {
  let state = createUnsetAttractionActivityPreferenceState();
  for (const { key } of attractionPreferenceDimensions) {
    state = setAttractionPreferenceLevel(state, key, "like");
  }
  assert.equal(
    summarizeAttractionActivityPreference(state),
    "自然 · 历史 · 人文",
  );
});

test("neutral dislike and unset do not enter the main summary", () => {
  let state = createUnsetAttractionActivityPreferenceState();
  state = setAttractionPreferenceLevel(state, "nature", "neutral");
  state = setAttractionPreferenceLevel(state, "history", "dislike");
  assert.equal(
    summarizeAttractionActivityPreference(state),
    "还没有明显的景点偏好",
  );
});

test("summary maximum is clamped to three", () => {
  const summary = summarizeAttractionActivityPreference(
    createDefaultAttractionActivityPreferenceState(),
    99,
  );
  assert.equal(summary.split(" · ").length, 3);
});

test("summary supports a single-item display limit", () => {
  assert.equal(
    summarizeAttractionActivityPreference(
      createDefaultAttractionActivityPreferenceState(),
      1,
    ),
    "自然",
  );
});

test("photo experience toggles independently", () => {
  const current = createDefaultAttractionActivityPreferenceState();
  const next = togglePhotoExperience(current);
  assert.equal(current.photoExperience, true);
  assert.equal(next.photoExperience, false);
  assert.deepEqual(next.dimensions, current.dimensions);
});

test("save creates a detached in-memory snapshot", () => {
  const draft = setAttractionPreferenceLevel(
    createDefaultAttractionActivityPreferenceState(),
    "culture",
    "dislike",
  );
  const saved = saveAttractionActivityPreference(draft);
  assert.deepEqual(saved, draft);
  assert.notStrictEqual(saved, draft);
  assert.notStrictEqual(saved.dimensions, draft.dimensions);
});

test("cancel restores a detached saved snapshot", () => {
  const saved = togglePhotoExperience(
    createDefaultAttractionActivityPreferenceState(),
  );
  const restored = cancelAttractionActivityPreferenceChanges(saved);
  assert.deepEqual(restored, saved);
  assert.notStrictEqual(restored, saved);
});

test("restore returns the UI fixture without mutating saved state", () => {
  const saved = createUnsetAttractionActivityPreferenceState();
  const restored = restoreAttractionActivityPreferenceDefaults();
  assert.deepEqual(restored, createDefaultAttractionActivityPreferenceState());
  assert.equal(saved.dimensions.nature, "unset");
});

test("dirty equality checks all dimensions and photo experience", () => {
  const state = createDefaultAttractionActivityPreferenceState();
  assert.equal(attractionActivityPreferencesEqual(state, { ...state }), true);
  assert.equal(
    attractionActivityPreferencesEqual(state, togglePhotoExperience(state)),
    false,
  );
  assert.equal(
    attractionActivityPreferencesEqual(
      state,
      setAttractionPreferenceLevel(state, "activityExperience", "dislike"),
    ),
    false,
  );
});

test("attractions route is split while mobility and generic shells remain", () => {
  const route = read(
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
  );
  assert.match(route, /category === "attractions"/);
  assert.match(route, /<AttractionActivityPreferencePage \/>/);
  assert.match(route, /category === "mobility"/);
  assert.match(route, /<MobilityPreferencePage \/>/);
  assert.match(route, /<PreferenceCategoryPage/);
});

test("page uses guarded navigation and the shared dirty-state provider", () => {
  const page = read(
    "src/features/preferences/attraction-activity-preference-page.tsx",
  );
  assert.match(page, /GuardedLink/);
  assert.match(page, /setIsDirty\(isDirty\)/);
  const guard = read(
    "src/features/personal-center/components/navigation-guard-context.tsx",
  );
  assert.match(guard, /beforeunload/);
});

test("page renders the frozen photo preference and explicit boundaries", () => {
  const page = read(
    "src/features/preferences/attraction-activity-preference-page.tsx",
  );
  assert.match(page, /旅行中希望主动安排拍照体验/);
  assert.match(page, /更重视取景价值、光线条件和拍照停留体验。/);
  assert.match(page, /<dt>Persistence<\/dt>[\s\S]*Mock \/ in-memory only/);
  assert.match(
    page,
    /<dt>Formal Preference Schema<\/dt>[\s\S]*Not implemented/,
  );
  assert.match(page, /<dt>Planner Contract<\/dt>[\s\S]*Not implemented/);
});

test("page maps the A and B three-level preference hierarchy", () => {
  const page = read(
    "src/features/preferences/attraction-activity-preference-page.tsx",
  );
  assert.match(page, /aria-label="景点偏好三级菜单"/);
  assert.match(page, /Level 1 · 大项目[\s\S]*景点与活动/);
  assert.match(page, /Level 2 · 中项目[\s\S]*六维快速设置/);
  assert.match(page, /Level 3 · 小项目[\s\S]*体验详细设置/);
  assert.match(page, /data-preference-level="large"/);
  assert.match(page, /data-preference-level="middle"/);
  assert.match(page, /data-preference-level="small"/);
});

test("detail scope separates long-term trip companion and future concepts", () => {
  const page = read(
    "src/features/preferences/attraction-activity-preference-page.tsx",
  );
  assert.match(page, /“我通常喜欢怎样的景点与活动”/);
  assert.match(page, /data-scope="available"/);
  assert.match(page, /大项目：当前景点与活动摘要/);
  assert.match(page, /中项目：六维喜好快速设置/);
  assert.match(page, /小项目：拍照体验详细设置/);
  assert.match(page, /data-scope="trip"/);
  assert.match(page, /必去 \/ 希望去 \/ 可去 \/ 不去与具体地点锁定/);
  assert.match(page, /日出、日落、夜景、黄金时段与拍照停留/);
  assert.match(page, /不会从本页写入或反向覆盖长期偏好/);
  assert.match(page, /data-scope="companion"/);
  assert.match(page, /与当前用户的长期偏好分开/);
  assert.match(page, /data-scope="future"/);
  assert.match(page, /候选范围，不是当前已保存字段/);
});

test("implementation reuses the repository attraction image", () => {
  const page = read(
    "src/features/preferences/attraction-activity-preference-page.tsx",
  );
  assert.match(
    page,
    /\/media\/personal-center\/preferences\/category-attractions\.webp/,
  );
});

test("no score weight percentage or durable storage contract is introduced", () => {
  const files = [
    read("src/features/preferences/attraction-activity-preference-page.tsx"),
    read("src/features/preferences/attraction-activity-preference-model.ts"),
  ].join("\n");
  assert.doesNotMatch(
    files,
    /goldenHourWeight|photoStopMinutes|cameraType|photoScore|4\.5\/5|percentage|plannerWeight/,
  );
  assert.doesNotMatch(
    files,
    /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|indexedDB|tripTemporary/,
  );
});
