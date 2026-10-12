import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { preflightAirportSelectors } from "../tools/transport/task-086-airport-identities.mjs";
const root = new URL("../data/transport/network/", import.meta.url);
const read = (p) => JSON.parse(fs.readFileSync(new URL(p, root), "utf8"));
const records = fs
  .readFileSync(new URL("research/c28-identities.jsonl", root), "utf8")
  .trim()
  .split(/\r?\n/)
  .map(JSON.parse);
const inventory = read("required-backbone-inventory.json").nodes;
const phase = read("research/phases/218-tanegashima-public-fixed-phone.json");
const check = (facts) => preflightAirportSelectors(facts, records, inventory);
test("registered Tanegashima public rides use the actual C28 admission selector in both directions", () => {
  assert.equal(check(phase.facts), 2);
});
test("bare airport name/operator fields cannot fall back to rail binding", () => {
  const facts = structuredClone(phase.facts);
  for (const f of facts)
    for (const c of f.callingComponents) delete c.airportIdentity;
  assert.throws(() => check(facts), /AIRPORT_IDENTITY_SELECTOR_REQUIRED/);
});
test("airport selector preflight rejects stale reference, wrong original requirement and removed access review", () => {
  for (const mutate of [
    (c) => (c.airportIdentity.referencePointId = "missing"),
    (c) => (c.airportIdentity.requirementId = "wrong"),
    (c) => (c.airportIdentity.currentPassengerAccessReview = ""),
    (c) => (c.operator = "airport-facility:wrong"),
  ]) {
    const facts = structuredClone(phase.facts);
    mutate(facts[0].callingComponents.find((c) => c.airportIdentity));
    assert.throws(() => check(facts), /AIRPORT_/);
  }
});
test("all registered airport selectors satisfy the same admission contract before expensive graph replay", () => {
  const dir = new URL("research/phases/", root);
  const facts = fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .flatMap((n) => JSON.parse(fs.readFileSync(new URL(n, dir), "utf8")).facts);
  assert.ok(check(facts) > 100);
});
