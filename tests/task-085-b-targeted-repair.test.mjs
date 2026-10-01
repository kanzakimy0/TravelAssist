import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { ROOT } from "../tools/transport/task-085-gate0.mjs";
import {
  loadInputs,
  buildArtifacts,
  execute,
} from "../tools/transport/task-085-access-generation.mjs";
import {
  applyTargetedRepair,
  TARGETED_PATH,
} from "../tools/transport/task-085-targeted-repair.mjs";
import { digest, stable } from "../tools/transport/task-085-access-core.mjs";

const base = loadInputs(ROOT, { includeTargeted: false });
const current = loadInputs(ROOT);
const receipt = JSON.parse(readFileSync(join(ROOT, TARGETED_PATH), "utf8"));
function changedReceipt(change, check, reseal = true) {
  const root = mkdtempSync(join(tmpdir(), "task085-repair-test-"));
  try {
    const r = structuredClone(receipt);
    for (const source of r.sourceFiles) {
      mkdirSync(dirname(join(root, source.path)), { recursive: true });
      copyFileSync(join(ROOT, source.path), join(root, source.path));
    }
    change(r, root);
    if (reseal) {
      delete r.receiptSha256;
      r.receiptSha256 = digest(r);
    }
    mkdirSync(dirname(join(root, TARGETED_PATH)), { recursive: true });
    writeFileSync(join(root, TARGETED_PATH), JSON.stringify(r));
    check(() => applyTargetedRepair(root, base));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("085 repair preserves the prior admissions and all 680 directed records without mutating base", () => {
  const before = digest(base);
  const repaired = applyTargetedRepair(ROOT, base);
  assert.equal(digest(base), before);
  const admitted = new Set(repaired.admissions.map(stable));
  assert.ok(base.admissions.every((n) => admitted.has(stable(n))));
  const built = buildArtifacts(repaired);
  const audit = JSON.parse(built.artifacts["post-canonical-replay-audit.json"]);
  assert.equal(audit.status, "PASS");
  assert.equal(audit.previousDirectedEdges, 680);
  assert.equal(audit.preservedDirectedEdges, 680);
  assert.equal(audit.cases.filter((p) => p.result === "TARGET_MET").length, 5);
  assert.equal(repaired.pois.length, 100);
  assert.equal(
    repaired.preflight.canonical.accessAdjudication.assessmentCount,
    95,
  );
});

test("085 repair rejects receipt and licensed archive corruption", () => {
  changedReceipt(
    (r) => {
      r.baseHead = "0".repeat(40);
    },
    (run) => assert.throws(run, /TARGETED_RECEIPT_CORRUPTED/),
    false,
  );
  changedReceipt(
    (r, root) => writeFileSync(join(root, r.sourceFiles[0].path), "broken"),
    (run) => assert.throws(run, /TARGETED_SOURCE_CORRUPTED/),
  );
});

test("085 repair rejects Canonical, scope, source row and coordinate drift", () => {
  changedReceipt(
    (r) => {
      r.canonicalDatasetFileSha256 = "0".repeat(64);
    },
    (run) => assert.throws(run, /TARGETED_CANONICAL_DRIFT/),
  );
  changedReceipt(
    (r) => {
      r.poiIds.pop();
    },
    (run) => assert.throws(run, /TARGETED_SCOPE_DRIFT/),
  );
  changedReceipt(
    (r) => {
      r.records[0].point.latitude += 0.001;
      delete r.records[0].sourceRecordSha256;
      r.records[0].sourceRecordSha256 = digest(r.records[0]);
    },
    (run) => assert.throws(run, /TARGETED_ROW_COORDINATE_MISMATCH/),
  );
});

test("085 repair requires licensed admission and reviewed exact name/operator joins", () => {
  changedReceipt(
    (r) => {
      r.rights[0].rights.derivativePersistence = false;
    },
    (run) => assert.throws(run, /TARGETED_NODE_NOT_ADMITTED/),
  );
  changedReceipt(
    (r) => {
      r.facts[0].gatewayName = "other station";
    },
    (run) => assert.throws(run, /TARGETED_NAME_JOIN_MISMATCH/),
  );
  changedReceipt(
    (r) => {
      r.facts[0].operator = "another operator";
    },
    (run) => assert.throws(run, /TARGETED_OPERATOR_JOIN_MISMATCH/),
  );
  changedReceipt(
    (r) => {
      r.facts[0].reviewStatus = "CANDIDATE";
    },
    (run) => assert.throws(run, /OFFICIAL_GATEWAY_FACT_REVIEWED/),
  );
});

test("085 repair rejects duplicate relationships and facts outside the nine-case scope", () => {
  changedReceipt(
    (r) => {
      r.facts.push(r.facts[0]);
    },
    (run) => assert.throws(run, /TARGETED_DUPLICATE_RELATIONSHIP/),
  );
  changedReceipt(
    (r) => {
      r.facts[0].poiId = base.pois.find(
        (p) => !r.poiIds.includes(p.internalId),
      ).internalId;
    },
    (run) => assert.throws(run, /TARGETED_FACT_OUTSIDE_SCOPE/),
  );
});

test("085 new evidence invalidates old fixpoint exceptions rather than rehashing them to PASS", () => {
  const built = buildArtifacts(current);
  const gate = JSON.parse(built.artifacts["final-acceptance-gate.json"]);
  assert.equal(gate.allPass, false);
  assert.equal(gate.auditedExceptionsOnly, false);
  assert.equal(gate.userAcceptanceRequired, false);
  assert.equal(gate.globalTopologyDiscoveryFixpoint, "IN_PROGRESS");
  const failed = gate.remainingFailedGates.find(
    (g) => g.name === "globalTopologyDiscoveryFixpoint",
  );
  assert.equal(failed.affectedPoiIds.length, 4);
  assert.equal(current.discoveryReview.length, 0);
});

test("085 targeted artifacts rebuild, resume, rerun and detect corruption without treating data shortfall as PASS", () => {
  const out = mkdtempSync(join(tmpdir(), "task085-repair-artifacts-"));
  try {
    const first = execute({ input: current, out, mode: "rebuild" });
    assert.notEqual(first.acceptance, "PASS / READY_FOR_REVIEW");
    const bytes = readFileSync(
      join(out, "topology-confirmed-edges.jsonl"),
      "utf8",
    );
    assert.equal(
      execute({ input: current, out, mode: "resume" }).operations[0].action,
      "CHECKSUM_SKIP",
    );
    execute({ input: current, out, rerunBatch: 1 });
    assert.equal(
      readFileSync(join(out, "topology-confirmed-edges.jsonl"), "utf8"),
      bytes,
    );
    const r = JSON.parse(
      readFileSync(join(out, "batch-receipts/0001.json"), "utf8"),
    );
    r.poiCount += 1;
    writeFileSync(join(out, "batch-receipts/0001.json"), JSON.stringify(r));
    assert.throws(
      () => execute({ input: current, out, mode: "resume" }),
      /CORRUPTED_RECEIPT/,
    );
    execute({ input: current, out, mode: "rebuild" });
    assert.equal(
      execute({ input: current, out, mode: "check" }).acceptance,
      first.acceptance,
    );
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("085 committed targeted artifact bytes match the current inputs", () => {
  const result = execute({ root: ROOT, mode: "check" });
  assert.notEqual(
    result.acceptance,
    "READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS",
  );
});
