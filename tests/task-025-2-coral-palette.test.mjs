import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./register-planner-ts.mjs";
import { displayRouteColor } from "../src/features/planner/map/route-color.ts";
const { mapCollections } =
  await import("../src/features/planner/map/map-provider.ts");

test("saved legacy brand paint uses the current CSS coral without changing other day colors", () => {
  const css = readFileSync(
    new URL("../src/app/globals.css", import.meta.url),
    "utf8",
  );
  const coral = css.match(/--color-accent-primary:\s*(#[a-f\d]+);/)[1];
  for (const legacy of ["#b95849", "#A74739", "#b66c5d", "#ab674b"])
    assert.equal(displayRouteColor(legacy), coral);
  for (const other of ["#6e7d98", "#a87d49", "#e95b4b", "#39745d"])
    assert.equal(displayRouteColor(other), other);
});

test("native map display recolors old saved route and marker without mutating persisted data or geometry", () => {
  const view = {
    routes: [
      {
        id: "saved-day-1",
        context: false,
        color: "#b95849",
        label: "旧保存",
        coordinates: [
          [139, 35],
          [140, 36],
        ],
      },
    ],
    areas: [],
    places: [
      {
        id: "saved-place",
        type: "attraction",
        name: "浅草寺",
        label: "浅草寺",
        color: "#b95849",
        coordinates: [139, 35],
        tripStatus: "selected",
      },
    ],
  };
  const before = structuredClone(view);
  const collections = mapCollections(view);
  assert.equal(
    collections["planner-routes"].features[0].properties.color,
    "#e95b4b",
  );
  assert.equal(
    collections["planner-places"].features[0].properties.color,
    "#e95b4b",
  );
  assert.deepEqual(
    collections["planner-routes"].features[0].geometry.coordinates,
    view.routes[0].coordinates,
  );
  assert.deepEqual(view, before);
});
