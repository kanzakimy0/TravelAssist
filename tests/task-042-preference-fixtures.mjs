// Independent frozen TASK-042 vectors, shared only by the pure and live DB tests.
export const expectedRules = {
  "mobility.fewerTransfers": "boolean",
  "mobility.walkingTolerance": [
    "veryLow",
    "low",
    "standard",
    "high",
    "veryHigh",
  ],
  "mobility.noPublicTransit": "boolean",
  "mobility.noBus": "boolean",
  "mobility.noFerry": "boolean",
  "dining.localCuisine": ["deprioritize", "neutral", "prioritize"],
  "dining.smallShops": ["deprioritize", "neutral", "prioritize"],
  "dining.queueTolerance": ["low", "medium", "high"],
  "accommodation.transportConvenience": [
    "deprioritize",
    "neutral",
    "prioritize",
  ],
  "accommodation.comfort": ["deprioritize", "neutral", "prioritize"],
  "accommodation.fewerHotelChanges": ["deprioritize", "neutral", "prioritize"],
  "budget.spendingTendency": ["economical", "moderate", "flexible"],
  "budget.prioritizeAccommodation": "boolean",
  "budget.prioritizeExperience": "boolean",
  "interests.preferences": "signals",
  "interests.details": "details",
  "style.pace": [1, 2, 3, 4, 5],
  "style.depth": [1, 2, 3, 4, 5],
  "style.discovery": [1, 2, 3, 4, 5],
  "style.movement": [1, 2, 3, 4, 5],
  "style.coverage": [1, 2, 3, 4, 5],
  "style.priority": [1, 2, 3, 4, 5],
  "style.planning": [1, 2, 3, 4, 5],
};
export const expectedDetails = {
  nature_scenery: ["mountain", "coast", "lake", "forest", "flower_field"],
  history_culture: ["shrine_temple", "castle", "museum", "historic_district"],
  food: ["sushi", "ramen", "regional_cuisine", "dessert", "sake"],
  photography: [
    "street_photography",
    "landscape",
    "nightscape",
    "architecture",
    "people_culture",
  ],
  onsen_wellness: [
    "ryokan_onsen",
    "open_air_bath",
    "forest_wellness",
    "sea_view_onsen",
  ],
  art_museums: [
    "contemporary_art",
    "traditional_crafts",
    "architecture",
    "design_exhibition",
  ],
  anime_entertainment: [
    "anime_pilgrimage",
    "gaming",
    "themed_cafe",
    "merchandise",
  ],
  shopping: ["department_store", "vintage", "drugstore", "local_specialties"],
  urban_exploration: [
    "distinctive_neighborhood",
    "architecture_walk",
    "cafe",
    "city_nightscape",
  ],
  outdoor_activity: ["hiking", "cycling", "skiing", "water_activity"],
  night_experience: ["izakaya", "nightscape", "performance", "night_walk"],
  family_activity: ["zoo", "science_museum", "family_crafts", "park"],
  traditional_experience: [
    "tea_ceremony",
    "kimono",
    "crafts",
    "traditional_performance",
  ],
  theme_parks: [
    "major_theme_park",
    "character_park",
    "aquarium",
    "immersive_exhibition",
  ],
  rural_towns: [
    "historic_town",
    "fishing_village",
    "countryside",
    "local_market",
  ],
  seasonal_events: [
    "cherry_blossom",
    "autumn_leaves",
    "snow_scenery",
    "festival",
    "fireworks",
  ],
};
export const oldKeys = [
  "mobility.preset",
  "mobility.lessWalking",
  "attractions.nature",
  "attractions.history",
  "attractions.culture",
  "attractions.art",
  "attractions.photography",
  "attractions.activityExperience",
  "experience.photoExperience",
  "interests.likes",
  "interests.dislikes",
];
export const payload = (values = {}) => ({ schemaVersion: "1.0", values });
export const validPayloads = [payload()];
export const invalidPayloads = [
  null,
  [],
  true,
  1,
  "1.0",
  {},
  { values: {} },
  { schemaVersion: "1.0" },
  { schemaVersion: 1, values: {} },
  { schemaVersion: "2.0", values: {} },
  { ...payload(), owner: "untrusted" },
  ...[null, [], true, "", 3].map((values) => ({
    schemaVersion: "1.0",
    values,
  })),
  ...oldKeys.map((key) => payload({ [key]: true })),
  ...[
    "dates",
    "destination",
    "companions",
    "radar",
    "budget.amount",
    "fatigue",
    "__proto__",
    "constructor",
  ].map((key) => payload({ [key]: true })),
  payload({ "interests.preferences": { unknown: "like" } }),
  payload({ "interests.preferences": { 自然风景: "like" } }),
  payload({ "interests.preferences": { food: "neutral" } }),
  payload({ "interests.preferences": { food: null } }),
  payload({ "interests.details": { unknown: [] } }),
  payload({ "interests.details": { food: ["mountain"] } }),
  payload({ "interests.details": { food: ["sushi", "sushi"] } }),
  payload({ "interests.details": { food: ["unknown"] } }),
  payload({ "interests.details": { food: [["sushi"]] } }),
  payload({ "interests.details": { food: [null] } }),
  payload({ "interests.details": { food: "sushi" } }),
  payload({ "interests.details": { food: null } }),
  payload({
    "interests.preferences": { food: "dislike" },
    "interests.details": { food: ["sushi"] },
  }),
  payload({ "dining.localCuisine": "priority" }),
  payload({ "dining.smallShops": "like" }),
  payload({ "accommodation.comfort": "value" }),
  payload({ "accommodation.comfort": "notSpecial" }),
  payload({ "mobility.walkingTolerance": true }),
  payload({ "mobility.walkingTolerance": "medium" }),
  payload({ "style.planning": "x".repeat(65536) }),
];
for (const [key, rule] of Object.entries(expectedRules)) {
  if (rule === "signals" || rule === "details") {
    validPayloads.push(payload({ [key]: {} }));
    for (const bad of [null, [], "", true, 3])
      invalidPayloads.push(payload({ [key]: bad }));
    continue;
  }
  const good = rule === "boolean" ? [true, false] : rule;
  for (const value of good) validPayloads.push(payload({ [key]: value }));
  for (const value of [
    null,
    {},
    [],
    [good[0]],
    [[]],
    "",
    "unset",
    0,
    6,
    1.5,
    "3",
    ...(rule === "boolean" ? [1, "true"] : [true, false]),
  ])
    invalidPayloads.push(payload({ [key]: value }));
}
for (const [code, children] of Object.entries(expectedDetails)) {
  for (const signal of ["like", "dislike"])
    validPayloads.push(
      payload({ "interests.preferences": { [code]: signal } }),
    );
  validPayloads.push(payload({ "interests.details": { [code]: children } }));
  validPayloads.push(
    payload({
      "interests.preferences": { [code]: "like" },
      "interests.details": { [code]: children },
    }),
  );
  validPayloads.push(
    payload({
      "interests.preferences": { [code]: "dislike" },
      "interests.details": { [code]: [] },
    }),
  );
}
validPayloads.push(
  payload({
    "interests.preferences": Object.fromEntries(
      Object.keys(expectedDetails).map((k) => [k, "like"]),
    ),
    "interests.details": expectedDetails,
  }),
  payload({ "mobility.noPublicTransit": true, "mobility.noBus": false }),
  payload({
    "style.movement": 5,
    "accommodation.fewerHotelChanges": "prioritize",
    "style.priority": 1,
    "budget.prioritizeExperience": true,
    "style.depth": 5,
    "style.coverage": 5,
  }),
);
