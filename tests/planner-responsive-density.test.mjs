import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) =>
  readFile(new URL(`../src/features/planner/${path}`, import.meta.url), "utf8");

test("planner menus escape transformed and clipped ancestors through the top layer", async () => {
  const popover = await source("components/planner-popover.tsx");
  assert.match(popover, /popover="manual"/);
  const reveal = popover.slice(popover.indexOf("function reveal()"));
  assert.ok(
    reveal.indexOf("element.showPopover()") < reveal.indexOf("position();"),
  );
  assert.match(reveal, /parentDialog && !parentDialog.open/);
  assert.match(reveal, /new MutationObserver\(reveal\)/);
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

test("right panel accessibility title does not consume a quick-settings row", async () => {
  const panel = await source("components/planner-right-panel.tsx");
  const css = await source("planner.module.css");
  assert.match(panel, /className=\{styles\.srOnly\}/);
  assert.match(
    css,
    /\.srOnly\s*\{[^}]*position: absolute;[^}]*width: 1px;[^}]*height: 1px;[^}]*overflow: hidden;/s,
  );
});

test("full-screen rails prioritize card and panel content", async () => {
  const css = await source("planner.module.css");
  assert.match(
    css,
    /\.quickSettings,\s*\.recommendations\s*\{\s*padding-inline: 15px;/s,
  );
  assert.match(
    css,
    /\.sectionTitle h2\s*\{[^}]*display: flex;[^}]*align-items: center;/s,
  );
  assert.match(
    css,
    /\.bottomPanel \.bottomTabs button\s*\{[^}]*min-height: clamp\(32px, 3\.8dvh, 42px\);/s,
  );
});
