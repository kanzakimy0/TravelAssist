import fs from "node:fs";
import path from "node:path";
import { canonical, hash, invariant } from "./task-086-model.mjs";
import { qualifiedInputPath } from "./task-086-qualified-inputs.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "./task-086-source-actions.mjs";
export const CAPABILITY_INPUT =
  "research/conditional-capability-contexts.v1.json";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export function loadCapabilityContextInputs(base) {
  const file = path.join(base, CAPABILITY_INPUT);
  if (!fs.existsSync(file)) return { contexts: [], inputPaths: [] };
  const cfg = read(file);
  invariant(
    cfg.schemaVersion === 1 && Array.isArray(cfg.contexts),
    "CAPABILITY_CONTEXT_SCHEMA",
  );
  const inputPaths = [CAPABILITY_INPUT],
    actions = fs
      .readFileSync(path.join(base, "next-source-actions.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(JSON.parse),
    contexts = [];
  for (const entry of cfg.contexts) {
    const c = entry.context;
    invariant(
      c?.kind === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY" &&
        c.publicStructureOnly === false &&
        !Object.hasOwn(c, "odValidationContext") &&
        !Object.hasOwn(c, "capabilityReview") &&
        !Object.hasOwn(c, "capabilityInputBindings") &&
        !Object.hasOwn(c, "evidenceContextSha256"),
      "CAPABILITY_NO_EMBEDDED_TRUST",
    );
    const review = read(qualifiedInputPath(base, entry.reviewPath)),
      bindings = [];
    inputPaths.push(entry.reviewPath, review.phaseFile);
    for (const b of review.inputBindings) {
      const p = qualifiedInputPath(base, b.path);
      bindings.push([b.path, hash(fs.readFileSync(p))]);
      inputPaths.push(b.path);
    }
    let error = null;
    try {
      const phase = read(qualifiedInputPath(base, review.phaseFile));
      invariant(
        phase.phaseId === review.phaseId &&
          canonical(phase.facts.map((f) => [f.factId, hash(f)])) ===
            canonical(review.factBindings),
        "CAPABILITY_PHASE_FACT_BINDING",
      );
      for (const f of phase.facts) {
        reviewedFactAction(f, actions);
        validateCorroboratingEvidence(f, actions);
        for (const o of [
          ...(f.conditionEvidence ?? []),
          ...(f.conditionObservations ?? []),
        ])
          reviewedFactAction({ ...o, factId: o.conditionId }, actions);
      }
    } catch (e) {
      error = e.message;
    }
    contexts.push({
      ...c,
      capabilityReview: review,
      capabilityInputBindings: bindings,
      capabilityInputError: error,
    });
  }
  return { contexts, inputPaths: [...new Set(inputPaths)] };
}
