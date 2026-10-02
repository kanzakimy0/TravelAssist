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
  staticReviewInputHashes,
} from "../tools/transport/task-086-acceptance-inputs.mjs";
import {
  safeSourceUrl,
  safeLogText,
  sanitizeEvidence,
} from "../tools/transport/task-086-log-safety.mjs";
import {
  buildWorkPackages,
  recordWorkPackage,
  acquireEvidence,
} from "../tools/transport/task-086-source-actions.mjs";
import {
  deriveExecutionState,
  readStageVerification,
  assessStageStatus,
  STAGE_TECHNICAL_CHECKS,
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

const stageFixture = () => ({
  scopeId: "fixture-scope",
  verifierSha256: hash("verifier"),
  asOf: "2026-10-02T10:00:00Z",
  checks: STAGE_TECHNICAL_CHECKS.map((name) => ({ name, status: "PASS" })),
  coreBlockers: [{ deficitId: "airport:fixture" }],
  manifest: {
    generatorHashes: { generator: hash("code") },
    inputHashes: { input: hash("data") },
  },
  verification: {
    scopeId: "fixture-scope",
    verifierSha256: hash("verifier"),
    verifiedAt: "2026-10-02T09:00:00Z",
    status: "PASS",
    fullDeterministicRebuild: "PASS",
    resumeChecksumSkip: "PASS",
    exceptionProofInputPreserved: "PASS",
    generatorHashes: { generator: hash("code") },
    inputHashes: { input: hash("data") },
  },
});
test("TASK086 stage cannot label technical failures or incomplete checks verified", () => {
  for (const coreBlockers of [[], [{ deficitId: "airport:fixture" }]]) {
    const f = stageFixture();
    f.coreBlockers = coreBlockers;
    f.checks[0].status = "FAIL";
    assert.equal(assessStageStatus(f).status, "CORE_STAGE_FAILED");
    f.checks = [];
    assert.equal(assessStageStatus(f).status, "CORE_STAGE_UNVERIFIED");
  }
});
test("TASK086 stage rejects missing, stale, expired or incomplete rebuild proofs", () => {
  const bad = [
    null,
    { status: "PASS" },
    { ...stageFixture().verification, scopeId: "old" },
    { ...stageFixture().verification, verifierSha256: hash("old verifier") },
    { ...stageFixture().verification, inputHashes: { input: hash("old") } },
    {
      ...stageFixture().verification,
      generatorHashes: { generator: hash("old") },
    },
    { ...stageFixture().verification, verifiedAt: "2026-10-03" },
    { ...stageFixture().verification, validUntil: "2026-10-02T09:30:00Z" },
    { ...stageFixture().verification, verifiedAt: undefined },
    { ...stageFixture().verification, resumeChecksumSkip: "NOT_RUN" },
  ];
  for (const verification of bad)
    for (const coreBlockers of [[], [{ deficitId: "airport:fixture" }]]) {
      const r = assessStageStatus({
        ...stageFixture(),
        verification,
        coreBlockers,
      });
      assert.equal(r.status, "CORE_STAGE_UNVERIFIED");
      assert.equal(r.rebuildVerified, false);
    }
  assert.equal(
    assessStageStatus({
      ...stageFixture(),
      verification: { ...stageFixture().verification, status: "FAIL" },
    }).status,
    "CORE_STAGE_FAILED",
  );
});
test("TASK086 verified business blockers are distinct from actual core pass", () => {
  assert.equal(
    assessStageStatus(stageFixture()).status,
    "VERIFIED_CORE_CHECKPOINT_WITH_BLOCKERS",
  );
  assert.equal(
    assessStageStatus({ ...stageFixture(), coreBlockers: [] }).status,
    "CORE_STAGE_PASS",
  );
});

test("TASK086 malformed or unbound rebuild receipts remain unverified", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-receipt-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "receipt.json");
  assert.equal(readStageVerification(file), null);
  fs.writeFileSync(file, "{broken");
  assert.equal(
    assessStageStatus({
      ...stageFixture(),
      verification: readStageVerification(file),
    }).status,
    "CORE_STAGE_UNVERIFIED",
  );
  for (const key of ["generatorHashes", "inputHashes"]) {
    const v = { ...stageFixture().verification };
    delete v[key];
    assert.equal(
      assessStageStatus({ ...stageFixture(), verification: v }).status,
      "CORE_STAGE_UNVERIFIED",
    );
  }
});

const continuousPolicy = {
  revisionId: "full-v2",
  continueAfterMilestones: true,
  newSourceAcquisitionAuthorized: true,
  scope: "ORIGINAL",
};
const unfinishedGate = {
  status: "IN_PROGRESS_AUTO_REMEDIATION",
  terminal: false,
  ordinaryDiscoveryRemaining: true,
  unresolvedTopologyCount: 1,
  validatedExceptionCount: 0,
};
const verifiedStage = {
  status: "VERIFIED_CORE_CHECKPOINT_WITH_BLOCKERS",
  cleanDeterministicRebuildForCurrentInputs: true,
  fullScope: { uniqueOpenRoots: 1 },
};
const packageRoot = {
  rootCauseId: "airport:a",
  status: "OPEN",
  classification: "C",
  researchBatchKey: "operator:a",
  requirementIds: ["original:a"],
  sourceActionIds: [],
  coreRequiredCount: 1,
};
test("TASK086 stage report retains next ordinary package beyond milestone and technical failures", () => {
  const packages = buildWorkPackages([packageRoot]);
  for (const status of [
    "CORE_STAGE_PASS",
    "VERIFIED_CORE_CHECKPOINT_WITH_BLOCKERS",
    "CORE_STAGE_FAILED",
    "CORE_STAGE_UNVERIFIED",
  ]) {
    const result = deriveExecutionState({
      policy: continuousPolicy,
      stage: { ...verifiedStage, status },
      gate: unfinishedGate,
      packages,
    });
    assert.equal(result.executionStatus, "CONTINUE");
    assert.equal(result.taskComplete, false);
    assert.equal(result.newSourceAcquisitionAuthorized, true);
    assert.equal(result.nextWorkPackage.packageId, "operator:a");
    assert.equal(result.milestoneIsStopCondition, false);
  }
});
test("TASK086 full completion cannot use stale rebuild, terminal exceptions or remaining roots", () => {
  const gate = {
    ...unfinishedGate,
    status: "PASS / READY_FOR_REVIEW",
    terminal: true,
    ordinaryDiscoveryRemaining: false,
    unresolvedTopologyCount: 0,
  };
  const stage = {
    ...verifiedStage,
    status: "CORE_STAGE_PASS",
    fullScope: { uniqueOpenRoots: 0 },
  };
  const run = (s = stage, g = gate, packages = []) =>
    deriveExecutionState({
      policy: continuousPolicy,
      stage: s,
      gate: g,
      packages,
    });
  assert.equal(run().taskComplete, true);
  assert.equal(
    run({ ...stage, cleanDeterministicRebuildForCurrentInputs: false })
      .taskComplete,
    false,
  );
  assert.equal(
    run({ ...stage, status: "CORE_STAGE_UNVERIFIED" }).taskComplete,
    false,
  );
  assert.equal(
    run(stage, { ...gate, validatedExceptionCount: 1 }).taskComplete,
    false,
  );
  assert.equal(run(verifiedStage).taskComplete, false);
  assert.equal(
    run(stage, gate, buildWorkPackages([packageRoot])).taskComplete,
    false,
  );
  const external = run(stage, {
    ...gate,
    status: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
    validatedExceptionCount: 1,
  });
  assert.equal(external.executionStatus, "AWAITING_AUDITED_EXTERNAL_DECISION");
  assert.equal(external.taskComplete, false);
  assert.equal(
    run(
      stage,
      {
        ...gate,
        status: "BLOCKED_EXTERNAL_APPROVAL_REQUIRED",
        ordinaryDiscoveryRemaining: true,
      },
      buildWorkPackages([packageRoot]),
    ).executionStatus,
    "CONTINUE",
  );
});
test("TASK086 root packages reuse operator cache, skip resolved and optional roots, retain recovery without pretending research", () => {
  const roots = [
    packageRoot,
    {
      ...packageRoot,
      rootCauseId: "airport:b",
      requirementIds: ["original:b"],
    },
    { ...packageRoot, rootCauseId: "closed", status: "RESOLVED" },
    { ...packageRoot, rootCauseId: "optional", classification: "E" },
  ];
  const [p] = buildWorkPackages(roots);
  assert.deepEqual(p.rootCauseIds, ["airport:a", "airport:b"]);
  assert.equal(p.researchCompletedBySelection, false);
  const saved = {
    ...p,
    status: "IN_PROGRESS",
    nextAction: "CHECK_EXACT_PUBLIC_PASSAGE",
    attempts: [{ result: "MISSING_PUBLIC_EVIDENCE" }],
    resumeEvidence: ["hash-bound-cache"],
  };
  assert.equal(
    buildWorkPackages(roots, { ledger: [saved] })[0].nextAction,
    saved.nextAction,
  );
  const changed = buildWorkPackages(
    [{ ...packageRoot, reason: "source changed" }],
    { ledger: [saved] },
  )[0];
  assert.equal(changed.status, "READY");
  assert.equal(changed.attempts.length, 1);
  assert.deepEqual(changed.resumeEvidence, []);
});
test("TASK086 package checkpoint survives reload and redacts secrets without asserting completion", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "task086-package-"));
  try {
    const ledgerPath = path.join(tmp, "ledger.json");
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({ schemaVersion: 1, packages: [] }),
    );
    const request = {
      packageId: "operator:a",
      inputFingerprint: hash("input"),
      status: "IN_PROGRESS",
      method: "cached parse",
      result: "missing interchange",
      nextAction: "review public guide",
      retryCondition: "new method",
      sources: [
        { url: "https://example.test/data?X-Amz-Signature=secret-value" },
      ],
    };
    recordWorkPackage(request, { ledgerPath });
    assert.equal(
      JSON.parse(fs.readFileSync(ledgerPath)).packages[0].attempts.length,
      1,
    );
    assert.ok(!fs.readFileSync(ledgerPath, "utf8").includes("secret-value"));
    assert.throws(
      () =>
        recordWorkPackage({ ...request, status: "COMPLETE" }, { ledgerPath }),
      /PACKAGE_STATUS_NOT_COMPLETION_PROOF/,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("TASK086 package order keeps original airports ahead of bus volume and counts only original requirements", () => {
  const roots = [
    {
      ...packageRoot,
      rootCauseId: "root:direction:many",
      researchBatchKey: "bus",
      coreRequiredCount: 0,
      requirementIds: ["a", "b", "c"],
    },
    {
      ...packageRoot,
      rootCauseId: "root:airport:ordinary",
      researchBatchKey: "airport",
      coreRequiredCount: 0,
      requirementIds: ["a", "intermediate"],
    },
    {
      ...packageRoot,
      rootCauseId: "root:airport:milestone",
      researchBatchKey: "milestone",
      coreRequiredCount: 0,
      requirementIds: ["b"],
    },
  ];
  const packages = buildWorkPackages(roots, {
    priorityRootIds: ["root:airport:milestone"],
    originalRequirementIds: ["a", "b", "c"],
  });
  assert.deepEqual(
    packages.map((p) => p.packageId),
    ["milestone", "airport", "bus"],
  );
  assert.equal(packages[1].originalRequiredCount, 1);
  assert.equal(packages[2].originalRequiredCount, 3);
});

function specialReviewFixture() {
  const gap = {
    deficitId: "mode:required-special-tourism",
    class: "TOURISM_SPECIAL_MODE_GAP",
  };
  const decision = {
    kind: "REQUIRED_SPECIAL_APPLICABILITY_V1",
    deficitId: gap.deficitId,
    status: "REVIEWED_CLOSED",
    requiredNodeIds: ["a", "b", "interchange"],
    requiredPatternIds: ["p"],
    reviewedSpecialModes: ["fixed_guideway"],
    inputBindings: [{ path: "scope", sha256: hash("scope") }],
  };
  const state = {
    inventory: decision.requiredNodeIds.map((nodeId) => ({
      nodeId,
      kind: "other_tourism_transport",
    })),
    nodes: decision.requiredNodeIds.map((nodeId) => ({
      nodeId,
      nodeKind: "other_tourism_transport",
      mode: "fixed_guideway",
      decision: "ADMIT_TASK_086_TOPOLOGY",
    })),
    patterns: [
      {
        servicePatternId: "p",
        mode: "fixed_guideway",
        serviceState: "active",
        callingNodes: [{ nodeId: "a" }, { nodeId: "b" }],
      },
    ],
    edges: [{ edgeKind: "service_segment", servicePatternRef: "p" }],
    connected: new Set(decision.requiredNodeIds),
    readInput: () => "scope",
  };
  return { gap, decision, state };
}
function specialReviewResult(f) {
  return reviewGlobalGaps(
    { gaps: [f.gap] },
    { reviews: [f.decision] },
    f.state,
  );
}
test("TASK086 special applicability permits required interchange components without claiming ride coverage", () => {
  const f = specialReviewFixture();
  assert.deepEqual(specialReviewResult(f), []);
  assert.equal(
    f.state.patterns.some((p) =>
      p.callingNodes.some((c) => c.nodeId === "interchange"),
    ),
    false,
  );
  assert.equal(f.decision.rideCoverage, undefined);
});
for (const [name, mutate] of [
  ["missing inventory", (f) => delete f.state.inventory],
  ["missing explicit review kind", (f) => delete f.decision.kind],
  ["missing reviewed modes", (f) => delete f.decision.reviewedSpecialModes],
  ["required subset", (f) => f.decision.requiredNodeIds.pop()],
  ["duplicate reviewed node", (f) => f.decision.requiredNodeIds.push("a")],
  [
    "new required special component despite fresh scope hash",
    (f) => {
      f.state.inventory.push({
        nodeId: "new",
        kind: "other_tourism_transport",
      });
      f.state.nodes.push({
        nodeId: "new",
        nodeKind: "other_tourism_transport",
        mode: "fixed_guideway",
        decision: "ADMIT_TASK_086_TOPOLOGY",
      });
      f.state.connected.add("new");
      f.state.readInput = () => "refreshed";
      f.decision.inputBindings[0].sha256 = hash("refreshed");
    },
  ],
  [
    "new ropeway cannot be covered by old patterns even after listing node and mode",
    (f) => {
      f.state.inventory.push({ nodeId: "rope", kind: "ropeway_station" });
      f.state.nodes.push({
        nodeId: "rope",
        nodeKind: "ropeway_station",
        mode: "ropeway",
        decision: "ADMIT_TASK_086_TOPOLOGY",
      });
      f.state.connected.add("rope");
      f.decision.requiredNodeIds.push("rope");
      f.decision.reviewedSpecialModes.push("ropeway");
      f.state.readInput = () => "refreshed";
      f.decision.inputBindings[0].sha256 = hash("refreshed");
    },
  ],
  [
    "mislabeled inventory kind cannot hide actual funicular mode",
    (f) => {
      f.state.inventory.push({ nodeId: "fun", kind: "rail_station" });
      f.state.nodes.push({
        nodeId: "fun",
        nodeKind: "rail_station",
        mode: "funicular",
        decision: "ADMIT_TASK_086_TOPOLOGY",
      });
      f.state.connected.add("fun");
    },
  ],
  [
    "new relevant pattern missing from audit",
    (f) =>
      f.state.patterns.push({ ...f.state.patterns[0], servicePatternId: "p2" }),
  ],
  ["removed actual pattern", (f) => (f.state.patterns = [])],
  ["removed listed pattern", (f) => (f.decision.requiredPatternIds = [])],
  [
    "unrelated conventional rail appended by generic reconciliation",
    (f) => {
      f.state.patterns.push({
        ...f.state.patterns[0],
        servicePatternId: "rail",
        mode: "conventional_rail",
      });
      f.state.edges.push({
        edgeKind: "service_segment",
        servicePatternRef: "rail",
      });
      f.decision.requiredPatternIds.push("rail");
    },
  ],
  ["source binding changed", (f) => (f.state.readInput = () => "changed")],
  ["node no longer admitted", (f) => (f.state.nodes[0].decision = "HOLD")],
  [
    "required component disconnected",
    (f) => f.state.connected.delete("interchange"),
  ],
  ["incomplete service edges", (f) => (f.state.edges = [])],
  [
    "inactive actual pattern",
    (f) => (f.state.patterns[0].serviceState = "inactive"),
  ],
])
  test("TASK086 special applicability reopens for " + name, () => {
    const f = specialReviewFixture();
    mutate(f);
    assert.equal(specialReviewResult(f)[0]?.deficitId, f.gap.deficitId);
  });
test("TASK086 newly reviewed ascent service requires its own actual mode and complete pattern", () => {
  const f = specialReviewFixture();
  f.state.nodes.forEach((n) => {
    n.mode = "funicular";
    n.nodeKind = "funicular_station";
  });
  f.state.inventory.forEach((n) => (n.kind = "funicular_station"));
  f.decision.reviewedSpecialModes = ["funicular"];
  f.state.patterns[0].mode = "funicular";
  assert.deepEqual(specialReviewResult(f), []);
});
test("TASK086 special review kind cannot replace unrelated global obligation", () => {
  const f = specialReviewFixture();
  f.gap.deficitId = "service:other";
  f.decision.deficitId = f.gap.deficitId;
  assert.equal(specialReviewResult(f)[0]?.deficitId, f.gap.deficitId);
});
test("TASK086 current required special applicability preflight preserves original Hamamatsucho transfer-only role", () => {
  const root = "data/transport/network/";
  const readRows = (n) =>
    fs
      .readFileSync(root + n, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(JSON.parse);
  const inventory = JSON.parse(
    fs.readFileSync(root + "required-backbone-inventory.json", "utf8"),
  ).nodes;
  const nodes = readRows("node-downstream-admission.jsonl"),
    patterns = readRows("service-patterns.jsonl"),
    edges = readRows("transport-node-edges.jsonl");
  const required = inventory.filter(
    (n) => n.kind === "other_tourism_transport",
  );
  const ids = new Set(required.map((n) => n.nodeId));
  const specialPatterns = patterns.filter(
    (p) =>
      ["fixed_guideway", "tram"].includes(p.mode) &&
      p.callingNodes.some((c) => ids.has(c.nodeId)),
  );
  const audit = JSON.parse(
    fs.readFileSync(root + "connectivity-audit.json", "utf8"),
  );
  const connectedRequirements = new Set(audit.connectedRequiredNodes);
  const connected = new Set(
    inventory
      .filter((r) => connectedRequirements.has(r.requirementId))
      .map((r) => r.nodeId),
  );
  const f = specialReviewFixture();
  f.decision.requiredNodeIds = [...ids];
  f.decision.requiredPatternIds = specialPatterns.map(
    (p) => p.servicePatternId,
  );
  f.decision.reviewedSpecialModes = ["fixed_guideway", "tram"];
  f.state = {
    inventory,
    nodes,
    patterns,
    edges,
    connected,
    readInput: () => "scope",
  };
  assert.ok(required.length >= 152);
  assert.ok(specialPatterns.length >= 20);
  assert.deepEqual(specialReviewResult(f), []);
  const originalHamamatsucho =
    "transport-node:086:6c0e9b255e45772433f26e3494333db6";
  assert.ok(ids.has(originalHamamatsucho));
  assert.ok(connected.has(originalHamamatsucho));
  assert.equal(
    patterns.some((p) =>
      p.callingNodes.some((c) => c.nodeId === originalHamamatsucho),
    ),
    false,
  );
  assert.equal(
    edges
      .filter((e) =>
        [e.fromTransportNodeId, e.toTransportNodeId].includes(
          originalHamamatsucho,
        ),
      )
      .every((e) => e.edgeKind === "hub_transfer"),
    true,
  );
});

test("TASK086 actual static review input bytes join manifest fingerprints without generated output cycles", () => {
  const staticPath =
    "data/transport/network/research/special-applicability.v1.json";
  const generated = "data/transport/network/next-source-actions.jsonl";
  const bytes = new Map([
    [staticPath, Buffer.from("review bytes")],
    [generated, Buffer.from("output")],
  ]);
  assert.deepEqual(staticReviewInputHashes(bytes, new Set([generated])), {
    [staticPath]: hash("review bytes"),
  });
});
test("TASK086 changed static review evidence invalidates both unreplayed checks and old rebuild proof", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-static-review-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const input = "data/transport/network/research/special-applicability.v1.json";
  const file = path.join(dir, "audit.json");
  fs.writeFileSync(file, "original audit");
  const current = () =>
    staticReviewInputHashes(
      new Map([[input, fs.readFileSync(file)]]),
      new Set(),
    );
  const f = stageFixture();
  f.coreBlockers = [];
  f.manifest.inputHashes = current();
  f.verification.inputHashes = structuredClone(f.manifest.inputHashes);
  assert.equal(assessStageStatus(f).status, "CORE_STAGE_PASS");
  fs.writeFileSync(file, "changed audit");
  assert.notDeepEqual(current(), f.manifest.inputHashes);
  // This is the same raw_content_hashes_and_retained_input_versions check
  // stage performs before accepting any published receipt, without replay.
  const unchangedChecks = structuredClone(f.checks);
  f.checks.push({
    name: "raw_content_hashes_and_retained_input_versions",
    status:
      hash(fs.readFileSync(file)) === f.manifest.inputHashes[input]
        ? "PASS"
        : "FAIL",
  });
  assert.equal(assessStageStatus(f).status, "CORE_STAGE_FAILED");
  // After a rebuild records the new bytes, the old receipt is still stale.
  f.checks = unchangedChecks;
  f.manifest.inputHashes = current();
  const r = assessStageStatus(f);
  assert.equal(r.status, "CORE_STAGE_UNVERIFIED");
  assert.equal(r.rebuildVerified, false);
});
test("TASK086 review fingerprint paths reject traversal absolute aliases and review self-binding", () => {
  for (const p of [
    "../evidence.json",
    "/evidence.json",
    "C:/evidence.json",
    "a/../evidence.json",
    "a\\evidence.json",
  ])
    assert.throws(
      () => staticReviewInputHashes(new Map([[p, "x"]]), new Set()),
      /GLOBAL_REVIEW_INPUT_PATH_NOT_ROOT_RELATIVE/,
    );
  assert.throws(
    () =>
      staticReviewInputHashes(
        new Map([
          ["data/transport/network/research/global-review.v1.json", "x"],
        ]),
        new Set(),
      ),
    /GLOBAL_REVIEW_INPUT_SELF_BINDING/,
  );
});

test("TASK086 remaining packages preserve T2 before T3 regardless of batch key or root volume", () => {
  const roots = [
    {
      ...packageRoot,
      rootCauseId: "root:airport:small-island",
      researchBatchKey: "a-t3",
      requirementIds: ["t3a", "t3b"],
    },
    {
      ...packageRoot,
      rootCauseId: "root:airport:regional",
      researchBatchKey: "z-t2",
      requirementIds: ["t2"],
    },
    {
      ...packageRoot,
      rootCauseId: "root:airport:untyped",
      researchBatchKey: "a-unknown",
      requirementIds: ["unknown"],
    },
  ];
  const options = {
    originalRequirementIds: ["t2", "t3a", "t3b"],
    requirementTiers: { t2: "T2", t3a: "T3", t3b: "T3" },
  };
  const ordered = buildWorkPackages(roots, options);
  assert.deepEqual(
    ordered.map((p) => p.packageId),
    ["z-t2", "a-t3", "a-unknown"],
  );
  assert.deepEqual(
    ordered.map((p) => p.requirementTierPriority),
    [2, 3, 4],
  );
  assert.deepEqual(
    buildWorkPackages(roots, {
      ...options,
      priorityRootIds: ["root:airport:small-island"],
    }).map((p) => p.packageId),
    ["a-t3", "z-t2", "a-unknown"],
  );
});
