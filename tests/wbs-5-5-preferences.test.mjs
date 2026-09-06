import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyTripTemporaryPreference,
  attractionAxisLabels,
  createDefaultPreferenceState,
  createResetPreferenceState,
  describePreference,
  levelWeight,
  preferenceCategoryKeys,
  radarPolygonPoints,
  travelStyleAxisLabels,
} from "../src/features/preferences/preference-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("WBS 5.5 freezes both six-axis portraits and semantic levels", () => {
  assert.deepEqual(attractionAxisLabels, [
    "自然",
    "历史",
    "人文",
    "艺术",
    "摄影",
    "活动体验",
  ]);
  assert.deepEqual(travelStyleAxisLabels, [
    "轻松",
    "经典",
    "计划",
    "探索",
    "参与",
    "深度",
  ]);
  assert.ok(levelWeight("unset") < levelWeight("low"));
  assert.notEqual(levelWeight("unset"), levelWeight("low"));
});

test("radar geometry creates six finite vertices", () => {
  const state = createDefaultPreferenceState();
  const points = radarPolygonPoints(state.attractions).split(" ");
  assert.equal(points.length, 6);
  for (const point of points) {
    const [x, y] = point.split(",").map(Number);
    assert.ok(Number.isFinite(x));
    assert.ok(Number.isFinite(y));
    assert.ok(x >= 0 && x <= 340);
    assert.ok(y >= 0 && y <= 300);
  }
});

test("portrait summary selects only the strongest two to four traits", () => {
  const summary = describePreference(createDefaultPreferenceState());
  assert.equal(
    summary,
    "偏爱自然与摄影相关的目的地，享受计划、深度的旅行方式。",
  );
  for (const omitted of [
    "历史",
    "人文",
    "艺术",
    "轻松",
    "经典",
    "探索",
    "参与",
  ])
    assert.doesNotMatch(summary, new RegExp(omitted));
});

test("reset clears radar semantics, summary and category presentation state", () => {
  const reset = createResetPreferenceState();
  assert.ok(
    [...reset.attractions, ...reset.travelStyle].every(
      (axis) => axis.level === "unset",
    ),
  );
  assert.ok(
    reset.categories.every((category) => category.summary === "未设置"),
  );
  assert.equal(describePreference(reset), null);
});

test("all category routes are stable and include advanced settings", () => {
  assert.deepEqual(preferenceCategoryKeys, [
    "mobility",
    "attractions",
    "dining",
    "accommodation",
    "budget",
    "experience",
  ]);
  const route = read(
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
  );
  assert.match(route, /\.\.\.preferenceCategoryKeys, "advanced"/);
});

test("trip temporary preferences remain isolated from long-term state", () => {
  const longTerm = createDefaultPreferenceState();
  const temporaryAttractions = longTerm.attractions.map((axis) => ({
    ...axis,
    level: "low",
  }));
  const result = applyTripTemporaryPreference(longTerm, {
    attractions: temporaryAttractions,
  });

  assert.equal(longTerm.attractions[0].level, "veryLike");
  assert.equal(result.longTerm.attractions[0].level, "veryLike");
  assert.equal(result.tripTemporary.attractions?.[0].level, "low");
  result.longTerm.attractions[0].level = "unset";
  assert.equal(longTerm.attractions[0].level, "veryLike");
});

test("overview exposes required content without persistence or schema expansion", () => {
  const center = read("src/features/preferences/preference-center.tsx");
  const model = read("src/features/preferences/preference-model.ts");
  const radar = read("src/features/preferences/preference-radar.tsx");

  for (const text of [
    "重置偏好",
    "重置长期偏好？",
    "这只会重置您的长期旅行偏好，不会删除账户、同行人或已保存的旅行。",
    "还没有形成完整的旅行画像",
    "开始设置偏好",
  ]) {
    assert.match(center, new RegExp(text.replace(/[？。]/g, ".")));
  }
  for (const title of [
    "移动",
    "景点与活动",
    "餐饮",
    "住宿",
    "预算",
    "旅行体验",
  ]) {
    assert.match(model, new RegExp(`title: "${title}"`));
  }
  assert.match(radar, /role="img"/);
  assert.match(radar, /tabIndex=\{0\}/);
  assert.doesNotMatch(
    `${center}\n${model}`,
    /localStorage|sessionStorage|fetch\(|cookies?\(|prisma|supabase|route\.ts/i,
  );
});
