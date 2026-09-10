import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-planner-ts.mjs";
import {
  plannerArtwork,
  destinationArtwork,
  planArtwork,
  mapArtworkUrl,
} from "../src/features/planner/data/planner-artwork.ts";
const { installMapArtwork } =
  await import("../src/features/planner/map/map-visuals.ts");
const { mapCollections } =
  await import("../src/features/planner/map/map-provider.ts");
const { makeTripState, mapView } =
  await import("../src/features/planner/model/trip-model.ts");
import {
  plannerMockPlans,
  initialPlannerSettings,
} from "../src/features/planner/data/planner-mock-data.ts";
import { makePlannerCatalog } from "../src/features/planner/data/planner-catalog.ts";

test("all five approved local originals exist and optimized URLs remain same-origin", () => {
  assert.equal(Object.keys(plannerArtwork).length, 5);
  assert.equal(
    new Set(Object.values(plannerArtwork).map((a) => a.src)).size,
    5,
  );
  for (const art of Object.values(plannerArtwork)) {
    const data = readFileSync("public" + art.src);
    assert.equal(data.subarray(1, 4).toString(), "PNG");
    assert.ok(data.readUInt32BE(16) > 0 && data.readUInt32BE(20) > 0);
    const optimized = new URL(mapArtworkUrl(art), "http://localhost");
    assert.equal(optimized.pathname, "/_next/image");
    assert.equal(optimized.searchParams.get("url"), art.src);
    assert.equal(optimized.searchParams.get("w"), "256");
  }
});

test("landmark matching separates towers and never substitutes scenery for hotels or other POIs", () => {
  for (const [name, id] of [
    ["东京", "tower"],
    ["东京塔", "tower"],
    ["东京晴空塔", "skytree"],
    ["浅草寺", "temple"],
    ["河口湖湖畔", "mountain"],
    ["芦之湖游船", "lake"],
  ])
    assert.equal(destinationArtwork(name, "attraction").id, id);
  for (const name of [
    "东京国立博物馆",
    "富士急乐园",
    "河口湖音乐森林",
    "箱根玻璃之森",
    "浅草午餐",
    "东京站区域酒店",
    "河口湖温泉旅馆",
    "未知景点",
  ])
    assert.equal(destinationArtwork(name), undefined);
  assert.equal(destinationArtwork("东京", "hotel"), undefined);
  assert.equal(destinationArtwork("浅草寺", "restaurant"), undefined);
  assert.deepEqual(
    plannerMockPlans.map((p) => planArtwork(p.id).id),
    ["mountain", "temple", "lake"],
  );
  assert.equal(planArtwork("unknown"), undefined);
});

test("Mapbox receives the same explicit asset identity without changing coordinates or state", () => {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  const s = makeTripState(
    plannerMockPlans,
    places,
    areas,
    initialPlannerSettings,
  );
  const view = mapView(s),
    before = structuredClone(view);
  const features = mapCollections(view)["planner-places"].features;
  assert.equal(
    features.find((f) => f.properties.tripItemId === "classic-skytree")
      .properties.artworkKey,
    "skytree",
  );
  assert.equal(
    features.find((f) => f.properties.tripItemId === "classic-asakusa")
      .properties.artworkKey,
    "temple",
  );
  for (const f of features)
    assert.deepEqual(
      f.geometry.coordinates,
      view.places.find((p) => p.id === f.properties.id).coordinates,
    );
  assert.deepEqual(view, before);
});

test("Mapbox sprite installation survives missing images and respects unmount", async () => {
  const oldImage = globalThis.Image,
    oldDocument = globalThis.document;
  let rejectArt = false;
  class TestImage {
    width = 128;
    height = 128;
    naturalWidth = 128;
    naturalHeight = 128;
    set src(value) {
      queueMicrotask(() => {
        if (rejectArt && value.startsWith("/_next/image")) this.onerror?.();
        else this.onload?.();
      });
    }
    async decode() {}
  }
  const context = Object.fromEntries(
    [
      "drawImage",
      "beginPath",
      "arc",
      "fill",
      "save",
      "clip",
      "restore",
      "fillRect",
      "fillText",
    ].map((k) => [k, () => {}]),
  );
  context.getImageData = () => ({
    width: 128,
    height: 128,
    data: new Uint8ClampedArray(128 * 128 * 4),
  });
  globalThis.Image = TestImage;
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
  };
  try {
    for (rejectArt of [false, true]) {
      const ids = [];
      await installMapArtwork({ addImage: (id) => ids.push(id) });
      assert.equal(ids.length, 11);
      assert.equal(new Set(ids).size, 11);
      for (const art of Object.values(plannerArtwork))
        assert.ok(ids.includes(`editorial-${art.id}`));
    }
    let writes = 0;
    await installMapArtwork({ addImage: () => writes++ }, () => false);
    assert.equal(writes, 0);
  } finally {
    globalThis.Image = oldImage;
    globalThis.document = oldDocument;
  }
});
