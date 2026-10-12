import test from "node:test";
import assert from "node:assert/strict";
import { correctionFixture } from "./fixtures/task-086-pattern-corrections-fixture.mjs";
import { hash } from "../tools/transport/task-086-model.mjs";
import {
  prepareExactPatternCorrections,
  exactCorrectionCovers,
  correctionObligationsPreserved,
  isRetiredCorrectionFact,
} from "../tools/transport/task-086-pattern-corrections.mjs";
import { reviewGlobalGaps } from "../tools/transport/task-086-acceptance-inputs.mjs";
const raw = correctionFixture();
function fresh() {
  const f = structuredClone(raw),
    inputs = new Map(f.inputMap);
  const context = prepareExactPatternCorrections(f.document, {
    readInput: (p) => inputs.get(p),
    phases: f.phases,
    actions: f.actions,
  });
  const graph = {
    ...f.graph,
    nodes: new Map(f.graph.nodes.map((n) => [n.nodeId, n])),
    sources: new Map(f.graph.sources.map((s) => [s.sourceId, s])),
    evidence: new Map(f.graph.evidence.map((e) => [e.evidenceId, e])),
    connected: new Set(f.graph.connected),
  };
  return { f, inputs, context, graph };
}
function first(x) {
  return x.context.document.entries[0].oldPatternId;
}
test("three synthetic source-bound successors pass production model verification", () => {
  const x = fresh();
  for (const e of x.f.document.entries)
    assert.equal(
      exactCorrectionCovers(x.context, e.oldPatternId, x.graph),
      true,
    );
});
test("only exact archived phase/fact tuples are retired", () => {
  const x = fresh();
  for (const e of x.f.document.entries) {
    assert.equal(
      isRetiredCorrectionFact(
        x.context,
        { phaseId: e.oldPhaseId },
        { factId: e.oldFactId },
      ),
      true,
    );
    assert.equal(
      isRetiredCorrectionFact(
        x.context,
        { phaseId: e.oldPhaseId },
        { factId: "unrelated" },
      ),
      false,
    );
  }
});
const malformed = {
  "wrong legacy pattern": (x) =>
    (x.f.document.entries[0].oldPatternId = "unknown"),
  "wrong mapping phase": (x) => (x.f.document.entries[0].oldPhaseId = "wrong"),
  "old fact hash changed": (x) =>
    (x.f.document.entries[0].oldFactSha256 = "a".repeat(64)),
  "old pattern hash changed": (x) =>
    (x.f.document.entries[0].oldPatternSha256 = "a".repeat(64)),
  "archived edge omitted": (x) =>
    delete x.f.document.entries[0].oldEdgeSha256ById[
      Object.keys(x.f.document.entries[0].oldEdgeSha256ById)[0]
    ],
  "original rapid explicitly required": (x) =>
    (x.f.document.entries[0].originalRequiredServiceClass =
      "快速マリンライナー"),
  "missing original requirement citation": (x) =>
    (x.f.document.entries[0].originalRequirementBasis = []),
  "new source native hash changed": (x) =>
    (x.f.actions[0].sourcesChecked[0].contentSha256 = "f".repeat(64)),
  "source rights revoked": (x) =>
    (x.f.actions[0].rightsFindings.at(-1).rightsClass = "REFERENCE_ONLY"),
  "unreviewed source state": (x) => (x.f.actions[0].state = "SOURCE_FOUND"),
  "source binding removed": (x) =>
    delete x.f.document.entries[0].sourceActionBindings[
      Object.keys(x.f.document.entries[0].sourceActionBindings)[0]
    ],
  "new fact changed": (x) => x.f.phases.at(-1).facts[0].callingStations.pop(),
  "static review changed": (x) =>
    x.inputs.set(x.f.document.inputBindings[1].path, "changed"),
  "archive changed": (x) => x.inputs.set(x.f.document.archivePath, "{}"),
  "successor rebound to old pattern": (x) =>
    (x.f.document.entries[0].successorPatternId =
      x.f.document.entries[0].oldPatternId),
  "old node mapping omitted": (x) => x.f.document.entries[0].oldNodeIds.pop(),
  "duplicate correction": (x) =>
    x.f.document.entries.push(structuredClone(x.f.document.entries[0])),
};
for (const [name, mutate] of Object.entries(malformed))
  test(name, () => {
    const x = fresh();
    mutate(x);
    assert.throws(() =>
      prepareExactPatternCorrections(x.f.document, {
        readInput: (p) => x.inputs.get(p),
        phases: x.f.phases,
        actions: x.f.actions,
      }),
    );
  });
const brokenGraph = {
  "missing successor pattern": (x) => x.graph.patterns.shift(),
  "missing necessary node": (x) =>
    x.graph.nodes.delete(x.graph.patterns[0].callingNodes[4].nodeId),
  "missing national return path": (x) =>
    x.graph.connected.delete(x.graph.patterns[0].callingNodes[4].nodeId),
  "node no longer admitted": (x) =>
    (x.graph.nodes.get(x.graph.patterns[0].callingNodes[4].nodeId).decision =
      "HOLD"),
  "direction changed": (x) => (x.graph.patterns[0].direction = "opposite"),
  "calling order reversed": (x) => x.graph.patterns[0].callingNodes.reverse(),
  "missing actual service edge": (x) => x.graph.edges.shift(),
  "duplicate service edge": (x) =>
    x.graph.edges.push(structuredClone(x.graph.edges[0])),
  "local disguised as rapid": (x) =>
    (x.graph.patterns[0].serviceClass = "快速マリンライナー"),
  "old active pattern retained": (x) =>
    x.graph.patterns.push(x.f.archive.patterns[0]),
  "old active edge retained": (x) =>
    x.graph.edges.push(
      x.f.archive.edges.find(
        (e) =>
          e.servicePatternRef ===
          x.f.document.entries.find(
            (v) =>
              v.successorPatternId === raw.graph.patterns[0].servicePatternId,
          ).oldPatternId,
      ),
    ),
  "runtime native response hash changed": (x) =>
    (x.graph.sources.get(
      x.graph.evidence.get(x.graph.patterns[0].sourceFactRef).sourceId,
    ).evidenceContentSha256 = "e".repeat(64)),
  "runtime fact metadata changed and rehashed": (x) => {
    const e = x.graph.evidence.get(x.graph.patterns[0].sourceFactRef);
    e.record.locator = "changed";
    e.recordSha256 = hash(e.record);
  },
  "runtime source hash changed": (x) =>
    (x.graph.sources.get(
      x.graph.evidence.get(x.graph.patterns[0].sourceFactRef).sourceId,
    ).contentSha256 = "f".repeat(64)),
  "runtime source rights revoked": (x) =>
    (x.graph.sources.get(
      x.graph.evidence.get(x.graph.patterns[0].sourceFactRef).sourceId,
    ).rightsClass = "REFERENCE_ONLY"),
  "runtime evidence tampered": (x) =>
    x.graph.evidence
      .get(x.graph.patterns[0].sourceFactRef)
      .record.callingStations.pop(),
  "old boarding permission lost": (x) =>
    (x.graph.patterns[0].callingNodes[0].pickupType = "1"),
};
for (const [name, mutate] of Object.entries(brokenGraph))
  test(name, () => {
    const x = fresh();
    mutate(x);
    const old = x.f.document.entries.find(
      (e) => e.successorPatternId === raw.graph.patterns[0].servicePatternId,
    ).oldPatternId;
    assert.equal(exactCorrectionCovers(x.context, old, x.graph), false);
  });
test("all403patterns and2521nodes remain mandatory despite retirement", () => {
  const x = fresh(),
    scope = x.f.archive.reviewScopes["source:national-stopping-patterns"];
  const d = {
    deficitId: "source:national-stopping-patterns",
    ...structuredClone(scope),
  };
  assert.equal(correctionObligationsPreserved(x.context, d), true);
  d.requiredPatternIds.pop();
  assert.equal(correctionObligationsPreserved(x.context, d), false);
  d.requiredPatternIds = scope.requiredPatternIds;
  d.requiredNodeIds.pop();
  assert.equal(correctionObligationsPreserved(x.context, d), false);
});
test("secondary375/2421scope also remains exact; no unrelated scope is excepted", () => {
  const x = fresh(),
    scope = x.f.archive.reviewScopes["service:major-rail-private-metro"];
  assert.equal(
    correctionObligationsPreserved(x.context, {
      deficitId: "service:major-rail-private-metro",
      ...scope,
    }),
    true,
  );
  assert.equal(
    correctionObligationsPreserved(x.context, { deficitId: "other", ...scope }),
    false,
  );
});
function acceptanceFixture() {
  const x = fresh(),
    deficitId = "source:national-stopping-patterns",
    scope = x.f.archive.reviewScopes[deficitId];
  // The400other entries are explicit synthetic fixtures of the unchanged old gate.
  // This is not a claim that all real source obligations are closed.
  const nodes = new Map(
    scope.requiredNodeIds.map((nodeId) => [
      nodeId,
      { nodeId, decision: "ADMIT_TASK_086_TOPOLOGY" },
    ]),
  );
  for (const [n, v] of x.graph.nodes) nodes.set(n, v);
  const retired = new Set(x.f.document.entries.map((e) => e.oldPatternId));
  const patterns = scope.requiredPatternIds
    .filter((id) => !retired.has(id))
    .map((servicePatternId) => ({
      servicePatternId,
      serviceState: "active",
      callingNodes: [
        { nodeId: scope.requiredNodeIds[0] },
        { nodeId: scope.requiredNodeIds[1] },
      ],
    }));
  const edges = patterns.map((p) => ({
    edgeKind: "service_segment",
    servicePatternRef: p.servicePatternId,
  }));
  const decision = {
    deficitId,
    status: "REVIEWED_CLOSED",
    ...structuredClone(scope),
    inputBindings: [{ path: "synthetic-review", sha256: hash("reviewed") }],
  };
  const graph = {
    ...x.graph,
    nodes: [...nodes.values()],
    patterns: [...patterns, ...x.graph.patterns],
    edges: [...edges, ...x.graph.edges],
    connected: new Set([...nodes.keys()]),
    readInput: () => Buffer.from("reviewed"),
    patternCorrections: x.context,
  };
  return {
    x,
    decision,
    graph,
    gap: { deficitId, class: "SOURCE_LICENSE_GAP" },
  };
}
test("actual acceptance branch preserves entries and accepts only exact validated corrections", () => {
  const a = acceptanceFixture();
  assert.deepEqual(
    reviewGlobalGaps({ gaps: [a.gap] }, { reviews: [a.decision] }, a.graph),
    [],
  );
});
test("arbitrary lost pattern still reopens actual acceptance gate", () => {
  const a = acceptanceFixture();
  a.graph.patterns.shift();
  assert.equal(
    reviewGlobalGaps({ gaps: [a.gap] }, { reviews: [a.decision] }, a.graph)
      .length,
    1,
  );
});
test("missing corrected successor reopens actual acceptance gate", () => {
  const a = acceptanceFixture();
  a.graph.patterns = a.graph.patterns.filter(
    (p) => p.servicePatternId !== a.x.graph.patterns[0].servicePatternId,
  );
  assert.equal(
    reviewGlobalGaps({ gaps: [a.gap] }, { reviews: [a.decision] }, a.graph)
      .length,
    1,
  );
});
test("OPENsource review stays OPEN even with valid successors", () => {
  const a = acceptanceFixture();
  a.decision.status = "OPEN";
  assert.equal(
    reviewGlobalGaps({ gaps: [a.gap] }, { reviews: [a.decision] }, a.graph)
      .length,
    1,
  );
});

test("refreshing binding hash cannot shrink primary403scope", () => {
  const x = fresh();
  const a = JSON.parse(x.inputs.get(x.f.document.archivePath));
  a.reviewScopes["source:national-stopping-patterns"].requiredPatternIds.pop();
  const bytes = JSON.stringify(a);
  x.inputs.set(x.f.document.archivePath, bytes);
  x.f.document.inputBindings.find(
    (b) => b.path === x.f.document.archivePath,
  ).sha256 = hash(bytes);
  assert.throws(() =>
    prepareExactPatternCorrections(x.f.document, {
      readInput: (p) => x.inputs.get(p),
      phases: x.f.phases,
      actions: x.f.actions,
    }),
  );
});
