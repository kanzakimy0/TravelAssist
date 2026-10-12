import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import {
  hash,
  admitNodes,
  generatePattern,
  validateEdges,
  queryGraph,
  surfaceServiceRoundTrip,
} from "../tools/transport/task-086-model.mjs";
import { loadOfficialBusFacilityInputs } from "../tools/transport/task-086-official-facility-bus-registry.mjs";
const dir = path.join(
    import.meta.dirname,
    "fixtures/task-086-kikai-historical-stop",
  ),
  read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const fixture = () => {
  const r = read(dir + "/actual-candidate.json");
  return {
    r,
    sources: new Map(r.sources.map((s) => [s.sourceId, s])),
    evidence: new Map(r.evidence.map((e) => [e.evidenceId, e])),
    nodes: new Map(r.nodes.map((n) => [n.nodeId, n])),
    patternById: new Map(r.patterns.map((p) => [p.servicePatternId, p])),
    nativeFacilityByAnchor: new Map([
      [
        r.nativeFacilityEntry.nativeIdentity.identityAnchor,
        r.nativeFacilityEntry.nativeIdentity,
      ],
    ]),
    node: r.nodes.find((n) => n.mode === "local_bus"),
    dynamicODById: new Map(),
  };
};
const deny = (name, change) =>
  test(name, () => {
    const v = fixture();
    change(v.node, v);
    assert.notEqual(
      admitNodes([v.node], v.sources, v.evidence, [], v)[0].decision,
      "ADMIT_TASK_086_TOPOLOGY",
    );
  });
function changeRecord(v, kind, fn) {
  const e = [...v.evidence.values()].find((e) => e.record.kind === kind);
  assert.ok(e);
  fn(e.record);
  e.recordSha256 = hash(e.record);
}
test("actual licensed archive loader yields historical site plus independently bound current front stop", () => {
  const packs = fs
      .readdirSync(dir + "/registration/sources")
      .filter((n) => n.endsWith(".json"))
      .map((n) => read(dir + "/registration/sources/" + n)),
    s = new Map(packs.map((p) => [p.source.sourceId, p.source])),
    e = new Map(packs.flatMap((p) => p.evidence).map((e) => [e.evidenceId, e])),
    actions = fs
      .readFileSync(dir + "/registration/actions-append.jsonl", "utf8")
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse),
    v = loadOfficialBusFacilityInputs(dir + "/registration", s, e, actions);
  assert.equal(v.candidates.size, 1);
  const node = [...v.candidates.values()][0];
  assert.equal(node.canonicalNameJa, "旧病院前");
  assert.equal(node.identityRecord.name, "医療法人徳洲会　喜界徳洲会病院");
  assert.equal(
    admitNodes([node], s, e, [], v)[0].decision,
    "ADMIT_TASK_086_TOPOLOGY",
  );
});
test("two real independent ordinary adjacent directions generate and validate; no reservation or artificial walks", () => {
  const v = fixture(),
    edges = v.r.patterns.flatMap((p) =>
      generatePattern(
        p,
        v.nodes,
        v.sources,
        v.evidence,
        "2026-10-01T00:00:00Z",
        v,
      ),
    );
  validateEdges(edges, v);
  assert.equal(edges.length, 2);
  assert.ok(
    edges.every((e) => e.edgeKind === "service_segment" && !e.accessContract),
  );
  const a = v.r.nodes.find((n) => n.mode === "flight");
  assert.ok(queryGraph(edges, a.nodeId, v.node.nodeId));
  assert.ok(queryGraph(edges, v.node.nodeId, a.nodeId));
  assert.ok(
    surfaceServiceRoundTrip(
      [...v.nodes.values()],
      edges,
      a.nodeId,
      undefined,
      v,
    ),
  );
});
for (const [name, change] of [
  ["native registry absent", (_, v) => v.nativeFacilityByAnchor.clear()],
  [
    "native raw license revoked",
    (_, v) =>
      (v.sources.get("kikai226:native:P04-20:46").persistenceAllowed = false),
  ],
  [
    "source rename evidence withdrawn",
    (_, v) => {
      const e = [...v.evidence.values()].find(
        (e) => e.record.kind === "REVIEWED_EXISTING_STOP_RENAME",
      );
      v.sources.get(e.sourceId).derivedDataAllowed = false;
    },
  ],
  [
    "current service evidence withdrawn",
    (_, v) => {
      const e = [...v.evidence.values()].find(
        (e) => e.record.kind === "REVIEWED_CURRENT_HISTORICAL_FRONT_STOP",
      );
      v.sources.get(e.sourceId).derivedDataAllowed = false;
    },
  ],
  [
    "corporate succession invented",
    (_, v) =>
      changeRecord(
        v,
        "REVIEWED_MUNICIPAL_OPERATION_REPLACEMENT",
        (r) => (r.corporateSuccession = true),
      ),
  ],
  [
    "old provider incorrectly current operator",
    (n) => (n.operatorRefs = ["株式会社奄美航空"]),
  ],
  [
    "old hospital relocation identity stripped",
    (_, v) =>
      changeRecord(
        v,
        "REVIEWED_EXISTING_STOP_RENAME",
        (r) => delete r.existingStopRenamed,
      ),
  ],
  [
    "new hospital not a separate stop",
    (_, v) =>
      changeRecord(
        v,
        "REVIEWED_EXISTING_STOP_RENAME",
        (r) => (r.newHospitalStopSeparate = false),
      ),
  ],
  [
    "current public service erased",
    (_, v) =>
      changeRecord(
        v,
        "REVIEWED_CURRENT_HISTORICAL_FRONT_STOP",
        (r) => (r.ordinaryPublicService = false),
      ),
  ],
  [
    "suspended north1800 falsely available",
    (_, v) =>
      changeRecord(
        v,
        "REVIEWED_CURRENT_HISTORICAL_FRONT_STOP",
        (r) => (r.north1800Excluded = false),
      ),
  ],
  ["native coordinate moved to roadside", (n) => (n.latitude += 0.001)],
  ["new hospital substituted", (n) => (n.canonicalNameJa = "徳洲会病院")],
  ["west mouth substituted", (n) => (n.canonicalNameJa = "ふくり西口")],
  ["east mouth substituted", (n) => (n.canonicalNameJa = "ふくり東口")],
  ["front mouth substituted", (n) => (n.canonicalNameJa = "ふくり正面")],
  [
    "precise curb claimed",
    (n) => (n.independentReview.coordinateScope = "EXACT_CURB"),
  ],
  [
    "historical identity claimed currently operating",
    (n) => (n.identityRecord.nativeFacilityStatus = "CURRENT_HOSPITAL"),
  ],
  [
    "source-bound rename response changed",
    (_, v) =>
      changeRecord(
        v,
        "REVIEWED_EXISTING_STOP_RENAME",
        (r) => (r.observedResponseSha256 = "0".repeat(64)),
      ),
  ],
])
  deny(name, change);
for (const [name, change] of [
  ["archive", (r) => (r.archiveSha256 = "0".repeat(64))],
  ["member", (r) => (r.memberSha256 = "0".repeat(64))],
  ["feature", (r) => (r.featureIndex = 467)],
  ["record", (r) => (r.nativeRecordSha256 = "0".repeat(64))],
  ["unknown dataset", (r) => (r.dataset = "P04-21")],
])
  test("actual offline extractor rejects changed " + name, () => {
    const conf = read(
        dir + "/registration/research/public-bus-facilities.v1.json",
      ).facilities[0],
      r = {
        ...conf.extraction,
        archiveAbsolutePath: dir + "/registration/" + conf.archivePath,
      };
    change(r);
    assert.throws(() =>
      execFileSync(
        process.env.TASK086_PYTHON ?? "python",
        [
          path.resolve(
            import.meta.dirname,
            "../tools/transport/task-086-extract-official-bus-facility.py",
          ),
        ],
        {
          input: JSON.stringify(r),
          encoding: "utf8",
          env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
          stdio: ["pipe", "pipe", "pipe"],
        },
      ),
    );
  });
for (const [name, transform] of [
  ["one direction", (e) => [e[0]]],
  [
    "unboardable outbound",
    (e) => e.map((x, i) => (i === 0 ? { ...x, boardAllowed: false } : x)),
  ],
  [
    "two walks only",
    (e) => e.map((x) => ({ ...x, edgeKind: "transfer", mode: "walk" })),
  ],
])
  test(name + " cannot satisfy real airport surface service", () => {
    const v = fixture(),
      airport = v.r.nodes.find((n) => n.mode === "flight");
    assert.equal(
      surfaceServiceRoundTrip(
        [...v.nodes.values()],
        transform(v.r.edges),
        airport.nodeId,
        undefined,
        v,
      ),
      null,
    );
  });
