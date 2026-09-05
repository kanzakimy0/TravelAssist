import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  parseStartEntry,
  plannerPlanForStartPlan,
  startEntryStep,
} from "../src/features/navigation/main-flow-navigation.ts";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("only the supported deep-link entry resolves to UI Step 3", () => {
  assert.equal(parseStartEntry("step3"), "step3");
  assert.equal(startEntryStep(parseStartEntry("step3")), 2);
  assert.equal(parseStartEntry("invalid"), null);
  assert.equal(parseStartEntry(["step3"]), null);
  assert.equal(parseStartEntry(undefined), null);
});

test("the temporary bridge maps each generated preview to one planner plan", () => {
  assert.equal(plannerPlanForStartPlan("classic-balanced"), "classic");
  assert.equal(plannerPlanForStartPlan("slow-depth"), "depth");
  assert.equal(plannerPlanForStartPlan("efficient-explorer"), "relax");
  assert.equal(plannerPlanForStartPlan("unknown"), null);
  assert.equal(plannerPlanForStartPlan(null), null);
});

test("main-flow links use real destinations and keep login disabled", async () => {
  const [home, startHeader, plans, planner] = await Promise.all([
    read("../src/features/home/components/home-hero.tsx"),
    read("../src/features/start-flow/components/start-flow-header.tsx"),
    read("../src/features/start-flow/components/plan-selection-step.tsx"),
    read("../src/features/planner/components/planner-page.tsx"),
  ]);

  assert.match(home, /href="\/personal-center"/);
  assert.match(home, /disabled/);
  assert.match(startHeader, /href="\/"/);
  assert.match(startHeader, /href="\/personal-center"/);
  assert.match(plans, /href="\/planner"/);
  assert.match(plans, /使用此方案并进入地图/);
  assert.match(planner, /href="\/start">新建旅行/);
  assert.match(planner, /href="\/personal-center"/);
});

test("deep-link entry overrides only the step while preserving the single draft store", async () => {
  const shell = await read(
    "../src/features/start-flow/components/start-flow-shell.tsx",
  );
  assert.match(shell, /startEntryStep\(entry\) \?\? currentStep/);
  assert.equal(shell.match(/travelassist\.trip-wizard\.v1/g)?.length, 1);
  assert.match(shell, /headingRef\.current\?\.focus/);
});
