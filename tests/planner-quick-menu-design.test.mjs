import assert from "node:assert/strict";
import test from "node:test";
import { preferenceDefinitions } from "../src/features/planner/data/planner-preferences.ts";
import {
  quickMenuSections,
  detailCompletion,
} from "../src/features/planner/data/quick-menu-sections.ts";

for (const group of ["sights", "food", "stay"]) {
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
