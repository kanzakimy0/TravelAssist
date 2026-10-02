import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hash,
  validateFixpoint,
  acceptance,
  anchorQueries,
  queryGraph,
  auditGraph,
} from "../tools/transport/task-086-model.mjs";
import {
  loadAcceptanceInputs,
  reviewGlobalGaps,
} from "../tools/transport/task-086-acceptance-inputs.mjs";
import {
  safeSourceUrl,
  safeLogText,
  sanitizeEvidence,
} from "../tools/transport/task-086-log-safety.mjs";
import { acquireEvidence } from "../tools/transport/task-086-source-actions.mjs";
import {
  passengerComponents,
  validPath,
} from "../tools/transport/task-086-stage.mjs";
import { readRows, jsonlBytes } from "../tools/transport/task-086-batches.mjs";
const context = { inputVersion: hash("input-v1"), asOf: "2026-10-02" },
  deficit = { deficitId: "source:external", class: "SOURCE_LICENSE_GAP" };
const seal = (b) => ({ ...b, proofSha256: hash(b) });
function proof(overrides = {}) {
  return seal({
    schemaVersion: 1,
    type: "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF",
    deficitId: deficit.deficitId,
    deficitSha256: hash(deficit),
    inputVersion: context.inputVersion,
    reviewedAt: "2026-10-01",
    validUntil: "2026-10-03",
    externalBlocker: "Provider authorization required",
    approvalAuthority: "Fixture Provider",
    resolution: "EXTERNAL_APPROVAL_REQUIRED",
    invalidateWhen: "Provider terms or any bound input changes",
    repeatSearchReason:
      "Six reviewed categories share the explicit authorization boundary",
    ordinaryWorkRemaining: false,
    searches: [
      "official_operator",
      "government_open_data",
      "licensed_static",
      "mode_specific",
      "identity",
      "alternative_connection",
    ].map((category) => ({
      category,
      outcome: "Reviewed unavailable alternative",
      evidencePath: "fixture-evidence",
      evidenceSha256: hash("evidence"),
    })),
    ...overrides,
  });
}
const audit = {
  tier: {
    T0: { required: 1, connected: 1 },
    T1: { required: 1, connected: 1 },
  },
  deficits: [deficit],
  corridors: [{ origin: "TASK_MANDATORY_QUERY_ONLY", status: "PASS" }],
};
test("TASK086 proofs reject stale, unrelated, invalid and changed-evidence inputs", () => {
  assert.equal(
    validateFixpoint(proof(), deficit, () => "evidence", context),
    true,
  );
  for (const p of [
    proof({ validUntil: "2026-10-01" }),
    proof({ reviewedAt: "2026-10-03" }),
    proof({ inputVersion: hash("old") }),
    proof({ deficitSha256: hash("other") }),
    proof({ ordinaryWorkRemaining: true }),
    proof({ searches: [] }),
    { ...proof(), proofSha256: hash("tampered") },
  ])
    assert.equal(
      validateFixpoint(p, deficit, () => "evidence", context),
      false,
    );
  assert.equal(
    validateFixpoint(
      proof(),
      deficit,
      () => {
        throw Error("missing");
      },
      context,
    ),
    false,
  );
  assert.equal(
    validateFixpoint(proof(), deficit, () => "changed", context),
    false,
  );
});
test("TASK086 genuine external approval has a distinct terminal outcome; ordinary work still blocks", () => {
  const p = proof(),
    a = {
      state: "EXTERNAL_APPROVAL_REQUIRED",
      affectedDeficits: [deficit.deficitId],
      events: [
        {
          fixpointProofSha256: p.proofSha256,
          approvalAuthority: p.approvalAuthority,
        },
      ],
    };
  const gate = acceptance(
    audit,
    [p],
    () => "evidence",
    { qa: "PASS" },
    [a],
    context,
  );
  assert.equal(gate.status, "BLOCKED_EXTERNAL_APPROVAL_REQUIRED");
  assert.equal(gate.ordinaryDiscoveryRemaining, false);
  assert.equal(gate.terminal, true);
  for (const actions of [
    [a, { state: "PENDING_RESEARCH" }],
    [{ ...a, affectedDeficits: ["unrelated"] }],
    [{ ...a, events: [] }],
  ])
    assert.equal(
      acceptance(audit, [p], () => "evidence", { qa: "PASS" }, actions, context)
        .terminal,
      false,
    );
  assert.equal(
    acceptance(audit, [p], () => "changed", { qa: "PASS" }, [a], context)
      .ordinaryDiscoveryRemaining,
    true,
  );
});
test("TASK086 independent versioned proof inputs survive output replacement", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-proof-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "research/phases"), { recursive: true });
  fs.mkdirSync(path.join(dir, "sources"));
  fs.writeFileSync(
    path.join(dir, "research/stage-scope.json"),
    JSON.stringify({ asOf: context.asOf, phaseFiles: [] }),
  );
  for (const f of [
    "research/global-review.v1.json",
    "sources/source-review.json",
    "research/s12-identities.jsonl",
    "research/c28-identities.jsonl",
    "research/p11-identities.jsonl",
    "research/p36-identities.jsonl",
    "next-source-actions.jsonl",
  ])
    fs.writeFileSync(path.join(dir, f), "");
  const file = path.join(dir, "research/exception-proofs.v1.json");
  fs.writeFileSync(file, JSON.stringify({ schemaVersion: 1, proofs: [] }));
  const input = loadAcceptanceInputs(dir);
  fs.writeFileSync(
    file,
    JSON.stringify({
      schemaVersion: 1,
      proofs: [proof({ inputVersion: input.context.inputVersion })],
    }),
  );
  const before = fs.readFileSync(file);
  for (let i = 0; i < 2; i++) {
    const r = loadAcceptanceInputs(dir);
    fs.writeFileSync(
      path.join(dir, "fixpoint-proofs.jsonl"),
      jsonlBytes(r.proofs),
    );
    assert.equal(
      validateFixpoint(
        readRows(path.join(dir, "fixpoint-proofs.jsonl"))[0],
        deficit,
        () => "evidence",
        r.context,
      ),
      true,
    );
  }
  assert.deepEqual(fs.readFileSync(file), before);
});
test("TASK086 global obligation reopens when bound evidence or actual service continuity disappears", () => {
  const review = { gaps: [deficit] },
    decision = {
      reviews: [
        {
          deficitId: deficit.deficitId,
          status: "REVIEWED_CLOSED",
          requiredNodeIds: ["a", "b"],
          requiredPatternIds: ["p"],
          inputBindings: [{ path: "e", sha256: hash("evidence") }],
        },
      ],
    };
  const state = {
    nodes: ["a", "b"].map((nodeId) => ({
      nodeId,
      decision: "ADMIT_TASK_086_TOPOLOGY",
    })),
    patterns: [
      {
        servicePatternId: "p",
        callingNodes: [{ nodeId: "a" }, { nodeId: "b" }],
      },
    ],
    edges: [{ edgeKind: "service_segment", servicePatternRef: "p" }],
    connected: new Set(["a", "b"]),
    readInput: () => "evidence",
  };
  assert.deepEqual(reviewGlobalGaps(review, decision, state), []);
  for (const x of [
    { readInput: () => "changed" },
    { patterns: [] },
    { edges: [] },
    { connected: new Set(["a"]) },
  ])
    assert.equal(
      reviewGlobalGaps(review, decision, { ...state, ...x })[0].deficitId,
      deficit.deficitId,
    );
});
test("TASK086 signed URL and error sanitization preserves stable version and hashes", () => {
  const url =
    "https://example.invalid/file?version=20261001&AWSAccessKeyId=fixture-key&Signature=fixture-sig&x-amz-security-token=fixture-token";
  assert.equal(
    safeSourceUrl(url),
    "https://example.invalid/file?version=20261001",
  );
  assert.ok(!safeLogText("Failed " + url).includes("fixture-"));
  assert.deepEqual(
    sanitizeEvidence({ finalUrl: url, contentSha256: hash("bytes") }),
    {
      finalUrl: "https://example.invalid/file?version=20261001",
      contentSha256: hash("bytes"),
    },
  );
});
test("TASK086 identical failed acquisition is reused until a substantive request version changes", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-dedup-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const queuePath = path.join(dir, "queue.jsonl");
  fs.writeFileSync(
    queuePath,
    jsonlBytes([
      {
        actionId: "a",
        state: "PENDING_RESEARCH",
        attempts: [],
        sourcesChecked: [],
        rightsFindings: [],
        events: [],
        extractedFacts: [],
      },
    ]),
  );
  let count = 0;
  const network = async () => {
    count++;
    throw Error("Failed https://example.invalid/file?sig=fixture-token");
  };
  const request = {
    actionId: "a",
    urls: [{ url: "https://example.invalid/file", purpose: "topology" }],
    parserVersion: 1,
  };
  await acquireEvidence(request, { queuePath, network });
  await acquireEvidence(request, { queuePath, network });
  assert.equal(count, 1);
  await acquireEvidence(
    { ...request, parserVersion: 2 },
    { queuePath, network },
  );
  assert.equal(count, 2);
  assert.ok(!fs.readFileSync(queuePath, "utf8").includes("fixture-token"));
});
test("TASK086 cached anchor witnesses preserve onboard restrictions for all fixture pairs", () => {
  const e = (
    edgeId,
    from,
    to,
    pattern,
    index,
    board = true,
    alight = true,
  ) => ({
    edgeId,
    edgeKind: "service_segment",
    fromTransportNodeId: from,
    toTransportNodeId: to,
    servicePatternRef: pattern,
    segmentIndex: index,
    boardAllowed: board,
    alightAllowed: alight,
  });
  const edges = [
    e("ab", "a", "b", "p", 0, true, false),
    e("bc", "b", "c", "p", 1, false, true),
    e("ca", "c", "a", "q", 0),
    e("cd", "c", "d", "r", 0),
    e("da", "d", "a", "s", 0),
  ];
  const q = anchorQueries(edges, "a");
  for (const from of ["a", "b", "c", "d"])
    for (const to of ["a", "b", "c", "d"])
      assert.equal(q(from, to) !== null, queryGraph(edges, from, to) !== null);
});

test("TASK086 root components preserve one-way dropoff and valid public transfer closure", () => {
  const nodes = ["a", "b", "c"].map((nodeId) => ({ nodeId }));
  const edges = [
    {
      edgeId: "ab",
      edgeKind: "service_segment",
      servicePatternRef: "p",
      segmentIndex: 0,
      fromTransportNodeId: "a",
      toTransportNodeId: "b",
      boardAllowed: true,
      alightAllowed: false,
    },
    {
      edgeId: "bc",
      edgeKind: "service_segment",
      servicePatternRef: "p",
      segmentIndex: 1,
      fromTransportNodeId: "b",
      toTransportNodeId: "c",
      boardAllowed: false,
      alightAllowed: true,
    },
    {
      edgeId: "ca",
      edgeKind: "hub_transfer",
      fromTransportNodeId: "c",
      toTransportNodeId: "a",
    },
  ];
  const c = passengerComponents(nodes, edges);
  assert.equal(c.get("a"), c.get("c"));
  assert.notEqual(c.get("a"), c.get("b"));
  const by = new Map(edges.map((e) => [e.edgeId, e]));
  assert.equal(validPath(["ab", "bc"], "a", "c", by), true);
  assert.equal(validPath(["ab"], "a", "b", by), false);
  assert.equal(validPath(["bc"], "b", "c", by), false);
  assert.equal(validPath(["ca"], "a", "c", by), false);
});
test("TASK086 licensed bus-stop missing optional mode is surface transport without weakening direction", () => {
  const nodes = [
    {
      nodeId: "airport",
      nodeKind: "airport",
      mode: "flight",
      decision: "ADMIT_TASK_086_TOPOLOGY",
    },
    {
      nodeId: "bus",
      nodeKind: "bus_stop",
      decision: "ADMIT_TASK_086_TOPOLOGY",
    },
  ];
  const edge = (id, a, b) => ({
    edgeId: id,
    edgeKind: "hub_transfer",
    mode: "transfer",
    fromTransportNodeId: a,
    toTransportNodeId: b,
    metrics: {},
  });
  const metrics = [
    "durationTypicalMin",
    "durationP90Min",
    "fareTypicalYen",
    "frequencyTypicalMin",
    "firstDeparture",
    "lastDeparture",
    "calendar",
    "reservation",
    "seasonal",
    "transferTimeMin",
    "accessibility",
  ];
  const edges = [
    edge("ab", "airport", "bus"),
    edge("ba", "bus", "airport"),
  ].map((e) => ({
    ...e,
    metrics: Object.fromEntries(
      metrics.map((k) => [k, { status: "unresolved" }]),
    ),
  }));
  const run = (es) =>
    auditGraph({
      nodes,
      edges: es,
      patterns: [],
      transfers: [],
      inventory: [
        {
          requirementId: "airport",
          nodeId: "airport",
          tier: "T1",
          kind: "airport",
        },
      ],
      anchorNodeId: "bus",
    });
  assert.equal(run(edges).counts.AIRPORT_SURFACE_GAP, 0);
  assert.equal(run(edges.slice(0, 1)).counts.AIRPORT_SURFACE_GAP, 1);
});

test("TASK086 proven exhausted alternatives close only the specifically bound no-source action", () => {
  const p = proof({ resolution: "AUDITED_FIXPOINT_EXCEPTION" });
  const action = {
    actionId: "fixture-only",
    state: "NO_SOURCE_FOUND",
    affectedDeficits: [deficit.deficitId],
    events: [{ fixpointProofSha256: p.proofSha256 }],
  };
  const gate = acceptance(
    audit,
    [p],
    () => "evidence",
    { qa: "PASS" },
    [action],
    context,
  );
  assert.equal(
    gate.status,
    "READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS",
  );
  assert.equal(gate.ordinaryDiscoveryRemaining, false);
  assert.deepEqual(gate.auditedClosedActionIds, ["fixture-only"]);
  assert.equal(
    acceptance(
      audit,
      [p],
      () => "evidence",
      { qa: "PASS" },
      [{ ...action, events: [] }],
      context,
    ).terminal,
    false,
  );
});
