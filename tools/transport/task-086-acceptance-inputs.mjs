import {
  exactCorrectionCovers,
  correctionObligationsPreserved,
} from "./task-086-pattern-corrections.mjs";
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
  if (
    fs.existsSync(
      path.join(networkRoot, "research/pattern-corrections.v1.json"),
    )
  )
    paths.push("research/pattern-corrections.v1.json");
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
// Review evidence can live outside the fixed network input list. Fingerprint
// the bytes actually read, never a declared hash or a generated graph output.
export function staticReviewInputHashes(reviewBytes, generatedPaths) {
  const result = {};
  for (const [inputPath, bytes] of reviewBytes) {
    invariant(
      typeof inputPath === "string" &&
        inputPath.length > 0 &&
        !inputPath.includes("\\") &&
        !inputPath.includes(":") &&
        !path.posix.isAbsolute(inputPath) &&
        path.posix.normalize(inputPath) === inputPath &&
        !inputPath.split("/").includes(".."),
      "GLOBAL_REVIEW_INPUT_PATH_NOT_ROOT_RELATIVE",
    );
    invariant(
      inputPath !== "data/transport/network/research/global-review.v1.json",
      "GLOBAL_REVIEW_INPUT_SELF_BINDING",
    );
    if (!generatedPaths.has(inputPath)) result[inputPath] = hash(bytes);
  }
  return result;
}

const SPECIAL_NODE_KINDS = new Set([
  "other_tourism_transport",
  "ropeway",
  "cable_car",
  "funicular",
  "ropeway_station",
  "cable_car_station",
  "funicular_station",
]);
const SPECIAL_MODES = new Set([
  "fixed_guideway",
  "tram",
  "ropeway",
  "cable_car",
  "funicular",
  "other_tourism_transport",
]);
const ASCENT_MODES = new Set(["ropeway", "cable_car", "funicular"]);
function exactSet(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === new Set(actual).size &&
    actual.length === expected.size &&
    actual.every((id) => expected.has(id))
  );
}
function specialApplicabilityCovered(decision, inventory, byNode, patterns) {
  if (
    decision.kind !== "REQUIRED_SPECIAL_APPLICABILITY_V1" ||
    !Array.isArray(inventory) ||
    inventory.length === 0
  )
    return false;
  const required = inventory.filter(
    (r) =>
      SPECIAL_NODE_KINDS.has(r.kind) ||
      SPECIAL_NODE_KINDS.has(byNode.get(r.nodeId)?.nodeKind) ||
      SPECIAL_MODES.has(byNode.get(r.nodeId)?.mode),
  );
  const ids = new Set(required.map((r) => r.nodeId));
  const modes = new Set(required.map((r) => byNode.get(r.nodeId)?.mode));
  if (
    !exactSet(decision.requiredNodeIds, ids) ||
    !exactSet(decision.reviewedSpecialModes, modes) ||
    [...modes].some((mode) => !SPECIAL_MODES.has(mode))
  )
    return false;
  const relevant = patterns.filter(
    (p) =>
      SPECIAL_MODES.has(p.mode) &&
      p.callingNodes.some((c) => ids.has(c.nodeId)),
  );
  if (
    !exactSet(
      decision.requiredPatternIds,
      new Set(relevant.map((p) => p.servicePatternId)),
    )
  )
    return false;
  // New ascent-mode obligations need their own actual mode evidence. Existing
  // fixed-guideway/tram patterns cannot cover them through a refreshed hash.
  return [...modes].every(
    (mode) =>
      !ASCENT_MODES.has(mode) ||
      relevant.some(
        (p) =>
          p.mode === mode &&
          p.callingNodes.some(
            (c) => ids.has(c.nodeId) && byNode.get(c.nodeId)?.mode === mode,
          ),
      ),
  );
}

// Closed review obligations remain executable: lost patterns, changed source bytes,
// rights revocation or connectivity failure reopens the original deficit ID.
export function reviewGlobalGaps(
  review,
  decisions,
  {
    nodes,
    patterns,
    edges,
    connected,
    readInput,
    inventory,
    patternCorrections,
    sources,
    evidence,
    generatedAt,
  },
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
    if (g.deficitId === "mode:required-special-tourism")
      valid &&= specialApplicabilityCovered(d, inventory, byNode, patterns);
    else if (d.kind === "REQUIRED_SPECIAL_APPLICABILITY_V1") valid = false;
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
    if (
      [
        "source:national-stopping-patterns",
        "service:major-rail-private-metro",
      ].includes(g.deficitId)
    )
      valid &&= correctionObligationsPreserved(patternCorrections, d);
    valid &&= d.requiredPatternIds.every((id) => {
      if (
        [
          "source:national-stopping-patterns",
          "service:major-rail-private-metro",
        ].includes(g.deficitId) &&
        patternCorrections?.contexts.has(id)
      )
        return exactCorrectionCovers(patternCorrections, id, {
          nodes,
          patterns,
          edges,
          connected,
          sources,
          evidence,
          generatedAt,
        });
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
