import fs from "node:fs";
import { hash, invariant } from "./task-086-model.mjs";
import { readJson } from "./task-086-batches.mjs";
import path from "node:path";
export function loadAcceptanceInputs(networkRoot) {
  const file = path.join(networkRoot, "research/exception-proofs.v1.json");
  const document = readJson(file);
  invariant(
    document.schemaVersion === 1 && Array.isArray(document.proofs),
    "PROOF_INPUT_SCHEMA",
  );
  const scope = readJson(path.join(networkRoot, "research/stage-scope.json"));
  const paths = [
    "research/stage-scope.json",
    "research/global-review.v1.json",
    "sources/source-review.json",
    "research/s12-identities.jsonl",
    "research/c28-identities.jsonl",
    "research/p11-identities.jsonl",
    "research/p36-identities.jsonl",
    ...scope.phaseFiles.map((n) => "research/phases/" + n),
  ];
  const currentPhases = fs
    .readdirSync(path.join(networkRoot, "research/phases"))
    .filter((n) => n.endsWith(".json"))
    .sort();
  invariant(
    hash(currentPhases) === hash(scope.phaseFiles),
    "FROZEN_STAGE_PHASE_SCOPE_CHANGED",
  );
  const actions = readJsonRows(
    path.join(networkRoot, "next-source-actions.jsonl"),
  );
  const bindingVersion = actions.map((a) => ({
    actionId: a.actionId,
    sourcesChecked: a.sourcesChecked,
    rightsFindings: a.rightsFindings,
  }));
  return {
    proofs: document.proofs,
    proofInputSha256: hash(fs.readFileSync(file)),
    context: {
      asOf: scope.asOf,
      inputVersion: hash({
        files: paths.map((p) => [
          p,
          hash(fs.readFileSync(path.join(networkRoot, p))),
        ]),
        bindingVersion,
      }),
    },
  };
}
function readJsonRows(file) {
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
}
// Closed review obligations remain executable: lost patterns, changed source bytes,
// rights revocation or connectivity failure reopens the original deficit ID.
export function reviewGlobalGaps(
  review,
  decisions,
  { nodes, patterns, edges, connected, readInput },
) {
  const byNode = new Map(nodes.map((n) => [n.nodeId, n])),
    byPattern = new Map(patterns.map((p) => [p.servicePatternId, p]));
  return review.gaps.flatMap((g) => {
    const d = decisions.reviews.find((x) => x.deficitId === g.deficitId);
    if (!d || d.status !== "REVIEWED_CLOSED")
      return [{ ...g, reason: d?.currentReason ?? g.reason }];
    let valid =
      d.requiredNodeIds.length > 0 &&
      d.requiredPatternIds.length > 0 &&
      d.inputBindings.length > 0;
    try {
      valid &&= d.inputBindings.every(
        (x) => hash(readInput(x.path)) === x.sha256,
      );
    } catch {
      valid = false;
    }
    valid &&= d.requiredNodeIds.every(
      (id) =>
        byNode.get(id)?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
        connected.has(id),
    );
    valid &&= d.requiredPatternIds.every((id) => {
      const p = byPattern.get(id);
      return (
        p &&
        !["inactive", "suspended"].includes(p.serviceState) &&
        p.callingNodes.every(
          (n) => byNode.get(n.nodeId)?.decision === "ADMIT_TASK_086_TOPOLOGY",
        ) &&
        edges.filter(
          (e) => e.edgeKind === "service_segment" && e.servicePatternRef === id,
        ).length ===
          p.callingNodes.length - 1
      );
    });
    return valid
      ? []
      : [{ ...g, reason: "REVIEW_EVIDENCE_OR_COVERAGE_INVALIDATED" }];
  });
}
