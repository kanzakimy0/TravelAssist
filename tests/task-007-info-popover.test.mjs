import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  INFO_OPEN_DELAY,
  INFO_CLOSE_DELAY,
  positionInfoPopover,
} from "../src/components/ui/info-popover-position.ts";

// Compile the small controller in memory; no test framework or project config changes.
const controllerSource = readFileSync(
  new URL("../src/components/ui/info-popover-interaction.ts", import.meta.url),
  "utf8",
);
const controllerJs = ts.transpileModule(
  controllerSource.replace(
    'from "./info-popover-position"',
    `from "${new URL("../src/components/ui/info-popover-position.ts", import.meta.url).href}"`,
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { createInfoInteraction } = await import(
  `data:text/javascript;base64,${Buffer.from(controllerJs).toString("base64")}`
);

function setup(t) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let visible = false;
  const interaction = createInfoInteraction({
    onOpen: () => {
      visible = true;
    },
    onClose: () => {
      visible = false;
    },
  });
  t.after(interaction.dispose);
  return {
    interaction,
    visible: () => visible,
    tick: (ms) => t.mock.timers.tick(ms),
  };
}

test("help is closed initially and hover waits 200ms", (t) => {
  const { interaction, visible, tick } = setup(t);
  assert.equal(visible(), false);
  interaction.pointerEnter("mouse");
  tick(INFO_OPEN_DELAY - 1);
  assert.equal(visible(), false);
  tick(1);
  assert.equal(visible(), true);
});

test("leaving waits 125ms before hiding", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.pointerEnter("mouse");
  tick(INFO_OPEN_DELAY);
  interaction.pointerLeave("mouse");
  tick(INFO_CLOSE_DELAY - 1);
  assert.equal(visible(), true);
  tick(1);
  assert.equal(visible(), false);
});

test("desktop activation retains the focus/hover delay", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.pointerDown("mouse");
  interaction.activate();
  tick(199);
  assert.equal(visible(), false);
  tick(1);
  assert.equal(visible(), true);
});

test("brief hover does not flash help later", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.pointerEnter("mouse");
  tick(100);
  interaction.pointerLeave("mouse");
  tick(500);
  assert.equal(visible(), false);
});

test("pointer may cross into the tooltip to read it", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.pointerEnter("mouse");
  tick(200);
  interaction.pointerLeave("mouse");
  tick(50);
  interaction.surfaceEnter();
  tick(500);
  assert.equal(visible(), true);
  interaction.surfaceLeave();
  tick(125);
  assert.equal(visible(), false);
});

test("keyboard focus opens and blur closes without moving focus", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.focus();
  tick(200);
  assert.equal(visible(), true);
  interaction.blur();
  tick(125);
  assert.equal(visible(), false);
});

test("Escape dismisses visible or pending help until a new interaction", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.focus();
  interaction.dismiss();
  tick(500);
  assert.equal(visible(), false);
  interaction.blur();
  interaction.focus();
  tick(200);
  interaction.dismiss();
  tick(500);
  assert.equal(visible(), false);
});

test("touch does not hover-open; first tap opens, second tap closes", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.pointerEnter("touch");
  tick(300);
  assert.equal(visible(), false);
  interaction.pointerDown("touch");
  interaction.focus();
  interaction.activate();
  tick(300);
  assert.equal(visible(), true);
  interaction.pointerDown("touch");
  interaction.activate();
  tick(300);
  assert.equal(visible(), false);
});

test("outside dismissal and disposal cancel pending timers", (t) => {
  const { interaction, visible, tick } = setup(t);
  interaction.pointerDown("touch");
  interaction.activate();
  interaction.dismiss();
  assert.equal(visible(), false);
  interaction.pointerEnter("mouse");
  interaction.dispose();
  tick(500);
  assert.equal(visible(), false);
});

const base = {
  anchor: { left: 400, right: 412, top: 300, bottom: 316 },
  width: 288,
  height: 70,
  viewportWidth: 1280,
  viewportHeight: 720,
};
test("help is positioned above the label, without covering its control", () => {
  assert.deepEqual(positionInfoPopover(base), { left: 262, top: 222 });
});
test("help flips below a label near the top", () => {
  assert.equal(
    positionInfoPopover({
      ...base,
      anchor: { ...base.anchor, top: 14, bottom: 30 },
    }).top,
    38,
  );
});
test("help remains within narrow viewport edges", () => {
  for (const left of [0, 310]) {
    const position = positionInfoPopover({
      ...base,
      viewportWidth: 320,
      anchor: { ...base.anchor, left, right: left + 10 },
    });
    assert.ok(position.left >= 12 && position.left + base.width <= 308);
  }
});
