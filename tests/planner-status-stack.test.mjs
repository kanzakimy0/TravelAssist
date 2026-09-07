import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (file) =>
  readFileSync(
    new URL("../src/features/planner/" + file, import.meta.url),
    "utf8",
  );

test("AI action buttons never share marker dimensions", () => {
  const css = read("detail-workspace.module.css");
  const actions = css.match(
    /\.aiActions button,\s*\.adjustmentPreview button,\s*\.itemDialog button\s*\{([^}]+)\}/,
  )?.[1];
  assert.ok(actions);
  assert.match(actions, /min-height: 38px/);
  assert.doesNotMatch(actions, /width: 12px|height: 12px/);
});
test("resolved advice is omitted and reservation promotes to second row", () => {
  const board = read("components/detail-itinerary-board.tsx");
  assert.match(board, /const hasAdvice = item.aiStatus !== "normal"/);
  assert.match(board, /\{hasAdvice &&/);
  assert.match(board, /data-primary-status=\{!hasAdvice \|\| undefined\}/);
  assert.match(board, /data-missing-arrangement/);
  assert.match(board, /area.day === day/);
  assert.match(board, /"hotelArea" : "foodArea"/);
});
test("expanded search uses the existing field while compact search retains its popover", () => {
  const header = read("components/workspace-header.tsx");
  assert.match(header, /searchInput.current\?\.getClientRects\(\).length/);
  assert.match(header, /setSearchNotice\(true\)/);
  assert.match(header, /else setOpen\("search"\)/);
});
