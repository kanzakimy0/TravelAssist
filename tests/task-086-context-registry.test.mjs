import test from "node:test";
import assert from "node:assert/strict";
import { attachODContexts } from "../tools/transport/task-086-dynamic-od-registry.mjs";
import { hash } from "../tools/transport/task-086-model.mjs";
const contract = { kind: "PUBLIC_BUS_ONBOARD_REQUEST" },
  ch = hash(contract);
const v = () => ({
  patternById: new Map(),
  dynamicODById: new Map(),
  sources: new Map(),
  evidence: new Map(),
  nodes: new Map(),
  nativeFacilityByAnchor: new Map(),
});
const onboard = { onboardIntents: [{ contractSha256: ch }] },
  od = { odReservationIntents: [{ odId: "od1" }] };
test("onboard context absent from historical registry is filtered without reading missing OD intents", () =>
  assert.deepEqual(attachODContexts([onboard], v()), []));
test("OD existence must not bypass missing onboard contract in a mixed context", () => {
  const c = v();
  c.dynamicODById.set("od1", {});
  assert.deepEqual(attachODContexts([{ ...onboard, ...od }], c), []);
});
test("onboard existence must not bypass missing OD record in mixed context", () => {
  const c = v();
  c.patternById.set("p", { accessContract: contract });
  assert.deepEqual(attachODContexts([{ ...onboard, ...od }], c), []);
});
test("independent established contexts attach complete evidence registry", () => {
  const c = v();
  c.patternById.set("p", { accessContract: contract });
  c.dynamicODById.set("od1", {});
  const r = attachODContexts([onboard, od, { ...onboard, ...od }, {}], c);
  assert.equal(r.length, 4);
  for (const x of r.slice(0, 3)) {
    assert.equal(x.odValidationContext, c);
    assert.match(x.evidenceContextSha256, /^[a-f0-9]{64}$/);
  }
  assert.deepEqual(r[3], {});
});
for (const key of ["onboardIntents", "odReservationIntents"])
  test("invalid or empty " + key + " rejected as ineligible", () => {
    for (const value of [[], {}, "bad"])
      assert.deepEqual(attachODContexts([{ [key]: value }], v()), []);
  });

test("flight-associated fixed reservation retains complete registry when no onboard context exists", () => {
  const c = v(),
    fixed = { reservationIntents: [{ flightServicePatternId: "flight-1" }] };
  const r = attachODContexts([fixed], c);
  assert.equal(r.length, 1);
  assert.equal(r[0].odValidationContext, c);
  assert.match(r[0].evidenceContextSha256, /^[a-f0-9]{64}$/);
});
test("all three mechanisms coexist but fixed flight intent cannot bypass missing onboard contract", () => {
  const c = v();
  c.dynamicODById.set("od1", {});
  const mixed = {
    ...od,
    ...onboard,
    reservationIntents: [{ flightServicePatternId: "flight-1" }],
  };
  assert.deepEqual(attachODContexts([mixed], c), []);
  c.patternById.set("p", { accessContract: contract });
  const r = attachODContexts([mixed], c);
  assert.equal(r.length, 1);
  assert.equal(r[0].odValidationContext, c);
});

const staleHash = "f".repeat(64);
const fixedContext = (acceptedContracts = [staleHash]) => ({
  kind: "EXPLICIT_CONDITIONAL_PLANNING",
  publicStructureOnly: true,
  acceptedContracts,
  reservationIntents: [{ flightServicePatternId: "future-flight" }],
});
test("fixed-flight-only context with no current accepted pattern contract is skipped", () => {
  const c = v();
  const context = fixedContext();
  assert.deepEqual(attachODContexts([context], c), []);
});
test("fixed-flight context whose exact contract is current remains attached", () => {
  const c = v();
  c.patternById.set("p", { accessContract: contract });
  const context = fixedContext([ch]);
  const r = attachODContexts([context], c);
  assert.equal(r.length, 1);
  assert.equal(r[0].odValidationContext, c);
});
test("fixed-flight context without acceptedContracts preserves established behavior", () => {
  const c = v();
  const context = fixedContext(undefined);
  delete context.acceptedContracts;
  assert.equal(attachODContexts([context], c).length, 1);
});
test("mixed OD and fixed-flight context is not removed by fixed-only optimization", () => {
  const c = v();
  c.dynamicODById.set("od1", {});
  const context = { ...fixedContext(), ...od };
  assert.equal(attachODContexts([context], c).length, 1);
});
test("mixed flight and non-flight reservation intents are not classified fixed-only", () => {
  const c = v();
  const context = {
    ...fixedContext(),
    reservationIntents: [
      { flightServicePatternId: "future-flight" },
      { kind: "REQUEST_BEFORE_DEADLINE" },
    ],
  };
  assert.equal(attachODContexts([context], c).length, 1);
});
