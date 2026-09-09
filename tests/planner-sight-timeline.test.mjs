import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import "./register-planner-ts.mjs";

// Exercise the actual TSX component without a second browser/test dependency.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return next(`${specifier}.tsx`, context);
      throw error;
    }
  },
  load(url, context, next) {
    if (url.endsWith(".module.css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default new Proxy({}, {get: (_, name) => name});",
      };
    if (url.endsWith(".tsx"))
      return {
        format: "module",
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
      };
    return next(url, context);
  },
});
const { PlannerSightTimeline } =
  await import("../src/features/planner/components/planner-sight-timeline.tsx");
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan, tripReducer, mapView } =
  await import("../src/features/planner/model/trip-model.ts");

const { createElement } = await import("react");
const {
  plannerTimeline,
  timelineAxis,
  timelineMinute,
  timelineDuration,
  timelineProtected,
  routineSlotFor,
  timelineDisplayBands,
  timelineBandSegments,
  snapTimelineBandMinute,
} = await import("../src/features/planner/model/planner-timeline.ts");
const { tripSnapshot, parseSavedTrip, restoreTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
const { emptyDetailDraft, detailRailItems } =
  await import("../src/features/planner/model/detail-workspace.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
}
const scope = (s, id) => ({ planId: currentPlan(s).id, day: 1, id });
const item = (s, id) => currentPlan(s).items.find((i) => i.id === id);
const drop = (s, id, afterId, to = "planned") =>
  tripReducer(s, { type: "timelineDrop", ...scope(s, id), afterId, to });
const candidate = (s) =>
  plannerTimeline(s, 1).reserve.find((i) => !i.planningPlaceholder);
const change = (s, id, patch) => tripReducer(s, { ...scope(s, id), ...patch });
test("all planned kinds use one proportional ruler, each card has time and lock controls", () => {
  const s = fixture();
  for (const p of s.plans) {
    s.ui.currentPlanId = p.id;
    for (const d of p.days) {
      const data = plannerTimeline(s, d.day);
      const html = renderToStaticMarkup(
        createElement(PlannerSightTimeline, {
          state: s,
          day: d.day,
          dispatch: () => {},
          onSelect: () => {},
        }),
      );
      assert.equal(
        (html.match(/data-planned-sight=/g) || []).length,
        data.planned.length,
      );
      assert.equal(
        (html.match(/data-reserve-sight=/g) || []).length,
        data.reserve.length,
      );
      assert.match(html, /当天等分时间刻度/);
      assert.match(html, /切换卡片样式/);
      assert.match(html, /开始时间 \/ 持续时间/);
      assert.match(html, /空格拿起/);
      for (const i of data.planned)
        assert.ok(
          html.includes(
            'data-start-minute="' + timelineMinute(i.startTime) + '"',
          ),
        );
    }
  }
});
test("routine slots are available without opening the page mutating the trip", () => {
  const s = fixture(),
    before = JSON.stringify(s);
  const { planned, reserve } = plannerTimeline(s, 1);
  assert.deepEqual(
    new Set([...planned, ...reserve].map(routineSlotFor).filter(Boolean)),
    new Set(["departure", "breakfast", "lunch", "dinner", "return"]),
  );
  assert.equal(JSON.stringify(s), before);
  for (const r of reserve.filter((i) => i.planningPlaceholder)) {
    const p = s.places.find((p) => p.id === r.placeId);
    assert.equal(p.planningPlaceholder, true);
    assert.equal(r.reservationRequired, false);
    assert.equal(r.reservationStatus, "not_required");
    assert.deepEqual(p.providerIds, {});
  }
});
test("axis divides earliest start to latest end equally, not equal card spacing", () => {
  const items = [
    { startTime: "07:00", endTime: "08:00" },
    { startTime: "08:00", endTime: "09:00" },
    { startTime: "20:00", endTime: "21:00" },
  ];
  const a = timelineAxis(items);
  assert.equal(a.start, 420);
  assert.equal(a.end, 1260);
  assert.equal(
    timelineAxis([{ startTime: "08:00", endTime: "08:15" }]).end,
    495,
  );
  assert.equal(a.ticks.length, 7);
  assert.ok(
    a.ticks.every((v, i) => Math.abs(v - (a.start + (a.span * i) / 6)) < 1e-8),
  );
  assert.equal(
    (timelineMinute("20:00") - a.start) / (timelineMinute("08:00") - a.start),
    13,
  );
});
test("optional card alignment splits a noon-to-afternoon item exactly at 14:00", () => {
  const item = {
    id: "split",
    startTime: "12:00",
    endTime: "15:00",
  };
  const bands = timelineDisplayBands([item]);
  assert.equal(bands[0].end, 14 * 60);
  assert.equal(bands[1].start, 14 * 60);
  assert.equal(bands[0].ticks.at(-1), 14 * 60);
  assert.equal(bands[1].ticks[0], 14 * 60);
  assert.deepEqual(timelineBandSegments(item, bands), [
    { band: "morning", start: 12 * 60, end: 14 * 60, primary: true },
    {
      band: "afternoon",
      start: 14 * 60,
      end: 15 * 60,
      primary: false,
    },
  ]);
  assert.equal(snapTimelineBandMinute(1, 7 * 60, 14 * 60, true), 13 * 60 + 55);
  assert.equal(snapTimelineBandMinute(0, 14 * 60, 21 * 60), 14 * 60);
});
test("timeline labels and card style toggle form aligned vertical rails", () => {
  const css = readFileSync(
    new URL(
      "../src/features/planner/planner-sight-timeline.module.css",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(css, /grid-template-columns: 61px minmax\(0, 1fr\)/);
  assert.match(css, /writing-mode: vertical-rl/);
  assert.match(css, /\.alignmentToggle\s*\{/);
  assert.match(css, /\.labels h3:last-of-type\s*\{[\s\S]*grid-column: 1 \/ -1/);
  assert.match(
    css,
    /\.timeline\[data-time-aligned="true"\] \.labels,[\s\S]*grid-template-rows: minmax\(0, 1fr\) 54px;/,
  );
});
test("desktop preview origin is allowed to hydrate planner interactions", () => {
  const config = readFileSync(
    new URL("../next.config.ts", import.meta.url),
    "utf8",
  );
  assert.match(config, /allowedDevOrigins:\s*\["127\.0\.0\.1"\]/);
});
test("insertion uses previous end plus fifteen, permits collisions and preserves every other card", () => {
  const s = fixture(),
    c = candidate(s),
    previous = plannerTimeline(s, 1).planned[0];
  const before = structuredClone(currentPlan(s).items);
  const next = drop(s, c.id, previous.id);
  assert.equal(
    timelineMinute(item(next, c.id).startTime),
    timelineMinute(previous.endTime) + 15,
  );
  assert.equal(timelineDuration(item(next, c.id)), timelineDuration(c));
  for (const i of before) {
    assert.equal(item(next, i.id).startTime, i.startTime);
    assert.equal(item(next, i.id).endTime, i.endTime);
    assert.equal(item(next, i.id).locked, i.locked);
  }
});
test("a full day never rejects the new draft and Detail flags after-midnight timing", () => {
  const s = fixture(),
    p = currentPlan(s),
    c = candidate(s);
  p.items[0] = { ...p.items[0], startTime: "00:00", endTime: "23:55" };
  const next = drop(s, c.id, p.items[0].id);
  assert.equal(item(next, c.id).startTime, "24:10");
  assert.equal(item(next, c.id).planningDraft, true);
  assert.equal(
    detailRailItems(next, 1).find((i) => i.id === c.id).aiStatus,
    "error",
  );
  const raw = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    snapshot: tripSnapshot(next, emptyDetailDraft()),
  });
  assert.ok(parseSavedTrip(raw, s));
});
test("planned to reserve roundtrip retains identity and duration, removes duplicates", () => {
  let s = fixture();
  const i = plannerTimeline(s, 1).planned.find((i) => !timelineProtected(i));
  s = drop(s, i.id, null, "reserve");
  assert.equal(item(s, i.id), undefined);
  assert.equal(
    plannerTimeline(s, 1).reserve.filter((r) => r.id === i.id).length,
    1,
  );
  s = drop(s, i.id, null);
  assert.equal(currentPlan(s).items.filter((r) => r.id === i.id).length, 1);
  assert.equal(timelineDuration(item(s, i.id)), timelineDuration(i));
  assert.equal(
    plannerTimeline(s, 1).reserve.some((r) => r.id === i.id),
    false,
  );
});
test("reordering an upper card changes only it", () => {
  const s = fixture(),
    a = plannerTimeline(s, 1).planned.find((i) => !timelineProtected(i));
  const b = plannerTimeline(s, 1).planned.find((i) => i.id !== a.id);
  const next = drop(s, a.id, b.id);
  assert.equal(
    timelineMinute(item(next, a.id).startTime),
    timelineMinute(b.endTime) + 15,
  );
  assert.equal(currentPlan(next).items.length, currentPlan(s).items.length);
});
test("lock works for virtual reserve and planned cards; fixed reservations cannot unlock", () => {
  let s = fixture();
  const c = candidate(s);
  s = change(s, c.id, { type: "timelineLock" });
  assert.equal(
    plannerTimeline(s, 1).reserve.find((i) => i.id === c.id).locked,
    true,
  );
  assert.equal(item(drop(s, c.id, null), c.id), undefined);
  s = change(s, c.id, { type: "timelineLock" });
  s = drop(s, c.id, null);
  s = change(s, c.id, { type: "timelineLock" });
  assert.equal(item(drop(s, c.id, null, "reserve"), c.id).locked, true);
  assert.equal(
    item(
      change(s, c.id, {
        type: "timelineTime",
        startTime: "09:00",
        duration: 45,
      }),
      c.id,
    ).startTime,
    item(s, c.id).startTime,
  );
  const fixed = plannerTimeline(s, 1).planned.find((i) => i.fixedTime);
  assert.deepEqual(
    change(s, fixed.id, { type: "timelineLock" }).plans,
    s.plans,
  );
});
test("time editing permits overlap but rejects malformed times and durations", () => {
  let s = fixture();
  const c = candidate(s);
  s = drop(s, c.id, null);
  s = change(s, c.id, {
    type: "timelineTime",
    startTime: "10:00",
    duration: 360,
  });
  assert.equal(item(s, c.id).endTime, "16:00");
  assert.equal(
    detailRailItems(s, 1).find((i) => i.id === c.id).aiStatus,
    "error",
  );
  for (const patch of [
    { startTime: "25:00", duration: 10 },
    { startTime: "09:00", duration: 0 },
    { startTime: "09:00", duration: 721 },
  ])
    assert.deepEqual(
      change(s, c.id, { type: "timelineTime", ...patch }).plans,
      s.plans,
    );
});
test("stale scope, missing target and self-target cannot change a plan", () => {
  const s = fixture(),
    c = candidate(s);
  for (const extra of [
    { planId: "stale" },
    { day: 99 },
    { id: "missing" },
    { afterId: "missing" },
    { afterId: c.id },
  ]) {
    const next = tripReducer(s, {
      type: "timelineDrop",
      ...scope(s, c.id),
      to: "planned",
      afterId: null,
      ...extra,
    });
    assert.deepEqual(next.plans, s.plans);
  }
});
test("browser snapshot restores routine draft, time, reserve and lock", () => {
  let s = fixture();
  const base = fixture(),
    r = plannerTimeline(s, 1).reserve.find(
      (i) => i.planningSlot === "breakfast",
    );
  s = drop(s, r.id, null);
  s = change(s, r.id, {
    type: "timelineTime",
    startTime: "07:30",
    duration: 45,
  });
  s = change(s, r.id, { type: "timelineLock" });
  const raw = JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    snapshot: tripSnapshot(s, emptyDetailDraft()),
  });
  const parsed = parseSavedTrip(raw, base);
  assert.ok(parsed);
  const restored = restoreTrip(base, parsed.snapshot);
  assert.equal(item(restored, r.id).startTime, "07:30");
  assert.equal(item(restored, r.id).locked, true);
  assert.equal(item(restored, r.id).planningPlaceholder, true);
});

test("routine slots keep their identity when edited to an unusual time", () => {
  let s = fixture();
  const lunch = plannerTimeline(s, 1).planned.find(
    (i) => routineSlotFor(i) === "lunch",
  );
  s = change(s, lunch.id, {
    type: "timelineTime",
    startTime: "19:00",
    duration: 45,
  });
  assert.equal(routineSlotFor(item(s, lunch.id)), "lunch");
});

test("unselected routine places cannot become fake map pins or reservation entries", () => {
  let s = fixture();
  const breakfast = plannerTimeline(s, 1).reserve.find(
    (i) => i.planningSlot === "breakfast",
  );
  s = drop(s, breakfast.id, null);
  const map = mapView(s);
  assert.equal(
    map.places.some((p) => p.tripItemId === breakfast.id),
    false,
  );
  assert.equal(
    change(s, breakfast.id, { type: "queueReservation" }).plans,
    s.plans,
  );
});

test("identical starts expose a visible card-cycling control without removing projects", () => {
  let s = fixture();
  const c = candidate(s);
  s = drop(s, c.id, null);
  s = change(s, c.id, {
    type: "timelineTime",
    startTime: "10:00",
    duration: 60,
  });
  const html = renderToStaticMarkup(
    createElement(PlannerSightTimeline, {
      state: s,
      day: 1,
      dispatch: () => {},
      onSelect: () => {},
    }),
  );
  assert.match(html, /重叠 \d+ 项/);
  assert.equal(
    (html.match(/data-planned-sight=/g) || []).length,
    plannerTimeline(s, 1).planned.length,
  );
});
