import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "./task-067-ui-loader.mjs";
const { StateNotice, StateSkeleton } =
  await import("../src/components/ui/state-notice.tsx");
const { StateAction } = await import("../src/components/ui/state-action.tsx");
const { PlannerRouteQueryPanel } =
  await import("../src/features/planner/components/planner-route-query.tsx");
const { routeErrorPresentation } =
  await import("../src/features/planner/model/route-presentation.ts");
const { browserTripErrorMessage } =
  await import("../src/features/planner/model/browser-trip-error.ts");
const { minimalRailRouteFixture } =
  await import("../src/shared/contracts/routes/fixtures.ts");
const { plannerRouteSnapshot } =
  await import("../src/features/planner/model/route-query.ts");
const render = (component, props) =>
  renderToStaticMarkup(createElement(component, props));
const read = (file) => readFileSync(file, "utf8");
const error = (
  code = "provider_unavailable",
  retryable = true,
  reason = "network",
) => ({
  code,
  retryable,
  category: "availability",
  message: "SECRET_TOKEN SQL Authorization Bearer raw-provider",
  diagnosticFingerprint: null,
  metadata: { reason },
});
const resolution = plannerRouteSnapshot({
  planId: "classic",
  day: 1,
  segmentId: "1:skytree>ginza",
  originPlace: { name: "东京晴空塔" },
  destinationPlace: { name: "银座散步" },
  localDate: "2026-09-09",
  localTime: "15:30",
});
for (const [kind, title] of [
  ["empty", "从这里开始"],
  ["empty", "没有找到符合条件的结果"],
  ["error", "暂时无法读取"],
  ["degraded", "地图暂时不可用"],
]) {
  test("shared semantic " + kind + " / " + title, () => {
    const html = render(StateNotice, { kind, title, description: "安全说明" });
    assert.match(html, new RegExp('data-state-kind="' + kind + '"'));
    assert(html.includes(title));
    assert(!html.includes("<button"));
    assert(!html.includes('role="alert"'));
  });
}
test("skeleton contains three rows, no fake values/actions and one external announcement", () => {
  const html = render(StateNotice, {
    kind: "loading",
    title: "正在读取…",
    children: createElement(StateSkeleton),
  });
  assert.equal((html.match(/class="skeletonRow"/g) || []).length, 3);
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /tabindex|progressbar|<button|%|ETA/);
  assert(html.indexOf('role="status"') < html.indexOf('aria-busy="true"'));
});
test("state action preserves keyboard focusability while semantically pending", () => {
  const html = render(StateAction, {
    pending: true,
    onAction: () => {},
    children: "重试",
  });
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /正在重试/);
  assert.doesNotMatch(html, /\sdisabled=|tabindex="-1"/);
});
test("state motion and targets use accepted tokens, no parallel palette", () => {
  const css = read("src/components/ui/state-notice.module.css");
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation:\s*none/);
  assert.match(css, /transition:\s*none/);
  assert.doesNotMatch(css, /@keyframes|#[0-9a-f]{3,8}\b|--ta-/i);
});
for (const [code, retryable, reason, expected] of [
  ["provider_timeout", true, "timeout", true],
  ["provider_unavailable", false, "network", false],
  ["provider_unavailable", true, "provider_not_configured", false],
  ["provider_unavailable", true, "unauthorized", false],
  ["invalid_request", true, "invalid", false],
  ["unsupported_mode", true, "unsupported", false],
]) {
  test("safe Route category " + code + "/" + reason, () => {
    const presentation = routeErrorPresentation(error(code, retryable, reason));
    assert.equal(presentation.retryable, expected);
    assert.doesNotMatch(
      JSON.stringify(presentation),
      /SECRET|Authorization|SQL|raw-provider/,
    );
  });
}
for (const status of [
  "disabled",
  "loading",
  "stale",
  "no_route",
  "unsupported",
  "error",
  "idle",
  "ready",
]) {
  test("actual Route panel retains truthful " + status + " semantics", () => {
    const fixture = structuredClone(minimalRailRouteFixture);
    const before = JSON.stringify(fixture);
    const html = render(PlannerRouteQueryPanel, {
      query: {
        resolution,
        state: {
          status,
          result: status === "ready" || status === "stale" ? fixture : null,
          error: status === "error" ? error() : null,
          selectedAlternativeId: null,
        },
        run: () => {},
        cancel: () => {},
        select: () => {},
      },
    });
    assert.match(html, new RegExp('data-route-query-status="' + status + '"'));
    assert.doesNotMatch(html, /SECRET|Authorization|raw-provider/);
    assert.equal(JSON.stringify(fixture), before);
    if (["disabled", "no_route", "unsupported"].includes(status))
      assert(!html.includes("<button"));
    if (status === "loading") {
      assert.match(html, /aria-busy="true"/);
      assert.match(html, /aria-disabled="true"/);
    }
    if (status === "stale") {
      assert.match(html, /路线信息需要更新/);
      assert(!html.includes("<dl>"));
    }
    if (status === "no_route") {
      assert.match(html, /没有找到符合条件的路线/);
      assert.match(html, /调整出发时间/);
    }
    if (status === "ready") assert.match(html, /耗时/);
  });
}
for (const cause of [
  new Error("SECRET SQL Authorization cookie=xxx"),
  new DOMException("raw-provider"),
  { message: "payment payload" },
  null,
]) {
  test(
    "local persistence never forwards untrusted error " +
      String(cause?.constructor?.name),
    () => {
      const message = browserTripErrorMessage(cause);
      assert.match(message, /当前修改仍在/);
      assert.doesNotMatch(
        message,
        /SECRET|SQL|Authorization|cookie|payment|raw-provider/,
      );
    },
  );
}
test("local conflict retains existing recovery guidance", () => {
  assert.match(
    browserTripErrorMessage(
      new Error(
        "另一页面已更新本地行程，请先打开已保存版本再编辑；您的修改仍保留在当前页。",
      ),
    ),
    /请先打开已保存版本/,
  );
});
test("Start storage failures preserve bytes, guard writes and show safe memory-only state", () => {
  const s = read("src/features/start-flow/components/start-flow-shell.tsx");
  assert.doesNotMatch(s, /removeItem\(/);
  assert.match(s, /if \(initialState.readFailed\) return/);
  assert.match(s, /setStorageFailed\(true\)/);
  assert.match(s, /原记录未改动/);
  assert.match(s, /generationPending.current/);
});
test("local generation has no fake compute stages or percentage", () => {
  const s = read("src/features/start-flow/components/generation-step.tsx");
  assert.match(s, /本地示例方案/);
  assert.match(s, /不代表真实 AI 或路线计算/);
  assert.doesNotMatch(s, /activeStage|STAGES|正在处理|✓|progressbar|百分比/);
});
test("AI uses the bounded streaming endpoint and Home public fallback remains unchanged", () => {
  const s = read("src/features/home/components/ai-conversation-panel.tsx");
  const runtime = read(
    "src/features/home/components/ai-conversation-runtime.tsx",
  );
  assert.match(s, /AIConversationRuntime/);
  assert.match(runtime, /fetch\("\/api\/ai\/conversation"/);
  assert.match(runtime, /输入内容已保留/);
  assert.doesNotMatch(runtime, /setTimeout|localStorage|providerRaw/);
  const home = read("src/lib/auth/home-viewer.server.ts");
  assert.match(home, /return error \|\| !data.user \? null/);
});
test("initial Planner shows restored-resource pending before mounting sample workspace", () => {
  const s = read("src/features/planner/components/planner-page.tsx");
  assert(s.indexOf("if (!browserTrip.ready)") < s.indexOf("<TripWorkspace"));
  assert.match(s, /StateSkeleton/);
});
test("real empty and degraded hosts use shared states without Trip actions", () => {
  for (const f of [
    "detail-itinerary-board",
    "planner-sight-timeline",
    "planner-route-board",
    "planner-map-shell",
  ]) {
    const s = read("src/features/planner/components/" + f + ".tsx");
    assert.match(s, /StateNotice/);
    assert.match(s, /kind="empty"/);
  }
});
test("Route gate and existing contract boundary remain closed in production", () => {
  const s = read("src/app/(main)/planner/page.tsx");
  assert.match(s, /process.env.NODE_ENV !== "production"/);
  assert.match(s, /ROUTING_PLANNER_QUERY_ENABLED/);
  const hook = read("src/features/planner/components/planner-route-query.tsx");
  assert.match(hook, /!enabled \|\| !resolution.ok \|\| active.current/);
  assert.match(hook, /routeResultCanApply/);
  assert.doesNotMatch(hook, /error.message|setInterval|localStorage/);
});

const { DetailItineraryBoard } =
  await import("../src/features/planner/components/detail-itinerary-board.tsx");
const { PlannerSightTimeline } =
  await import("../src/features/planner/components/planner-sight-timeline.tsx");
const { initialPlannerSettings, plannerMockPlans } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState } =
  await import("../src/features/planner/model/trip-model.ts");
const { emptyDetailDraft } =
  await import("../src/features/planner/model/detail-workspace.ts");
const { GenerationStep } =
  await import("../src/features/start-flow/components/generation-step.tsx");
const { AIConversationPanel } =
  await import("../src/features/home/components/ai-conversation-panel.tsx");
const fixture = () => {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
};
test("actual Detail empty renderer preserves plan, locks, settings and reservations", () => {
  const state = fixture(),
    draft = emptyDetailDraft(),
    before = JSON.stringify({ state, draft });
  const html = render(DetailItineraryBoard, {
    state,
    draft,
    day: 1,
    items: [],
    selectedId: null,
    dispatch: () => assert.fail("presentation must not dispatch"),
    onDraft: () => assert.fail("presentation must not mutate"),
    onItem: () => {},
    onMissing: () => {},
    onBreakfastChoice: () => {},
  });
  assert.match(html, /当前日期尚无安排/);
  assert.match(html, /data-state-kind="empty"/);
  assert.equal(JSON.stringify({ state, draft }), before);
  assert.doesNotMatch(html, /role="alert"/);
});
test("actual generation renderer is static local preparation with safe return", () => {
  const html = render(GenerationStep, {
    headingRef: { current: null },
    onBack: () => {},
  });
  assert.match(html, /本地示例方案/);
  assert.match(html, /返回修改需求/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /正在处理|分析您的旅行偏好|生成最佳路线/);
});
test("actual AI shell starts idle with an empty disabled composer", () => {
  const html = render(AIConversationPanel, {
    id: "test-ai",
    closeButtonRef: { current: null },
    onClose: () => {},
  });
  assert.match(html, /可以询问日本旅行与行程规划问题/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /重试|正在思考/);
});

test("actual Planner timeline Empty preserves other dates and settings", () => {
  const state = fixture();
  state.plans = state.plans.map((p) => ({
    ...p,
    items: p.items.filter((item) => item.day !== 1),
  }));
  const before = JSON.stringify(state);
  const html = render(PlannerSightTimeline, {
    state,
    day: 1,
    dispatch: () => assert.fail("render must not dispatch"),
    onSelect: () => {},
  });
  assert.match(html, /当前日期尚无景点安排/);
  assert.equal(JSON.stringify(state), before);
});

test("existing region filter only renders Empty for confirmed zero results", () => {
  const s = read("src/features/start-flow/components/more-regions-modal.tsx");
  assert.match(s, /visiblePrefectures.length === 0/);
  assert.match(s, /已选择的地区不会因此清空/);
  assert.match(s, /searchRef.current\?\.focus/);
});
