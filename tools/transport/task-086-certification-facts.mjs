import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {
  canonical,
  hash,
  sourceAllowed,
  verifyEvidence,
  factCallingRestrictions,
  factThroughOperators,
  id,
} from "./task-086-model.mjs";

export const FACT_CAPABILITIES = [
  "rawPersistence",
  "rawRedistribution",
  "identityFact",
  "serviceTopologyFact",
  "directionBoardingFact",
  "transferFact",
  "walkingAccessFact",
  "metricFact",
  "runtimeDerivedFact",
];
const explicitLicense =
  /^(CC[- ]?BY(?:[- ]|$)|CC0|PDL-1\.0(?:\+MOJ-MAP-DATA-TERMS)?|MLIT legacy commercial-use terms|ODbL 1\.0|Operator unrestricted-use terms|Tokachi Bus static GTFS route-guidance use grant)/;
// Reuse the existing reviewed minimal-fact policy. This is not a new legal grant.
export function sourceCapabilities(
  source,
  snapshot,
  evidenceBound,
  rightsEvidence = false,
) {
  const rightsClass =
    source?.rightsClass ??
    (source?.persistenceAllowed === true ? "RAW_PERSISTENCE_ALLOWED" : null);
  const explicit = explicitLicense.test(source?.license ?? "");
  const reviewedFacts =
    sourceAllowed(source) &&
    source.rawPayloadRetained === false &&
    ["DERIVED_STATIC_FACTS_ALLOWED", "TOPOLOGY_FACT_ONLY_ALLOWED"].includes(
      source.rightsClass,
    ) &&
    source.rightsDecision === "MINIMUM_NONEXPRESSIVE_FACTS_ONLY" &&
    source.rightsReview?.scope === "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS" &&
    Boolean(source.rightsReview?.termsUrl && source.rightsReview?.reason);
  const attributed = Boolean(
    source?.attribution ||
    source?.license === "CC0" ||
    (reviewedFacts && source.url),
  );
  const shareAlike =
    source?.license !== "ODbL 1.0" ||
    Boolean(source.shareAlikeRequired && source.shareAlikeScope);
  const basis =
    sourceAllowed(source) &&
    snapshot &&
    evidenceBound &&
    attributed &&
    shareAlike &&
    ((explicit && rightsEvidence) || reviewedFacts);
  const raw = Boolean(basis && explicit && rightsEvidence);
  return Object.fromEntries(
    FACT_CAPABILITIES.map((capability) => [
      capability,
      {
        allowed: Boolean(
          capability === "rawPersistence"
            ? raw && rightsClass === "RAW_PERSISTENCE_ALLOWED"
            : capability === "rawRedistribution"
              ? raw &&
                rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
                source.rawRedistributionAllowed !== false
              : capability === "metricFact"
                ? raw &&
                  (source.metricPersistenceAllowed === true ||
                    rightsClass === "RAW_PERSISTENCE_ALLOWED")
                : basis,
        ),
        basis: reviewedFacts
          ? "EXISTING_REVIEWED_MINIMAL_FACT_POLICY"
          : explicit && rightsEvidence
            ? "BOUND_EXPLICIT_USAGE_TERMS"
            : "UNVERIFIED_USAGE_BASIS",
        sourceId: source?.sourceId ?? null,
        rawPayloadRetained: source?.rawPayloadRetained ?? null,
        scope: source?.rightsReview?.scope ?? null,
        termsUrl: source?.rightsReview?.termsUrl ?? source?.licenseUrl ?? null,
      },
    ]),
  );
}

const distinct = (refs) => [...new Set(refs ?? [])].sort();
// Only semantically required bindings recurse. Corroboration/metrics/raw archives do not.
export function requiredEvidenceClosure(refs, evidence) {
  const result = new Set();
  const visit = (ref) => {
    if (result.has(ref)) return;
    result.add(ref);
    const record = evidence.get(ref)?.record;
    const walk = (value) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object")
        for (const [key, v] of Object.entries(value)) {
          if (
            [
              "corroboratingEvidence",
              "auxiliaryEvidenceRefs",
              "metricEvidenceRefs",
              "rawArchiveEvidenceRefs",
            ].includes(key)
          )
            continue;
          if (
            [
              "sourceFactRef",
              "parentEvidenceRef",
              "currentEndpointEvidenceRef",
            ].includes(key) &&
            typeof v === "string"
          )
            visit(v);
          if (
            [
              "sourceEvidenceRefs",
              "corroboratingConditionEvidenceRefs",
              "requiredEvidenceRefs",
              "identityEvidenceRefs",
            ].includes(key) &&
            Array.isArray(v)
          )
            v.forEach(visit);
          walk(v);
        }
    };
    walk(record);
  };
  (refs ?? []).forEach(visit);
  return distinct([...result]);
}

export function identityEvidenceRefs(node, evidence) {
  const exact = (node.evidenceRefs ?? []).filter(
    (ref) => evidence.get(ref)?.recordSha256 === hash(node.identityRecord),
  );
  if (
    [
      "TASK_086_INDEPENDENT_S12_AND_OFFICIAL_SERVICE",
      "TASK_086_INDEPENDENT_GTFS",
      "TASK_086_INDEPENDENT_C28_AND_CURRENT_ACCESS",
    ].includes(node.origin)
  ) {
    const transitions = node.identityTransition
      ? (node.evidenceRefs ?? []).filter((ref) => {
          const fact = evidence.get(ref)?.record;
          return (fact?.callingComponents ?? fact?.components ?? []).some(
            (c) =>
              c.name === node.canonicalNameJa &&
              c.operatorTransitionReview?.stationCode ===
                node.identityRecord.stationCode &&
              c.operatorTransitionReview?.transitionId ===
                node.identityTransition.transitionId,
          );
        })
      : [];
    return distinct([...exact, ...transitions]);
  }
  // Facility/service-specific identities depend on their reviewed current role/mode.
  // Keep those existing specialist validators and exact bindings, not geometry guesses.
  return distinct(node.evidenceRefs);
}

export function certifyFact(role, capability, refs, context) {
  const evidenceIds = requiredEvidenceClosure(refs, context.evidence);
  const sourceIds = distinct(
    evidenceIds
      .map((ref) => context.evidence.get(ref)?.sourceId)
      .filter(Boolean),
  );
  const blockers = [];
  if (!evidenceIds.length)
    blockers.push({
      reason:
        role === "REQUIRED_IDENTITY"
          ? "IDENTITY_UNRESOLVED"
          : "SERVICE_DIRECTION_UNRESOLVED",
      detail: "Required evidence is absent",
    });
  for (const ref of evidenceIds) {
    const row = context.evidence.get(ref),
      source = context.sources.get(row?.sourceId),
      audit = context.sourceAudits.get(row?.sourceId);
    if (
      !row ||
      !source ||
      !verifyEvidence([ref], context.sources, context.evidence)
    ) {
      blockers.push({
        reason: "SOURCE_SNAPSHOT_INTEGRITY_FAILED",
        evidenceId: ref,
        sourceId: row?.sourceId ?? null,
        detail:
          "Missing descriptor/locator or source/record SHA binding mismatch",
      });
      continue;
    }
    const localCaps = sourceCapabilities(
      {
        ...source,
        license: audit?.license ?? source.license,
        attribution: source.attribution ?? source.rightsReview?.attribution,
      },
      !audit?.rawSnapshot?.startsWith("FAIL"),
      true,
      audit?.rightsBasisEvidence?.rightsEvidenceBound ?? false,
    );
    if (!localCaps[capability].allowed || !localCaps.runtimeDerivedFact.allowed)
      blockers.push({
        reason: "RIGHTS_UNVERIFIED_FOR_REQUIRED_FACT",
        evidenceId: ref,
        sourceId: row.sourceId,
        capability,
        detail:
          "Existing structured review or bound exact-use terms do not support this fact use",
      });
  }
  return {
    role,
    capability,
    evidenceIds,
    sourceIds,
    status: blockers.length ? "FAIL" : "PASS",
    blockers,
  };
}

export function patternRequiredRefs(pattern, evidence) {
  return distinct(
    (pattern?.evidenceRefs ?? []).filter((ref) => {
      const row = evidence.get(ref),
        record = row?.record;
      return (
        record?.callingNodes ||
        (record?.trip && record?.calls) ||
        record?.kind === "service"
      );
    }),
  );
}

export function segmentRequiredFacts(edge, pattern, context) {
  if (!pattern)
    return [
      {
        role: "REQUIRED_SERVICE_TOPOLOGY",
        capability: "serviceTopologyFact",
        evidenceIds: [],
        sourceIds: [],
        status: "FAIL",
        blockers: [
          {
            reason: "SERVICE_DIRECTION_UNRESOLVED",
            detail: "Missing service pattern",
          },
        ],
      },
    ];
  const refs = patternRequiredRefs(pattern, context.evidence);
  const facts = [
    certifyFact(
      "REQUIRED_SERVICE_TOPOLOGY",
      "serviceTopologyFact",
      refs,
      context,
    ),
    certifyFact(
      "REQUIRED_DIRECTION_BOARDING",
      "directionBoardingFact",
      refs,
      context,
    ),
  ];
  for (const ref of refs) {
    const record = context.evidence.get(ref)?.record,
      fact = context.evidence.get(record?.sourceFactRef)?.record;
    for (const i of [edge.segmentIndex, edge.segmentIndex + 1]) {
      const selector = fact?.callingComponents?.[i],
        review = selector?.nameVariantReview;
      if (review) {
        const node = context.nodes.get(pattern.callingNodes[i]?.nodeId);
        const identityRefs = (node?.evidenceRefs ?? []).filter((ref) => {
          const r = context.evidence.get(ref)?.record;
          return (
            r?.stationCode === review.stationCode &&
            r.stationName === selector.name &&
            r.operator === selector.operator &&
            r.line === selector.line
          );
        });
        facts.push(
          certifyFact(
            "REQUIRED_IDENTITY",
            "identityFact",
            identityRefs,
            context,
          ),
        );
      }
    }
  }
  if (edge.accessContract)
    facts.push(
      certifyFact(
        "REQUIRED_DIRECTION_BOARDING",
        "directionBoardingFact",
        edge.accessContract.sourceEvidenceRefs,
        context,
      ),
    );
  return facts;
}

// Validate one real interval, using its original sequence indices and canonical IDs.
// D's identity never participates in the A->B proof; all required A/B facts do.
export function validateSegmentFact(edge, pattern, context) {
  const i = edge.segmentIndex,
    a = pattern?.callingNodes?.[i],
    b = pattern?.callingNodes?.[i + 1];
  const fail = (code, detail) => ({ reason: code, detail, segmentIndex: i });
  if (
    !Number.isInteger(i) ||
    !a ||
    !b ||
    a.nodeId !== edge.fromTransportNodeId ||
    b.nodeId !== edge.toTransportNodeId ||
    a.sequence >= b.sequence
  )
    return fail(
      "SERVICE_DIRECTION_UNRESOLVED",
      "Segment does not bind the exact consecutive calling pair",
    );
  if (
    edge.edgeId !==
      id("edge", [pattern.servicePatternId, i, a.nodeId, b.nodeId]) ||
    edge.servicePatternRef !== pattern.servicePatternId
  )
    return fail(
      "SERVICE_DIRECTION_UNRESOLVED",
      "Canonical interval ID binding mismatch",
    );
  if (
    edge.direction !== pattern.direction ||
    !pattern.direction ||
    pattern.direction === "unknown" ||
    edge.directed !== true
  )
    return fail(
      "SERVICE_DIRECTION_UNRESOLVED",
      "Direction is missing or differs from reviewed pattern",
    );
  if (
    edge.boardAllowed !== (a.pickupType !== "1") ||
    edge.alightAllowed !== (b.dropOffType !== "1")
  )
    return fail(
      "BOARDING_ALIGHTING_UNRESOLVED",
      "Edge permissions differ from the selected calls",
    );
  if (
    edge.lineRef !== pattern.lineRef ||
    edge.mode !== pattern.mode ||
    edge.serviceClass !== pattern.serviceClass ||
    edge.operatorRef !== pattern.segmentOperators?.[i]
  )
    return fail(
      "SERVICE_DIRECTION_UNRESOLVED",
      "Line/mode/class/operator interval mismatch",
    );
  const refs = patternRequiredRefs(pattern, context.evidence);
  if (!refs.length)
    return fail(
      "SERVICE_DIRECTION_UNRESOLVED",
      "No required ordered service record",
    );
  for (const ref of refs) {
    const record = context.evidence.get(ref)?.record;
    if (pattern.sequenceEvidence === "OFFICIAL_CALLING_SEQUENCE") {
      const parent = context.evidence.get(record?.sourceFactRef)?.record;
      if (
        !parent ||
        parent.kind !== "service" ||
        !["active", "seasonal"].includes(parent.serviceState) ||
        record.direction !== pattern.direction ||
        record.lineRef !== pattern.lineRef ||
        record.operatorRef !== pattern.operatorRef ||
        record.mode !== pattern.mode ||
        record.serviceClass !== pattern.serviceClass ||
        canonical(record.callingNodes?.slice(i, i + 2)) !== canonical([a, b])
      )
        return fail(
          "SERVICE_DIRECTION_UNRESOLVED",
          "Required service record does not bind this line/direction/interval",
        );
      let restrictions, through;
      try {
        restrictions = factCallingRestrictions(parent);
        through = factThroughOperators(parent);
      } catch (error) {
        return fail("SERVICE_DIRECTION_UNRESOLVED", error.message);
      }
      for (const [index, call] of [
        [i, a],
        [i + 1, b],
      ]) {
        const node = context.nodes.get(call.nodeId),
          selector = parent.callingComponents?.[index] ?? {
            name: parent.callingStations?.[index],
            operator: parent.operator,
            line: parent.line,
            mode: parent.mode,
          };
        const reviewedVariant = selector.nameVariantReview;
        const sourceName = parent.callingStations?.[index];
        const identityName = node?.canonicalNameJa;
        const normalize = (value, kind) =>
          kind === "JAPANESE_SMALL_KE"
            ? value.replaceAll("ヶ", "ケ")
            : kind === "JAPANESE_PAREN_WIDTH"
              ? value.replaceAll("（", "(").replaceAll("）", ")")
              : value.replace(/[０-９]/g, (digit) =>
                  String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
                );
        const variantBound =
          reviewedVariant &&
          [
            "JAPANESE_SMALL_KE",
            "JAPANESE_DIGIT_WIDTH",
            "JAPANESE_PAREN_WIDTH",
          ].includes(reviewedVariant.kind) &&
          reviewedVariant.sourceName === sourceName &&
          node?.evidenceRefs?.some((ref) => {
            const row = context.evidence.get(ref);
            return (
              verifyEvidence([ref], context.sources, context.evidence) &&
              row.record.stationCode === reviewedVariant.stationCode &&
              row.record.stationName === selector.name &&
              row.record.operator === selector.operator &&
              row.record.line === selector.line
            );
          }) &&
          normalize(sourceName, reviewedVariant.kind) ===
            normalize(selector.name, reviewedVariant.kind);
        const nameMatches =
          selector.name === identityName &&
          (sourceName === identityName ||
            variantBound ||
            [
              "PUBLIC_BUS_ONBOARD_REQUEST",
              "AIR_PASSENGER_PUBLIC_SHUTTLE",
            ].includes(parent.accessContract?.kind));
        if (
          !node ||
          !nameMatches ||
          !node.operatorRefs.includes(selector.operator) ||
          !node.lineRefs.includes(selector.line) ||
          node.mode !== selector.mode
        )
          return fail(
            "IDENTITY_UNRESOLVED",
            "Ordered call does not bind this endpoint's canonical operator/line/mode",
          );
        if (
          call.pickupType !== restrictions[index]?.pickupType ||
          call.dropOffType !== restrictions[index]?.dropOffType
        )
          return fail(
            "BOARDING_ALIGHTING_UNRESOLVED",
            "Calling permissions differ from the required original fact",
          );
      }
      const selectedOperator =
        through?.segmentOperators?.[i] ?? parent.operator;
      if (
        edge.operatorRef !== selectedOperator ||
        canonical(edge.operatorRefs ?? null) !==
          canonical(through?.segmentOperatorRefs?.[i] ?? null)
      )
        return fail(
          "SERVICE_DIRECTION_UNRESOLVED",
          "Crossed operator boundary not bound by reviewed through-service fact",
        );
    } else if (
      ["GTFS_TRIP_STOP_SEQUENCE", "REVIEWED_GTFS_STATIC_SEQUENCE"].includes(
        pattern.sequenceEvidence,
      )
    ) {
      const calls = record?.calls;
      if (
        !record?.trip ||
        !calls ||
        calls.length !== pattern.callingNodes.length
      )
        return fail(
          "SERVICE_DIRECTION_UNRESOLVED",
          "GTFS calls/sequence missing",
        );
      for (const [index, call] of [
        [i, a],
        [i + 1, b],
      ]) {
        const original = calls[index];
        if (
          call.sequence !== Number(original.stop_sequence) ||
          call.pickupType !== (original.pickup_type || "0") ||
          call.dropOffType !== (original.drop_off_type || "0")
        )
          return fail(
            "BOARDING_ALIGHTING_UNRESOLVED",
            "GTFS interval restrictions changed",
          );
      }
    } else
      return fail(
        "SERVICE_DIRECTION_UNRESOLVED",
        "Unrecognized ordered service basis",
      );
  }
  return null;
}

// A source-specific obligation binding; neither license nor rights booleans change.
export function applyCapabilityReviews(sources, reviews, evidence, base) {
  const updates = new Map();
  for (const review of reviews) {
    const source = sources.find((s) => s.sourceId === review.sourceId);
    assert.ok(source, "Capability review source absent");
    assert.equal(review.kind, "EXISTING_ODBL_OBLIGATION_AND_TERMS_BINDING");
    assert.equal(source.license, "ODbL 1.0");
    assert.equal(source.shareAlikeRequired, true);
    assert.equal(review.sourceSha256, source.contentSha256);
    assert.equal(review.descriptorSha256, hash(source));
    assert.equal(review.attribution, source.attribution);
    assert.equal(
      review.shareAlikeScope,
      "OSM-derived database portion bound to this exact source and its audited retained facts; attribution and ODbL distribution obligations retained.",
    );
    const obs = review.termsObservation;
    assert.equal(review.termsObservationSha256, hash(obs));
    assert.ok(Number.isFinite(Date.parse(obs.observedAt)) && obs.byteSize > 0);
    assert.equal(obs.url, source.rightsReview.termsUrl);
    assert.equal(obs.status, 200);
    assert.ok(/^[a-f0-9]{64}$/.test(obs.contentSha256));
    assert.equal(obs.rawPayloadRetained, false);
    assert.ok(
      obs.minimalFindings.ODbLNamed &&
        obs.minimalFindings.attributionRequired &&
        obs.minimalFindings.sameLicenseRequired,
    );
    const archive = path.resolve(base, source.retainedArchive);
    assert.ok(archive.startsWith(path.resolve(base) + path.sep));
    assert.equal(hash(fs.readFileSync(archive)), source.contentSha256);
    const actualIds = evidence
      .filter((e) => e.sourceId === source.sourceId)
      .map((e) => e.evidenceId)
      .sort();
    assert.deepEqual(review.requiredEvidenceIds, actualIds);
    assert.ok(actualIds.length > 0);
    assert.ok(
      evidence
        .filter((e) => actualIds.includes(e.evidenceId))
        .every(
          (e) =>
            e.sourceSha256 === source.contentSha256 &&
            hash(e.record) === e.recordSha256,
        ),
    );
    updates.set(source.sourceId, {
      ...source,
      shareAlikeScope: review.shareAlikeScope,
      licenseEvidence: {
        observedResponseSha256: obs.contentSha256,
        termsObservation: obs,
        reviewSha256: hash(review),
      },
    });
  }
  return sources.map((s) => updates.get(s.sourceId) ?? s);
}
