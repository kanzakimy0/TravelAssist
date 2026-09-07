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
});
