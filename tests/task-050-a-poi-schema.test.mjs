import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseMasterCodeRegistryV1 } from "../src/shared/master-code/index.ts";
import { parsePoiPlanningProjectionV1 } from "../src/shared/contracts/planning/index.ts";
import {
  admittedCandidateFixture,
  candidateAdmissionContextFixture,
  canonicalPoiDatasetFixture,
  canonicalPoiPositiveFixtures,
  evaluateCandidateAdmissionV1,
  mergeTargetCandidateFixture,
  mergedDuplicatePoiFixture,
  naturePoiFixture,
  parseCandidateAdmissionEnvelopeV1,
  parseCanonicalPoiDatasetV1,
  parseCanonicalPoiV1,
  projectCanonicalPoiToPlanningV1,
  shoppingFoodEntertainmentPoiFixture,
  templePoiFixture,
  temporarilyClosedPoiFixture,
  permanentlyClosedPoiFixture,
  urbanAttractionPoiFixture,
  onsenPoiFixture,
} from "../src/shared/contracts/poi/index.ts";

const clone = (value) => structuredClone(value);
const firstCode = (result) => (result.ok ? null : result.issues[0]?.code);
const admissionReasonCodes = (result) =>
  result.ok ? result.value.gates.flatMap(({ reasonCodes }) => reasonCodes) : [];

test("canonical positive fixtures cover every required POI shape", () => {
  for (const fixture of canonicalPoiPositiveFixtures)
    assert.equal(parseCanonicalPoiV1(fixture).ok, true, fixture.internalId);
  assert.equal(parseCanonicalPoiDatasetV1(canonicalPoiDatasetFixture).ok, true);
  assert.equal(urbanAttractionPoiFixture.regionRelations.length, 2);
  assert.equal(urbanAttractionPoiFixture.accessAnchors.length, 1);
  assert.equal(urbanAttractionPoiFixture.visitProfiles.length, 0);
  assert.equal(templePoiFixture.visitProfiles.length, 1);
  assert.equal(templePoiFixture.classification.primary, "religious_historic");
  assert.equal(naturePoiFixture.classification.primary, "nature");
  assert.equal(onsenPoiFixture.classification.primary, "experience");
  assert.equal(
    shoppingFoodEntertainmentPoiFixture.classification.primary,
    "shopping",
  );
  assert.equal(
    temporarilyClosedPoiFixture.lifecycle.status,
    "temporarily_closed",
  );
  assert.equal(
    permanentlyClosedPoiFixture.lifecycle.status,
    "permanently_closed",
  );
  assert.equal(mergedDuplicatePoiFixture.lifecycle.status, "merged");
  assert.ok(
    Object.values(naturePoiFixture.features.values).filter(
      (value) => value === null,
    ).length > 30,
  );
});

test("fixture POI Master Codes reuse and pass the canonical registry grammar", () => {
  const parsed = parseMasterCodeRegistryV1(
    candidateAdmissionContextFixture.masterCodeRegistry,
  );
  assert.equal(parsed.ok, true);
  const allocations = new Map(
    parsed.value.entries.map((entry) => [entry.masterCode, entry]),
  );
  for (const poi of canonicalPoiPositiveFixtures) {
    if (poi.masterCode === null) continue;
    const entry = allocations.get(poi.masterCode);
    assert.equal(entry?.entityRef, poi.internalId);
    assert.equal(entry?.entityType, `poi.${poi.classification.primary}`);
  }
});

test("all fixture Region identities resolve to the merged Region Graph", () => {
  const graph = JSON.parse(
    readFileSync("docs/qa/TASK-041/region-nodes.json", "utf8"),
  );
  const ids = new Set(graph.nodes.map(({ regionId }) => regionId));
  for (const poi of canonicalPoiPositiveFixtures)
    for (const { regionRef } of poi.regionRelations)
      assert.ok(ids.has(regionRef), `${poi.internalId}:${regionRef}`);
});

test("canonical parsing is a deterministic JSON round-trip", () => {
  const first = parseCanonicalPoiV1(templePoiFixture);
  assert.equal(first.ok, true);
  const second = parseCanonicalPoiV1(JSON.parse(JSON.stringify(first.value)));
  assert.deepEqual(second, first);
});

test("canonical POI projects deterministically to the existing Planning contract", () => {
  const first = projectCanonicalPoiToPlanningV1(templePoiFixture);
  const second = projectCanonicalPoiToPlanningV1(templePoiFixture);
  assert.equal(first.ok, true);
  assert.deepEqual(second, first);
  assert.equal(parsePoiPlanningProjectionV1(first.value).ok, true);
  assert.equal(first.value.poiRef, templePoiFixture.internalId);
  assert.deepEqual(first.value.featureSet, templePoiFixture.features);
  assert.deepEqual(
    first.value.regionRefs,
    templePoiFixture.regionRelations.map(({ regionRef }) => regionRef),
  );
  assert.deepEqual(
    first.value.factRefs,
    templePoiFixture.facts.map(({ factId }) => factId),
  );
});

test("candidate admission admits only after every gate passes", () => {
  const result = evaluateCandidateAdmissionV1(
    admittedCandidateFixture,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "ADMIT");
  assert.equal(
    result.value.canonicalPoiRef,
    urbanAttractionPoiFixture.internalId,
  );
  assert.ok(result.value.gates.every(({ status }) => status === "PASS"));
  assert.equal(JSON.stringify(result.value).includes("providerPhoto"), false);
  assert.equal(JSON.stringify(result.value).includes("providerRaw"), false);
});

test("resolved duplicate returns MERGE_TARGET and never canonicalizes the candidate", () => {
  const result = evaluateCandidateAdmissionV1(
    mergeTargetCandidateFixture,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "MERGE_TARGET");
  assert.equal(result.value.canonicalPoiRef, null);
  assert.equal(result.value.mergeTargetPoiRef, templePoiFixture.internalId);
});

test("all five admission outcomes are deterministic", () => {
  const review = clone(admittedCandidateFixture);
  review.candidate.proposedCanonical.masterCode = null;
  const reviewed = evaluateCandidateAdmissionV1(
    review,
    candidateAdmissionContextFixture,
  );
  assert.equal(reviewed.ok, true);
  assert.equal(reviewed.value.state, "REVIEW_REQUIRED");
  assert.equal(reviewed.value.canonicalPoiRef, null);

  const insufficient = clone(admittedCandidateFixture);
  insufficient.candidate.identityResolution.status = "unresolved";
  insufficient.candidate.identityResolution.resolvedPoiRef = null;
  const missing = evaluateCandidateAdmissionV1(
    insufficient,
    candidateAdmissionContextFixture,
  );
  assert.equal(missing.ok, true);
  assert.equal(missing.value.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(missing.value.canonicalPoiRef, null);
});

test("negative: duplicate internal ID fails closed", () => {
  const dataset = clone(canonicalPoiDatasetFixture);
  dataset.records.push(clone(dataset.records[0]));
  assert.equal(
    firstCode(parseCanonicalPoiDatasetV1(dataset)),
    "DUPLICATE_INTERNAL_ID",
  );
});

test("negative: duplicate active Master Code fails closed", () => {
  const dataset = clone(canonicalPoiDatasetFixture);
  dataset.records[1].masterCode = dataset.records[0].masterCode;
  assert.equal(
    firstCode(parseCanonicalPoiDatasetV1(dataset)),
    "DUPLICATE_ACTIVE_MASTER_CODE",
  );
});

test("negative: Master Code outside POI namespace fails closed", () => {
  const poi = clone(urbanAttractionPoiFixture);
  poi.masterCode = "80001";
  assert.equal(
    firstCode(parseCanonicalPoiV1(poi)),
    "MASTER_CODE_OUTSIDE_POI_NAMESPACE",
  );
});

test("negative: candidateKey or Provider ID cannot become canonical identity", () => {
  const envelope = clone(admittedCandidateFixture);
  envelope.candidate.providerObservations[0].providerId =
    envelope.candidate.proposedCanonical.internalId;
  const result = evaluateCandidateAdmissionV1(
    envelope,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "BLOCKED");
  assert.ok(
    admissionReasonCodes(result).includes("NON_CANONICAL_ID_SUBSTITUTED"),
  );

  const malformed = clone(admittedCandidateFixture);
  malformed.candidate.proposedCanonical.internalId =
    malformed.candidate.candidateKey;
  assert.equal(
    firstCode(parseCandidateAdmissionEnvelopeV1(malformed)),
    "INVALID_CANONICAL_POI_ID",
  );
});

test("negative: unresolved Region blocks admission", () => {
  const envelope = clone(admittedCandidateFixture);
  envelope.candidate.proposedCanonical.regionRelations[0].regionRef =
    "region-not-merged";
  const result = evaluateCandidateAdmissionV1(
    envelope,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "BLOCKED");
  assert.ok(admissionReasonCodes(result).includes("UNRESOLVED_REGION_REF"));
});

test("negative: invalid lifecycle and merge target fail closed", () => {
  const poi = clone(mergedDuplicatePoiFixture);
  poi.lifecycle.mergedIntoPoiRef = null;
  assert.equal(firstCode(parseCanonicalPoiV1(poi)), "INVALID_MERGE_TARGET");
});

test("negative: missing 43D key and out-of-range value fail closed", () => {
  const missing = clone(naturePoiFixture);
  delete missing.features.values["43"];
  assert.equal(
    firstCode(parseCanonicalPoiV1(missing)),
    "INCOMPLETE_FEATURE_VECTOR",
  );
  const outOfRange = clone(naturePoiFixture);
  outOfRange.features.values["01"] = 10;
  assert.equal(firstCode(parseCanonicalPoiV1(outOfRange)), "INVALID_NUMBER");
});

for (const coercedValue of [0, 5])
  test(`negative: unknown 43D value cannot be coerced to ${coercedValue}`, () => {
    const envelope = clone(admittedCandidateFixture);
    envelope.candidate.featureEvidence[0].proposedValue = coercedValue;
    envelope.candidate.proposedCanonical.features.values["01"] = coercedValue;
    const result = evaluateCandidateAdmissionV1(
      envelope,
      candidateAdmissionContextFixture,
    );
    assert.equal(result.ok, true);
    assert.equal(result.value.state, "BLOCKED");
    assert.ok(admissionReasonCodes(result).includes("UNKNOWN_FEATURE_COERCED"));
  });

test("negative: invalid Visit Profile duration order fails closed", () => {
  const poi = clone(templePoiFixture);
  poi.visitProfiles[0].minimumDurationMinutes = 90;
  poi.visitProfiles[0].recommendedDurationMinutes = 60;
  assert.equal(firstCode(parseCanonicalPoiV1(poi)), "INVALID_DURATION_ORDER");
});

test("negative: exact timetable/live fact cannot enter static POI master", () => {
  const poi = clone(urbanAttractionPoiFixture);
  poi.facts.push({
    ...clone(poi.facts[0]),
    factId: "fact:live-timetable",
    factKind: "transport_timetable",
  });
  assert.equal(
    firstCode(parseCanonicalPoiV1(poi)),
    "LIVE_FACT_FORBIDDEN_IN_STATIC_MASTER",
  );
  const fare = clone(urbanAttractionPoiFixture);
  fare.facts[0].liveFare = 500;
  assert.equal(firstCode(parseCanonicalPoiV1(fare)), "UNKNOWN_FIELD");
});

test("negative: dangling source/evidence refs fail closed", () => {
  const poi = clone(urbanAttractionPoiFixture);
  poi.features.sourceRefs = ["source:missing"];
  assert.equal(firstCode(parseCanonicalPoiV1(poi)), "DANGLING_SOURCE_REF");

  const envelope = clone(admittedCandidateFixture);
  envelope.candidate.evidenceRefs = ["evidence:missing"];
  const result = evaluateCandidateAdmissionV1(
    envelope,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "BLOCKED");
  assert.ok(admissionReasonCodes(result).includes("DANGLING_EVIDENCE_REF"));
});

test("negative: Provider raw payload is rejected as an unknown field", () => {
  const envelope = clone(admittedCandidateFixture);
  envelope.candidate.providerObservations[0].providerRaw = { payload: true };
  assert.equal(
    firstCode(parseCandidateAdmissionEnvelopeV1(envelope)),
    "UNKNOWN_FIELD",
  );
});

test("negative: restricted/transient Provider field cannot be persistent", () => {
  const envelope = clone(admittedCandidateFixture);
  envelope.candidate.providerObservations[0].fields[1].persistenceIntent =
    "canonical";
  const result = evaluateCandidateAdmissionV1(
    envelope,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "BLOCKED");
  assert.ok(
    admissionReasonCodes(result).includes("PERSISTENCE_RIGHTS_VIOLATION"),
  );
});

test("negative: unresolved identity conflict is never silently admitted", () => {
  const envelope = clone(admittedCandidateFixture);
  envelope.candidate.materialConflicts = [
    {
      conflictId: "conflict:identity",
      fieldPath: "identity",
      evidenceRefs: ["evidence:identity"],
      disposition: "unresolved",
    },
  ];
  const result = evaluateCandidateAdmissionV1(
    envelope,
    candidateAdmissionContextFixture,
  );
  assert.equal(result.ok, true);
  assert.equal(result.value.state, "BLOCKED");
  assert.ok(
    admissionReasonCodes(result).includes("MATERIAL_CONFLICT_UNRESOLVED"),
  );
});

test("negative: missing 43D prevents Planning projection without inventing defaults", () => {
  const poi = clone(urbanAttractionPoiFixture);
  poi.features = null;
  const result = projectCanonicalPoiToPlanningV1(poi);
  assert.equal(result.ok, false);
  assert.equal(firstCode(result), "FEATURE_SET_REQUIRED_FOR_PLANNING");
});
