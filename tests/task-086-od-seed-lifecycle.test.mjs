import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import test from "node:test";
import {
  hash,
  id,
  publicConditionalApplicability,
  validateEdges,
} from "../tools/transport/task-086-model.mjs";
import { attachODContexts } from "../tools/transport/task-086-dynamic-od-registry.mjs";
import { materializeDynamicODFact } from "../tools/transport/task-086-dynamic-od-intake.mjs";
import { buildReviewedFactSourceRecord } from "../tools/transport/task-086-remediate.mjs";
import { reviewedFactAction } from "../tools/transport/task-086-source-actions.mjs";
const root = path.resolve(import.meta.dirname, ".."),
  read = (p) => JSON.parse(fs.readFileSync(p, "utf8")),
  resolved = (e) =>
    e.record?.kind === "dynamic_od" && e.record.odId && e.record.sourceFactRef;
const fixtures = ["aguni", "okushiri"].map((n) =>
  read(
    root + "/tests/fixtures/task-086-" + n + "-capability/actual-subgraph.json",
  ),
);
function val(f) {
  return {
    sources: new Map(f.sources.map((x) => [x.sourceId, x])),
    evidence: new Map(f.evidence.map((x) => [x.evidenceId, x])),
    nodes: new Map(f.nodes.map((x) => [x.nodeId, x])),
    patternById: new Map(f.patterns.map((x) => [x.servicePatternId, x])),
    dynamicODById: new Map(f.dynamicOD.map((x) => [x.odId, x])),
    nativeFacilityByAnchor: new Map(f.nativeFacilityByAnchor),
  };
}
function invoke(
  v,
  edges,
  contexts = [],
  nodes = [...v.nodes.values()],
  inventory = [],
  anchorNodeId = nodes[0]?.nodeId,
  deficits = [],
) {
  return publicConditionalApplicability({
    nodes,
    edges,
    inventory,
    anchorNodeId,
    deficits,
    contexts,
    validationContext: v,
  });
}
test("source-only package fixtures contain unchanged raw facts and no future materialized records", () => {
  for (let j = 0; j < fixtures.length; j++) {
    const name = ["aguni", "okushiri"][j],
      clean = read(
        root + "/tests/fixtures/task-086-od-seed/" + name + "-source-seed.json",
      ),
      f = fixtures[j];
    assert.equal(clean.evidence.length, 2);
    assert.ok(
      clean.evidence.every(
        (e) =>
          e.record.kind === "dynamic_od" &&
          !e.record.odId &&
          !e.record.sourceFactRef,
      ),
    );
    for (const e of clean.evidence)
      assert.deepEqual(
        e,
        f.evidence.find((x) => x.evidenceId === e.evidenceId),
      );
    assert.equal(
      clean.source.contentSha256,
      f.sources.find((s) => s.sourceId === clean.source.sourceId).contentSha256,
    );
    assert.deepEqual(
      [clean.candidates, clean.patterns, clean.transfers],
      [[], [], []],
    );
    const packageName = [
      "aguni232-b7282d6c729db1d1.json",
      "okushiri233-1fc670cc65825bed.json",
    ][j];
    assert.deepEqual(
      read(root + "/data/transport/network/sources/" + packageName),
      clean,
      "canonical source package must remain a source-only seed",
    );
  }
});
for (let j = 0; j < fixtures.length; j++) {
  const name = ["aguni", "okushiri"][j];
  test(
    name +
      " absent future pair deferred without weakening partial/current registry checks",
    () => {
      const f = structuredClone(fixtures[j]),
        v = val(f);
      for (const e of [...v.evidence.values()].filter(resolved))
        v.evidence.delete(e.evidenceId);
      v.dynamicODById.clear();
      assert.equal(attachODContexts(f.contexts, v).length, 0);
      v.dynamicODById.set(f.dynamicOD[0].odId, f.dynamicOD[0]);
      assert.equal(attachODContexts(f.contexts, v).length, 1);
      v.dynamicODById.clear();
      const e = f.evidence.find(resolved);
      v.evidence.set(e.evidenceId, e);
      assert.equal(attachODContexts(f.contexts, v).length, 1);
      assert.throws(
        () => invoke(v, [], attachODContexts(f.contexts, v)),
        /PUBLIC_STRUCTURE_OD_REGISTRY_STRIPPED/,
      );
    },
  );
  test(
    name +
      " current registry stripped remains a hard error even if contexts are filtered/omitted",
    () => {
      const f = structuredClone(fixtures[j]),
        v = val(f);
      v.dynamicODById.clear();
      assert.equal(attachODContexts(f.contexts, v).length, 1);
      assert.throws(
        () => invoke(v, f.edges, []),
        /PUBLIC_STRUCTURE_OD_REGISTRY_STRIPPED/,
      );
    },
  );
  test(
    name +
      " materializeDynamicODFact regenerates exact retired seed IDs, records and ride edges from unchanged raw facts",
    () => {
      const f = structuredClone(fixtures[j]),
        v = val(f),
        original = new Map(v.evidence);
      for (const e of [...v.evidence.values()].filter(resolved))
        v.evidence.delete(e.evidenceId);
      v.dynamicODById.clear();
      for (const fact of f.phase.facts.filter((x) => x.kind === "dynamic_od")) {
        const m = materializeDynamicODFact(fact, {
          ...v,
          actions: f.actions,
          phaseId: f.phase.phaseId,
          generatedAt: "2026-10-01T00:00:00Z",
          makeEvidence(source, record, locator, key) {
            const e = {
              evidenceId: id("evidence", key),
              sourceId: source.sourceId,
              sourceSha256: source.contentSha256,
              record,
              recordSha256: hash(record),
              locator,
            };
            assert.deepEqual(e, original.get(e.evidenceId));
            v.evidence.set(e.evidenceId, e);
            return e.evidenceId;
          },
          factSource(fact) {
            const { observed, rights } = reviewedFactAction(fact, f.actions);
            const s = buildReviewedFactSourceRecord({
              fact,
              observed,
              rights,
              recordSet: f.phase.facts.filter(
                (x) =>
                  x.sourceActionId === fact.sourceActionId &&
                  x.sourceUrl === fact.sourceUrl,
              ),
            });
            assert.equal(
              s.contentSha256,
              v.sources.get(s.sourceId).contentSha256,
            );
            v.sources.set(s.sourceId, s);
            return s;
          },
        });
        assert.deepEqual(
          m.od,
          f.dynamicOD.find((x) => x.odId === m.od.odId),
        );
        assert.deepEqual(
          m.edge,
          f.edges.find((x) => x.edgeId === m.edge.edgeId),
        );
        v.dynamicODById.set(m.od.odId, m.od);
      }
      assert.equal(v.dynamicODById.size, 2);
      validateEdges(f.edges, v);
      assert.equal(attachODContexts(f.contexts, v).length, 1);
    },
  );
}
test("future malformed or partial review never silently skipped", () => {
  const v = val(fixtures[0]);
  v.dynamicODById.clear();
  v.evidence.clear();
  for (const ids of [[], ["x"], ["x", "x"], ["x", null]]) {
    const c = structuredClone(fixtures[0].contexts[0]);
    c.capabilityReview.odIds = ids;
    assert.equal(attachODContexts([c], v).length, 1);
  }
});

test("actual 1038-node origin first audit rejects future resolved seed pollution and passes with source-only packages", () => {
  const sourceRoot = process.env.TASK086_SOURCE_ROOT ?? root,
    network = sourceRoot + "/data/transport/network",
    origin = read(network + "/checkpoints/origin.json"),
    archive = fs.readFileSync(network + "/checkpoints/" + origin.archive);
  assert.equal(hash(archive), origin.archiveSha256);
  const snapshot = JSON.parse(zlib.gunzipSync(archive));
  assert.equal(snapshot.checkpointHead, origin.head);
  const parse = (n) =>
      snapshot.files[n].trim().split(/\r?\n/).filter(Boolean).map(JSON.parse),
    nodes = parse("node-downstream-admission.jsonl"),
    edges = parse("transport-node-edges.jsonl"),
    patterns = parse("service-patterns.jsonl");
  assert.equal(nodes.length, 1038);
  const packs = fs
      .readdirSync(network + "/sources")
      .filter((n) => n.endsWith(".json"))
      .map((n) => read(network + "/sources/" + n))
      .filter((p) => p.source && Array.isArray(p.evidence)),
    v = {
      sources: new Map(packs.map((p) => [p.source.sourceId, p.source])),
      evidence: new Map(
        packs.flatMap((p) => p.evidence).map((e) => [e.evidenceId, e]),
      ),
      nodes: new Map(nodes.map((n) => [n.nodeId, n])),
      patternById: new Map(patterns.map((p) => [p.servicePatternId, p])),
      dynamicODById: new Map(),
      nativeFacilityByAnchor: new Map(),
    };
  const seeds = fixtures.flatMap((f) => f.evidence.filter(resolved));
  assert.equal(seeds.length, 4);
  for (const e of seeds) v.evidence.set(e.evidenceId, e);
  assert.throws(
    () => invoke(v, edges),
    /PUBLIC_STRUCTURE_OD_REGISTRY_STRIPPED/,
  );
  for (const e of seeds) v.evidence.delete(e.evidenceId);
  assert.equal(
    [...v.evidence.values()].filter(resolved).length,
    0,
    "source packages may not seed future resolved dynamic OD",
  );
  const contexts = attachODContexts(
    fixtures.flatMap((f) => f.contexts),
    v,
  );
  assert.equal(contexts.length, 0);
  invoke(v, edges, contexts);
});
