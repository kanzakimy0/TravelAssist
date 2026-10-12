import { canonical, hash, id, invariant } from "./task-086-model.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "./task-086-source-actions.mjs";
export const conditionEvidenceId = (o) =>
  id("evidence", [
    "service-access-condition",
    o.sourceActionId,
    o.sourceUrl,
    o.observedResponseSha256,
    o.conditionId,
  ]);
export function resolvedAccessFields(fact) {
  return Object.hasOwn(fact, "accessContract")
    ? { accessContract: structuredClone(fact.accessContract) }
    : {};
}
export function bindReviewedConditionEvidence(
  fact,
  actions,
  sources,
  evidence,
  readRetainedBytes,
) {
  const observations = fact.conditionEvidence ?? [];
  if (!Object.hasOwn(fact, "accessContract")) {
    invariant(
      observations.length === 0 &&
        !fact.corroboratingConditionEvidenceRefs?.length,
      "ORPHAN_CONDITION_EVIDENCE",
    );
    return [];
  }
  reviewedFactAction(fact, actions);
  validateCorroboratingEvidence(fact, actions);
  invariant(
    fact.kind === "service" &&
      Array.isArray(observations) &&
      observations.length > 0,
    "REVIEWED_CONDITION_OBSERVATIONS_REQUIRED",
  );
  const { sourceEvidenceRefs, ...terms } = fact.accessContract;
  const ids = observations.map(conditionEvidenceId);
  invariant(
    new Set(ids).size === ids.length &&
      canonical(ids) === canonical(sourceEvidenceRefs) &&
      canonical(ids) === canonical(fact.corroboratingConditionEvidenceRefs),
    "CONDITION_REFERENCE_SET_MISMATCH",
  );
  const pending = [];
  for (const o of observations) {
    invariant(
      typeof o.conditionId === "string" &&
        o.conditionId.length > 0 &&
        typeof o.locator === "string" &&
        o.locator.length > 0 &&
        /^[a-f0-9]{64}$/.test(o.observedResponseSha256 ?? ""),
      "CONDITION_OBSERVATION_BINDING_REQUIRED",
    );
    invariant(
      canonical(o.accessTerms) === canonical(terms),
      "CONDITION_TERMS_NOT_EXACT",
    );
    const probe = {
      ...o,
      kind: "condition",
      factId: fact.factId + ":condition:" + o.conditionId,
    };
    const { observed, rights } = reviewedFactAction(probe, actions);
    validateCorroboratingEvidence(probe, actions);
    invariant(
      observed.contentSha256 === o.observedResponseSha256,
      "CONDITION_RAW_RESPONSE_MISMATCH",
    );
    if (observed.rawPayloadRetained === true) {
      invariant(
        rights.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
          observed.retainedPath &&
          typeof readRetainedBytes === "function" &&
          hash(readRetainedBytes(observed.retainedPath)) ===
            observed.contentSha256,
        "CONDITION_RETAINED_SOURCE_HASH_MISMATCH",
      );
    }
    const record = {
      kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
      conditionId: o.conditionId,
      sourceActionId: o.sourceActionId,
      sourceUrl: o.sourceUrl,
      observedResponseSha256: o.observedResponseSha256,
      accessTerms: structuredClone(o.accessTerms),
      corroboratingEvidence: structuredClone(o.corroboratingEvidence ?? []),
    };
    const source = {
      sourceId: id("source", [
        "service-access-condition",
        o.sourceActionId,
        o.sourceUrl,
        o.observedResponseSha256,
        o.conditionId,
      ]),
      url: o.sourceUrl,
      contentSha256: hash(record),
      evidenceContentSha256: observed.contentSha256,
      evidenceFingerprintScope:
        observed.fingerprintScope ?? "RAW_RESPONSE_BYTES",
      observedAt: observed.observedAt,
      rightsClass: rights.rightsClass,
      rawPayloadRetained: false,
      derivedDataAllowed: true,
      redistributionAllowed: true,
      metricPersistenceAllowed: false,
      rightsDecision: "MINIMUM_NONEXPRESSIVE_FACTS_ONLY",
      rightsReview: {
        scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
        termsUrl: rights.termsUrl,
        reason: rights.reason,
      },
    };
    const row = {
      evidenceId: conditionEvidenceId(o),
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      record,
      recordSha256: hash(record),
      locator: o.locator,
    };
    for (const [map, key, value, label] of [
      [sources, source.sourceId, source, "CONDITION_SOURCE_REBIND"],
      [evidence, row.evidenceId, row, "CONDITION_EVIDENCE_REBIND"],
    ]) {
      invariant(
        !map.has(key) || canonical(map.get(key)) === canonical(value),
        label,
      );
      pending.push([map, key, value]);
    }
  }
  for (const [map, key, value] of pending) map.set(key, value);
  return ids;
}
