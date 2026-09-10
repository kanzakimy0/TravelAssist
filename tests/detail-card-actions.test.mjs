import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "./register-planner-ts.mjs";
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return next(specifier + ".tsx", context);
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
const { plannerMockPlans, initialPlannerSettings } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan, tripReducer } =
  await import("../src/features/planner/model/trip-model.ts");
const { detailRailItems, emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { detailCardKey, detailTimeSuggestion, acceptDetailTimeSuggestion } =
  await import("../src/features/planner/model/detail-card-actions.ts");
const { DetailItineraryBoard } =
  await import("../src/features/planner/components/detail-itinerary-board.tsx");
const { tripSnapshot, parseSavedTrip } =
  await import("../src/features/planner/model/browser-trip.ts");
function fixture() {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  const state = makeTripState(
    plannerMockPlans,
    places,
    areas,
    initialPlannerSettings,
  );
  const plan = currentPlan(state);
  plan.items = plan.items.filter((i) =>
    ["classic-airport", "classic-asakusa", "classic-lunch"].includes(i.id),
  );
  // Do not depend on the airport fixture ID: add an explicit protected collision.
  plan.items = plan.items.filter((i) => i.id !== "classic-airport");
  const sight = plan.items.find((i) => i.id === "classic-asakusa");
  plan.items.push({
    ...sight,
    id: "arrival",
    title: "固定抵达",
    type: "transport",
    startTime: "09:00",
    endTime: "10:15",
    fixedTime: true,
    locked: true,
  });
  return state;
}
function view(state, draft = emptyDetailDraft()) {
  const items = detailRailItems(state, 1, draft.items, draft.completedIds);
  return {
    items,
    html: renderToStaticMarkup(
      createElement(DetailItineraryBoard, {
        state,
        draft,
        items,
        day: 1,
        selectedId: null,
        dispatch: () => {},
        onDraft: () => {},
        onItem: () => {},
        onMissing: () => {},
      }),
    ),
  };
}
function article(html, id) {
  return (
    html.split(`data-detail-column="${id}"`)[1]?.split("</article>")[0] ?? ""
  );
}
test("agree resolves the overlap but retains unverified transport warning", () => {
  const state = fixture(),
    before = structuredClone(state),
    draft = emptyDetailDraft();
  const target = view(state).items.find((i) => i.id === "classic-asakusa");
  assert.equal(target.aiStatus, "error");
  const result = acceptDetailTimeSuggestion(state, draft, 1, target.id);
  assert.equal(result.action?.type, "detailEdit");
  const after = tripReducer(state, result.action),
    edited = currentPlan(after).items.find((i) => i.id === target.id);
  assert.equal(edited.startTime, "10:30");
  assert.equal(edited.endTime, "12:00");
  assert.equal(
    view(after).items.find((i) => i.id === target.id).aiStatus,
    "warning",
  );
  assert.match(article(view(after).html, target.id), /data-status-action/);
  assert.deepEqual(
    currentPlan(after).items.filter((i) => i.id !== target.id),
    currentPlan(before).items.filter((i) => i.id !== target.id),
  );
  assert.deepEqual(state, before);
});
test("ignore hides the confirmation cell, not the project or red issue marker; changed issue returns", () => {
  const state = fixture(),
    draft = emptyDetailDraft(),
    first = view(state);
  const target = first.items.find((i) => i.id === "classic-asakusa");
  const key = detailCardKey(state, target, "advice", first.items);
  draft.railResponses = { [key]: "later" };
  const hidden = article(view(state, draft).html, target.id);
  assert.doesNotMatch(hidden, /data-status-action/);
  assert.match(hidden, /data-status="error"/);
  assert.match(hidden, />!<\/span>/);
  assert.match(hidden, /data-detail-item="classic-asakusa"/);
  currentPlan(state).items.find((i) => i.id === "arrival").endTime = "10:30";
  assert.match(
    article(view(state, draft).html, target.id),
    /data-status-action/,
  );
});
test("fixed, locked and confirmed/book-in-progress items never get automatic time edits", () => {
  for (const protection of [
    { fixedTime: true },
    { locked: true },
    { reservationStatus: "booked" },
    { reservationStatus: "ticketed" },
    { reservationStatus: "pay_on_site" },
    { reservationStatus: "booking" },
  ]) {
    const state = fixture();
    Object.assign(
      currentPlan(state).items.find((i) => i.id === "classic-asakusa"),
      protection,
    );
    assert.equal(
      acceptDetailTimeSuggestion(
        state,
        emptyDetailDraft(),
        1,
        "classic-asakusa",
      ).action,
      undefined,
    );
  }
});
test("reservation-only reminders offer change instead of fabricating confirmation", () => {
  const state = fixture();
  currentPlan(state).items = currentPlan(state).items.filter(
    (i) => i.id === "classic-asakusa",
  );
  Object.assign(currentPlan(state).items[0], {
    reservationRequired: true,
    reservationStatus: "pending",
  });
  const { items, html } = view(state);
  assert.equal(detailTimeSuggestion(state, items[0], items), null);
  assert.match(article(html, items[0].id), />更改<\/button>/);
  assert.doesNotMatch(article(html, items[0].id), />同意<\/button>/);
});
test("missing meals use large add control; ignore only removes their secondary card", () => {
  const state = fixture(),
    draft = emptyDetailDraft();
  const initial = view(state, draft).html;
  assert.match(initial, /aria-label="安排晚餐"/);
  assert.match(initial, /class="missingPlus"[^>]*>＋/);
  draft.railResponses = { "classic:missing-1-dinner": "later" };
  const dinner = view(state, draft)
    .html.split('data-missing-meal="dinner"')[1]
    .split("</article>")[0];
  assert.match(dinner, /安排晚餐/);
  assert.doesNotMatch(dinner, /data-primary-status/);
});
test("dismissals survive explicit browser snapshot without changing reservation state", () => {
  const state = fixture(),
    draft = emptyDetailDraft(),
    { items } = view(state);
  draft.railResponses = {
    [detailCardKey(state, items[0], "advice", items)]: "later",
  };
  const saved = parseSavedTrip(
    JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      snapshot: tripSnapshot(state, draft),
    }),
    state,
  );
  assert.deepEqual(saved?.snapshot.draft.railResponses, draft.railResponses);
});
test("draft time suggestions update draft items while retaining unverified status", () => {
  const state = fixture(),
    draft = emptyDetailDraft();
  draft.items = [
    {
      id: "draft-1",
      day: 1,
      title: "自选活动",
      startTime: "10:00",
      endTime: "10:30",
      type: "custom",
      note: "待核对",
    },
  ];
  const result = acceptDetailTimeSuggestion(state, draft, 1, "draft-1");
  assert.ok(result.draft);
  assert.notEqual(result.draft.items[0].startTime, "10:00");
  assert.equal(result.draft.items[0].note, "待核对");
  assert.equal(
    view(state, result.draft).items.find((i) => i.id === "draft-1").aiStatus,
    "warning",
  );
});

test("no free slot does not overwrite fixed projects or silently drop the reminder", () => {
  const state = fixture();
  const fixed = currentPlan(state).items.find((i) => i.id === "arrival");
  Object.assign(fixed, { startTime: "00:00", endTime: "23:59" });
  const result = acceptDetailTimeSuggestion(
    state,
    emptyDetailDraft(),
    1,
    "classic-asakusa",
  );
  assert.equal(result.action, undefined);
  assert.match(
    article(view(state).html, "classic-asakusa"),
    /data-status-action/,
  );
});

test("a manual incoming transport estimate is included in the suggested start time", () => {
  const state = fixture();
  currentPlan(state).movementLegs = {
    "1:arrival>classic-asakusa": {
      day: 1,
      fromId: "arrival",
      toId: "classic-asakusa",
      mode: "train",
      duration: 60,
      buffer: 10,
    },
  };
  const { items } = view(state);
  const suggestion = detailTimeSuggestion(
    state,
    items.find((i) => i.id === "classic-asakusa"),
    items,
  );
  assert.ok(suggestion && suggestion.startTime >= "11:25");
});
