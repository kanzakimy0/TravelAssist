import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import {
  preferencePresets,
  presetsForCategory,
  applyPreferencePreset,
  matchPreferencePreset,
} from "../src/features/preferences/presets/preference-presets.ts";
import {
  emptyPreference,
  parsePreferencePatchV1,
  parsePreferenceV1,
  preferenceKeys,
  applyPreferencePatch,
} from "../src/shared/contracts/preferences/core.ts";
import {
  editPreferenceValue,
  preferenceDraftPatch,
  keysForPage,
} from "../src/features/preferences/persistence/preference-adapter.ts";
const full = parsePreferenceV1({
  schemaVersion: "1.0",
  values: Object.fromEntries(
    preferenceKeys.map((k) => [
      k,
      k === "interests.preferences"
        ? { nature_scenery: "like" }
        : k === "interests.details"
          ? { nature_scenery: ["mountain"] }
          : k.startsWith("style.")
            ? 5
            : k === "mobility.walkingTolerance"
              ? "veryHigh"
              : k === "dining.queueTolerance"
                ? "low"
                : k === "budget.spendingTendency"
                  ? "flexible"
                  : k.startsWith("dining.") || k.startsWith("accommodation.")
                    ? "deprioritize"
                    : true,
    ]),
  ),
});
const expected = [
  [
    "mobility_easy",
    "mobility",
    { "mobility.fewerTransfers": true, "mobility.walkingTolerance": "low" },
    ["mobility.noPublicTransit", "mobility.noBus", "mobility.noFerry"],
  ],
  [
    "mobility_standard",
    "mobility",
    { "mobility.walkingTolerance": "standard" },
    [
      "mobility.fewerTransfers",
      "mobility.noPublicTransit",
      "mobility.noBus",
      "mobility.noFerry",
    ],
  ],
  [
    "dining_local",
    "dining",
    {
      "dining.localCuisine": "prioritize",
      "dining.smallShops": "prioritize",
      "dining.queueTolerance": "medium",
    },
    [],
  ],
  [
    "dining_flexible",
    "dining",
    {
      "dining.localCuisine": "neutral",
      "dining.smallShops": "neutral",
      "dining.queueTolerance": "high",
    },
    [],
  ],
  [
    "accommodation_comfort",
    "accommodation",
    {
      "accommodation.transportConvenience": "prioritize",
      "accommodation.comfort": "prioritize",
      "accommodation.fewerHotelChanges": "prioritize",
    },
    [],
  ],
  [
    "accommodation_neutral",
    "accommodation",
    {
      "accommodation.transportConvenience": "neutral",
      "accommodation.comfort": "neutral",
      "accommodation.fewerHotelChanges": "neutral",
    },
    [],
  ],
  ...["economical", "moderate", "flexible"].map((v) => [
    "budget_" + v,
    "budget",
    { "budget.spendingTendency": v },
    ["budget.prioritizeAccommodation", "budget.prioritizeExperience"],
  ]),
];
test("TASK-053 catalog has only the nine frozen templates; defaults remain sparse", () => {
  assert.deepEqual(
    preferencePresets.map((p) => p.id),
    expected.map((p) => p[0]),
  );
  assert.deepEqual(emptyPreference(), { schemaVersion: "1.0", values: {} });
  for (const category of [
    "mobility",
    "dining",
    "accommodation",
    "budget",
    "attractions",
    "experience",
    "advanced",
  ])
    assert.equal(matchPreferencePreset(emptyPreference(), category), null);
  for (const category of [
    "attractions",
    "experience",
    "advanced",
    "interests",
    "style",
  ])
    assert.deepEqual(presetsForCategory(category), []);
  assert.throws(() => applyPreferencePreset(full, "balanced"));
});
for (const [id, category, set, unset] of expected) {
  test("TASK-053 frozen patch " + id, () => {
    const p = preferencePresets.find((p) => p.id === id);
    assert.deepEqual(parsePreferencePatchV1(p.patch), {
      schemaVersion: "1.0",
      set,
      unset,
    });
    assert.deepEqual(
      new Set([...Object.keys(set), ...unset]),
      new Set(keysForPage(category)),
    );
  });
  test(
    "TASK-053 scope, repeatability, immutability and exact match " + id,
    () => {
      for (const base of [emptyPreference(), full]) {
        const before = structuredClone(base),
          next = applyPreferencePreset(base, id);
        assert.deepEqual(base, before);
        assert.deepEqual(parsePreferenceV1(next), next);
        assert.deepEqual(applyPreferencePreset(next, id), next);
        assert.deepEqual(applyPreferencePreset(base, id), next);
        assert.equal(matchPreferencePreset(next, category)?.id, id);
        for (const key of preferenceKeys.filter(
          (k) => !k.startsWith(category + "."),
        ))
          assert.deepEqual(next.values[key], base.values[key]);
        assert.equal(
          matchPreferencePreset(
            editPreferenceValue(next, "style.pace", 1),
            category,
          )?.id,
          id,
        );
        for (const key of keysForPage(category)) {
          const changed = editPreferenceValue(
            next,
            key,
            next.values[key] === undefined ? true : undefined,
          );
          assert.equal(matchPreferencePreset(changed, category), null);
        }
        const wire = JSON.stringify(preferenceDraftPatch(base, next));
        assert.doesNotMatch(wire, /preset|label|description|match/);
        assert.deepEqual(applyPreferencePatch(base, JSON.parse(wire)), next);
        let clear = next;
        for (const key of keysForPage(category))
          clear = editPreferenceValue(clear, key, undefined);
        assert.equal(matchPreferencePreset(clear, category), null);
        for (const key of keysForPage(category))
          assert.equal(Object.hasOwn(clear.values, key), false);
      }
    },
  );
}
test("TASK-053 catalog is deeply immutable, derived arrays cannot mutate registry", () => {
  assert.ok(Object.isFrozen(preferencePresets));
  assert.ok(Object.isFrozen(presetsForCategory("budget")));
  for (const p of preferencePresets) {
    for (const x of [p, p.patch, p.patch.set, p.patch.unset])
      assert.ok(Object.isFrozen(x));
    assert.throws(() => {
      p.patch.set["style.pace"] = 1;
    });
  }
});
test("TASK-053 explicit false and neutral are not unset", () => {
  const next = applyPreferencePreset(emptyPreference(), "mobility_standard");
  assert.equal(
    matchPreferencePreset(
      editPreferenceValue(next, "mobility.noBus", false),
      "mobility",
    ),
    null,
  );
  assert.notDeepEqual(
    applyPreferencePreset(emptyPreference(), "accommodation_neutral"),
    emptyPreference(),
  );
});
test("TASK-053 browser registry graph has one canonical parser and no private dependencies", async () => {
  const built = await build({
    entryPoints: ["src/features/preferences/presets/preference-presets.ts"],
    bundle: true,
    platform: "browser",
    write: false,
    metafile: true,
    minify: true,
    legalComments: "none",
  });
  const paths = Object.keys(built.metafile.inputs);
  assert.ok(
    paths.some((p) => p.endsWith("shared/contracts/preferences/core.ts")),
  );
  assert.equal(
    paths.filter((p) => p.endsWith("shared/contracts/preferences/core.ts"))
      .length,
    1,
  );
  assert.doesNotMatch(
    paths.join("\n"),
    /server\/|server-only|supabase|postgres|drizzle|\/db\//,
  );
  assert.doesNotMatch(
    built.outputFiles[0].text,
    /process\.env|SUPABASE_SECRET_KEY|verifiedPrivateRequest/,
  );
  const editor = await readFile(
    "src/features/preferences/persistence/canonical-preference-editor.tsx",
    "utf8",
  );
  assert.match(editor, /state\.edit\(applyPreferencePreset/);
  assert.doesNotMatch(editor, /createDefault.*Preference|setMobilityPreset/);
});
