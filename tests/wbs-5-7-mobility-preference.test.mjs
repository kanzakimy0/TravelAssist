import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyTripTemporaryMobilityPreference,
  cancelMobilityPreferenceChanges,
  createDefaultMobilityPreferenceState,
  getMobilityNotices,
  mobilityPreferencesEqual,
  restoreMobilityPreferenceDefaults,
  saveMobilityPreference,
  setMobilityPreset,
  summarizeMobilityPreference,
  toggleMobilityPreference,
} from "../src/features/preferences/mobility-preference-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("default fixture is balanced with both common tendencies", () => {
  assert.deepEqual(createDefaultMobilityPreferenceState(), {
    preset: "balanced",
    fewerTransfers: true,
    lessWalking: true,
    noPublicTransit: false,
    noBus: false,
    noFerry: false,
  });
});

test("default factory returns independent values", () => {
  const first = createDefaultMobilityPreferenceState();
  const second = createDefaultMobilityPreferenceState();
  first.noBus = true;
  assert.equal(second.noBus, false);
});

test("preset selection is immutable and changes only preset", () => {
  const current = createDefaultMobilityPreferenceState();
  const next = setMobilityPreset(current, "efficient");
  assert.equal(current.preset, "balanced");
  assert.deepEqual(next, { ...current, preset: "efficient" });
});

test("fewer transfers and less walking toggle independently", () => {
  const current = createDefaultMobilityPreferenceState();
  const withoutTransfers = toggleMobilityPreference(current, "fewerTransfers");
  assert.equal(withoutTransfers.fewerTransfers, false);
  assert.equal(withoutTransfers.lessWalking, true);
  const withoutWalking = toggleMobilityPreference(
    withoutTransfers,
    "lessWalking",
  );
  assert.equal(withoutWalking.fewerTransfers, false);
  assert.equal(withoutWalking.lessWalking, false);
});

test("each allowed transport restriction toggles independently", () => {
  let state = createDefaultMobilityPreferenceState();
  state = toggleMobilityPreference(state, "noPublicTransit");
  assert.deepEqual(
    [state.noPublicTransit, state.noBus, state.noFerry],
    [true, false, false],
  );
  state = toggleMobilityPreference(state, "noBus");
  state = toggleMobilityPreference(state, "noFerry");
  assert.deepEqual(
    [state.noPublicTransit, state.noBus, state.noFerry],
    [true, true, true],
  );
});

test("default summary contains no more than three main items", () => {
  assert.equal(
    summarizeMobilityPreference(createDefaultMobilityPreferenceState()),
    "平衡 · 少换乘 · 少步行",
  );
});

test("summary prioritizes explicit restrictions", () => {
  const state = {
    ...createDefaultMobilityPreferenceState(),
    noPublicTransit: true,
    noBus: true,
    noFerry: true,
  };
  assert.equal(
    summarizeMobilityPreference(state),
    "平衡 · 不乘坐公共交通 · 不乘坐公交",
  );
});

test("summary maximum is clamped to three", () => {
  const state = {
    ...createDefaultMobilityPreferenceState(),
    noPublicTransit: true,
    noBus: true,
    noFerry: true,
  };
  assert.equal(summarizeMobilityPreference(state, 99).split(" · ").length, 3);
});

test("summary still exposes the selected preset when item limit is one", () => {
  assert.equal(
    summarizeMobilityPreference(createDefaultMobilityPreferenceState(), 1),
    "平衡",
  );
});

test("default fixture has no compatibility notice", () => {
  assert.deepEqual(
    getMobilityNotices(createDefaultMobilityPreferenceState()),
    [],
  );
});

test("less walking plus no public transit produces a warning", () => {
  const state = {
    ...createDefaultMobilityPreferenceState(),
    noPublicTransit: true,
  };
  const notices = getMobilityNotices(state);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, "walking-public-transit");
  assert.equal(notices[0].tone, "warning");
});

test("warning calculation never changes conflicting selections", () => {
  const state = {
    ...createDefaultMobilityPreferenceState(),
    noPublicTransit: true,
  };
  getMobilityNotices(state);
  assert.equal(state.lessWalking, true);
  assert.equal(state.noPublicTransit, true);
});

test("public transit plus bus restrictions produce redundancy info", () => {
  const state = {
    ...createDefaultMobilityPreferenceState(),
    lessWalking: false,
    noPublicTransit: true,
    noBus: true,
  };
  const notices = getMobilityNotices(state);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, "public-transit-bus");
  assert.equal(notices[0].tone, "info");
});

test("conflict and redundancy notices can coexist", () => {
  const state = {
    ...createDefaultMobilityPreferenceState(),
    noPublicTransit: true,
    noBus: true,
  };
  assert.deepEqual(
    getMobilityNotices(state).map((notice) => notice.id),
    ["walking-public-transit", "public-transit-bus"],
  );
});

test("save creates a detached in-memory snapshot", () => {
  const draft = {
    ...createDefaultMobilityPreferenceState(),
    noFerry: true,
  };
  const saved = saveMobilityPreference(draft);
  assert.notStrictEqual(saved, draft);
  draft.noFerry = false;
  assert.equal(saved.noFerry, true);
});

test("cancel restores a detached saved snapshot", () => {
  const saved = {
    ...createDefaultMobilityPreferenceState(),
    preset: "relaxed",
  };
  const restored = cancelMobilityPreferenceChanges(saved);
  assert.deepEqual(restored, saved);
  assert.notStrictEqual(restored, saved);
});

test("restore default returns presentation fixture", () => {
  const restored = restoreMobilityPreferenceDefaults();
  assert.deepEqual(restored, createDefaultMobilityPreferenceState());
  assert.notStrictEqual(restored, createDefaultMobilityPreferenceState());
});

test("state equality checks every supported field", () => {
  const current = createDefaultMobilityPreferenceState();
  assert.equal(mobilityPreferencesEqual(current, { ...current }), true);
  assert.equal(
    mobilityPreferencesEqual(current, { ...current, noFerry: true }),
    false,
  );
});

test("trip-temporary mobility values do not write back to long-term state", () => {
  const longTerm = createDefaultMobilityPreferenceState();
  const result = applyTripTemporaryMobilityPreference(longTerm, {
    noBus: true,
  });
  assert.equal(result.tripTemporary.noBus, true);
  assert.equal(result.longTerm.noBus, false);
  assert.notStrictEqual(result.longTerm, longTerm);
});

test("mobility route is split while other category shell remains intact", () => {
  const route = read(
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
  );
  assert.match(route, /category === "mobility"/);
  assert.match(route, /<MobilityPreferencePage \/>/);
  assert.match(route, /<PreferenceCategoryPage/);
});

test("page reuses guarded navigation and beforeunload-backed dirty state", () => {
  const page = read("src/features/preferences/mobility-preference-page.tsx");
  assert.match(page, /GuardedLink/);
  assert.match(page, /setIsDirty\(isDirty\)/);
  const guard = read(
    "src/features/personal-center/components/navigation-guard-context.tsx",
  );
  assert.match(guard, /beforeunload/);
});

test("implementation uses only the three requested restriction labels", () => {
  const page = read("src/features/preferences/mobility-preference-page.tsx");
  const labels = ["不乘坐公共交通", "不乘坐公交", "不乘坐游船"];
  for (const label of labels) assert.match(page, new RegExp(label));
  assert.doesNotMatch(page, /不乘坐飞机|不乘坐出租车|不乘坐铁路/);
});

test("no durable persistence or network storage is introduced", () => {
  const files = [
    read("src/features/preferences/mobility-preference-page.tsx"),
    read("src/features/preferences/mobility-preference-model.ts"),
  ].join("\n");
  assert.doesNotMatch(
    files,
    /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|indexedDB/,
  );
});
