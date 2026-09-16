import {
  AI_COMPACT_OPERATION_CODES,
  AI_CONTEXT_EXPANSION_CODES,
  AI_DECISION_STATUSES,
  AI_TASK_TYPES,
  type AiCompactContextV1,
  type AiCompactOpV1,
  type AiDecisionPayloadV1,
  type AiDecisionResponseV1,
  type AiDecisionValidationContext,
} from "./ai";
import {
  CANDIDATE_STAGES,
  CANDIDATE_STATUSES,
  type CandidateRunV1,
} from "./candidates";
import {
  CONSTRAINT_GATE_STATUSES,
  FEASIBILITY_STATUSES,
  PLANNING_CONTRACT_VERSION,
  type PlanningValidationResult,
} from "./common";
import {
  DECISION_USES,
  FACT_KINDS,
  FACT_USABILITY_ACTIONS,
  FRESHNESS_STATES,
  SOURCE_KINDS,
  type FactUsabilityV1,
  type PlanningFactRefV1,
} from "./facts";
import {
  POI_FEATURE_CODES,
  type EffectivePreferenceV1,
  type PoiFeatureSetV1,
  type SparsePreferenceV1,
} from "./features";
import type { PoiPlanningProjectionV1, PoiVisitProfileV1 } from "./poi";
import { REPLAN_SCOPES, type ReplanProposalV1 } from "./replanning";
import {
  REGION_RELATION_TYPES,
  REGION_TYPES,
  type TravelRegionGraphV1,
} from "./regions";
import {
  SCORE_COMPONENTS,
  type FeasibilityResultV1,
  type PlanningScoreSetV1,
} from "./scoring";
import type { DecisionRunV1 } from "./trace";

class InvalidPlanningContract extends Error {
  readonly path: string;
  readonly code: string;
  constructor(path: string, code: string) {
    super(code);
    this.path = path;
    this.code = code;
  }
}

function fail(path: string, code: string): never {
  throw new InvalidPlanningContract(path, code);
}

function parse<T>(
  input: unknown,
  validator: (value: unknown, path: string) => void,
) {
  try {
    validator(input, "$");
    return { ok: true, value: structuredClone(input) as T } as const;
  } catch (error) {
    if (error instanceof InvalidPlanningContract)
      return {
        ok: false,
        issue: { path: error.path, code: error.code },
      } as const;
    return {
      ok: false,
      issue: { path: "$", code: "INVALID_JSON_VALUE" },
    } as const;
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail(path, "INVALID_OBJECT");
  return value as Record<string, unknown>;
}

function exact(value: unknown, path: string, keys: readonly string[]) {
  const item = record(value, path);
  const actual = Object.keys(item);
  if (actual.some((key) => !keys.includes(key))) fail(path, "UNKNOWN_FIELD");
  for (const key of keys)
    if (!Object.hasOwn(item, key)) fail(`${path}.${key}`, "MISSING_FIELD");
  return item;
}

function text(value: unknown, path: string, max = 200, nullable = false) {
  if (nullable && value === null) return;
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length === 0 ||
    value.length > max ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    fail(path, "INVALID_STRING");
}

function id(value: unknown, path: string, nullable = false) {
  text(value, path, 160, nullable);
  if (value !== null && /\s/.test(value as string)) fail(path, "INVALID_ID");
}

function enumValue(value: unknown, path: string, values: readonly string[]) {
  if (typeof value !== "string" || !values.includes(value))
    fail(path, "UNSUPPORTED_VALUE");
}

function numberValue(
  value: unknown,
  path: string,
  min: number,
  max: number,
  nullable = false,
  integer = false,
) {
  if (nullable && value === null) return;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isSafeInteger(value))
  )
    fail(path, integer ? "INVALID_INTEGER" : "INVALID_NUMBER");
}

function booleanValue(value: unknown, path: string) {
  if (typeof value !== "boolean") fail(path, "INVALID_BOOLEAN");
}

function array(value: unknown, path: string, max = 10_000) {
  if (!Array.isArray(value) || value.length > max) fail(path, "INVALID_ARRAY");
  return value;
}

function strings(value: unknown, path: string, max = 1000) {
  const values = array(value, path, max);
  values.forEach((entry, index) => text(entry, `${path}[${index}]`, 160));
  if (new Set(values).size !== values.length) fail(path, "DUPLICATE_ID");
}

function ids(value: unknown, path: string, max = 1000) {
  const values = array(value, path, max);
  values.forEach((entry, index) => id(entry, `${path}[${index}]`));
  if (new Set(values).size !== values.length) fail(path, "DUPLICATE_ID");
}

function instant(value: unknown, path: string, nullable = false) {
  if (nullable && value === null) return;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    fail(path, "INVALID_INSTANT");
}

function version(value: unknown, path: string) {
  if (value !== PLANNING_CONTRACT_VERSION) fail(path, "UNSUPPORTED_VERSION");
}

function nullableScore(value: unknown, path: string) {
  numberValue(value, path, 0, 1, true);
}

function uniqueNumbers(value: unknown, path: string) {
  const values = array(value, path, 1000);
  values.forEach((entry, index) =>
    numberValue(entry, `${path}[${index}]`, 0, 1_000_000, false, true),
  );
  if (new Set(values).size !== values.length) fail(path, "DUPLICATE_ID");
  return values as number[];
}

function validateFeatureValues(value: unknown, path: string, min: number) {
  const values = record(value, path);
  const actual = Object.keys(values);
  if (actual.length !== POI_FEATURE_CODES.length)
    fail(path, "INCOMPLETE_FEATURE_VECTOR");
  if (actual.some((key) => !POI_FEATURE_CODES.includes(key as never)))
    fail(path, "UNKNOWN_FEATURE_CODE");
  for (const code of POI_FEATURE_CODES) {
    if (!Object.hasOwn(values, code))
      fail(`${path}.${code}`, "MISSING_FEATURE_CODE");
    numberValue(values[code], `${path}.${code}`, min, 9, min === 0);
  }
}

function validateFeatureSet(value: unknown, path: string) {
  const item = exact(value, path, [
    "contractVersion",
    "featureVersion",
    "poiRef",
    "values",
    "sourceRefs",
    "confidence",
    "updatedAt",
  ]);
  version(item.contractVersion, `${path}.contractVersion`);
  if (item.featureVersion !== "1.0")
    fail(`${path}.featureVersion`, "UNSUPPORTED_VERSION");
  id(item.poiRef, `${path}.poiRef`);
  validateFeatureValues(item.values, `${path}.values`, 0);
  ids(item.sourceRefs, `${path}.sourceRefs`);
  nullableScore(item.confidence, `${path}.confidence`);
  instant(item.updatedAt, `${path}.updatedAt`);
}

export const parsePoiFeatureSetV1 = (
  input: unknown,
): PlanningValidationResult<PoiFeatureSetV1> =>
  parse(input, validateFeatureSet);

export const parseEffectivePreferenceV1 = (
  input: unknown,
): PlanningValidationResult<EffectivePreferenceV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "preferenceVersion",
      "snapshotRef",
      "overrideRevision",
      "values",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    if (item.preferenceVersion !== "1.0")
      fail(`${path}.preferenceVersion`, "UNSUPPORTED_VERSION");
    id(item.snapshotRef, `${path}.snapshotRef`);
    numberValue(
      item.overrideRevision,
      `${path}.overrideRevision`,
      0,
      Number.MAX_SAFE_INTEGER,
      false,
      true,
    );
    validateFeatureValues(item.values, `${path}.values`, 1);
  });

function validateSparsePreference(value: unknown, path: string) {
  const item = exact(value, path, ["version", "entries"]);
  if (item.version !== "1") fail(`${path}.version`, "UNSUPPORTED_VERSION");
  const entries = array(item.entries, `${path}.entries`, 43);
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== 2)
      fail(`${path}.entries[${index}]`, "INVALID_TUPLE");
    const [code, preference] = entry;
    if (!POI_FEATURE_CODES.includes(code as never))
      fail(`${path}.entries[${index}][0]`, "UNKNOWN_FEATURE_CODE");
    numberValue(preference, `${path}.entries[${index}][1]`, 1, 9, false, true);
    if (preference === 5)
      fail(`${path}.entries[${index}][1]`, "COMPACT_NEUTRAL_MUST_BE_OMITTED");
    if (seen.has(code as string))
      fail(`${path}.entries`, "DUPLICATE_FEATURE_CODE");
    seen.add(code as string);
  });
}

export const parseSparsePreferenceV1 = (
  input: unknown,
): PlanningValidationResult<SparsePreferenceV1> =>
  parse(input, validateSparsePreference);

function validateVisitProfile(value: unknown, path: string) {
  const item = exact(value, path, [
    "contractVersion",
    "profileVersion",
    "profileId",
    "poiRef",
    "visitMode",
    "status",
    "minimumDurationMinutes",
    "recommendedDurationMinutes",
    "maximumUsefulDurationMinutes",
    "fixedWalkingLoad",
    "variableWalkingLoad",
    "fixedPhysicalLoad",
    "variablePhysicalLoad",
    "terrainModifier",
    "standingModifier",
    "sourceRefs",
    "confidence",
    "updatedAt",
  ]);
  version(item.contractVersion, `${path}.contractVersion`);
  if (item.profileVersion !== "1.0")
    fail(`${path}.profileVersion`, "UNSUPPORTED_VERSION");
  id(item.profileId, `${path}.profileId`);
  id(item.poiRef, `${path}.poiRef`);
  text(item.visitMode, `${path}.visitMode`, 64);
  enumValue(item.status, `${path}.status`, ["active", "deprecated"]);
  for (const key of [
    "minimumDurationMinutes",
    "recommendedDurationMinutes",
    "maximumUsefulDurationMinutes",
  ])
    numberValue(item[key], `${path}.${key}`, 0, 10_080, true, true);
  const min = item.minimumDurationMinutes as number | null;
  const recommended = item.recommendedDurationMinutes as number | null;
  const max = item.maximumUsefulDurationMinutes as number | null;
  if (
    (min !== null && recommended !== null && min > recommended) ||
    (recommended !== null && max !== null && recommended > max) ||
    (min !== null && max !== null && min > max)
  )
    fail(path, "INVALID_DURATION_ORDER");
  for (const key of [
    "fixedWalkingLoad",
    "variableWalkingLoad",
    "fixedPhysicalLoad",
    "variablePhysicalLoad",
    "terrainModifier",
    "standingModifier",
  ])
    numberValue(item[key], `${path}.${key}`, 0, 9, true);
  ids(item.sourceRefs, `${path}.sourceRefs`);
  nullableScore(item.confidence, `${path}.confidence`);
  instant(item.updatedAt, `${path}.updatedAt`);
}

export const parsePoiVisitProfileV1 = (
  input: unknown,
): PlanningValidationResult<PoiVisitProfileV1> =>
  parse(input, validateVisitProfile);

export const parsePoiPlanningProjectionV1 = (
  input: unknown,
): PlanningValidationResult<PoiPlanningProjectionV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "poiRef",
      "featureSet",
      "visitProfiles",
      "regionRefs",
      "factRefs",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    id(item.poiRef, `${path}.poiRef`);
    validateFeatureSet(item.featureSet, `${path}.featureSet`);
    const featureSet = record(item.featureSet, `${path}.featureSet`);
    if (featureSet.poiRef !== item.poiRef)
      fail(`${path}.featureSet.poiRef`, "POI_REF_MISMATCH");
    const profiles = array(item.visitProfiles, `${path}.visitProfiles`, 100);
    profiles.forEach((profile, index) => {
      const profilePath = `${path}.visitProfiles[${index}]`;
      validateVisitProfile(profile, profilePath);
      if (record(profile, profilePath).poiRef !== item.poiRef)
        fail(`${profilePath}.poiRef`, "POI_REF_MISMATCH");
    });
    const profileIds = profiles.map(
      (profile) => record(profile, path).profileId,
    );
    if (new Set(profileIds).size !== profileIds.length)
      fail(`${path}.visitProfiles`, "DUPLICATE_ID");
    ids(item.regionRefs, `${path}.regionRefs`);
    ids(item.factRefs, `${path}.factRefs`);
  });

function validateRange(value: unknown, path: string, integer = false) {
  const item = exact(value, path, ["low", "typical", "high"]);
  for (const key of ["low", "typical", "high"])
    numberValue(
      item[key],
      `${path}.${key}`,
      0,
      Number.MAX_SAFE_INTEGER,
      true,
      integer,
    );
  const values = [item.low, item.typical, item.high] as (number | null)[];
  const known = values.filter((entry): entry is number => entry !== null);
  if (known.some((entry, index) => index > 0 && entry < known[index - 1]!))
    fail(path, "INVALID_RANGE_ORDER");
}

export const parseTravelRegionGraphV1 = (
  input: unknown,
): PlanningValidationResult<TravelRegionGraphV1> =>
  parse(input, (value, path) => {
    const graph = exact(value, path, [
      "contractVersion",
      "graphSchemaVersion",
      "graphDataRevision",
      "nodes",
      "relations",
      "travelEdges",
    ]);
    version(graph.contractVersion, `${path}.contractVersion`);
    if (graph.graphSchemaVersion !== "1.0")
      fail(`${path}.graphSchemaVersion`, "UNSUPPORTED_VERSION");
    text(graph.graphDataRevision, `${path}.graphDataRevision`, 160);
    const nodes = array(graph.nodes, `${path}.nodes`, 10_000);
    const nodeIds = new Set<string>();
    nodes.forEach((node, index) => {
      const p = `${path}.nodes[${index}]`;
      const item = exact(node, p, [
        "contractVersion",
        "schemaVersion",
        "regionId",
        "masterCode",
        "regionType",
        "names",
        "center",
        "geometryRef",
        "geometryKind",
        "gatewayProfile",
        "sourceRefs",
        "revision",
      ]);
      version(item.contractVersion, `${p}.contractVersion`);
      if (item.schemaVersion !== "1.0")
        fail(`${p}.schemaVersion`, "UNSUPPORTED_VERSION");
      id(item.regionId, `${p}.regionId`);
      if (nodeIds.has(item.regionId as string))
        fail(`${path}.nodes`, "DUPLICATE_ID");
      nodeIds.add(item.regionId as string);
      text(item.masterCode, `${p}.masterCode`, 160, true);
      enumValue(item.regionType, `${p}.regionType`, REGION_TYPES);
      const names = exact(item.names, `${p}.names`, [
        "nameJa",
        "nameZhCn",
        "nameEn",
        "aliases",
      ]);
      for (const key of ["nameJa", "nameZhCn", "nameEn"])
        text(names[key], `${p}.names.${key}`, 200, true);
      strings(names.aliases, `${p}.names.aliases`);
      if (item.center !== null) {
        const center = exact(item.center, `${p}.center`, [
          "longitude",
          "latitude",
        ]);
        numberValue(center.longitude, `${p}.center.longitude`, -180, 180);
        numberValue(center.latitude, `${p}.center.latitude`, -90, 90);
      }
      id(item.geometryRef, `${p}.geometryRef`, true);
      enumValue(item.geometryKind, `${p}.geometryKind`, [
        "administrative",
        "tourism",
        "cluster",
        "point",
        "unknown",
      ]);
      if (item.gatewayProfile !== null) {
        const gateway = exact(item.gatewayProfile, `${p}.gatewayProfile`, [
          "gatewayKind",
          "transportNodeRefs",
          "servedRegionRefs",
          "luggageEasePrior",
          "transferEasePrior",
          "centralityPrior",
          "sourceRefs",
          "confidence",
        ]);
        enumValue(gateway.gatewayKind, `${p}.gatewayProfile.gatewayKind`, [
          "rail",
          "airport",
          "bus",
          "port",
          "road",
          "mixed",
        ]);
        ids(gateway.transportNodeRefs, `${p}.gatewayProfile.transportNodeRefs`);
        ids(gateway.servedRegionRefs, `${p}.gatewayProfile.servedRegionRefs`);
        for (const key of [
          "luggageEasePrior",
          "transferEasePrior",
          "centralityPrior",
        ])
          numberValue(gateway[key], `${p}.gatewayProfile.${key}`, 0, 9, true);
        ids(gateway.sourceRefs, `${p}.gatewayProfile.sourceRefs`);
        nullableScore(gateway.confidence, `${p}.gatewayProfile.confidence`);
      }
      if (item.regionType === "gateway" && item.gatewayProfile === null)
        fail(`${p}.gatewayProfile`, "MISSING_GATEWAY_PROFILE");
      ids(item.sourceRefs, `${p}.sourceRefs`);
      numberValue(
        item.revision,
        `${p}.revision`,
        1,
        Number.MAX_SAFE_INTEGER,
        false,
        true,
      );
    });
    const relations = array(graph.relations, `${path}.relations`, 50_000);
    const relationIds = new Set<string>();
    const relationPairs = new Set<string>();
    const contains = new Map<string, string[]>();
    relations.forEach((relation, index) => {
      const p = `${path}.relations[${index}]`;
      const item = exact(relation, p, [
        "relationId",
        "relationType",
        "fromRegionRef",
        "toRegionRef",
        "confidence",
        "sourceRefs",
        "validFrom",
        "validUntil",
        "lifecycleStatus",
        "revision",
      ]);
      id(item.relationId, `${p}.relationId`);
      if (relationIds.has(item.relationId as string))
        fail(`${path}.relations`, "DUPLICATE_ID");
      relationIds.add(item.relationId as string);
      enumValue(item.relationType, `${p}.relationType`, REGION_RELATION_TYPES);
      id(item.fromRegionRef, `${p}.fromRegionRef`);
      id(item.toRegionRef, `${p}.toRegionRef`);
      if (item.fromRegionRef === item.toRegionRef) fail(p, "SELF_RELATION");
      if (
        !nodeIds.has(item.fromRegionRef as string) ||
        !nodeIds.has(item.toRegionRef as string)
      )
        fail(p, "DANGLING_REGION_REF");
      const symmetric =
        item.relationType === "adjacent" || item.relationType === "overlaps";
      const ends = [item.fromRegionRef as string, item.toRegionRef as string];
      if (symmetric) ends.sort();
      const pair = `${item.relationType}:${ends.join(":")}`;
      if (relationPairs.has(pair))
        fail(
          p,
          symmetric ? "DUPLICATE_SYMMETRIC_RELATION" : "DUPLICATE_RELATION",
        );
      relationPairs.add(pair);
      if (item.relationType === "contains") {
        const children = contains.get(item.fromRegionRef as string) ?? [];
        children.push(item.toRegionRef as string);
        contains.set(item.fromRegionRef as string, children);
      }
      nullableScore(item.confidence, `${p}.confidence`);
      ids(item.sourceRefs, `${p}.sourceRefs`);
      instant(item.validFrom, `${p}.validFrom`, true);
      instant(item.validUntil, `${p}.validUntil`, true);
      enumValue(item.lifecycleStatus, `${p}.lifecycleStatus`, [
        "active",
        "deprecated",
      ]);
      numberValue(
        item.revision,
        `${p}.revision`,
        1,
        Number.MAX_SAFE_INTEGER,
        false,
        true,
      );
    });
    const visit = (node: string, active: Set<string>, done: Set<string>) => {
      if (active.has(node)) fail(`${path}.relations`, "CONTAINS_CYCLE");
      if (done.has(node)) return;
      active.add(node);
      for (const child of contains.get(node) ?? []) visit(child, active, done);
      active.delete(node);
      done.add(node);
    };
    const done = new Set<string>();
    for (const node of nodeIds) visit(node, new Set(), done);
    const edges = array(graph.travelEdges, `${path}.travelEdges`, 50_000);
    const edgeIds = new Set<string>();
    edges.forEach((edge, index) => {
      const p = `${path}.travelEdges[${index}]`;
      const item = exact(edge, p, [
        "contractVersion",
        "edgeId",
        "fromRegionRef",
        "toRegionRef",
        "scope",
        "planningPrior",
        "recommendedStayAfterArrivalDays",
        "variants",
        "sourceRefs",
        "confidence",
        "revision",
        "lifecycleStatus",
      ]);
      version(item.contractVersion, `${p}.contractVersion`);
      id(item.edgeId, `${p}.edgeId`);
      if (edgeIds.has(item.edgeId as string))
        fail(`${path}.travelEdges`, "DUPLICATE_ID");
      edgeIds.add(item.edgeId as string);
      id(item.fromRegionRef, `${p}.fromRegionRef`);
      id(item.toRegionRef, `${p}.toRegionRef`);
      if (item.fromRegionRef === item.toRegionRef) fail(p, "SELF_TRAVEL_EDGE");
      if (
        !nodeIds.has(item.fromRegionRef as string) ||
        !nodeIds.has(item.toRegionRef as string)
      )
        fail(p, "DANGLING_REGION_REF");
      enumValue(item.scope, `${p}.scope`, ["macro", "local", "gateway"]);
      const prior = exact(item.planningPrior, `${p}.planningPrior`, [
        "tripCompatibility",
        "dayTripFit",
        "sameDayTransitionFit",
        "overnightTransitionFit",
        "scenicTransition",
        "slowTravelFit",
        "luggageEase",
        "reliabilityPrior",
        "detourPenaltyPrior",
      ]);
      for (const [key, priorValue] of Object.entries(prior))
        numberValue(priorValue, `${p}.planningPrior.${key}`, 0, 9, true);
      numberValue(
        item.recommendedStayAfterArrivalDays,
        `${p}.recommendedStayAfterArrivalDays`,
        0,
        3650,
        true,
      );
      const variants = array(item.variants, `${p}.variants`, 100);
      const variantIds = new Set<string>();
      variants.forEach((variant, variantIndex) => {
        const q = `${p}.variants[${variantIndex}]`;
        const v = exact(variant, q, [
          "variantId",
          "mode",
          "gatewayFromRef",
          "gatewayToRef",
          "typicalDurationMinutes",
          "typicalCostJpy",
          "typicalTransfers",
          "typicalWalkMinutes",
          "frequencyBand",
          "reservationPrior",
          "sourceRefs",
          "observedAt",
          "validUntil",
          "confidence",
        ]);
        id(v.variantId, `${q}.variantId`);
        if (variantIds.has(v.variantId as string))
          fail(`${p}.variants`, "DUPLICATE_ID");
        variantIds.add(v.variantId as string);
        enumValue(v.mode, `${q}.mode`, [
          "rail",
          "bus",
          "car",
          "flight",
          "ferry",
          "walk",
          "mixed",
          "other",
        ]);
        id(v.gatewayFromRef, `${q}.gatewayFromRef`, true);
        id(v.gatewayToRef, `${q}.gatewayToRef`, true);
        validateRange(
          v.typicalDurationMinutes,
          `${q}.typicalDurationMinutes`,
          true,
        );
        validateRange(v.typicalCostJpy, `${q}.typicalCostJpy`, true);
        validateRange(v.typicalTransfers, `${q}.typicalTransfers`, true);
        validateRange(v.typicalWalkMinutes, `${q}.typicalWalkMinutes`, true);
        enumValue(v.frequencyBand, `${q}.frequencyBand`, [
          "very_high",
          "high",
          "medium",
          "low",
          "very_low",
          "unknown",
        ]);
        enumValue(v.reservationPrior, `${q}.reservationPrior`, [
          "usually_not_needed",
          "optional",
          "often_recommended",
          "usually_required",
          "unknown",
        ]);
        ids(v.sourceRefs, `${q}.sourceRefs`);
        instant(v.observedAt, `${q}.observedAt`, true);
        instant(v.validUntil, `${q}.validUntil`, true);
        nullableScore(v.confidence, `${q}.confidence`);
      });
      ids(item.sourceRefs, `${p}.sourceRefs`);
      nullableScore(item.confidence, `${p}.confidence`);
      numberValue(
        item.revision,
        `${p}.revision`,
        1,
        Number.MAX_SAFE_INTEGER,
        false,
        true,
      );
      enumValue(item.lifecycleStatus, `${p}.lifecycleStatus`, [
        "active",
        "deprecated",
        "seasonal",
      ]);
    });
  });

function validateScore(value: unknown, path: string) {
  const item = exact(value, path, [
    "component",
    "value",
    "coverage",
    "confidence",
    "status",
    "configVersion",
    "breakdown",
  ]);
  enumValue(item.component, `${path}.component`, SCORE_COMPONENTS);
  numberValue(item.value, `${path}.value`, 0, 99);
  numberValue(item.coverage, `${path}.coverage`, 0, 1);
  nullableScore(item.confidence, `${path}.confidence`);
  enumValue(item.status, `${path}.status`, [
    "scored",
    "partial",
    "needs_fact",
    "not_applicable",
  ]);
  text(item.configVersion, `${path}.configVersion`, 160);
  const breakdown = array(item.breakdown, `${path}.breakdown`, 1000);
  breakdown.forEach((entry, index) => {
    const p = `${path}.breakdown[${index}]`;
    const row = exact(entry, p, [
      "featureCode",
      "preferenceValue",
      "featureValue",
      "contribution",
      "confidence",
      "reasonCode",
    ]);
    if (
      row.featureCode !== null &&
      !POI_FEATURE_CODES.includes(row.featureCode as never)
    )
      fail(`${p}.featureCode`, "UNKNOWN_FEATURE_CODE");
    numberValue(row.preferenceValue, `${p}.preferenceValue`, 1, 9, true, true);
    numberValue(row.featureValue, `${p}.featureValue`, 0, 9, true, true);
    numberValue(row.contribution, `${p}.contribution`, -1000, 1000);
    nullableScore(row.confidence, `${p}.confidence`);
    text(row.reasonCode, `${p}.reasonCode`, 64);
  });
}

export const parsePlanningScoreSetV1 = (
  input: unknown,
): PlanningValidationResult<PlanningScoreSetV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "subjectRef",
      "scores",
      "overallValue",
      "overallConfigVersion",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    id(item.subjectRef, `${path}.subjectRef`);
    const scores = exact(item.scores, `${path}.scores`, SCORE_COMPONENTS);
    for (const component of SCORE_COMPONENTS) {
      if (scores[component] !== null) {
        validateScore(scores[component], `${path}.scores.${component}`);
        if (record(scores[component], path).component !== component)
          fail(
            `${path}.scores.${component}.component`,
            "SCORE_COMPONENT_MISMATCH",
          );
      }
    }
    numberValue(item.overallValue, `${path}.overallValue`, 0, 99, true);
    text(item.overallConfigVersion, `${path}.overallConfigVersion`, 160, true);
    if ((item.overallValue === null) !== (item.overallConfigVersion === null))
      fail(path, "INCOMPLETE_OVERALL_SCORE");
  });

export const parseFeasibilityResultV1 = (
  input: unknown,
): PlanningValidationResult<FeasibilityResultV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "status",
      "scope",
      "subjectRef",
      "issues",
      "metrics",
      "visit",
      "factRefs",
      "configVersion",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    enumValue(item.status, `${path}.status`, FEASIBILITY_STATUSES);
    enumValue(item.scope, `${path}.scope`, [
      "item",
      "transition",
      "day",
      "trip",
    ]);
    id(item.subjectRef, `${path}.subjectRef`);
    const issues = array(item.issues, `${path}.issues`, 1000);
    issues.forEach((issue, index) => {
      const p = `${path}.issues[${index}]`;
      const row = exact(issue, p, [
        "code",
        "severity",
        "subjectRef",
        "requiredValue",
        "actualValue",
        "shortfallOrExcess",
        "factRefs",
        "repairHints",
      ]);
      text(row.code, `${p}.code`, 100);
      enumValue(row.severity, `${p}.severity`, [
        "WARNING",
        "CRITICAL",
        "NEEDS_FACT",
      ]);
      id(row.subjectRef, `${p}.subjectRef`);
      if (
        row.requiredValue !== null &&
        !["number", "string"].includes(typeof row.requiredValue)
      )
        fail(`${p}.requiredValue`, "INVALID_SCALAR");
      if (
        row.actualValue !== null &&
        !["number", "string"].includes(typeof row.actualValue)
      )
        fail(`${p}.actualValue`, "INVALID_SCALAR");
      numberValue(
        row.shortfallOrExcess,
        `${p}.shortfallOrExcess`,
        -1_000_000,
        1_000_000,
        true,
      );
      ids(row.factRefs, `${p}.factRefs`);
      strings(row.repairHints, `${p}.repairHints`);
    });
    if (item.status === "PASS" && issues.length > 0)
      fail(`${path}.issues`, "PASS_WITH_ISSUES");
    if (
      item.status !== "PASS" &&
      !issues.some((issue) => record(issue, path).severity === item.status)
    )
      fail(`${path}.issues`, "STATUS_ISSUE_MISMATCH");
    const metrics = exact(item.metrics, `${path}.metrics`, [
      "scheduledMinutes",
      "transitionMinutes",
      "bufferMinutes",
      "walkingLoad",
      "physicalLoad",
      "remainingFatigueBudget",
    ]);
    for (const [key, metric] of Object.entries(metrics))
      numberValue(
        metric,
        `${path}.metrics.${key}`,
        key === "remainingFatigueBudget" ? -1_000_000 : 0,
        1_000_000,
        true,
      );
    if (item.visit !== null) {
      const visit = exact(item.visit, `${path}.visit`, [
        "visitMode",
        "plannedDurationMinutes",
        "minimumDurationMinutes",
        "recommendedDurationMinutes",
        "maximumUsefulDurationMinutes",
        "visitWalkingLoad",
        "visitPhysicalLoad",
        "loadSource",
      ]);
      text(visit.visitMode, `${path}.visit.visitMode`, 64);
      numberValue(
        visit.plannedDurationMinutes,
        `${path}.visit.plannedDurationMinutes`,
        0,
        10_080,
        false,
        true,
      );
      for (const key of [
        "minimumDurationMinutes",
        "recommendedDurationMinutes",
        "maximumUsefulDurationMinutes",
      ])
        numberValue(visit[key], `${path}.visit.${key}`, 0, 10_080, true, true);
      for (const key of ["visitWalkingLoad", "visitPhysicalLoad"])
        numberValue(visit[key], `${path}.visit.${key}`, 0, 1000, true);
      enumValue(visit.loadSource, `${path}.visit.loadSource`, [
        "detailed_fact_model",
        "estimated_from_feature_summary",
        "unknown",
      ]);
    }
    ids(item.factRefs, `${path}.factRefs`);
    text(item.configVersion, `${path}.configVersion`, 160);
  });

export const parseCandidateRunV1 = (
  input: unknown,
): PlanningValidationResult<CandidateRunV1> =>
  parse(input, (value, path) => {
    const run = exact(value, path, [
      "contractVersion",
      "runId",
      "pipelineVersion",
      "configVersion",
      "tripRef",
      "preferenceSnapshotRef",
      "contextSnapshotRef",
      "graphVersion",
      "poiFeatureVersion",
      "scope",
      "candidates",
      "countsByStage",
      "startedAt",
      "completedAt",
    ]);
    version(run.contractVersion, `${path}.contractVersion`);
    id(run.runId, `${path}.runId`);
    if (run.pipelineVersion !== "1.0")
      fail(`${path}.pipelineVersion`, "UNSUPPORTED_VERSION");
    for (const key of [
      "configVersion",
      "preferenceSnapshotRef",
      "contextSnapshotRef",
      "graphVersion",
      "poiFeatureVersion",
    ])
      text(run[key], `${path}.${key}`, 160);
    id(run.tripRef, `${path}.tripRef`, true);
    enumValue(run.scope, `${path}.scope`, [
      "macro",
      "region",
      "day",
      "timeslot",
      "replan",
    ]);
    const candidates = array(run.candidates, `${path}.candidates`, 10_000);
    const candidateIds = new Set<string>();
    candidates.forEach((candidate, index) => {
      const p = `${path}.candidates[${index}]`;
      const item = exact(candidate, p, [
        "contractVersion",
        "runId",
        "candidateId",
        "domainRef",
        "candidateKind",
        "stage",
        "status",
        "anchor",
        "protection",
        "gate",
        "feasibility",
        "scoreRefs",
        "factRefs",
        "reasons",
        "parentCandidateIds",
      ]);
      version(item.contractVersion, `${p}.contractVersion`);
      if (item.runId !== run.runId) fail(`${p}.runId`, "RUN_MISMATCH");
      id(item.candidateId, `${p}.candidateId`);
      id(item.domainRef, `${p}.domainRef`);
      if (candidateIds.has(item.candidateId as string))
        fail(`${path}.candidates`, "DUPLICATE_ID");
      candidateIds.add(item.candidateId as string);
      enumValue(item.candidateKind, `${p}.candidateKind`, [
        "region",
        "corridor",
        "poi",
      ]);
      enumValue(item.stage, `${p}.stage`, CANDIDATE_STAGES);
      enumValue(item.status, `${p}.status`, CANDIDATE_STATUSES);
      if (item.anchor !== null)
        enumValue(item.anchor, `${p}.anchor`, [
          "must_go",
          "want_go",
          "prefer",
          "avoid",
          "must_avoid",
        ]);
      const protection = exact(item.protection, `${p}.protection`, [
        "mustGo",
        "locked",
        "protected",
      ]);
      Object.entries(protection).forEach(([key, v]) =>
        booleanValue(v, `${p}.protection.${key}`),
      );
      if (item.gate !== null)
        enumValue(item.gate, `${p}.gate`, CONSTRAINT_GATE_STATUSES);
      const feasibility = exact(item.feasibility, `${p}.feasibility`, [
        "route",
        "itinerary",
      ]);
      for (const [key, status] of Object.entries(feasibility))
        if (status !== null)
          enumValue(status, `${p}.feasibility.${key}`, FEASIBILITY_STATUSES);
      const scoreRefs = record(item.scoreRefs, `${p}.scoreRefs`);
      if (
        Object.keys(scoreRefs).some(
          (key) => !SCORE_COMPONENTS.includes(key as never),
        )
      )
        fail(`${p}.scoreRefs`, "UNKNOWN_FIELD");
      Object.entries(scoreRefs).forEach(([key, ref]) =>
        id(ref, `${p}.scoreRefs.${key}`),
      );
      ids(item.factRefs, `${p}.factRefs`);
      ids(item.parentCandidateIds, `${p}.parentCandidateIds`);
      const reasons = array(item.reasons, `${p}.reasons`, 100);
      reasons.forEach((reason, reasonIndex) => {
        const q = `${p}.reasons[${reasonIndex}]`;
        const row = exact(reason, q, [
          "code",
          "stage",
          "severity",
          "subjectRef",
          "relatedCandidateRef",
          "factRefs",
        ]);
        text(row.code, `${q}.code`, 100);
        enumValue(row.stage, `${q}.stage`, CANDIDATE_STAGES);
        enumValue(row.severity, `${q}.severity`, [
          "info",
          "warning",
          "blocking",
        ]);
        id(row.subjectRef, `${q}.subjectRef`);
        id(row.relatedCandidateRef, `${q}.relatedCandidateRef`, true);
        ids(row.factRefs, `${q}.factRefs`);
      });
      if (
        (item.status === "rejected" || item.status === "needs_fact") &&
        reasons.length === 0
      )
        fail(`${p}.reasons`, "MISSING_DISPOSITION_REASON");
    });
    for (const candidate of candidates)
      for (const parent of record(candidate, path)
        .parentCandidateIds as string[])
        if (!candidateIds.has(parent))
          fail(`${path}.candidates`, "DANGLING_CANDIDATE_REF");
    const counts = record(run.countsByStage, `${path}.countsByStage`);
    if (
      Object.keys(counts).some(
        (key) => !CANDIDATE_STAGES.includes(key as never),
      )
    )
      fail(`${path}.countsByStage`, "UNKNOWN_FIELD");
    Object.entries(counts).forEach(([key, count]) =>
      numberValue(
        count,
        `${path}.countsByStage.${key}`,
        0,
        1_000_000,
        false,
        true,
      ),
    );
    instant(run.startedAt, `${path}.startedAt`);
    instant(run.completedAt, `${path}.completedAt`, true);
  });

function validateContextScope(value: unknown, path: string) {
  const item = exact(value, path, [
    "kind",
    "tripRef",
    "dayIndex",
    "regionLocalId",
    "itemLocalId",
    "window",
  ]);
  enumValue(item.kind, `${path}.kind`, [
    "trip",
    "region",
    "day",
    "timeslot",
    "item",
    "event",
  ]);
  id(item.tripRef, `${path}.tripRef`);
  for (const key of ["dayIndex", "regionLocalId", "itemLocalId"])
    numberValue(item[key], `${path}.${key}`, 0, 1_000_000, true, true);
  if (item.window !== null) {
    if (!Array.isArray(item.window) || item.window.length !== 2)
      fail(`${path}.window`, "INVALID_TUPLE");
    numberValue(item.window[0], `${path}.window[0]`, 0, 10_080, false, true);
    numberValue(item.window[1], `${path}.window[1]`, 0, 10_080, false, true);
    if (item.window[0] >= item.window[1])
      fail(`${path}.window`, "INVALID_TIME_RANGE");
  }
}

function validateDecisionRequest(value: unknown, path: string) {
  const item = exact(value, path, [
    "kind",
    "minimumSelections",
    "maximumSelections",
    "orderTargetIds",
    "allowedOperations",
  ]);
  enumValue(item.kind, `${path}.kind`, [
    "choose",
    "order",
    "patch",
    "resolve_preference",
  ]);
  numberValue(
    item.minimumSelections,
    `${path}.minimumSelections`,
    0,
    1000,
    false,
    true,
  );
  numberValue(
    item.maximumSelections,
    `${path}.maximumSelections`,
    0,
    1000,
    false,
    true,
  );
  if ((item.minimumSelections as number) > (item.maximumSelections as number))
    fail(path, "INVALID_SELECTION_RANGE");
  uniqueNumbers(item.orderTargetIds, `${path}.orderTargetIds`);
  const ops = array(item.allowedOperations, `${path}.allowedOperations`, 8);
  ops.forEach((op, index) =>
    enumValue(
      op,
      `${path}.allowedOperations[${index}]`,
      AI_COMPACT_OPERATION_CODES,
    ),
  );
  if (new Set(ops).size !== ops.length)
    fail(`${path}.allowedOperations`, "DUPLICATE_OPERATION");
}

function validateAiCompactContext(value: unknown, path: string) {
  const item = exact(value, path, [
    "contractVersion",
    "v",
    "runId",
    "task",
    "scope",
    "state",
    "preference",
    "constraints",
    "candidates",
    "route",
    "weather",
    "request",
    "precision",
  ]);
  version(item.contractVersion, `${path}.contractVersion`);
  if (item.v !== "1") fail(`${path}.v`, "UNSUPPORTED_VERSION");
  id(item.runId, `${path}.runId`);
  enumValue(item.task, `${path}.task`, AI_TASK_TYPES);
  validateContextScope(item.scope, `${path}.scope`);
  const state = exact(item.state, `${path}.state`, [
    "tripDays",
    "macroPath",
    "currentRegion",
    "currentDay",
    "currentWindow",
    "partySummary",
    "budgetBand",
    "tripStyle",
    "lockedAnchors",
    "completedRefs",
    "inProgressRef",
    "currentLoad",
    "adjacentBoundary",
  ]);
  numberValue(state.tripDays, `${path}.state.tripDays`, 1, 3660, false, true);
  uniqueNumbers(state.macroPath, `${path}.state.macroPath`);
  for (const key of ["currentRegion", "currentDay", "inProgressRef"])
    numberValue(state[key], `${path}.state.${key}`, 0, 1_000_000, true, true);
  for (const key of ["currentWindow", "currentLoad"])
    if (state[key] !== null) {
      if (!Array.isArray(state[key]) || (state[key] as unknown[]).length !== 2)
        fail(`${path}.state.${key}`, "INVALID_TUPLE");
      (state[key] as unknown[]).forEach((v, index) =>
        numberValue(
          v,
          `${path}.state.${key}[${index}]`,
          0,
          key === "currentWindow" ? 10_080 : 1000,
        ),
      );
    }
  text(state.partySummary, `${path}.state.partySummary`, 160);
  text(state.budgetBand, `${path}.state.budgetBand`, 80, true);
  text(state.tripStyle, `${path}.state.tripStyle`, 80, true);
  uniqueNumbers(state.lockedAnchors, `${path}.state.lockedAnchors`);
  uniqueNumbers(state.completedRefs, `${path}.state.completedRefs`);
  text(state.adjacentBoundary, `${path}.state.adjacentBoundary`, 500, true);
  if (item.preference !== null)
    validateSparsePreference(item.preference, `${path}.preference`);
  const constraints = array(item.constraints, `${path}.constraints`, 1000);
  constraints.forEach((constraint, index) => {
    const p = `${path}.constraints[${index}]`;
    const row = exact(constraint, p, [
      "code",
      "targetLocalId",
      "value",
      "hard",
    ]);
    text(row.code, `${p}.code`, 100);
    numberValue(
      row.targetLocalId,
      `${p}.targetLocalId`,
      0,
      1_000_000,
      true,
      true,
    );
    if (
      row.value !== null &&
      !["string", "number", "boolean"].includes(typeof row.value)
    )
      fail(`${p}.value`, "INVALID_SCALAR");
    if (typeof row.value === "number" && !Number.isFinite(row.value))
      fail(`${p}.value`, "INVALID_NUMBER");
    booleanValue(row.hard, `${p}.hard`);
  });
  const candidates = array(item.candidates, `${path}.candidates`, 1000);
  const localIds = new Set<number>();
  candidates.forEach((candidate, index) => {
    const p = `${path}.candidates[${index}]`;
    const row = exact(candidate, p, [
      "id",
      "entityKind",
      "status",
      "name",
      "metrics",
      "reasonTags",
    ]);
    numberValue(row.id, `${p}.id`, 0, 1_000_000, false, true);
    if (localIds.has(row.id as number))
      fail(`${path}.candidates`, "DUPLICATE_LOCAL_ID");
    localIds.add(row.id as number);
    enumValue(row.entityKind, `${p}.entityKind`, [
      "poi",
      "region",
      "corridor",
      "route",
      "item",
      "stay_cluster",
    ]);
    enumValue(row.status, `${p}.status`, ["candidate", "blocked"]);
    text(row.name, `${p}.name`, 200, true);
    const metrics = record(row.metrics, `${p}.metrics`);
    for (const [key, metric] of Object.entries(metrics)) {
      if (!/^[a-z][A-Za-z0-9]*$/.test(key))
        fail(`${p}.metrics`, "INVALID_METRIC_KEY");
      if (
        metric !== null &&
        !["string", "number", "boolean"].includes(typeof metric)
      )
        fail(`${p}.metrics.${key}`, "INVALID_SCALAR");
      if (typeof metric === "number" && !Number.isFinite(metric))
        fail(`${p}.metrics.${key}`, "INVALID_NUMBER");
    }
    strings(row.reasonTags, `${p}.reasonTags`);
  });
  if (item.route !== null) {
    const route = exact(item.route, `${path}.route`, [
      "id",
      "routeRef",
      "source",
      "durationMinutes",
      "fareMinor",
      "currency",
      "transfers",
      "walkMinutes",
      "reliability",
      "arrivalMinute",
      "departureMinute",
      "freshness",
      "flags",
    ]);
    numberValue(route.id, `${path}.route.id`, 0, 1_000_000, true, true);
    id(route.routeRef, `${path}.route.routeRef`);
    enumValue(route.source, `${path}.route.source`, [
      "live_fact",
      "planning_prior",
    ]);
    numberValue(
      route.durationMinutes,
      `${path}.route.durationMinutes`,
      0,
      100_000,
    );
    for (const key of [
      "fareMinor",
      "transfers",
      "walkMinutes",
      "arrivalMinute",
      "departureMinute",
    ])
      numberValue(
        route[key],
        `${path}.route.${key}`,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
        true,
      );
    text(route.currency, `${path}.route.currency`, 3, true);
    numberValue(route.reliability, `${path}.route.reliability`, 0, 9, true);
    enumValue(route.freshness, `${path}.route.freshness`, FRESHNESS_STATES);
    strings(route.flags, `${path}.route.flags`);
    if (
      route.source === "planning_prior" &&
      (route.arrivalMinute !== null || route.departureMinute !== null)
    )
      fail(`${path}.route`, "PLANNING_PRIOR_EXACT_TIME_FORBIDDEN");
  }
  if (item.weather !== null) {
    const weather = exact(item.weather, `${path}.weather`, [
      "rainRisk",
      "heatRisk",
      "coldRisk",
      "snowValue",
      "outdoorFit",
      "transportRisk",
      "volatility",
      "freshness",
    ]);
    for (const key of [
      "rainRisk",
      "heatRisk",
      "coldRisk",
      "snowValue",
      "outdoorFit",
      "transportRisk",
      "volatility",
    ])
      numberValue(weather[key], `${path}.weather.${key}`, 0, 9, true);
    enumValue(weather.freshness, `${path}.weather.freshness`, FRESHNESS_STATES);
  }
  validateDecisionRequest(item.request, `${path}.request`);
  enumValue(item.precision, `${path}.precision`, ["normal", "fine"]);
}

export const parseAiCompactContextV1 = (
  input: unknown,
): PlanningValidationResult<AiCompactContextV1> =>
  parse(input, validateAiCompactContext);

function validateCompactOperation(value: unknown, path: string): AiCompactOpV1 {
  const base = record(value, path);
  enumValue(base.op, `${path}.op`, AI_COMPACT_OPERATION_CODES);
  const op = base.op as AiCompactOpV1["op"];
  const shapes: Record<AiCompactOpV1["op"], readonly string[]> = {
    ADD: ["op", "candidateId", "afterItemId"],
    REMOVE: ["op", "itemId"],
    REPLACE: ["op", "itemId", "candidateId"],
    MOVE_BEFORE: ["op", "itemId", "anchorItemId"],
    MOVE_AFTER: ["op", "itemId", "anchorItemId"],
    REORDER: ["op", "orderedItemIds"],
    CHOOSE_ROUTE: ["op", "routeId"],
    SET_VISIT_MODE: ["op", "itemId", "visitModeCode"],
  };
  const item = exact(value, path, shapes[op]);
  for (const key of ["candidateId", "itemId", "anchorItemId", "routeId"])
    if (Object.hasOwn(item, key))
      numberValue(item[key], `${path}.${key}`, 0, 1_000_000, false, true);
  if (Object.hasOwn(item, "afterItemId"))
    numberValue(
      item.afterItemId,
      `${path}.afterItemId`,
      0,
      1_000_000,
      true,
      true,
    );
  if (Object.hasOwn(item, "orderedItemIds"))
    uniqueNumbers(item.orderedItemIds, `${path}.orderedItemIds`);
  if (Object.hasOwn(item, "visitModeCode"))
    text(item.visitModeCode, `${path}.visitModeCode`, 64);
  return item as unknown as AiCompactOpV1;
}

function validateDecisionPayload(value: unknown, path: string) {
  const base = record(value, path);
  enumValue(base.kind, `${path}.kind`, [
    "choice",
    "ordering",
    "patch",
    "semantic_preference",
  ]);
  if (base.kind === "choice") {
    const item = exact(value, path, ["kind", "selectedIds", "backupIds"]);
    const selected = uniqueNumbers(item.selectedIds, `${path}.selectedIds`);
    const backup = uniqueNumbers(item.backupIds, `${path}.backupIds`);
    if (selected.some((entry) => backup.includes(entry)))
      fail(path, "SELECTION_BACKUP_OVERLAP");
  }
  if (base.kind === "ordering") {
    const item = exact(value, path, ["kind", "orderedIds"]);
    uniqueNumbers(item.orderedIds, `${path}.orderedIds`);
  }
  if (base.kind === "patch") {
    const item = exact(value, path, ["kind", "operations", "backupIds"]);
    const ops = array(item.operations, `${path}.operations`, 100);
    ops.forEach((op, index) =>
      validateCompactOperation(op, `${path}.operations[${index}]`),
    );
    uniqueNumbers(item.backupIds, `${path}.backupIds`);
  }
  if (base.kind === "semantic_preference") {
    const item = exact(value, path, [
      "kind",
      "soft",
      "hardConstraintCandidates",
    ]);
    const soft = array(item.soft, `${path}.soft`, 43);
    soft.forEach((entry, index) => {
      const p = `${path}.soft[${index}]`;
      const row = exact(entry, p, [
        "featureCode",
        "value",
        "targetLayer",
        "evidenceKind",
      ]);
      if (!POI_FEATURE_CODES.includes(row.featureCode as never))
        fail(`${p}.featureCode`, "UNKNOWN_FEATURE_CODE");
      numberValue(row.value, `${p}.value`, 1, 9, false, true);
      enumValue(row.targetLayer, `${p}.targetLayer`, [
        "trip_override",
        "learning_proposal",
      ]);
      enumValue(row.evidenceKind, `${p}.evidenceKind`, [
        "explicit_user",
        "inferred",
      ]);
    });
    const hard = array(
      item.hardConstraintCandidates,
      `${path}.hardConstraintCandidates`,
      100,
    );
    hard.forEach((entry, index) => {
      const p = `${path}.hardConstraintCandidates[${index}]`;
      const row = exact(entry, p, ["constraintCode", "evidenceKind"]);
      text(row.constraintCode, `${p}.constraintCode`, 100);
      if (row.evidenceKind !== "explicit_user")
        fail(`${p}.evidenceKind`, "HARD_CONSTRAINT_INFERENCE_FORBIDDEN");
    });
  }
}

function validateAiDecision(value: unknown, path: string) {
  const item = exact(value, path, [
    "contractVersion",
    "v",
    "runId",
    "task",
    "status",
    "decision",
    "contextRequest",
    "reasonCodes",
    "confidenceBand",
    "uncertaintyCodes",
  ]);
  version(item.contractVersion, `${path}.contractVersion`);
  if (item.v !== "1") fail(`${path}.v`, "UNSUPPORTED_VERSION");
  id(item.runId, `${path}.runId`);
  enumValue(item.task, `${path}.task`, AI_TASK_TYPES);
  enumValue(item.status, `${path}.status`, AI_DECISION_STATUSES);
  if (item.decision !== null)
    validateDecisionPayload(item.decision, `${path}.decision`);
  if (item.contextRequest !== null) {
    const request = exact(item.contextRequest, `${path}.contextRequest`, [
      "needs",
      "targetIds",
    ]);
    const needs = array(request.needs, `${path}.contextRequest.needs`, 6);
    needs.forEach((need, index) =>
      enumValue(
        need,
        `${path}.contextRequest.needs[${index}]`,
        AI_CONTEXT_EXPANSION_CODES,
      ),
    );
    if (new Set(needs).size !== needs.length)
      fail(`${path}.contextRequest.needs`, "DUPLICATE_EXPANSION");
    uniqueNumbers(request.targetIds, `${path}.contextRequest.targetIds`);
  }
  if (
    item.status === "decision" &&
    (item.decision === null || item.contextRequest !== null)
  )
    fail(path, "INVALID_STATUS_BRANCH");
  if (
    item.status === "need_more_context" &&
    (item.decision !== null || item.contextRequest === null)
  )
    fail(path, "INVALID_STATUS_BRANCH");
  if (
    (item.status === "no_valid_choice" || item.status === "abstain") &&
    (item.decision !== null || item.contextRequest !== null)
  )
    fail(path, "INVALID_STATUS_BRANCH");
  strings(item.reasonCodes, `${path}.reasonCodes`);
  if (item.confidenceBand !== null)
    enumValue(item.confidenceBand, `${path}.confidenceBand`, [
      "low",
      "medium",
      "high",
    ]);
  strings(item.uncertaintyCodes, `${path}.uncertaintyCodes`);
}

const ALLOWED_PAYLOADS: Record<
  AiDecisionValidationContext["task"],
  readonly AiDecisionPayloadV1["kind"][]
> = {
  macro_corridor_choice: ["choice"],
  region_choice: ["choice"],
  stay_cluster_choice: ["choice"],
  poi_choice: ["choice"],
  poi_order: ["ordering"],
  poi_replacement: ["patch"],
  day_balance_choice: ["ordering", "patch"],
  route_alternative_choice: ["choice"],
  replan_soft_choice: ["patch"],
  semantic_preference_resolution: ["semantic_preference"],
};

export function parseAiDecisionResponseV1(
  input: unknown,
  context?: AiDecisionValidationContext,
): PlanningValidationResult<AiDecisionResponseV1> {
  const structural = parse<AiDecisionResponseV1>(input, validateAiDecision);
  if (!structural.ok || !context) return structural;
  return parse(structural.value, (value, path) => {
    validateAiDecision(value, path);
    const response = value as AiDecisionResponseV1;
    if (
      response.runId !== context.runId ||
      context.localIdMap.runId !== context.runId
    )
      fail(`${path}.runId`, "OUT_RUN_MISMATCH");
    if (response.task !== context.task)
      fail(`${path}.task`, "OUT_TASK_MISMATCH");
    if (
      response.decision &&
      !ALLOWED_PAYLOADS[context.task].includes(response.decision.kind)
    )
      fail(`${path}.decision.kind`, "OUT_OP_NOT_ALLOWED_FOR_TASK");
    const entries = new Map(
      context.localIdMap.entries.map((entry) => [entry.localId, entry]),
    );
    const requireId = (localId: number, candidate: boolean) => {
      const entry = entries.get(localId);
      if (!entry) fail(`${path}.decision`, "OUT_UNKNOWN_LOCAL_ID");
      if (candidate && !entry.candidate)
        fail(`${path}.decision`, "OUT_NON_CANDIDATE_ID");
    };
    if (response.decision?.kind === "choice") {
      response.decision.selectedIds.forEach((entry) => requireId(entry, true));
      response.decision.backupIds.forEach((entry) => requireId(entry, true));
      if (
        response.decision.selectedIds.length <
          context.request.minimumSelections ||
        response.decision.selectedIds.length > context.request.maximumSelections
      )
        fail(`${path}.decision.selectedIds`, "OUT_INVALID_SELECTION_COUNT");
    }
    if (response.decision?.kind === "ordering") {
      response.decision.orderedIds.forEach((entry) => requireId(entry, false));
      if (
        response.decision.orderedIds.length !==
          context.request.orderTargetIds.length ||
        response.decision.orderedIds.some(
          (entry) => !context.request.orderTargetIds.includes(entry),
        )
      )
        fail(`${path}.decision.orderedIds`, "OUT_INVALID_PERMUTATION");
    }
    if (response.decision?.kind === "patch")
      for (const op of response.decision.operations) {
        if (!context.request.allowedOperations.includes(op.op))
          fail(`${path}.decision.operations`, "OUT_OP_NOT_ALLOWED_FOR_TASK");
        for (const [key, entry] of Object.entries(op))
          if (key !== "op" && key !== "visitModeCode" && entry !== null)
            if (Array.isArray(entry))
              entry.forEach((localId) => requireId(localId, false));
            else requireId(entry as number, key === "candidateId");
      }
    if (response.contextRequest)
      response.contextRequest.targetIds.forEach((entry) =>
        requireId(entry, false),
      );
  });
}

function validatePlanningFact(value: unknown, path: string) {
  const item = exact(value, path, [
    "contractVersion",
    "factId",
    "factKind",
    "subjectRef",
    "source",
    "observedAt",
    "effectiveAt",
    "validFrom",
    "validUntil",
    "expiresAt",
    "confidence",
    "status",
    "revision",
  ]);
  version(item.contractVersion, `${path}.contractVersion`);
  id(item.factId, `${path}.factId`);
  enumValue(item.factKind, `${path}.factKind`, FACT_KINDS);
  id(item.subjectRef, `${path}.subjectRef`);
  const source = exact(item.source, `${path}.source`, [
    "sourceKind",
    "provider",
    "sourceRef",
    "authorityBand",
  ]);
  enumValue(source.sourceKind, `${path}.source.sourceKind`, SOURCE_KINDS);
  text(source.provider, `${path}.source.provider`, 100, true);
  id(source.sourceRef, `${path}.source.sourceRef`);
  enumValue(source.authorityBand, `${path}.source.authorityBand`, [
    "A",
    "B",
    "C",
    "D",
  ]);
  instant(item.observedAt, `${path}.observedAt`);
  for (const key of ["effectiveAt", "validFrom", "validUntil", "expiresAt"])
    instant(item[key], `${path}.${key}`, true);
  nullableScore(item.confidence, `${path}.confidence`);
  enumValue(item.status, `${path}.status`, [
    "active",
    "superseded",
    "revoked",
    "unknown",
  ]);
  if (
    item.revision !== null &&
    typeof item.revision !== "string" &&
    !Number.isSafeInteger(item.revision)
  )
    fail(`${path}.revision`, "INVALID_REVISION");
}

export const parsePlanningFactRefV1 = (
  input: unknown,
): PlanningValidationResult<PlanningFactRefV1> =>
  parse(input, validatePlanningFact);

export const parseFactUsabilityV1 = (
  input: unknown,
): PlanningValidationResult<FactUsabilityV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "factRef",
      "decisionUse",
      "freshness",
      "action",
      "reasonCodes",
      "evaluatedAt",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    id(item.factRef, `${path}.factRef`);
    enumValue(item.decisionUse, `${path}.decisionUse`, DECISION_USES);
    enumValue(item.freshness, `${path}.freshness`, FRESHNESS_STATES);
    enumValue(item.action, `${path}.action`, FACT_USABILITY_ACTIONS);
    if (
      item.freshness === "EXPIRED" &&
      (item.action === "USE" || item.action === "USE_WITH_WARNING")
    )
      fail(`${path}.action`, "EXPIRED_FACT_ACTION_FORBIDDEN");
    strings(item.reasonCodes, `${path}.reasonCodes`);
    instant(item.evaluatedAt, `${path}.evaluatedAt`);
  });

export const parseReplanProposalV1 = (
  input: unknown,
): PlanningValidationResult<ReplanProposalV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "proposalId",
      "runId",
      "triggerRef",
      "scope",
      "earliestMutableAt",
      "baseTripRevision",
      "basePlanRevision",
      "baseRuntimeRevision",
      "selectedRepairAttemptRef",
      "repairAttempts",
      "protectedRefs",
      "affectedRefs",
      "factRefs",
      "reasonCodes",
      "changeSetRef",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    for (const key of [
      "proposalId",
      "runId",
      "triggerRef",
      "selectedRepairAttemptRef",
    ])
      id(item[key], `${path}.${key}`);
    enumValue(item.scope, `${path}.scope`, REPLAN_SCOPES);
    instant(item.earliestMutableAt, `${path}.earliestMutableAt`);
    for (const key of [
      "baseTripRevision",
      "basePlanRevision",
      "baseRuntimeRevision",
    ])
      numberValue(
        item[key],
        `${path}.${key}`,
        1,
        Number.MAX_SAFE_INTEGER,
        false,
        true,
      );
    const attempts = array(item.repairAttempts, `${path}.repairAttempts`, 100);
    const attemptIds = new Set<string>();
    attempts.forEach((attempt, index) => {
      const p = `${path}.repairAttempts[${index}]`;
      const row = exact(attempt, p, [
        "attemptId",
        "strategyCode",
        "status",
        "issueCodesBefore",
        "issueCodesAfter",
        "affectedRefs",
        "elapsedMilliseconds",
      ]);
      id(row.attemptId, `${p}.attemptId`);
      if (attemptIds.has(row.attemptId as string))
        fail(`${path}.repairAttempts`, "DUPLICATE_ID");
      attemptIds.add(row.attemptId as string);
      text(row.strategyCode, `${p}.strategyCode`, 100);
      enumValue(row.status, `${p}.status`, [
        "accepted",
        "rejected",
        "partial",
        "needs_ai",
      ]);
      strings(row.issueCodesBefore, `${p}.issueCodesBefore`);
      strings(row.issueCodesAfter, `${p}.issueCodesAfter`);
      ids(row.affectedRefs, `${p}.affectedRefs`);
      numberValue(
        row.elapsedMilliseconds,
        `${p}.elapsedMilliseconds`,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
        true,
      );
    });
    if (!attemptIds.has(item.selectedRepairAttemptRef as string))
      fail(`${path}.selectedRepairAttemptRef`, "DANGLING_REPAIR_REF");
    ids(item.protectedRefs, `${path}.protectedRefs`);
    ids(item.affectedRefs, `${path}.affectedRefs`);
    ids(item.factRefs, `${path}.factRefs`);
    strings(item.reasonCodes, `${path}.reasonCodes`);
    id(item.changeSetRef, `${path}.changeSetRef`, true);
    if (
      (item.protectedRefs as string[]).some((entry) =>
        (item.affectedRefs as string[]).includes(entry),
      )
    )
      fail(path, "PROTECTED_REF_AFFECTED");
  });

export const parseDecisionRunV1 = (
  input: unknown,
): PlanningValidationResult<DecisionRunV1> =>
  parse(input, (value, path) => {
    const item = exact(value, path, [
      "contractVersion",
      "traceVersion",
      "decisionRunId",
      "kind",
      "trigger",
      "scope",
      "tripRef",
      "planRef",
      "inputVersionRefs",
      "policyVersionRefs",
      "startedAt",
      "completedAt",
      "outcome",
      "stageTraces",
      "factUsage",
      "scoreRefs",
      "paretoRecordRefs",
      "diversityRecordRefs",
      "repairAttemptRefs",
      "aiUsed",
      "aiUsage",
      "providerUsage",
      "fallbackCodes",
      "finalDecisionRef",
      "proposalRef",
      "engineValidationRef",
      "changeSetRef",
      "previewRef",
      "applyResultRef",
      "userOutcome",
    ]);
    version(item.contractVersion, `${path}.contractVersion`);
    if (item.traceVersion !== "1.0")
      fail(`${path}.traceVersion`, "UNSUPPORTED_VERSION");
    id(item.decisionRunId, `${path}.decisionRunId`);
    enumValue(item.kind, `${path}.kind`, [
      "initial_plan",
      "macro_plan",
      "region_plan",
      "day_plan",
      "item_choice",
      "route_choice",
      "plan_review",
      "replan",
      "runtime_repair",
      "user_explanation",
    ]);
    const trigger = exact(item.trigger, `${path}.trigger`, [
      "kind",
      "eventRef",
      "userIntentCode",
      "occurredAt",
    ]);
    text(trigger.kind, `${path}.trigger.kind`, 100);
    id(trigger.eventRef, `${path}.trigger.eventRef`, true);
    text(trigger.userIntentCode, `${path}.trigger.userIntentCode`, 100, true);
    instant(trigger.occurredAt, `${path}.trigger.occurredAt`);
    const scope = exact(item.scope, `${path}.scope`, ["kind", "subjectRef"]);
    enumValue(scope.kind, `${path}.scope.kind`, [
      "trip",
      "region",
      "day",
      "timeslot",
      "item",
      "event",
    ]);
    id(scope.subjectRef, `${path}.scope.subjectRef`);
    id(item.tripRef, `${path}.tripRef`);
    id(item.planRef, `${path}.planRef`, true);
    const inputRefs = exact(item.inputVersionRefs, `${path}.inputVersionRefs`, [
      "tripContractVersion",
      "tripRevision",
      "planRevision",
      "runtimeRevision",
      "preferenceSnapshotRef",
      "preferenceOverrideRevision",
      "poiFeatureVersion",
      "regionGraphVersion",
    ]);
    for (const key of [
      "tripContractVersion",
      "preferenceSnapshotRef",
      "poiFeatureVersion",
      "regionGraphVersion",
    ])
      text(inputRefs[key], `${path}.inputVersionRefs.${key}`, 160);
    numberValue(
      inputRefs.tripRevision,
      `${path}.inputVersionRefs.tripRevision`,
      1,
      Number.MAX_SAFE_INTEGER,
      false,
      true,
    );
    numberValue(
      inputRefs.planRevision,
      `${path}.inputVersionRefs.planRevision`,
      1,
      Number.MAX_SAFE_INTEGER,
      true,
      true,
    );
    numberValue(
      inputRefs.runtimeRevision,
      `${path}.inputVersionRefs.runtimeRevision`,
      1,
      Number.MAX_SAFE_INTEGER,
      true,
      true,
    );
    numberValue(
      inputRefs.preferenceOverrideRevision,
      `${path}.inputVersionRefs.preferenceOverrideRevision`,
      0,
      Number.MAX_SAFE_INTEGER,
      false,
      true,
    );
    const policyRefs = record(
      item.policyVersionRefs,
      `${path}.policyVersionRefs`,
    );
    if (Object.keys(policyRefs).length === 0)
      fail(`${path}.policyVersionRefs`, "EMPTY_VERSION_REFS");
    for (const [key, ref] of Object.entries(policyRefs)) {
      if (!/^[a-z][A-Za-z0-9]*$/.test(key))
        fail(`${path}.policyVersionRefs`, "INVALID_VERSION_KEY");
      text(ref, `${path}.policyVersionRefs.${key}`, 160);
    }
    instant(item.startedAt, `${path}.startedAt`);
    instant(item.completedAt, `${path}.completedAt`, true);
    enumValue(item.outcome, `${path}.outcome`, [
      "selected",
      "proposal_created",
      "needs_user_confirmation",
      "no_valid_choice",
      "blocked",
      "abstained",
      "superseded",
      "stale_before_apply",
      "applied",
      "rejected_by_user",
      "failed",
    ]);
    const stages = array(item.stageTraces, `${path}.stageTraces`, 100);
    stages.forEach((stage, index) => {
      const p = `${path}.stageTraces[${index}]`;
      const row = exact(stage, p, [
        "stage",
        "inputCount",
        "outputCount",
        "rejectedCount",
        "needsFactCount",
        "elapsedMilliseconds",
        "rejectionReasonCounts",
        "fallbackCodes",
      ]);
      enumValue(row.stage, `${p}.stage`, CANDIDATE_STAGES);
      for (const key of [
        "inputCount",
        "outputCount",
        "rejectedCount",
        "needsFactCount",
      ])
        numberValue(row[key], `${p}.${key}`, 0, 1_000_000, false, true);
      numberValue(
        row.elapsedMilliseconds,
        `${p}.elapsedMilliseconds`,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
        true,
      );
      const counts = record(
        row.rejectionReasonCounts,
        `${p}.rejectionReasonCounts`,
      );
      Object.entries(counts).forEach(([key, count]) => {
        text(key, `${p}.rejectionReasonCounts`, 100);
        numberValue(
          count,
          `${p}.rejectionReasonCounts.${key}`,
          0,
          1_000_000,
          false,
          true,
        );
      });
      strings(row.fallbackCodes, `${p}.fallbackCodes`);
    });
    const facts = array(item.factUsage, `${path}.factUsage`, 10_000);
    facts.forEach((fact, index) => {
      const p = `${path}.factUsage[${index}]`;
      const row = exact(fact, p, [
        "factRef",
        "factKind",
        "subjectRef",
        "freshnessAtDecision",
        "actionAtDecision",
        "authorityBand",
        "confidence",
        "observedAt",
        "fallbackFromFactRef",
      ]);
      id(row.factRef, `${p}.factRef`);
      text(row.factKind, `${p}.factKind`, 100);
      id(row.subjectRef, `${p}.subjectRef`);
      enumValue(
        row.freshnessAtDecision,
        `${p}.freshnessAtDecision`,
        FRESHNESS_STATES,
      );
      enumValue(
        row.actionAtDecision,
        `${p}.actionAtDecision`,
        FACT_USABILITY_ACTIONS,
      );
      if (row.authorityBand !== null)
        enumValue(row.authorityBand, `${p}.authorityBand`, [
          "A",
          "B",
          "C",
          "D",
        ]);
      nullableScore(row.confidence, `${p}.confidence`);
      instant(row.observedAt, `${p}.observedAt`, true);
      id(row.fallbackFromFactRef, `${p}.fallbackFromFactRef`, true);
    });
    for (const key of [
      "scoreRefs",
      "paretoRecordRefs",
      "diversityRecordRefs",
      "repairAttemptRefs",
      "fallbackCodes",
    ])
      ids(item[key], `${path}.${key}`);
    booleanValue(item.aiUsed, `${path}.aiUsed`);
    const ai = array(item.aiUsage, `${path}.aiUsage`, 100);
    ai.forEach((usage, index) => {
      const p = `${path}.aiUsage[${index}]`;
      const row = exact(usage, p, [
        "aiRunRef",
        "taskType",
        "contextContractVersion",
        "decisionContractVersion",
        "modelClass",
        "providerClass",
        "inputTokens",
        "outputTokens",
        "cachedInputTokens",
        "latencyMilliseconds",
        "expansionRounds",
        "retryCount",
        "status",
        "reasonCodes",
      ]);
      id(row.aiRunRef, `${p}.aiRunRef`);
      for (const key of [
        "taskType",
        "contextContractVersion",
        "decisionContractVersion",
      ])
        text(row[key], `${p}.${key}`, 160);
      enumValue(row.modelClass, `${p}.modelClass`, [
        "low_cost",
        "standard",
        "high_reasoning",
        "unknown",
      ]);
      text(row.providerClass, `${p}.providerClass`, 100, true);
      for (const key of [
        "inputTokens",
        "outputTokens",
        "cachedInputTokens",
        "latencyMilliseconds",
      ])
        numberValue(
          row[key],
          `${p}.${key}`,
          0,
          Number.MAX_SAFE_INTEGER,
          true,
          true,
        );
      for (const key of ["expansionRounds", "retryCount"])
        numberValue(row[key], `${p}.${key}`, 0, 1000, false, true);
      enumValue(row.status, `${p}.status`, [
        "decision",
        "need_more_context",
        "no_valid_choice",
        "abstain",
        "error",
      ]);
      strings(row.reasonCodes, `${p}.reasonCodes`);
    });
    const providers = array(item.providerUsage, `${path}.providerUsage`, 1000);
    providers.forEach((usage, index) => {
      const p = `${path}.providerUsage[${index}]`;
      const row = exact(usage, p, [
        "callRef",
        "capability",
        "providerClass",
        "requestPurpose",
        "status",
        "latencyMilliseconds",
        "cacheHit",
        "factRefsProduced",
        "billableUnits",
        "costMinor",
        "currency",
      ]);
      id(row.callRef, `${p}.callRef`);
      enumValue(row.capability, `${p}.capability`, [
        "route",
        "weather",
        "poi",
        "booking",
        "price",
        "availability",
        "other",
      ]);
      text(row.providerClass, `${p}.providerClass`, 100);
      text(row.requestPurpose, `${p}.requestPurpose`, 160);
      enumValue(row.status, `${p}.status`, [
        "ok",
        "timeout",
        "rate_limited",
        "unavailable",
        "contract_error",
        "other_error",
      ]);
      numberValue(
        row.latencyMilliseconds,
        `${p}.latencyMilliseconds`,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
        true,
      );
      if (row.cacheHit !== null) booleanValue(row.cacheHit, `${p}.cacheHit`);
      ids(row.factRefsProduced, `${p}.factRefsProduced`);
      numberValue(
        row.billableUnits,
        `${p}.billableUnits`,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
      );
      numberValue(
        row.costMinor,
        `${p}.costMinor`,
        0,
        Number.MAX_SAFE_INTEGER,
        true,
        true,
      );
      text(row.currency, `${p}.currency`, 3, true);
    });
    for (const key of [
      "finalDecisionRef",
      "proposalRef",
      "engineValidationRef",
      "changeSetRef",
      "previewRef",
      "applyResultRef",
    ])
      id(item[key], `${path}.${key}`, true);
    enumValue(item.userOutcome, `${path}.userOutcome`, [
      "accepted",
      "rejected",
      "modified_then_accepted",
      "ignored",
      "reverted_later",
      "not_applicable",
    ]);
  });
