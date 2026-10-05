import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { pathToFileURL } from "node:url";

const repo = process.cwd();
const model = await import(
  pathToFileURL(path.join(repo, "tools/transport/task-086-model.mjs"))
);
const fixtureRoot = path.join(repo, "tests/fixtures");
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(fixtureRoot, name), "utf8"));
const contextFor = (f) => ({
  sources: new Map(f.sources.map((x) => [x.sourceId, x])),
  evidence: new Map(f.evidence.map((x) => [x.evidenceId, x])),
  nodes: new Map(f.nodes.map((x) => [x.nodeId, x])),
  patternById: new Map(f.patterns.map((x) => [x.servicePatternId, x])),
  dynamicODById: new Map(f.dynamicOD.map((x) => [x.odId, x])),
  nativeFacilityByAnchor: new Map(f.nativeFacilityByAnchor ?? []),
});
const permute = (items) =>
  items.length <= 1
    ? [items]
    : items.flatMap((x, i) =>
        permute([...items.slice(0, i), ...items.slice(i + 1)]).map((tail) => [
          x,
          ...tail,
        ]),
      );
const reorderParameterRefsByValues = (od, valueOrder) => {
  const out = structuredClone(od),
    entries = Object.entries(out.parameterEvidenceRefs);
  const rank = new Map(valueOrder.map((value, i) => [value, i]));
  entries.sort(
    (a, b) => rank.get(a[1]) - rank.get(b[1]) || a[0].localeCompare(b[0]),
  );
  out.parameterEvidenceRefs = Object.fromEntries(entries);
  return out;
};

test("Aguni 232 generation is invariant to parameterEvidenceRefs insertion order after canonical roundtrip", () => {
  const f = read("task-086-aguni-capability/actual-subgraph.json"),
    v = contextFor(f);
  assert.equal(f.dynamicOD.length, 2);
  for (const od of f.dynamicOD) {
    const expected = f.edges.find((x) => x.dynamicODRef === od.odId);
    assert(expected);
    const persisted = JSON.parse(model.canonical(od));
    const refs = [...new Set(Object.values(persisted.parameterEvidenceRefs))];
    const outputs = permute(refs).map((order) =>
      model.generateDynamicOD(
        reorderParameterRefsByValues(persisted, order),
        v,
        expected.generatedAt,
      ),
    );
    for (const actual of outputs) {
      assert.deepEqual(actual, outputs[0]);
      assert.deepEqual(actual, expected);
    }
    const persistedRegistry = new Map(v.dynamicODById);
    persistedRegistry.set(od.odId, persisted);
    assert.equal(
      model.dynamicOD.bindEdge(outputs[0], {
        ...v,
        dynamicODById: persistedRegistry,
      }).odId,
      od.odId,
    );
  }
});

test("Okushiri 233 generation is invariant to every distinct evidence-value ordering", () => {
  const f = read("task-086-okushiri-capability/actual-subgraph.json"),
    v = contextFor(f);
  for (const od of f.dynamicOD) {
    const expected = f.edges.find((x) => x.dynamicODRef === od.odId);
    assert(expected);
    const persisted = JSON.parse(model.canonical(od));
    const refs = [...new Set(Object.values(persisted.parameterEvidenceRefs))];
    for (const order of permute(refs))
      assert.deepEqual(
        model.generateDynamicOD(
          reorderParameterRefsByValues(persisted, order),
          v,
          expected.generatedAt,
        ),
        expected,
      );
  }
});

test("the four published225 legacy OD edges preserve canonical payloads and hashes", () => {
  const f = read("task-086-dynamic-od-order/legacy-225-minimal.json"),
    v = contextFor(f);
  assert.equal(f.dynamicOD.length, 4);
  assert.equal(f.edges.length, 4);
  for (const od of f.dynamicOD) {
    const edge = f.edges.find((x) => x.dynamicODRef === od.odId);
    assert(edge);
    const generated = model.generateDynamicOD(od, v, edge.generatedAt);
    assert.equal(model.canonical(generated), model.canonical(edge));
    assert.equal(
      createHash("sha256").update(model.canonical(generated)).digest("hex"),
      f.recordHashes.edge[edge.edgeId],
    );
    assert.equal(model.dynamicOD.bindEdge(generated, v).odId, od.odId);
  }
});

test("bindEdge rejects evidence removal, evidence substitution, and field edits", () => {
  const f = read("task-086-aguni-capability/actual-subgraph.json"),
    v = contextFor(f),
    od = f.dynamicOD[0];
  const expected = f.edges.find((x) => x.dynamicODRef === od.odId);
  for (const mutate of [
    (x) => x.topologyEvidenceRefs.pop(),
    (x) => {
      x.topologyEvidenceRefs[0] =
        "transport-evidence:086:00000000000000000000000000000000";
    },
    (x) => {
      x.operatorRef = "Different operator";
    },
  ]) {
    const altered = structuredClone(expected);
    mutate(altered);
    assert.throws(
      () => model.dynamicOD.bindEdge(altered, v),
      /OD_EDGE_STRIPPED_OR_CHANGED/,
    );
  }
});
