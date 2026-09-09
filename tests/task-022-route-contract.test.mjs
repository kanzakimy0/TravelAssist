import assert from "node:assert/strict";
import test from "node:test";

import "./register-route-ts.mjs";

const {
  busRouteFixture,
  crossMidnightRouteFixture,
  fareUnknownRouteFixture,
  futureUnknownModeFixture,
  minimalRailRouteFixture,
  mixedTransferRouteFixture,
  multiAlternativeRouteFixture,
  routeErrorFixtures,
  routeRequestFixture,
  timezoneBoundaryRouteFixture,
} = await import("../src/shared/contracts/routes/fixtures.ts");
const { validateRouteError, validateRouteRequest, validateRouteResponse } =
  await import("../src/shared/contracts/routes/validation.ts");

test("canonical requests and all contract fixture classes validate", () => {
  assert.equal(validateRouteRequest(routeRequestFixture).valid, true);
  for (const fixture of [
    minimalRailRouteFixture,
    fareUnknownRouteFixture,
    busRouteFixture,
    futureUnknownModeFixture,
    crossMidnightRouteFixture,
    timezoneBoundaryRouteFixture,
    multiAlternativeRouteFixture,
    mixedTransferRouteFixture,
  ])
    assert.deepEqual(validateRouteResponse(fixture).issues, []);
  for (const fixture of Object.values(routeErrorFixtures))
    assert.equal(validateRouteError(fixture).valid, true);
});

test("request validator rejects invalid coordinates, version, private data, and alternatives", () => {
  const invalid = structuredClone(routeRequestFixture);
  invalid.version = "999";
  invalid.origin.coordinates = [181, 91];
  invalid.alternatives.max = 0;
  invalid.providerPayload = { accessKey: "must-not-enter-contract" };
  const result = validateRouteRequest(invalid);
  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /unsupported contract version/);
  assert.match(result.issues.join("\n"), /coordinates is invalid/);
  assert.match(result.issues.join("\n"), /private provider data/);
  assert.match(result.issues.join("\n"), /between 1 and 20/);
});

test("request validator rejects inconsistent time, mode, and preference semantics", () => {
  const invalid = structuredClone(routeRequestFixture);
  invalid.requestedModes = ["rail", "rail", "teleport"];
  invalid.timeIntent.localDate = "2026-09-10";
  invalid.timeIntent.localTime = "25:61";
  invalid.timezone = "UTC";
  invalid.alternatives.preference = "fastest-ish";
  invalid.preferences.maxWalkingMeters = -1;
  invalid.preferences.accessibility = { wheelchair: "sometimes" };
  const issues = validateRouteRequest(invalid).issues.join("\n");
  assert.match(issues, /requestedModes contains an unsupported value/);
  assert.match(issues, /requestedModes must not contain duplicates/);
  assert.match(issues, /local fields do not match its instant/);
  assert.match(issues, /timezone must match timeIntent.timezone/);
  assert.match(issues, /alternatives.preference is invalid/);
  assert.match(issues, /maxWalkingMeters is invalid/);
  assert.match(issues, /accessibility.wheelchair is invalid/);
});

test("response validator rejects negative values, reversed time, malformed geometry and private payload", () => {
  const invalid = structuredClone(minimalRailRouteFixture);
  invalid.alternatives[0].durationSeconds = -1;
  invalid.alternatives[0].arrival.instant = "2026-09-08T09:00:00+09:00";
  invalid.alternatives[0].geometry.coordinates = [[200, 100]];
  invalid.alternatives[0].raw = { SerializeData: "private" };
  const issues = validateRouteResponse(invalid).issues.join("\n");
  assert.match(issues, /non-negative integer/);
  assert.match(issues, /reversed times/);
  assert.match(issues, /at least two valid positions/);
  assert.match(issues, /private provider data/);
});

test("response validator rejects duplicates and dangling graph references", () => {
  const invalid = structuredClone(mixedTransferRouteFixture);
  invalid.alternatives[0].segments[1].id =
    invalid.alternatives[0].segments[0].id;
  invalid.alternatives[0].legs[0].segmentIds.push("missing-segment");
  invalid.alternatives[0].segments[0].stepIds.push("missing-step");
  const issues = validateRouteResponse(invalid).issues.join("\n");
  assert.match(issues, /duplicate segment id/);
  assert.match(issues, /dangling segment reference/);
  assert.match(issues, /dangling step reference/);
});

test("unknown future provider modes use explicit other/sourceMode fallback", () => {
  const segment = futureUnknownModeFixture.alternatives[0].segments[0];
  assert.equal(segment.mode, "other");
  assert.equal(segment.sourceMode, "other");
});
