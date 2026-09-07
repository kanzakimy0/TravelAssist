import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return nextResolve(specifier + ".ts", context);
      throw error;
    }
  },
});
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, tripReducer, currentPlan, visibleAreas } =
  await import("../src/features/planner/model/trip-model.ts");
const {
  settingsCategories,
  settingsDirtyCount,
  pendingSettingsCount,
  settingsImpact,
  secondaryPanelModel,
  isProtectedItem,
} = await import("../src/features/planner/model/secondary-panels.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
test("TASK-012 exactly seven settings categories", () =>
  assert.equal(settingsCategories.length, 7));
test("draft edits do not mutate opening snapshot", () => {
  const s = fixture(),
    before = structuredClone(s.configuration);
  const draft = tripReducer(s, { type: "level", key: "pace", value: 0 });
  assert.deepEqual(s.configuration, before);
  assert.equal(settingsDirtyCount(before, draft.configuration), 1);
});
test("cancel is lossless by discarding draft", () => {
  const s = fixture(),
    before = structuredClone(s);
  tripReducer(s, { type: "preference", group: "timing", quick: ["午休"] });
  assert.deepEqual(s, before);
});
test("save settings marks pending but does not change plans", () => {
  const s = fixture();
  const next = tripReducer(s, {
    type: "saveSettings",
    configuration: { ...s.configuration, budget: 3 },
  });
  assert.equal(pendingSettingsCount(next), 1);
  assert.equal(next.plans, s.plans);
});
test("repeated save compares against last generated baseline", () => {
  let s = fixture();
  s = tripReducer(s, {
    type: "saveSettings",
    configuration: { ...s.configuration, budget: 3 },
  });
  s = tripReducer(s, {
    type: "saveSettings",
    configuration: { ...s.configuration, pace: 0 },
  });
  assert.equal(pendingSettingsCount(s), 2);
});
test("return settings to baseline clears dirty count", () => {
  const s = fixture();
  let n = tripReducer(s, {
    type: "saveSettings",
    configuration: { ...s.configuration, budget: 3 },
  });
  n = tripReducer(n, { type: "saveSettings", configuration: s.configuration });
  assert.equal(pendingSettingsCount(n), 0);
});
test("impact protects confirmed bookings hotels locks and fixed times", () => {
  const s = fixture(),
    p = settingsImpact(s);
  assert.ok(p.protected.length);
  assert.ok(p.protected.every(isProtectedItem));
  assert.ok(p.movable.every((i) => !isProtectedItem(i)));
});
test("mock replan clears pending and preserves every item", () => {
  let s = fixture();
  s = tripReducer(s, {
    type: "saveSettings",
    configuration: { ...s.configuration, budget: 3 },
  });
  const n = tripReducer(s, { type: "replan" });
  assert.equal(pendingSettingsCount(n), 0);
  assert.deepEqual(n.plans, s.plans);
});
test("all six tabs survive map selection and inspection", () => {
  for (const tab of [
    "itinerary",
    "movement",
    "booking",
    "weather",
    "stayFood",
    "details",
  ]) {
    let s = fixture();
    s = tripReducer(s, { type: "ui", patch: { activeBottomTab: tab } });
    const i = currentPlan(s).items[0];
    s = tripReducer(s, { type: "select", id: i.id });
    s = tripReducer(s, { type: "inspect", id: i.placeId });
    assert.equal(s.ui.activeBottomTab, tab);
  }
});
test("secondary views follow selected day and three day range", () => {
  let s = tripReducer(fixture(), { type: "range", mode: "day", start: 2 });
  assert.deepEqual(
    secondaryPanelModel(s).rows.map((r) => r.day.day),
    [2],
  );
  s = tripReducer(s, { type: "range", mode: "threeDays", start: 1 });
  assert.equal(secondaryPanelModel(s).rows.length, 3);
});
test("all range bookings exclude ordinary flexible meals", () => {
  const s = tripReducer(fixture(), { type: "range", mode: "all" });
  assert.ok(
    secondaryPanelModel(s).bookings.every(
      (i) => i.type !== "restaurant" || i.fixedTime,
    ),
  );
});
test("plan switch derives new panel data without second state", () => {
  let s = fixture();
  s = tripReducer(s, { type: "plan", id: s.plans[1].id });
  assert.equal(secondaryPanelModel(s).plan.id, s.plans[1].id);
});
test("confirmed hotel hides recommended area and remains protected", () => {
  let s = fixture();
  s = tripReducer(s, {
    type: "add",
    placeId: "hotelArea-1-1",
    day: 1,
    reservation: true,
    nights: 1,
  });
  const hotel = currentPlan(s).items.find((i) => i.placeId === "hotelArea-1-1");
  s = tripReducer(s, {
    type: "provider",
    id: hotel.id,
    providerId: "official",
  });
  s = tripReducer(s, { type: "complete", id: hotel.id, time: hotel.startTime });
  assert.ok(
    isProtectedItem(currentPlan(s).items.find((i) => i.id === hotel.id)),
  );
  assert.ok(
    !visibleAreas(s).some((a) => a.type === "hotelArea" && a.day === hotel.day),
  );
});
test("recommendation component is byte-for-byte frozen from merged baseline", async () => {
  const file = "src/features/planner/components/plan-recommendation-list.tsx";
  const base = execFileSync("git", ["show", "4c1d9bb:" + file], {
    encoding: "utf8",
  }).replaceAll("\r\n", "\n");
  assert.equal((await readFile(file, "utf8")).replaceAll("\r\n", "\n"), base);
});
test("v05 does not reintroduce legacy conditions entry", async () => {
  for (const file of [
    "trip-quick-settings.tsx",
    "more-trip-settings-popover.tsx",
    "planner-right-panel.tsx",
  ]) {
    assert.ok(
      !(
        await readFile("src/features/planner/components/" + file, "utf8")
      ).includes("其他条件"),
    );
  }
});
test("gradients are CSS, noninteractive, and share one map component", async () => {
  const css = await readFile(
    "src/features/planner/planner-v05.module.css",
    "utf8",
  );
  assert.match(css, /linear-gradient/);
  assert.match(css, /pointer-events: none/);
  const shell = await readFile(
    "src/features/planner/components/trip-workspace.tsx",
    "utf8",
  );
  assert.equal((shell.match(/<PlannerMapShell/g) || []).length, 1);
});
