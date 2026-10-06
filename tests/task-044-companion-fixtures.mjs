// Independent frozen-design vectors, shared verbatim by TS and real SQL tests.
export const codes = {
  mobilityNeeds: [
    "reduce_walking",
    "reduce_stairs",
    "stroller",
    "child_seat",
    "accessible_route",
    "more_rest",
  ],
  diningNeeds: [
    "dietary_restriction",
    "food_allergy_notice",
    "vegetarian",
    "child_meal",
    "other_dietary_need",
  ],
  activityInterests: ["animals", "outdoor", "museums", "photography", "rides"],
};
export const emptyProfile = () => ({
  schemaVersion: "1.0",
  mobilityNeeds: [],
  diningNeeds: [],
  activityInterests: [],
});
export const fullProfile = () => ({
  schemaVersion: "1.0",
  ...structuredClone(codes),
});
export const validProfiles = [
  ["empty", emptyProfile()],
  ["full", fullProfile()],
];
for (const [key, values] of Object.entries(codes)) {
  validProfiles.push([key + " all", { ...emptyProfile(), [key]: values }]);
  for (const code of values)
    validProfiles.push([
      key + " " + code,
      { ...emptyProfile(), [key]: [code] },
    ]);
}
// Near-limit wire JSON is legal, but JSONB and the TS parser discard whitespace.
// No semantic profile can approach 8 KiB: finite unique allowlists cap its size.
export const nearLimitJson =
  JSON.stringify(fullProfile()) +
  " ".repeat(8191 - Buffer.byteLength(JSON.stringify(fullProfile())));
validProfiles.push(["near-limit serialized input", JSON.parse(nearLimitJson)]);
export const invalidProfiles = [
  ["null", null],
  ["array", []],
  ["boolean", true],
  ["string", "x"],
  ["number", 1],
  [
    "missing version",
    Object.fromEntries(
      Object.entries(emptyProfile()).filter(([k]) => k !== "schemaVersion"),
    ),
  ],
  ...[null, 1, "1", "2.0", ["1.0"], { version: "1.0" }].map((v) => [
    "version " + JSON.stringify(v),
    { ...emptyProfile(), schemaVersion: v },
  ]),
  ...[
    "privateNote",
    "diningNote",
    "notes",
    "medical_notes",
    "diagnosis",
    "medication",
    "allergen_text",
    "religion",
    "isSelf",
    "age",
    "gender",
    "relationship",
    "__proto__",
    "constructor",
    "prototype",
  ].map((key) => ["extra " + key, { ...emptyProfile(), [key]: "forbidden" }]),
  ["over 8KiB", { ...emptyProfile(), privateNote: "x".repeat(8193) }],
];
for (const [key, values] of Object.entries(codes)) {
  invalidProfiles.push([
    "missing " + key,
    Object.fromEntries(
      Object.entries(emptyProfile()).filter(([k]) => k !== key),
    ),
  ]);
  for (const value of [
    null,
    true,
    1,
    "",
    {},
    [null],
    [true],
    [1],
    [{}],
    [[]],
    [[values[0]]],
    ["少步行"],
    ["unknown"],
    [values[0], values[0]],
    Array(9000).fill(values[0]),
  ]) {
    invalidProfiles.push([
      key + " invalid " + invalidProfiles.length,
      { ...emptyProfile(), [key]: value },
    ]);
  }
  for (const other of Object.values(codes)
    .flat()
    .filter((x) => !values.includes(x)))
    invalidProfiles.push([
      key + " cross-category " + other,
      { ...emptyProfile(), [key]: [other] },
    ]);
}
export const ageVectors = [
  ["2024-09-11", "2026-09-11", "infant"],
  ["2023-09-11", "2026-09-10", "infant"],
  ["2023-09-11", "2026-09-11", "child"],
  ["2008-09-11", "2026-09-10", "child"],
  ["2008-09-11", "2026-09-11", "adult"],
  ["1961-09-11", "2026-09-10", "adult"],
  ["1961-09-11", "2026-09-11", "senior"],
  ["2026-09-11", "2026-09-11", "infant"],
  ["2024-02-29", "2027-02-28", "infant"],
  ["2024-02-29", "2027-03-01", "child"],
  ["2000-02-29", "2018-02-28", "child"],
  ["2000-02-29", "2018-03-01", "adult"],
  ["0001-01-01", "9999-12-31", "senior"],
];
export const invalidDates = [
  "",
  "2026-2-01",
  "2026-02-30",
  "2025-02-29",
  "1900-02-29",
  "0000-01-01",
  "10000-01-01",
  "2026-13-01",
  "2026-00-01",
  "2026-01-00",
  "2026-01-32",
  "2026-01-01T00:00:00Z",
  " 2026-01-01",
  null,
  123,
];
