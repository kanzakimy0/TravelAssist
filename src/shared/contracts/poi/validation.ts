import {
  FACT_KINDS,
  PLANNING_CONTRACT_VERSION,
  POI_FEATURE_CODES,
  parsePlanningFactRefV1,
  parsePoiFeatureSetV1,
  parsePoiVisitProfileV1,
} from "../planning";

import {
  CANONICAL_POI_SCHEMA_VERSION,
  CANDIDATE_ADMISSION_SCHEMA_VERSION,
  POI_CLASSIFICATIONS,
  POI_LIFECYCLE_STATUSES,
  type CandidateAdmissionEnvelopeV1,
  type CanonicalPoiDatasetV1,
  type CanonicalPoiV1,
  type PoiValidationIssue,
  type PoiValidationResult,
} from "./types";

class InvalidPoiContract extends Error {
  readonly path: string;
  readonly code: string;

  constructor(path: string, code: string) {
    super(code);
    this.path = path;
    this.code = code;
  }
}

const fail = (path: string, code: string): never => {
  throw new InvalidPoiContract(path, code);
};

const parse = <T>(
  input: unknown,
  validator: (input: unknown) => void,
): PoiValidationResult<T> => {
  try {
    validator(input);
    return { ok: true, value: structuredClone(input) as T };
  } catch (error) {
    if (error instanceof InvalidPoiContract)
      return {
        ok: false,
        issues: [{ path: error.path, code: error.code }],
      };
    return {
      ok: false,
      issues: [{ path: "$", code: "INVALID_JSON_VALUE" }],
    };
  }
};

const object = (value: unknown, path: string): Record<string, unknown> => {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail(path, "INVALID_OBJECT");
  return value as Record<string, unknown>;
};

const exact = (value: unknown, path: string, keys: readonly string[]) => {
  const item = object(value, path);
  for (const key of Object.keys(item))
    if (!keys.includes(key)) fail(`${path}.${key}`, "UNKNOWN_FIELD");
  for (const key of keys)
    if (!Object.hasOwn(item, key)) fail(`${path}.${key}`, "MISSING_FIELD");
  return item;
};

const list = (value: unknown, path: string, maximum = 10_000): unknown[] => {
  if (!Array.isArray(value) || value.length > maximum)
    fail(path, "INVALID_ARRAY");
  return value as unknown[];
};

const text = (
  value: unknown,
  path: string,
  maximum = 300,
  nullable = false,
) => {
  if (nullable && value === null) return;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    fail(path, "INVALID_STRING");
};

const identifier = (value: unknown, path: string, nullable = false) => {
  text(value, path, 180, nullable);
  if (value !== null && /\s/.test(value as string)) fail(path, "INVALID_ID");
};

const poiIdentifier = (value: unknown, path: string) => {
  identifier(value, path);
  if (!/^poi:[a-z0-9][a-z0-9._-]{2,127}$/.test(value as string))
    fail(path, "INVALID_CANONICAL_POI_ID");
};

const instant = (value: unknown, path: string) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    fail(path, "INVALID_INSTANT");
};

const enumeration = (
  value: unknown,
  path: string,
  values: readonly string[],
) => {
  if (typeof value !== "string" || !values.includes(value))
    fail(path, "UNSUPPORTED_VALUE");
};

const finiteNumber = (
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  integer = false,
) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isSafeInteger(value))
  )
    fail(path, integer ? "INVALID_INTEGER" : "INVALID_NUMBER");
};

const booleanValue = (value: unknown, path: string) => {
  if (typeof value !== "boolean") fail(path, "INVALID_BOOLEAN");
};

const stringList = (value: unknown, path: string, maximum = 1000) => {
  const values = list(value, path, maximum);
  values.forEach((entry, index) => identifier(entry, `${path}[${index}]`));
  if (new Set(values).size !== values.length) fail(path, "DUPLICATE_ID");
  return values as string[];
};

const locale = (value: unknown, path: string) => {
  text(value, path, 35);
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value as string))
    fail(path, "INVALID_LOCALE");
};

const STATIC_CANONICAL_FACT_KINDS = new Set<string>([
  "poi_identity",
  "poi_location",
  "poi_operational_calendar",
  "poi_reservation_policy",
  "poi_accessibility",
  "poi_visit_profile",
] satisfies (typeof FACT_KINDS)[number][]);

function validateCanonicalPoi(value: unknown, root = "$") {
  const item = exact(value, root, [
    "schemaVersion",
    "internalId",
    "masterCode",
    "names",
    "classification",
    "location",
    "lifecycle",
    "facts",
    "features",
    "visitProfiles",
    "regionRelations",
    "accessAnchors",
    "externalIds",
    "assetRefs",
    "sourceRefs",
    "revision",
  ]);
  if (item.schemaVersion !== CANONICAL_POI_SCHEMA_VERSION)
    fail(`${root}.schemaVersion`, "UNSUPPORTED_VERSION");
  poiIdentifier(item.internalId, `${root}.internalId`);
  if (item.masterCode !== null) {
    text(item.masterCode, `${root}.masterCode`, 5);
    if (!/^[1-7]\d{4}$/.test(item.masterCode as string))
      fail(`${root}.masterCode`, "MASTER_CODE_OUTSIDE_POI_NAMESPACE");
  }

  const names = exact(item.names, `${root}.names`, [
    "primaryLocale",
    "localized",
    "aliases",
  ]);
  locale(names.primaryLocale, `${root}.names.primaryLocale`);
  const localized = list(names.localized, `${root}.names.localized`, 100);
  if (localized.length === 0) fail(`${root}.names.localized`, "EMPTY_NAMES");
  const localizedKeys = new Set<string>();
  localized.forEach((entry, index) => {
    const path = `${root}.names.localized[${index}]`;
    const row = exact(entry, path, ["locale", "value", "kind"]);
    locale(row.locale, `${path}.locale`);
    text(row.value, `${path}.value`, 300);
    enumeration(row.kind, `${path}.kind`, ["official", "common", "translated"]);
    const key = `${row.locale}\u0000${row.kind}`;
    if (localizedKeys.has(key)) fail(path, "DUPLICATE_LOCALIZED_NAME");
    localizedKeys.add(key);
  });
  if (
    !localized.some(
      (entry) =>
        object(entry, `${root}.names.localized`).locale === names.primaryLocale,
    )
  )
    fail(`${root}.names.primaryLocale`, "PRIMARY_LOCALE_NAME_MISSING");
  const aliases = list(names.aliases, `${root}.names.aliases`, 500);
  const aliasKeys = new Set<string>();
  aliases.forEach((entry, index) => {
    const path = `${root}.names.aliases[${index}]`;
    const row = exact(entry, path, ["locale", "value"]);
    locale(row.locale, `${path}.locale`);
    text(row.value, `${path}.value`, 300);
    const key = `${row.locale}\u0000${row.value}`;
    if (aliasKeys.has(key)) fail(path, "DUPLICATE_ALIAS");
    aliasKeys.add(key);
  });

  const classification = exact(item.classification, `${root}.classification`, [
    "primary",
    "secondary",
    "tags",
  ]);
  enumeration(
    classification.primary,
    `${root}.classification.primary`,
    POI_CLASSIFICATIONS,
  );
  const secondary = list(
    classification.secondary,
    `${root}.classification.secondary`,
    POI_CLASSIFICATIONS.length,
  );
  secondary.forEach((entry, index) =>
    enumeration(
      entry,
      `${root}.classification.secondary[${index}]`,
      POI_CLASSIFICATIONS,
    ),
  );
  if (
    new Set(secondary).size !== secondary.length ||
    secondary.includes(classification.primary)
  )
    fail(`${root}.classification.secondary`, "DUPLICATE_CLASSIFICATION");
  stringList(classification.tags, `${root}.classification.tags`, 100);

  const location = exact(item.location, `${root}.location`, [
    "supportStatus",
    "countryCode",
    "point",
    "geometryRef",
    "address",
  ]);
  enumeration(location.supportStatus, `${root}.location.supportStatus`, [
    "japan_supported",
    "unsupported_outside_japan",
    "unresolved",
  ]);
  if (location.countryCode !== null) {
    text(location.countryCode, `${root}.location.countryCode`, 2);
    if (!/^[A-Z]{2}$/.test(location.countryCode as string))
      fail(`${root}.location.countryCode`, "INVALID_COUNTRY_CODE");
  }
  if (
    location.supportStatus === "japan_supported" &&
    location.countryCode !== "JP"
  )
    fail(`${root}.location.countryCode`, "JAPAN_COUNTRY_REQUIRED");
  if (
    location.supportStatus === "unsupported_outside_japan" &&
    (location.countryCode === null || location.countryCode === "JP")
  )
    fail(`${root}.location.countryCode`, "OUTSIDE_JAPAN_COUNTRY_REQUIRED");
  if (location.supportStatus === "unresolved" && location.countryCode !== null)
    fail(`${root}.location.countryCode`, "UNRESOLVED_LOCATION_MUST_BE_UNKNOWN");
  if (location.point !== null) {
    const point = exact(location.point, `${root}.location.point`, [
      "longitude",
      "latitude",
    ]);
    finiteNumber(
      point.longitude,
      `${root}.location.point.longitude`,
      -180,
      180,
    );
    finiteNumber(point.latitude, `${root}.location.point.latitude`, -90, 90);
    if (
      location.supportStatus === "japan_supported" &&
      !(
        (point.longitude as number) >= 122 &&
        (point.longitude as number) <= 154 &&
        (point.latitude as number) >= 20 &&
        (point.latitude as number) <= 46
      )
    )
      fail(`${root}.location.point`, "POINT_OUTSIDE_JAPAN_BOUNDARY");
  }
  identifier(location.geometryRef, `${root}.location.geometryRef`, true);
  if (location.supportStatus === "unresolved") {
    if (location.point !== null || location.geometryRef !== null)
      fail(`${root}.location`, "UNRESOLVED_LOCATION_HAS_GEOMETRY");
  }
  if (location.address !== null) {
    const address = exact(location.address, `${root}.location.address`, [
      "prefecture",
      "municipality",
      "postalCode",
    ]);
    for (const key of ["prefecture", "municipality", "postalCode"])
      text(address[key], `${root}.location.address.${key}`, 120, true);
  }

  const lifecycle = exact(item.lifecycle, `${root}.lifecycle`, [
    "status",
    "mergedIntoPoiRef",
    "supersededByPoiRef",
    "statusChangedAt",
  ]);
  enumeration(
    lifecycle.status,
    `${root}.lifecycle.status`,
    POI_LIFECYCLE_STATUSES,
  );
  for (const key of ["mergedIntoPoiRef", "supersededByPoiRef"])
    if (lifecycle[key] !== null)
      poiIdentifier(lifecycle[key], `${root}.lifecycle.${key}`);
  instant(lifecycle.statusChangedAt, `${root}.lifecycle.statusChangedAt`);
  if (
    lifecycle.status === "merged" &&
    (lifecycle.mergedIntoPoiRef === null ||
      lifecycle.supersededByPoiRef !== null)
  )
    fail(`${root}.lifecycle`, "INVALID_MERGE_TARGET");
  if (
    lifecycle.status === "superseded" &&
    (lifecycle.supersededByPoiRef === null ||
      lifecycle.mergedIntoPoiRef !== null)
  )
    fail(`${root}.lifecycle`, "INVALID_SUPERSESSION_TARGET");
  if (
    lifecycle.status !== "merged" &&
    lifecycle.status !== "superseded" &&
    (lifecycle.mergedIntoPoiRef !== null ||
      lifecycle.supersededByPoiRef !== null)
  )
    fail(`${root}.lifecycle`, "UNEXPECTED_LIFECYCLE_TARGET");
  if (
    lifecycle.mergedIntoPoiRef === item.internalId ||
    lifecycle.supersededByPoiRef === item.internalId
  )
    fail(`${root}.lifecycle`, "SELF_LIFECYCLE_TARGET");

  const sources = list(item.sourceRefs, `${root}.sourceRefs`, 10_000);
  if (sources.length === 0) fail(`${root}.sourceRefs`, "MISSING_PROVENANCE");
  const sourceIds = new Set<string>();
  sources.forEach((entry, index) => {
    const path = `${root}.sourceRefs[${index}]`;
    const source = exact(entry, path, [
      "sourceRef",
      "sourceKind",
      "authorityBand",
      "locator",
      "observedAt",
      "rights",
    ]);
    identifier(source.sourceRef, `${path}.sourceRef`);
    if (sourceIds.has(source.sourceRef as string))
      fail(`${root}.sourceRefs`, "DUPLICATE_ID");
    sourceIds.add(source.sourceRef as string);
    enumeration(source.sourceKind, `${path}.sourceKind`, [
      "official",
      "provider",
      "open_data",
      "human_verified",
      "derived",
      "master_prior",
      "ai_labeled",
    ]);
    enumeration(source.authorityBand, `${path}.authorityBand`, [
      "A",
      "B",
      "C",
      "D",
    ]);
    text(source.locator, `${path}.locator`, 1000, true);
    instant(source.observedAt, `${path}.observedAt`);
    const rights = exact(source.rights, `${path}.rights`, [
      "persistence",
      "redistribution",
      "attributionRequired",
    ]);
    enumeration(rights.persistence, `${path}.rights.persistence`, [
      "allowed",
      "reference_only",
      "transient_only",
    ]);
    enumeration(rights.redistribution, `${path}.rights.redistribution`, [
      "allowed",
      "restricted",
      "unknown",
    ]);
    booleanValue(
      rights.attributionRequired,
      `${path}.rights.attributionRequired`,
    );
  });
  const requireSources = (refs: unknown, path: string) => {
    const values = stringList(refs, path);
    if (values.length === 0) fail(path, "MISSING_PROVENANCE");
    for (const ref of values)
      if (!sourceIds.has(ref)) fail(path, "DANGLING_SOURCE_REF");
  };

  const facts = list(item.facts, `${root}.facts`, 10_000);
  const factIds = new Set<string>();
  facts.forEach((fact, index) => {
    const path = `${root}.facts[${index}]`;
    const parsed = parsePlanningFactRefV1(fact);
    if (!("value" in parsed)) {
      fail(`${path}${parsed.issue.path.slice(1)}`, parsed.issue.code);
    }
    const validFact = (parsed as Extract<typeof parsed, { ok: true }>).value;
    if (!STATIC_CANONICAL_FACT_KINDS.has(validFact.factKind))
      fail(`${path}.factKind`, "LIVE_FACT_FORBIDDEN_IN_STATIC_MASTER");
    if (validFact.subjectRef !== item.internalId)
      fail(`${path}.subjectRef`, "POI_REF_MISMATCH");
    if (!sourceIds.has(validFact.source.sourceRef))
      fail(`${path}.source.sourceRef`, "DANGLING_SOURCE_REF");
    if (factIds.has(validFact.factId)) fail(`${root}.facts`, "DUPLICATE_ID");
    factIds.add(validFact.factId);
  });

  if (item.features !== null) {
    const parsed = parsePoiFeatureSetV1(item.features);
    if (!("value" in parsed)) {
      fail(`${root}.features${parsed.issue.path.slice(1)}`, parsed.issue.code);
    }
    const validFeatures = (parsed as Extract<typeof parsed, { ok: true }>)
      .value;
    if (validFeatures.poiRef !== item.internalId)
      fail(`${root}.features.poiRef`, "POI_REF_MISMATCH");
    requireSources(validFeatures.sourceRefs, `${root}.features.sourceRefs`);
  }
  const profiles = list(item.visitProfiles, `${root}.visitProfiles`, 100);
  const profileIds = new Set<string>();
  profiles.forEach((profile, index) => {
    const path = `${root}.visitProfiles[${index}]`;
    const parsed = parsePoiVisitProfileV1(profile);
    if (!("value" in parsed)) {
      fail(`${path}${parsed.issue.path.slice(1)}`, parsed.issue.code);
    }
    const validProfile = (parsed as Extract<typeof parsed, { ok: true }>).value;
    if (validProfile.poiRef !== item.internalId)
      fail(`${path}.poiRef`, "POI_REF_MISMATCH");
    if (profileIds.has(validProfile.profileId))
      fail(`${root}.visitProfiles`, "DUPLICATE_ID");
    profileIds.add(validProfile.profileId);
    requireSources(validProfile.sourceRefs, `${path}.sourceRefs`);
  });

  const regions = list(item.regionRelations, `${root}.regionRelations`, 100);
  const regionIds = new Set<string>();
  regions.forEach((relation, index) => {
    const path = `${root}.regionRelations[${index}]`;
    const row = exact(relation, path, [
      "regionRef",
      "relationType",
      "primary",
      "sourceRefs",
    ]);
    identifier(row.regionRef, `${path}.regionRef`);
    if (regionIds.has(row.regionRef as string))
      fail(`${root}.regionRelations`, "DUPLICATE_REGION_REF");
    regionIds.add(row.regionRef as string);
    enumeration(row.relationType, `${path}.relationType`, [
      "located_in",
      "serves",
      "near",
      "spans",
    ]);
    booleanValue(row.primary, `${path}.primary`);
    requireSources(row.sourceRefs, `${path}.sourceRefs`);
  });
  if (
    regions.filter((entry) => object(entry, root).primary === true).length > 1
  )
    fail(`${root}.regionRelations`, "MULTIPLE_PRIMARY_REGIONS");

  const anchors = list(item.accessAnchors, `${root}.accessAnchors`, 100);
  const anchorIds = new Set<string>();
  anchors.forEach((anchor, index) => {
    const path = `${root}.accessAnchors[${index}]`;
    const row = exact(anchor, path, [
      "anchorId",
      "transportNodeRef",
      "kind",
      "relationship",
      "sourceRefs",
    ]);
    identifier(row.anchorId, `${path}.anchorId`);
    if (anchorIds.has(row.anchorId as string))
      fail(`${root}.accessAnchors`, "DUPLICATE_ID");
    anchorIds.add(row.anchorId as string);
    identifier(row.transportNodeRef, `${path}.transportNodeRef`);
    enumeration(row.kind, `${path}.kind`, [
      "entrance",
      "rail",
      "bus",
      "port",
      "parking",
      "other",
    ]);
    enumeration(row.relationship, `${path}.relationship`, [
      "primary",
      "secondary",
      "accessible",
      "seasonal",
    ]);
    requireSources(row.sourceRefs, `${path}.sourceRefs`);
  });

  const externalIds = list(item.externalIds, `${root}.externalIds`, 1000);
  const externalKeys = new Set<string>();
  externalIds.forEach((external, index) => {
    const path = `${root}.externalIds[${index}]`;
    const row = exact(external, path, [
      "provider",
      "externalId",
      "sourceRef",
      "status",
    ]);
    text(row.provider, `${path}.provider`, 100);
    identifier(row.externalId, `${path}.externalId`);
    identifier(row.sourceRef, `${path}.sourceRef`);
    if (!sourceIds.has(row.sourceRef as string))
      fail(`${path}.sourceRef`, "DANGLING_SOURCE_REF");
    enumeration(row.status, `${path}.status`, ["active", "historical"]);
    const key = `${row.provider}\u0000${row.externalId}`;
    if (externalKeys.has(key))
      fail(`${root}.externalIds`, "DUPLICATE_EXTERNAL_ID");
    externalKeys.add(key);
  });
  stringList(item.assetRefs, `${root}.assetRefs`, 1000);

  const revision = exact(item.revision, `${root}.revision`, [
    "recordRevision",
    "factsRevision",
    "featureRevision",
    "visitProfileRevision",
    "createdAt",
    "updatedAt",
  ]);
  for (const key of [
    "recordRevision",
    "factsRevision",
    "featureRevision",
    "visitProfileRevision",
  ])
    finiteNumber(
      revision[key],
      `${root}.revision.${key}`,
      0,
      Number.MAX_SAFE_INTEGER,
      true,
    );
  if ((revision.recordRevision as number) < 1)
    fail(`${root}.revision.recordRevision`, "INVALID_REVISION");
  instant(revision.createdAt, `${root}.revision.createdAt`);
  instant(revision.updatedAt, `${root}.revision.updatedAt`);
  if (
    Date.parse(revision.updatedAt as string) <
    Date.parse(revision.createdAt as string)
  )
    fail(`${root}.revision.updatedAt`, "REVISION_TIME_ORDER");
}

export const parseCanonicalPoiV1 = (
  input: unknown,
): PoiValidationResult<CanonicalPoiV1> =>
  parse(input, (value) => validateCanonicalPoi(value));

export const parseCanonicalPoiDatasetV1 = (
  input: unknown,
): PoiValidationResult<CanonicalPoiDatasetV1> =>
  parse(input, (value) => {
    const dataset = exact(value, "$", [
      "schemaVersion",
      "datasetRevision",
      "records",
    ]);
    if (dataset.schemaVersion !== "1.0")
      fail("$.schemaVersion", "UNSUPPORTED_VERSION");
    identifier(dataset.datasetRevision, "$.datasetRevision");
    const records = list(dataset.records, "$.records", 100_000);
    const poiIds = new Set<string>();
    const masterCodes = new Map<
      string,
      CanonicalPoiV1["lifecycle"]["status"]
    >();
    records.forEach((record, index) => {
      const path = `$.records[${index}]`;
      validateCanonicalPoi(record, path);
      const poi = record as CanonicalPoiV1;
      if (poiIds.has(poi.internalId)) fail(path, "DUPLICATE_INTERNAL_ID");
      poiIds.add(poi.internalId);
      if (poi.masterCode !== null) {
        const existingStatus = masterCodes.get(poi.masterCode);
        if (existingStatus !== undefined)
          fail(
            `${path}.masterCode`,
            [existingStatus, poi.lifecycle.status].every((status) =>
              ["active", "temporarily_closed"].includes(status),
            )
              ? "DUPLICATE_ACTIVE_MASTER_CODE"
              : "DUPLICATE_MASTER_CODE",
          );
        masterCodes.set(poi.masterCode, poi.lifecycle.status);
      }
    });
    records.forEach((record, index) => {
      const poi = record as CanonicalPoiV1;
      const target =
        poi.lifecycle.mergedIntoPoiRef ?? poi.lifecycle.supersededByPoiRef;
      if (target !== null && !poiIds.has(target))
        fail(`$.records[${index}].lifecycle`, "DANGLING_LIFECYCLE_TARGET");
    });
  });

function validateCandidateAdmissionEnvelope(value: unknown) {
  const envelope = exact(value, "$", [
    "schemaVersion",
    "admissionId",
    "candidate",
    "requestedAt",
  ]);
  if (envelope.schemaVersion !== CANDIDATE_ADMISSION_SCHEMA_VERSION)
    fail("$.schemaVersion", "UNSUPPORTED_VERSION");
  identifier(envelope.admissionId, "$.admissionId");
  instant(envelope.requestedAt, "$.requestedAt");
  const candidate = exact(envelope.candidate, "$.candidate", [
    "candidateKey",
    "proposedCanonical",
    "identityResolution",
    "duplicateDisposition",
    "providerObservations",
    "featureEvidence",
    "evidenceRefs",
    "materialConflicts",
  ]);
  identifier(candidate.candidateKey, "$.candidate.candidateKey");
  if (candidate.proposedCanonical !== null)
    validateCanonicalPoi(
      candidate.proposedCanonical,
      "$.candidate.proposedCanonical",
    );
  const identity = exact(
    candidate.identityResolution,
    "$.candidate.identityResolution",
    ["status", "resolvedPoiRef", "evidenceRefs"],
  );
  enumeration(identity.status, "$.candidate.identityResolution.status", [
    "resolved",
    "ambiguous",
    "unresolved",
  ]);
  if (identity.resolvedPoiRef !== null)
    poiIdentifier(
      identity.resolvedPoiRef,
      "$.candidate.identityResolution.resolvedPoiRef",
    );
  if ((identity.status === "resolved") !== (identity.resolvedPoiRef !== null))
    fail("$.candidate.identityResolution", "INVALID_IDENTITY_RESOLUTION");
  stringList(
    identity.evidenceRefs,
    "$.candidate.identityResolution.evidenceRefs",
  );

  const duplicate = exact(
    candidate.duplicateDisposition,
    "$.candidate.duplicateDisposition",
    ["status", "targetPoiRef", "evidenceRefs"],
  );
  enumeration(duplicate.status, "$.candidate.duplicateDisposition.status", [
    "unique",
    "merge_into",
    "conflict",
    "unresolved",
  ]);
  if (duplicate.targetPoiRef !== null)
    poiIdentifier(
      duplicate.targetPoiRef,
      "$.candidate.duplicateDisposition.targetPoiRef",
    );
  if ((duplicate.status === "merge_into") !== (duplicate.targetPoiRef !== null))
    fail("$.candidate.duplicateDisposition", "INVALID_DUPLICATE_DISPOSITION");
  stringList(
    duplicate.evidenceRefs,
    "$.candidate.duplicateDisposition.evidenceRefs",
  );

  const observations = list(
    candidate.providerObservations,
    "$.candidate.providerObservations",
    1000,
  );
  const providerIds = new Set<string>();
  observations.forEach((observation, index) => {
    const path = `$.candidate.providerObservations[${index}]`;
    const row = exact(observation, path, [
      "provider",
      "providerId",
      "sourceRef",
      "observedAt",
      "fields",
    ]);
    text(row.provider, `${path}.provider`, 100);
    identifier(row.providerId, `${path}.providerId`);
    identifier(row.sourceRef, `${path}.sourceRef`);
    instant(row.observedAt, `${path}.observedAt`);
    const providerKey = `${row.provider}\u0000${row.providerId}`;
    if (providerIds.has(providerKey))
      fail("$.candidate.providerObservations", "DUPLICATE_PROVIDER_ID");
    providerIds.add(providerKey);
    const fields = list(row.fields, `${path}.fields`, 1000);
    fields.forEach((field, fieldIndex) => {
      const fieldPath = `${path}.fields[${fieldIndex}]`;
      const normalized = exact(field, fieldPath, [
        "fieldPath",
        "valueClass",
        "persistenceIntent",
        "rightsPolicy",
      ]);
      text(normalized.fieldPath, `${fieldPath}.fieldPath`, 300);
      enumeration(normalized.valueClass, `${fieldPath}.valueClass`, [
        "identifier",
        "name",
        "location",
        "classification",
        "fact",
        "feature",
        "asset",
      ]);
      enumeration(
        normalized.persistenceIntent,
        `${fieldPath}.persistenceIntent`,
        ["canonical", "reference_only", "transient"],
      );
      enumeration(normalized.rightsPolicy, `${fieldPath}.rightsPolicy`, [
        "persistent_allowed",
        "reference_only",
        "transient_only",
        "forbidden",
      ]);
    });
  });

  const featureEvidence = list(
    candidate.featureEvidence,
    "$.candidate.featureEvidence",
    43,
  );
  const featureCodes = new Set<string>();
  featureEvidence.forEach((evidence, index) => {
    const path = `$.candidate.featureEvidence[${index}]`;
    const row = exact(evidence, path, [
      "code",
      "observedValue",
      "proposedValue",
    ]);
    enumeration(row.code, `${path}.code`, POI_FEATURE_CODES);
    if (featureCodes.has(row.code as string))
      fail("$.candidate.featureEvidence", "DUPLICATE_FEATURE_CODE");
    featureCodes.add(row.code as string);
    for (const key of ["observedValue", "proposedValue"])
      if (row[key] !== null)
        finiteNumber(row[key], `${path}.${key}`, 0, 9, true);
  });
  stringList(candidate.evidenceRefs, "$.candidate.evidenceRefs");
  const conflicts = list(
    candidate.materialConflicts,
    "$.candidate.materialConflicts",
    1000,
  );
  const conflictIds = new Set<string>();
  conflicts.forEach((conflict, index) => {
    const path = `$.candidate.materialConflicts[${index}]`;
    const row = exact(conflict, path, [
      "conflictId",
      "fieldPath",
      "evidenceRefs",
      "disposition",
    ]);
    identifier(row.conflictId, `${path}.conflictId`);
    if (conflictIds.has(row.conflictId as string))
      fail("$.candidate.materialConflicts", "DUPLICATE_ID");
    conflictIds.add(row.conflictId as string);
    text(row.fieldPath, `${path}.fieldPath`, 300);
    stringList(row.evidenceRefs, `${path}.evidenceRefs`);
    enumeration(row.disposition, `${path}.disposition`, [
      "resolved",
      "review_required",
      "unresolved",
    ]);
  });
}

export const parseCandidateAdmissionEnvelopeV1 = (
  input: unknown,
): PoiValidationResult<CandidateAdmissionEnvelopeV1> =>
  parse(input, validateCandidateAdmissionEnvelope);

export const formatPoiValidationIssues = (issues: PoiValidationIssue[]) =>
  issues.map(({ path, code }) => `${path}:${code}`).join(", ");

export const CANONICAL_STATIC_FACT_KINDS = Object.freeze([
  ...STATIC_CANONICAL_FACT_KINDS,
]);
export { PLANNING_CONTRACT_VERSION };
