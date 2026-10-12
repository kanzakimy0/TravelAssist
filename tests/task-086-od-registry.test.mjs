import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildFixture } from "./fixtures/task-086-dynamic-od/fixture.mjs";
import { hash, queryGraph } from "../tools/transport/task-086-model.mjs";
import {
  loadPublishedODContext,
  attachODContexts,
} from "../tools/transport/task-086-dynamic-od-registry.mjs";
const F = buildFixture();
function setup() {
  const f = structuredClone(F),
    base = fs.mkdtempSync(path.join(os.tmpdir(), "task086-od-registry-")),
    write = (rel, x) => {
      const p = path.join(base, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(x));
    };
  const review = JSON.parse(
    fs.readFileSync(
      new URL(
        "./fixtures/task-086-dynamic-od/south-daito-office-p05-native-identity-review.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  fs.mkdirSync(path.join(base, "sources/raw"), { recursive: true });
  fs.copyFileSync(
    new URL(
      "./fixtures/task-086-dynamic-od/p05-22-47-native.zip",
      import.meta.url,
    ),
    path.join(base, "sources/raw/p05.zip"),
  );
  fs.copyFileSync(
    new URL(
      "./fixtures/task-086-dynamic-od/P05-22_47.geojson",
      import.meta.url,
    ),
    path.join(base, "sources/raw/p05.geojson"),
  );
  write("research/public-od-facilities.v1.json", {
    schemaVersion: 1,
    facilities: [
      {
        archivePath: "sources/raw/p05.zip",
        memberPath: "sources/raw/p05.geojson",
        review,
        nativeIdentityEvidenceRef: f.office.evidenceRefs[0],
        currentEndpointEvidenceRef: f.office.evidenceRefs[1],
        sourcePackagePaths: [],
      },
    ],
  });
  write("research/phases/001.json", {
    phaseId: "south-daito-public-phone-private",
    facts: f.facts,
  });
  write(
    "public-od-facility-registry.json",
    [...f.validation.nativeFacilityByAnchor].sort(),
  );
  fs.writeFileSync(
    path.join(base, "dynamic-od-services.jsonl"),
    [...f.validation.dynamicODById.values()]
      .map((x) => JSON.stringify(x))
      .join("\n"),
  );
  return {
    f,
    base,
    write,
    context: () =>
      loadPublishedODContext(base, { ...f.validation, actions: f.actions }),
  };
}
test("actual persisted registry reloaded from phase/raw/native independent inputs", () => {
  const s = setup(),
    v = s.context(),
    contexts = attachODContexts([s.f.context], v);
  assert.equal(v.dynamicODById.size, 2);
  assert(contexts[0].evidenceContextSha256);
  assert.equal(
    queryGraph(s.f.edges, s.f.office.nodeId, s.f.airport.nodeId, contexts[0])
      .length,
    1,
  );
});
test("phase expected OD cannot disappear by stripping registry", () => {
  const s = setup();
  fs.writeFileSync(path.join(s.base, "dynamic-od-services.jsonl"), "");
  assert.throws(s.context, /OD_PHASE_REGISTRY_CARDINALITY/);
});
test("raw source input cannot diverge from persisted record", () => {
  const s = setup();
  const facts = structuredClone(s.f.facts);
  facts[0].endpointNames = ["南大東港", "南大東空港"];
  s.write("research/phases/001.json", {
    phaseId: "south-daito-public-phone-private",
    facts,
  });
  assert.throws(s.context, /OD_PHASE_RAW_REGISTRY_MISMATCH/);
});
test("native registry mutation rejected independently from admitted node", () => {
  const s = setup(),
    rows = [...s.f.validation.nativeFacilityByAnchor];
  rows[0][1].identityRecord.feature.geometry.coordinates[0] += 0.01;
  s.write("public-od-facility-registry.json", rows);
  assert.throws(s.context);
});
test("withdrawn observed action invalidates registry loading", () => {
  const s = setup();
  s.f.actions[0].state = "PENDING_RESEARCH";
  assert.throws(s.context, /RIGHTS_REVIEW|CORROBORATING_SOURCE/);
});
test("condition evidence source withdrawal invalidates loaded registry", () => {
  const s = setup(),
    od = [...s.f.validation.dynamicODById.values()][0],
    ref = od.parameterEvidenceRefs.minimumLeadMinutes;
  s.f.validation.sources.get(
    s.f.validation.evidence.get(ref).sourceId,
  ).rightsClass = "REVOKED";
  assert.throws(s.context, /OD_PARAMETER_SOURCE/);
});
test("published registry cannot broaden to resident profile or WEB", () => {
  for (const change of [
    { profile: "RESIDENT_ALL_VILLAGE" },
    { channel: "WEB" },
  ]) {
    const s = setup(),
      rows = [...s.f.validation.dynamicODById.values()];
    Object.assign(rows[0].accessTerms, change);
    fs.writeFileSync(
      path.join(s.base, "dynamic-od-services.jsonl"),
      rows.map((x) => JSON.stringify(x)).join("\n"),
    );
    assert.throws(s.context);
  }
});
test("reloaded context remains date-sensitive and default denied", () => {
  const s = setup(),
    v = s.context(),
    c = attachODContexts([s.f.context], v)[0];
  assert.equal(
    queryGraph(s.f.edges, s.f.office.nodeId, s.f.airport.nodeId),
    null,
  );
  c.travelDate = "2027-02-01";
  for (const i of c.odReservationIntents) {
    i.requestAt = "2027-02-01T09:00:00+09:00";
    i.pickupAt = "2027-02-01T10:00:00+09:00";
  }
  assert.equal(
    queryGraph(s.f.edges, s.f.office.nodeId, s.f.airport.nodeId, c),
    null,
  );
});
import {
  loadConditionalContextInputs,
  CONDITIONAL_CONTEXT_INPUT_FILE,
} from "../tools/transport/task-086-dynamic-od-registry.mjs";
test("actual CLI context input reloads exact source-bound request declarations without runtime-only override", () => {
  const s = setup(),
    { odValidationContext, ...c } = s.f.context;
  s.write(CONDITIONAL_CONTEXT_INPUT_FILE, { schemaVersion: 1, contexts: [c] });
  const result = loadConditionalContextInputs(s.base);
  assert.deepEqual(result.contexts, [c]);
  assert.deepEqual(result.inputPaths, [CONDITIONAL_CONTEXT_INPUT_FILE]);
  assert.throws(
    () => loadConditionalContextInputs(s.base, []),
    /PUBLIC_CONTEXT_RUNTIME_OVERRIDE_FORBIDDEN/,
  );
});
test("CLI cannot silently pass runtime-only conditional context without an input fingerprint", () => {
  const s = setup(),
    { odValidationContext, ...c } = s.f.context;
  assert.throws(
    () => loadConditionalContextInputs(s.base, [c]),
    /PUBLIC_CONTEXT_MUST_BE_PERSISTED_INPUT/,
  );
});
test("persisted context cannot carry a fake embedded independent registry", () => {
  const s = setup(),
    { odValidationContext, ...c } = s.f.context;
  s.write(CONDITIONAL_CONTEXT_INPUT_FILE, {
    schemaVersion: 1,
    contexts: [{ ...c, odValidationContext: {} }],
  });
  assert.throws(
    () => loadConditionalContextInputs(s.base),
    /PUBLIC_CONTEXT_NO_EMBEDDED_TRUST_REGISTRY/,
  );
});
