import test from "node:test";
import assert from "node:assert/strict";
import { sonicCorrectionFixture } from "./fixtures/task-086-sonic-corrections-fixture.mjs";
import { hash } from "../tools/transport/task-086-model.mjs";
import {
  prepareExactPatternCorrections,
  exactCorrectionCovers,
  correctionObligationsPreserved,
  assertCorrectionGraph,
} from "../tools/transport/task-086-pattern-corrections.mjs";
import { reviewGlobalGaps } from "../tools/transport/task-086-acceptance-inputs.mjs";
const raw = sonicCorrectionFixture();
function fresh() {
  const f = structuredClone(raw),
    inputs = new Map(f.inputMap),
    context = prepareExactPatternCorrections(f.document, {
      readInput: (p) => inputs.get(p),
      phases: f.phases,
      actions: f.actions,
    }),
    graph = {
      ...f.graph,
      nodes: new Map(f.graph.nodes.map((n) => [n.nodeId, n])),
      sources: new Map(f.graph.sources.map((s) => [s.sourceId, s])),
      evidence: new Map(f.graph.evidence.map((e) => [e.evidenceId, e])),
      connected: new Set(f.graph.connected),
    };
  return { f, inputs, context, graph };
}
const entry = (x) => x.f.document.entries[3],
  oldId = (x) => entry(x).oldPatternId,
  pattern = (x) =>
    x.graph.patterns.find(
      (p) => p.servicePatternId === entry(x).successors[0].patternId,
    );
test("five exact corrections retain three legacy records and separate eight successors", () => {
  const x = fresh();
  assert.equal(assertCorrectionGraph(x.context, x.graph).length, 5);
  assert.equal(x.graph.patterns.length, 11);
  for (const e of x.f.document.entries)
    assert.equal(
      exactCorrectionCovers(x.context, e.oldPatternId, x.graph),
      true,
    );
});
const malformed = {
  "dropping prior correction": (x) => x.f.document.entries.shift(),
  "dropping reverse correction": (x) => x.f.document.entries.pop(),
  "unknown old pattern": (x) => (entry(x).oldPatternId = "not-allowlisted"),
  "wrong original phase": (x) => (entry(x).oldPhaseId = "other"),
  "wrong old fact hash": (x) => (entry(x).oldFactSha256 = "0".repeat(64)),
  "old source snapshot edge lost": (x) =>
    delete entry(x).oldEdgeSha256ById[
      Object.keys(entry(x).oldEdgeSha256ById)[0]
    ],
  "explicit original limited express obligation": (x) =>
    (entry(x).originalRequiredServiceClass = "特急ソニック"),
  "ordinary incorrectly declared original requirement": (x) =>
    (entry(x).originalRequiredServiceClass = "普通"),
  "missing exact multi-service kind": (x) => delete entry(x).replacementKind,
  "wrong successor phase": (x) => (entry(x).successorPhaseId = "other"),
  "missing eighth service": (x) => entry(x).successors.pop(),
  "wrong section transfer boundary": (x) => (entry(x).sectionPath[1][1] = 11),
  "mechanical reverse direction": (x) => entry(x).sectionPath.reverse(),
  "wrong source fact binding": (x) =>
    (entry(x).successors[0].factSha256 = "0".repeat(64)),
  "lost old required point": (x) => entry(x).oldNodeIds.pop(),
  "missing primary rights binding": (x) =>
    (entry(x).successors[0].sourceActionBindings = {}),
  "source action content changed": (x) =>
    (x.f.actions[3].sourcesChecked[0].contentSha256 = "0".repeat(64)),
  "rights revoked": (x) => (x.f.actions[3].state = "REFERENCE_ONLY"),
  "rehashed source wrong station order": (x) => {
    const f = x.f.phases.at(-1).facts[0];
    f.callingStations.reverse();
    entry(x).successors[0].factSha256 = hash(f);
  },
  "local cannot be relabeled Sonic": (x) => {
    const f = x.f.phases.at(-1).facts[0];
    f.serviceClass = "特急ソニック";
    entry(x).successors[0].factSha256 = hash(f);
  },
  "evidence input changed": (x) =>
    x.inputs.set("synthetic-original-task", "changed"),
};
for (const [name, mutate] of Object.entries(malformed))
  test(name + " rejects preparation", () => {
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
const invalidGraph = {
  "old active pattern remains": (x) =>
    x.graph.patterns.push(x.f.archive.patterns[3]),
  "old edge remains": (x) =>
    x.graph.edges.push(
      x.f.archive.edges.find((e) => e.servicePatternRef === oldId(x)),
    ),
  "successor pattern missing": (x) => {
    x.graph.patterns = x.graph.patterns.filter((p) => p !== pattern(x));
  },
  "successor edge missing": (x) => {
    const p = pattern(x);
    x.graph.edges.splice(
      x.graph.edges.findIndex(
        (e) => e.servicePatternRef === p.servicePatternId,
      ),
      1,
    );
  },
  "successor edge hash changed": (x) => {
    const p = pattern(x);
    x.graph.edges.find(
      (e) => e.servicePatternRef === p.servicePatternId,
    ).boardAllowed = false;
  },
  "node admission lost": (x) =>
    (x.graph.nodes.get(pattern(x).callingNodes[1].nodeId).decision = "HOLD"),
  "necessary point loses national return": (x) =>
    x.graph.connected.delete(pattern(x).callingNodes[1].nodeId),
  "resolved direction changed": (x) => (pattern(x).direction = "opposite"),
  "resolved calls reversed": (x) => pattern(x).callingNodes.reverse(),
  "passenger pickup lost": (x) => (pattern(x).callingNodes[0].pickupType = "1"),
  "runtime native hash changed": (x) =>
    (x.graph.sources.get(
      x.graph.evidence.get(pattern(x).sourceFactRef).sourceId,
    ).evidenceContentSha256 = "0".repeat(64)),
  "runtime descriptor changed": (x) =>
    (x.graph.sources.get(
      x.graph.evidence.get(pattern(x).sourceFactRef).sourceId,
    ).contentSha256 = "0".repeat(64)),
  "runtime fact changed": (x) =>
    (x.graph.evidence.get(pattern(x).sourceFactRef).record.direction =
      "opposite"),
  "runtime source rights revoked": (x) =>
    (x.graph.sources.get(
      x.graph.evidence.get(pattern(x).sourceFactRef).sourceId,
    ).derivedDataAllowed = false),
};
for (const [name, mutate] of Object.entries(invalidGraph))
  test(name + " reopens correction", () => {
    const x = fresh();
    mutate(x);
    assert.equal(exactCorrectionCovers(x.context, oldId(x), x.graph), false);
  });
function acceptance() {
  const x = fresh(),
    deficitId = "source:national-stopping-patterns",
    scope = x.f.archive.reviewScopes[deficitId],
    nodes = new Map(
      scope.requiredNodeIds.map((nodeId) => [
        nodeId,
        { nodeId, decision: "ADMIT_TASK_086_TOPOLOGY" },
      ]),
    );
  for (const [id, n] of x.graph.nodes) nodes.set(id, n);
  const retired = new Set(x.f.document.entries.map((e) => e.oldPatternId)),
    other = scope.requiredPatternIds
      .filter((id) => !retired.has(id))
      .map((servicePatternId) => ({
        servicePatternId,
        serviceState: "active",
        callingNodes: scope.requiredNodeIds
          .slice(0, 2)
          .map((nodeId) => ({ nodeId })),
      }));
  return {
    x,
    gap: { deficitId, class: "SOURCE_LICENSE_GAP" },
    decision: {
      deficitId,
      status: "REVIEWED_CLOSED",
      ...structuredClone(scope),
      inputBindings: [{ path: "synthetic-review", sha256: hash("reviewed") }],
    },
    graph: {
      ...x.graph,
      nodes: [...nodes.values()],
      patterns: [...other, ...x.graph.patterns],
      edges: [
        ...other.map((p) => ({
          edgeKind: "service_segment",
          servicePatternRef: p.servicePatternId,
        })),
        ...x.graph.edges,
      ],
      connected: new Set(nodes.keys()),
      readInput: () => Buffer.from("reviewed"),
      patternCorrections: x.context,
    },
  };
}
const review = (a) =>
  reviewGlobalGaps({ gaps: [a.gap] }, { reviews: [a.decision] }, a.graph);
test("actual acceptance retains403 original obligations and validates five corrections", () =>
  assert.equal(review(acceptance()).length, 0));
test("unrelated lost pattern remains OPEN", () => {
  const a = acceptance();
  a.graph.patterns.shift();
  assert.equal(review(a).length, 1);
});
test("removing any original requirement does not close scope", () => {
  const a = acceptance();
  a.decision.requiredPatternIds.pop();
  assert.equal(review(a).length, 1);
});
test("OPEN source review is never automatically closed", () => {
  const a = acceptance();
  a.decision.status = "OPEN";
  assert.equal(review(a).length, 1);
});
test("lost reverse successor remains OPEN", () => {
  const a = acceptance();
  a.graph.patterns = a.graph.patterns.filter(
    (p) => p.servicePatternId !== entry(a.x).successors[7].patternId,
  );
  assert.equal(review(a).length, 1);
});
test("both source403/2521 and service375/2421 remain exact", () => {
  const x = fresh();
  for (const [deficitId, s] of Object.entries(x.f.archive.reviewScopes)) {
    assert.equal(
      correctionObligationsPreserved(x.context, { deficitId, ...s }),
      true,
    );
    assert.equal(
      correctionObligationsPreserved(x.context, {
        deficitId,
        ...s,
        requiredNodeIds: s.requiredNodeIds.slice(1),
      }),
      false,
    );
  }
});
