import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";

import {
  initialPlannerSettings,
  plannerMockPlans,
} from "../src/features/planner/data/planner-mock-data.ts";
import { makePlannerCatalog } from "../src/features/planner/data/planner-catalog.ts";
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

const {
  DETAIL_DRAFT_STORAGE_KEY,
  detailDaySummary,
  detailMapView,
  detailRailItems,
  detailUrl,
  judgementPhase,
  parseDetailDay,
  parseDetailDraft,
  parseWorkspaceMode,
} = await import("../src/features/planner/model/detail-workspace.ts");
import {
  currentPlan,
  makeTripState,
  tripReducer,
} from "../src/features/planner/model/trip-model.ts";

function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}

test("planner/detail query parsing has safe defaults and stable URLs", () => {
  assert.equal(parseWorkspaceMode(null), "planner");
  assert.equal(parseWorkspaceMode("unknown"), "planner");
  assert.equal(parseWorkspaceMode("detail"), "detail");
  assert.equal(parseDetailDay(null, 3), 1);
  assert.equal(parseDetailDay("2", 3), 2);
  assert.equal(parseDetailDay("0", 3), 1);
  assert.equal(parseDetailDay("99", 3), 1);
  assert.equal(parseDetailDay("oops", 3), 1);
  assert.equal(detailUrl(3), "/planner?view=detail&day=3");
});

test("detail map keeps active route colored, adjacent full routes gray and distant days hidden", () => {
  const state = fixture();
  const view = detailMapView(state, 2);
  assert.equal(
    view.routes.some((route) => route.id === "day-2"),
    true,
  );
  assert.deepEqual(
    view.routes
      .filter((route) => route.context)
      .map((route) => route.id)
      .sort(),
    ["detail-context-1", "detail-context-3"],
  );
  assert.equal(
    view.routes
      .filter((route) => route.context)
      .every((route) => route.color === "#77716c"),
    true,
  );
  assert.equal(
    view.routes.some((route) => route.id.includes("day-4")),
    false,
  );
  assert.equal(
    view.places.every((place) => place.day === 2),
    true,
  );
});

test("detail rail adapts canonical Trip State and explicit local draft without a second trip store", () => {
  const state = fixture();
  const canonicalCount = currentPlan(state).items.filter(
    (item) => item.day === 2,
  ).length;
  const items = detailRailItems(
    state,
    2,
    [
      {
        id: "local-task",
        day: 2,
        title: "领取行李",
        startTime: "17:30",
        endTime: "17:45",
        type: "task",
        note: "本地草稿",
      },
      {
        id: "other-day",
        day: 1,
        title: "不应显示",
        startTime: "09:00",
        endTime: "09:15",
        type: "custom",
        note: "",
      },
    ],
    [],
  );
  assert.equal(items.length, canonicalCount + 1);
  assert.equal(items.find((item) => item.id === "local-task")?.draft, true);
  assert.equal(
    items.some((item) => item.id === "other-day"),
    false,
  );
  assert.equal(
    items.every((item) => item.durationLabel.endsWith(" 分")),
    true,
  );
});

test("AI judgement and reservation judgement remain independent", () => {
  const items = detailRailItems(fixture(), 2);
  const reservationUnknown = items.find(
    (item) => item.reservation === "unknown",
  );
  assert.ok(reservationUnknown);
  assert.equal(
    ["warning", "error"].includes(reservationUnknown.aiStatus),
    true,
  );
  assert.notEqual(reservationUnknown.reservationLabel, "无需预约");
  assert.equal(
    items.some(
      (item) => item.aiStatus === "normal" && item.reservation === "none",
    ),
    true,
  );
});

test("day summary exposes time, constraints, independent counts and all expense groups", () => {
  const state = fixture();
  const items = detailRailItems(state, 1);
  const summary = detailDaySummary(state, 1, items);
  assert.equal(summary.itemCount, items.length);
  assert.equal(
    summary.aiCounts.normal + summary.aiCounts.warning + summary.aiCounts.error,
    items.length,
  );
  assert.equal(summary.startTime, items[0].startTime);
  assert.equal(summary.endTime, items.at(-1).endTime);
  assert.equal(
    summary.hardConstraintCount + summary.flexibleCount,
    items.length,
  );
  assert.deepEqual(Object.keys(summary.expenses).sort(), [
    "dining",
    "lodging",
    "other",
    "parkingHighway",
    "ticketsActivities",
    "total",
    "transport",
  ]);
  assert.equal(
    summary.expenses.total,
    summary.expenses.transport +
      summary.expenses.parkingHighway +
      summary.expenses.ticketsActivities +
      summary.expenses.dining +
      summary.expenses.lodging +
      summary.expenses.other,
  );
});

test("T-48 judgement phase and local draft parser are deterministic and safe", () => {
  assert.equal(
    judgementPhase("2026-09-09", new Date("2026-09-06T09:00:00")),
    "planning",
  );
  assert.equal(
    judgementPhase("2026-09-07", new Date("2026-09-06T09:00:00")),
    "execution",
  );
  assert.equal(DETAIL_DRAFT_STORAGE_KEY, "travelassist.detail-draft.v1");
  assert.deepEqual(parseDetailDraft("not-json"), {
    items: [],
    completedIds: [],
    version: 1,
  });
  const parsed = parseDetailDraft(
    JSON.stringify({
      version: 1,
      items: [
        {
          id: "draft-1",
          day: 1,
          title: "自定义事项",
          startTime: "15:00",
          endTime: "15:30",
          type: "custom",
          note: "",
        },
        { broken: true },
      ],
      completedIds: ["draft-1", 42],
    }),
  );
  assert.equal(parsed.items.length, 1);
  assert.deepEqual(parsed.completedIds, ["draft-1"]);
});

test("detail edits protect fixed items, reject overlap, and update flexible canonical items", () => {
  const before = fixture();
  const plan = currentPlan(before);
  const flexible = plan.items.find((item) => !item.fixedTime && !item.locked);
  const fixed = plan.items.find((item) => item.fixedTime || item.locked);
  assert.ok(flexible);
  assert.ok(fixed);

  const protectedState = tripReducer(before, {
    type: "detailEdit",
    id: fixed.id,
    title: "不应修改",
    startTime: fixed.startTime,
    endTime: fixed.endTime,
  });
  assert.match(protectedState.notice, /固定或锁定/);

  const invalid = tripReducer(before, {
    type: "detailEdit",
    id: flexible.id,
    title: flexible.title,
    startTime: "12:00",
    endTime: "11:00",
  });
  assert.match(invalid.notice, /结束时间必须晚于/);

  const sibling = plan.items.find(
    (item) => item.day === flexible.day && item.id !== flexible.id,
  );
  assert.ok(sibling);
  const conflict = tripReducer(before, {
    type: "detailEdit",
    id: flexible.id,
    title: flexible.title,
    startTime: sibling.startTime,
    endTime: sibling.endTime,
  });
  assert.match(conflict.notice, /时间重叠/);

  const updated = tripReducer(before, {
    type: "detailEdit",
    id: flexible.id,
    title: `${flexible.title}（已确认）`,
    startTime: flexible.startTime,
    endTime: flexible.endTime,
  });
  assert.equal(
    currentPlan(updated).items.find((item) => item.id === flexible.id)?.title,
    `${flexible.title}（已确认）`,
  );
  assert.equal(updated.plans.length, before.plans.length);
});

test("workspace source keeps one map shell and separates planner/detail slots", async () => {
  const workspace = await readFile(
    new URL(
      "../src/features/planner/components/trip-workspace.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const page = await readFile(
    new URL(
      "../src/features/planner/components/planner-page.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const rail = await readFile(
    new URL(
      "../src/features/planner/components/detail-execution-rail.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const css = await readFile(
    new URL("../src/features/planner/planner.module.css", import.meta.url),
    "utf8",
  );
  assert.equal((workspace.match(/<PlannerMapShell/g) ?? []).length, 1);
  assert.equal((page.match(/<PlannerMapShell/g) ?? []).length, 0);
  assert.match(workspace, /data-map-workspace/);
  assert.match(page, /mode === "planner" \? \(/);
  assert.match(page, /mode === "planner" \? plannerRight : detailRight/);
  assert.match(page, /mode === "planner" \? plannerBottom : detailBottom/);
  assert.match(rail, /data-status=\{item\.aiStatus\}/);
  assert.match(rail, /data-lane=\{index % 2 \? "below" : "above"\}/);
  assert.doesNotMatch(rail, /<img/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
