import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) =>
  readFileSync(
    new URL("../src/features/planner/" + path, import.meta.url),
    "utf8",
  );
test("Detail shares the original 25dvh dock rather than a taller three-card override", () => {
  const css = read("planner.module.css");
  assert.match(css, /25dvh/);
  assert.doesNotMatch(css, /clamp\(144px, 10vw, 172px\) \* 3/);
  assert.doesNotMatch(css, /data-view="detail"[^}]+\.toolbar/);
});
test("compact itinerary categories use consistent distinct colors and narrow cards", () => {
  const css = read("detail-itinerary-board.module.css");
  assert.match(css, /aspect-ratio: 1/);
  assert.match(css, /height: var\(--card-size\)/);
  for (const kind of [
    "attraction",
    "hotel",
    "restaurant",
    "transport",
    "activity",
  ])
    assert.ok(css.includes(`[data-kind="${kind}"]`));
});
test("all lower cards share map-side inspection and no no-booking placeholder remains", () => {
  const component = read("components/detail-itinerary-board.tsx");
  assert.match(component, /function openItem/);
  assert.ok(
    (component.match(/openItem\(item, event.currentTarget/g) || []).length >= 3,
  );
  assert.doesNotMatch(component, /<PlannerPopover/);
  assert.match(component, /showReservation && canonical/);
  assert.doesNotMatch(component, /无需预约可留空|为\$\{item.title\}添加预约/);
  assert.match(component, /data-reservation-pending/);
  assert.match(component, /酒店早餐/);
  assert.match(component, /简易早餐/);
});
test("Detail inspector shares one mounted map and exposes an explicit edit action", () => {
  const workspace = read("components/trip-workspace.tsx");
  assert.equal(workspace.match(/<PlannerMapShell\b/g).length, 1);
  assert.match(workspace, /data-map-surface/);
  assert.match(workspace, /<DetailMapInspector/);
  assert.ok(
    read("detail-map-inspector.module.css").includes(
      "width: calc(100% * 2 / 3)",
    ),
  );
  assert.match(read("components/detail-map-inspector.tsx"), /调整行程/);
  assert.match(workspace, /mapPickMode/);
  assert.match(workspace, /onMapPick/);
  const addDialog = read("components/trip-item-dialog.tsx");
  assert.match(addDialog, /在地图上点选位置/);
  assert.match(addDialog, /已从地图获取/);
});
test("planner close controls use one centered icon contract", () => {
  for (const component of [
    "components/detail-map-inspector.tsx",
    "components/flight-project.tsx",
    "components/map-quick-card.tsx",
    "components/trip-item-dialog.tsx",
  ]) {
    assert.match(read(component), /<PlannerIcon name="close" \/>/);
  }

  const inspectorCss = read("detail-map-inspector.module.css");
  assert.match(
    inspectorCss,
    /\.editor form > header > button\[aria-label\^="关闭"\][\s\S]*?width: 34px;[\s\S]*?height: 34px;[\s\S]*?padding: 0;/,
  );
  assert.match(
    read("trip-preparation.module.css"),
    /\.completion > header button\[aria-label\^="关闭"\][\s\S]*?width: 32px;[\s\S]*?height: 32px;[\s\S]*?padding: 0;/,
  );
});
test("new items defer overlap detection to the itinerary rail", () => {
  const addDialog = read("components/trip-item-dialog.tsx");
  const plannerPage = read("components/planner-page.tsx");
  assert.match(addDialog, /const invalid = validateSchedule\(item\);/);
  assert.doesNotMatch(addDialog, /validate\?:/);
  assert.doesNotMatch(addDialog, /validate\?\.\(item\)/);
  assert.doesNotMatch(plannerPage, /<AddTripItemDialog[\s\S]{0,1200}validate=/);
});
test("detail day cards resize with the viewport and overflow on their own axis", () => {
  const css = read("detail-workspace.module.css");
  assert.match(
    css,
    /\.daySelector\s*\{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;[^}]*scroll-snap-type: inline proximity;/s,
  );
  assert.match(
    css,
    /\.daySelector button\s*\{[^}]*flex: 1 1 clamp\(96px, 11vw, 168px\);[^}]*min-width: 96px;[^}]*min-height: 44px;/s,
  );
});
