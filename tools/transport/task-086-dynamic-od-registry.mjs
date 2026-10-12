import { publicOkushiriFacilityCandidate } from "./task-086-okushiri-od-facility.mjs";
import { loadCapabilityContextInputs } from "./task-086-od-capability-inputs.mjs";
import {
  loadQualifiedHotelInputs,
  loadQualifiedContextInputs,
} from "./task-086-qualified-inputs.mjs";
import { loadOfficialBusFacilityInputs } from "./task-086-official-facility-bus-registry.mjs";
import fs from "node:fs";
import path from "node:path";
import {
  canonical,
  hash,
  id,
  invariant,
  exactRecordMap,
  dynamicOD,
} from "./task-086-model.mjs";
import {
  publicODOfficeCandidate,
  publicAguniOfficeCandidate,
  publicODHospitalCandidate,
} from "./task-086-public-od-facility.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "./task-086-source-actions.mjs";
export const OD_REGISTRY_FILE = "dynamic-od-services.jsonl";
export const FACILITY_REGISTRY_FILE = "public-od-facility-registry.json";
export const FACILITY_INPUT_FILE = "research/public-od-facilities.v1.json";
const parseRows = (b) =>
  b.toString("utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
function inputPath(base, relative) {
  invariant(
    typeof relative === "string" &&
      !relative.includes("\\") &&
      !relative.includes(":") &&
      !path.posix.isAbsolute(relative) &&
      path.posix.normalize(relative) === relative &&
      !relative.split("/").includes(".."),
    "OD_INPUT_PATH_INVALID",
  );
  return path.join(base, relative);
}
export function loadODFacilityInputs(base, sources, evidence, actions) {
  const busFacilities = loadOfficialBusFacilityInputs(
    base,
    sources,
    evidence,
    actions,
  );
  const hotelFacilities = loadQualifiedHotelInputs(
    base,
    sources,
    evidence,
    actions,
  );
  for (const key of ["candidates", "nativeFacilityByAnchor"])
    for (const [anchor, value] of hotelFacilities[key]) {
      invariant(
        !busFacilities[key].has(anchor),
        "QUALIFIED_FACILITY_COLLISION",
      );
      busFacilities[key].set(anchor, value);
    }
  busFacilities.inputPaths.push(...hotelFacilities.inputPaths);
  const configPath = path.join(base, FACILITY_INPUT_FILE);
  if (!fs.existsSync(configPath))
    return {
      nativeFacilityByAnchor: busFacilities.nativeFacilityByAnchor,
      candidates: busFacilities.candidates,
      inputPaths: busFacilities.inputPaths,
    };
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  invariant(
    config.schemaVersion === 1 && Array.isArray(config.facilities),
    "OD_FACILITY_INPUT_SCHEMA",
  );
  const nativeFacilityByAnchor = new Map(busFacilities.nativeFacilityByAnchor),
    candidates = new Map(busFacilities.candidates),
    inputPaths = [FACILITY_INPUT_FILE, ...busFacilities.inputPaths];
  for (const entry of config.facilities) {
    const current = evidence.get(entry.currentEndpointEvidenceRef)?.record;
    invariant(current, "OD_CURRENT_ENDPOINT_RECORD_MISSING");
    const probe = {
      ...current,
      factId: current.factId ?? "public-od-current-endpoints",
    };
    reviewedFactAction(probe, actions);
    validateCorroboratingEvidence(probe, actions);
    invariant(
      entry.facilityKind === undefined ||
        entry.facilityKind === "P04_HOSPITAL" ||
        entry.facilityKind === "AGUNI_P05_OFFICE" ||
        entry.facilityKind === "OKUSHIRI_P05_FACILITY",
      "OD_UNSUPPORTED_FACILITY_KIND",
    );
    const factory =
      entry.facilityKind === "OKUSHIRI_P05_FACILITY"
        ? publicOkushiriFacilityCandidate
        : entry.facilityKind === "AGUNI_P05_OFFICE"
          ? publicAguniOfficeCandidate
          : entry.facilityKind === "P04_HOSPITAL"
            ? publicODHospitalCandidate
            : publicODOfficeCandidate;
    const result = factory({
      ...(entry.facilityKind === "P04_HOSPITAL"
        ? { gmlBytes: fs.readFileSync(inputPath(base, entry.gmlPath)) }
        : {}),
      archiveBytes: fs.readFileSync(inputPath(base, entry.archivePath)),
      memberBytes: fs.readFileSync(inputPath(base, entry.memberPath)),
      review: entry.review,
      currentEndpointEvidenceRef: entry.currentEndpointEvidenceRef,
      nativeIdentityEvidenceRef: entry.nativeIdentityEvidenceRef,
      sources,
      evidence,
    });
    for (const [anchor, value] of result.nativeFacilityByAnchor) {
      invariant(
        !nativeFacilityByAnchor.has(anchor),
        "OD_DUPLICATE_NATIVE_FACILITY",
      );
      nativeFacilityByAnchor.set(anchor, value);
      candidates.set(anchor, result.candidate);
    }
    inputPaths.push(
      entry.archivePath,
      entry.memberPath,
      ...(entry.facilityKind === "P04_HOSPITAL" ? [entry.gmlPath] : []),
      ...entry.sourcePackagePaths,
    );
  }
  for (const p of inputPaths) inputPath(base, p);
  return {
    nativeFacilityByAnchor,
    candidates,
    inputPaths: [...new Set(inputPaths)],
  };
}
export function readODRegistry(base) {
  const file = path.join(base, OD_REGISTRY_FILE);
  return exactRecordMap(
    fs.existsSync(file) ? parseRows(fs.readFileSync(file)) : [],
    "odId",
    "DYNAMIC_OD",
  );
}
export function loadPublishedODContext(
  base,
  { sources, evidence, nodes, patternById, actions },
) {
  const facilities = loadODFacilityInputs(base, sources, evidence, actions),
    dynamicODById = readODRegistry(base),
    persisted = path.join(base, FACILITY_REGISTRY_FILE);
  invariant(
    !facilities.nativeFacilityByAnchor.size ||
      (fs.existsSync(persisted) &&
        canonical(JSON.parse(fs.readFileSync(persisted, "utf8"))) ===
          canonical([...facilities.nativeFacilityByAnchor].sort())),
    "OD_NATIVE_REGISTRY_NOT_PERSISTED_OR_CHANGED",
  );
  const expected = new Map();
  for (const name of fs
    .readdirSync(path.join(base, "research/phases"))
    .filter((n) => n.endsWith(".json"))) {
    const phase = JSON.parse(
      fs.readFileSync(path.join(base, "research/phases", name), "utf8"),
    );
    for (const fact of phase.facts ?? [])
      if (fact.kind === "dynamic_od")
        expected.set(id("od", [phase.phaseId, fact.factId]), fact);
  }
  invariant(
    expected.size === dynamicODById.size,
    "OD_PHASE_REGISTRY_CARDINALITY",
  );
  const context = {
    sources,
    evidence,
    nodes,
    patternById,
    dynamicODById,
    nativeFacilityByAnchor: facilities.nativeFacilityByAnchor,
  };
  for (const [key, fact] of expected) {
    reviewedFactAction(fact, actions);
    validateCorroboratingEvidence(fact, actions);
    for (const observation of fact.conditionObservations ?? []) {
      reviewedFactAction(
        { ...observation, factId: fact.factId + ":" + observation.conditionId },
        actions,
      );
      validateCorroboratingEvidence(observation, actions);
    }
    const od = dynamicODById.get(key);
    invariant(
      od &&
        canonical(evidence.get(od.sourceFactRef)?.record) === canonical(fact),
      "OD_PHASE_RAW_REGISTRY_MISMATCH",
    );
    dynamicOD.validateRecord(od, context);
  }
  return { ...context, facilityCandidates: facilities.candidates };
}
export function attachODContexts(contexts, validation) {
  const contractHashes = new Set(
    [...validation.patternById.values()]
      .filter((p) => p.accessContract)
      .map((p) => hash(p.accessContract)),
  );
  // A flight-only context cannot unlock an edge until its accepted contract exists.
  // Preserve mixed mechanisms and legacy contexts without explicit accepted hashes.
  const isFixedFlightOnly = (c) =>
    !c.odReservationIntents &&
    !c.onboardIntents &&
    Array.isArray(c.reservationIntents) &&
    c.reservationIntents.length > 0 &&
    c.reservationIntents.every(
      (i) =>
        typeof i?.flightServicePatternId === "string" &&
        i.flightServicePatternId.length > 0,
    ) &&
    Array.isArray(c.acceptedContracts) &&
    c.acceptedContracts.length > 0;
  // Defer only wholly future capability pairs: no registered OD and no resolved
  // evidence exists yet. Partial or stripped admitted registries stay visible to
  // the unchanged full-registry assertion in public structural assessment.
  const resolvedODIds = new Set(
    [...validation.evidence.values()]
      .map((e) => e.record)
      .filter((r) => r?.kind === "dynamic_od" && r.odId && r.sourceFactRef)
      .map((r) => r.odId),
  );
  const isWhollyFutureCapability = (c) => {
    const ids = c.capabilityReview?.odIds;
    return (
      c.kind === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY" &&
      Array.isArray(ids) &&
      ids.length === 2 &&
      new Set(ids).size === 2 &&
      ids.every((id) => typeof id === "string" && id.length > 0) &&
      ids.every(
        (id) => !validation.dynamicODById.has(id) && !resolvedODIds.has(id),
      )
    );
  };
  const eligible = contexts.filter(
    (c) =>
      !isWhollyFutureCapability(c) &&
      (!c.airPassengerIntents ||
        (Array.isArray(c.airPassengerIntents) &&
          c.airPassengerIntents.length > 0 &&
          c.airPassengerIntents.every((i) =>
            contractHashes.has(i.contractSha256),
          ))) &&
      !(
        isFixedFlightOnly(c) &&
        !c.acceptedContracts.some((h) => contractHashes.has(h))
      ) &&
      (!c.onboardIntents ||
        (Array.isArray(c.onboardIntents) &&
          c.onboardIntents.length > 0 &&
          c.onboardIntents.every((i) =>
            contractHashes.has(i.contractSha256),
          ))) &&
      (!c.odReservationIntents ||
        (Array.isArray(c.odReservationIntents) &&
          c.odReservationIntents.length > 0 &&
          c.odReservationIntents.every((i) =>
            validation.dynamicODById.has(i.odId),
          ))),
  );
  if (
    !eligible.some(
      (c) =>
        (c.publicStructureOnly === false && c.eligibilityKeys?.length) ||
        c.kind === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY" ||
        c.odReservationIntents ||
        c.onboardIntents ||
        c.reservationIntents?.some((i) => i.flightServicePatternId),
    )
  )
    return eligible;
  const evidenceContextSha256 = hash({
    sources: [...validation.sources].sort(),
    evidence: [...validation.evidence].sort(),
    nodes: [...validation.nodes].sort(),
    patterns: [...validation.patternById].sort(),
    dynamicOD: [...validation.dynamicODById].sort(),
    nativeFacilities: [...validation.nativeFacilityByAnchor].sort(),
  });
  return eligible.map((c) =>
    (c.publicStructureOnly === false && c.eligibilityKeys?.length) ||
    c.kind === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY" ||
    c.odReservationIntents ||
    c.onboardIntents ||
    c.reservationIntents?.some((i) => i.flightServicePatternId)
      ? { ...c, evidenceContextSha256, odValidationContext: validation }
      : c,
  );
}

export const CONDITIONAL_CONTEXT_INPUT_FILE =
  "research/public-conditional-contexts.v1.json";
export function loadConditionalContextInputs(base, supplied) {
  const lodging = loadQualifiedContextInputs(base),
    capability = loadCapabilityContextInputs(base);
  const qualified = {
    contexts: [...lodging.contexts, ...capability.contexts],
    inputPaths: [...lodging.inputPaths, ...capability.inputPaths],
  };
  const file = path.join(base, CONDITIONAL_CONTEXT_INPUT_FILE);
  if (!fs.existsSync(file)) {
    invariant(
      supplied === undefined ||
        (Array.isArray(supplied) &&
          canonical(supplied) === canonical(qualified.contexts)),
      "PUBLIC_CONTEXT_MUST_BE_PERSISTED_INPUT",
    );
    return { contexts: qualified.contexts, inputPaths: qualified.inputPaths };
  }
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  invariant(
    config.schemaVersion === 1 && Array.isArray(config.contexts),
    "PUBLIC_CONTEXT_INPUT_SCHEMA",
  );
  invariant(
    config.contexts.every(
      (c) =>
        c?.kind === "EXPLICIT_CONDITIONAL_PLANNING" &&
        c.publicStructureOnly === true &&
        !Object.hasOwn(c, "odValidationContext") &&
        !Object.hasOwn(c, "evidenceContextSha256"),
    ),
    "PUBLIC_CONTEXT_NO_EMBEDDED_TRUST_REGISTRY",
  );
  invariant(
    supplied === undefined ||
      canonical(supplied) ===
        canonical([...config.contexts, ...qualified.contexts]),
    "PUBLIC_CONTEXT_RUNTIME_OVERRIDE_FORBIDDEN",
  );
  return {
    contexts: [...config.contexts, ...qualified.contexts],
    inputPaths: [CONDITIONAL_CONTEXT_INPUT_FILE, ...qualified.inputPaths],
  };
}
