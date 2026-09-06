import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) =>
  readFile(new URL(`../src/features/planner/${path}`, import.meta.url), "utf8");

test("planner menus escape transformed and clipped ancestors through the top layer", async () => {
  const popover = await source("components/planner-popover.tsx");
  assert.match(popover, /popover="manual"/);
  assert.ok(
    popover.indexOf("element.showPopover()") <
      popover.indexOf("function position()"),
  );
  assert.match(popover, /element.hidePopover\(\)/);
  assert.match(
    await source("planner.module.css"),
    /\.popover::backdrop\s*\{\s*pointer-events: none;/,
  );
});

test("desktop execution dock uses a true quarter viewport without Day summary", async () => {
  const css = await source("planner.module.css");
  assert.match(css, /grid-template-rows: minmax\(0, 1fr\) 25dvh/);
  assert.doesNotMatch(
    await source("components/bottom-execution-panel.tsx"),
    /executionSummary/,
  );
  assert.match(css, /\.bottomSlot\s*\{[^}]*padding: 0;/);
});

test("three-day control stays compact and reuses accessible popover dismissal", async () => {
  const selector = await source("components/day-range-selector.tsx");
  assert.match(
    selector,
    /D\$\{state\.threeDayStart\}-D\$\{state\.threeDayStart \+ 2\}/,
  );
  assert.match(selector, /id="day-choices"\s+compact/);
  const popover = await source("components/planner-popover.tsx");
  assert.match(
    popover,
    /if \(compact\) element\.style\.width = `\$\{rect.width\}px`/,
  );
  assert.match(popover, /event.key === "Escape"/);
  assert.match(popover, /button.focus\(\{ preventScroll: true \}\)/);
});

test("map-to-sidebar transition cannot intercept map interaction", async () => {
  const css = await source("planner.module.css");
  assert.match(
    css,
    /\.rightSlot::before\s*\{[^}]*pointer-events: none;[^}]*linear-gradient/s,
  );
  assert.match(
    css,
    /\.toolbarToggle\[aria-expanded="true"\] svg\s*\{[^}]*rotate\(-90deg\)/,
  );
});
