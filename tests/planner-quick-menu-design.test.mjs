import assert from "node:assert/strict";
import test from "node:test";
import { quickDetailOptions } from "../src/features/planner/data/quick-detail-options.ts";
import { preferenceDefinitions } from "../src/features/planner/data/planner-preferences.ts";
import {
  quickMenuSections,
  detailCompletion,
} from "../src/features/planner/data/quick-menu-sections.ts";

for (const group of ["sights", "food", "stay"]) {
  test(`${group} detail choices cover all fields with at most two manual entries`, () => {
    const options = quickDetailOptions[group];
    assert.deepEqual(
      Object.keys(options).sort(),
      [...preferenceDefinitions[group].details].sort(),
    );
    const manual = Object.values(options).filter((option) => option.manual);
    assert.ok(manual.length >= 1 && manual.length <= 2);
    for (const option of Object.values(options)) {
      assert.ok(option.manual || option.choices.length >= 2);
      assert.equal(option.choices.length, new Set(option.choices).size);
      assert.ok(
        option.choices.every((choice) => choice.trim() && choice.length <= 160),
      );
    }
  });
  for (const level of ["quick", "details"]) {
    test(`${group} ${level} presentation includes every original key exactly once`, () => {
      const keys = quickMenuSections[group][level].flatMap(
        (section) => section.keys,
      );
      assert.equal(keys.length, new Set(keys).size);
      assert.deepEqual(
        [...keys].sort(),
        [...preferenceDefinitions[group][level]].sort(),
      );
    });
  }
}
test("detail progress counts only populated existing keys without changing values", () => {
  const values = { 必去: "京都", 夜景: "  ", unknown: "custom" };
  const original = JSON.stringify(values);
  assert.equal(detailCompletion("sights", values), 1);
  assert.equal(JSON.stringify(values), original);
});
