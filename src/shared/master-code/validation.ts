import {
  MASTER_CODE_ENTITY_TYPES,
  MASTER_CODE_LIFECYCLE_STATUSES,
  type MasterCodeEntityType,
  type MasterCodeEntryV1,
  type MasterCodeRegistryV1,
  type MasterCodeValidationIssue,
  type MasterCodeValidationResult,
  type RegionMasterCodeAllocationManifestV1,
} from "./types";

const MASTER_CODE_PATTERN = /^\d{5}$/;
const INVALID_TEXT_PATTERN = /[\u0000-\u001f\u007f]/;
const JAPAN_PREFECTURE_ADMIN_CODES = new Set(
  Array.from({ length: 47 }, (_, index) => String(index + 1).padStart(5, "0")),
);

const RANGE_BY_ENTITY_TYPE: Record<
  MasterCodeEntityType,
  readonly [number, number][]
> = {
  "system.reserved": [
    [0, 0],
    [5000, 9999],
    [90000, 99999],
  ],
  "region.country": [[100, 999]],
  "region.macro_area": [[100, 999]],
  "region.prefecture": [[1, 99]],
  "region.municipality": [[100, 999]],
  "region.travel_region": [[100, 999]],
  "region.district": [[1000, 1999]],
  "region.stay_cluster": [[2000, 2999]],
  "region.onsen_resort": [[3000, 3999]],
  "region.gateway": [[4000, 4999]],
  "poi.cityscape_landmark": [[10000, 19999]],
  "poi.culture_history": [[20000, 29999]],
  "poi.nature": [[30000, 39999]],
  "poi.experience": [[40000, 49999]],
  "poi.museum_art": [[50000, 59999]],
  "poi.religious_historic": [[60000, 69999]],
  "poi.shopping": [[70000, 79999]],
  transport: [[80000, 89999]],
};

const ENTRY_KEYS = [
  "masterCode",
  "entityType",
  "entityRef",
  "lifecycleStatus",
  "supersededBy",
  "sourceRefs",
  "provenance",
  "allocationReason",
  "createdRevision",
  "updatedRevision",
] as const;

function issue(
  issues: MasterCodeValidationIssue[],
  path: string,
  code: string,
  message: string,
) {
  issues.push({ path, code, message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isSafeText(value: unknown, maxLength = 240): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value.trim() === value &&
    !INVALID_TEXT_PATTERN.test(value)
  );
}

function validateExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
  issues: MasterCodeValidationIssue[],
) {
  for (const key of Object.keys(value)) {
    if (!expected.includes(key))
      issue(issues, `${path}.${key}`, "UNKNOWN_FIELD", "Unknown field.");
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key))
      issue(
        issues,
        `${path}.${key}`,
        "MISSING_FIELD",
        "Required field missing.",
      );
  }
}

function validateMasterCodeShape(
  masterCode: unknown,
  path: string,
  issues: MasterCodeValidationIssue[],
) {
  if (typeof masterCode !== "string" || !MASTER_CODE_PATTERN.test(masterCode)) {
    issue(
      issues,
      path,
      "MALFORMED_MASTER_CODE",
      "Master Code must be exactly five ASCII digits.",
    );
  }
}

function validateEntry(
  value: unknown,
  index: number,
  issues: MasterCodeValidationIssue[],
) {
  const path = `$.entries[${index}]`;
  if (!isRecord(value)) {
    issue(issues, path, "INVALID_ENTRY", "Registry entry must be an object.");
    return;
  }
  validateExactKeys(value, ENTRY_KEYS, path, issues);
  validateMasterCodeShape(value.masterCode, `${path}.masterCode`, issues);

  if (
    typeof value.entityType !== "string" ||
    !MASTER_CODE_ENTITY_TYPES.includes(value.entityType as MasterCodeEntityType)
  ) {
    issue(
      issues,
      `${path}.entityType`,
      "UNKNOWN_ENTITY_TYPE",
      "Unknown entity type.",
    );
  }

  if (value.entityRef !== null && !isSafeText(value.entityRef, 160)) {
    issue(
      issues,
      `${path}.entityRef`,
      "INVALID_ENTITY_REF",
      "Entity reference must be trimmed and contain no control characters.",
    );
  }
  if (typeof value.entityRef === "string" && /\s/.test(value.entityRef)) {
    issue(
      issues,
      `${path}.entityRef`,
      "INVALID_ENTITY_REF",
      "Entity reference cannot contain whitespace.",
    );
  }

  if (
    typeof value.lifecycleStatus !== "string" ||
    !MASTER_CODE_LIFECYCLE_STATUSES.includes(
      value.lifecycleStatus as MasterCodeEntryV1["lifecycleStatus"],
    )
  ) {
    issue(
      issues,
      `${path}.lifecycleStatus`,
      "UNKNOWN_LIFECYCLE",
      "Unknown lifecycle status.",
    );
  }

  if (value.supersededBy !== null)
    validateMasterCodeShape(value.supersededBy, `${path}.supersededBy`, issues);

  if (!Array.isArray(value.sourceRefs) || value.sourceRefs.length === 0) {
    issue(
      issues,
      `${path}.sourceRefs`,
      "MISSING_PROVENANCE",
      "Source refs required.",
    );
  } else {
    const seen = new Set<string>();
    value.sourceRefs.forEach((sourceRef, sourceIndex) => {
      if (!isSafeText(sourceRef, 240))
        issue(
          issues,
          `${path}.sourceRefs[${sourceIndex}]`,
          "INVALID_SOURCE_REF",
          "Invalid source reference.",
        );
      if (typeof sourceRef === "string" && seen.has(sourceRef))
        issue(
          issues,
          `${path}.sourceRefs`,
          "DUPLICATE_SOURCE_REF",
          "Duplicate source ref.",
        );
      if (typeof sourceRef === "string") seen.add(sourceRef);
    });
  }

  if (!Array.isArray(value.provenance) || value.provenance.length === 0) {
    issue(
      issues,
      `${path}.provenance`,
      "MISSING_PROVENANCE",
      "Provenance required.",
    );
  } else {
    value.provenance.forEach((item, provenanceIndex) => {
      const itemPath = `${path}.provenance[${provenanceIndex}]`;
      if (!isRecord(item)) {
        issue(
          issues,
          itemPath,
          "INVALID_PROVENANCE",
          "Provenance must be an object.",
        );
        return;
      }
      validateExactKeys(item, ["kind", "ref"], itemPath, issues);
      if (
        !["repository_contract", "allocation_review", "migration"].includes(
          item.kind as string,
        )
      )
        issue(
          issues,
          `${itemPath}.kind`,
          "INVALID_PROVENANCE",
          "Invalid provenance kind.",
        );
      if (!isSafeText(item.ref, 240))
        issue(
          issues,
          `${itemPath}.ref`,
          "INVALID_PROVENANCE",
          "Invalid provenance ref.",
        );
    });
  }

  for (const field of [
    "allocationReason",
    "createdRevision",
    "updatedRevision",
  ] as const) {
    if (!isSafeText(value[field], field === "allocationReason" ? 500 : 120))
      issue(
        issues,
        `${path}.${field}`,
        "INVALID_METADATA",
        `Invalid ${field}.`,
      );
  }

  if (
    typeof value.masterCode === "string" &&
    MASTER_CODE_PATTERN.test(value.masterCode) &&
    typeof value.entityType === "string" &&
    MASTER_CODE_ENTITY_TYPES.includes(value.entityType as MasterCodeEntityType)
  ) {
    const numericCode = Number(value.masterCode);
    const ranges =
      RANGE_BY_ENTITY_TYPE[value.entityType as MasterCodeEntityType];
    if (
      !ranges.some(
        ([minimum, maximum]) =>
          numericCode >= minimum && numericCode <= maximum,
      )
    )
      issue(
        issues,
        `${path}.masterCode`,
        "MASTER_CODE_NAMESPACE_MISMATCH",
        "Master Code is outside the inherited range for this entity type.",
      );
    if (
      value.entityType === "region.prefecture" &&
      JAPAN_PREFECTURE_ADMIN_CODES.has(value.masterCode)
    )
      issue(
        issues,
        `${path}.masterCode`,
        "ADMINISTRATIVE_ID_MASQUERADING_AS_MASTER_CODE",
        "Japan prefecture administrative codes cannot be reused as Master Codes.",
      );
  }

  if (value.lifecycleStatus === "reserved") {
    if (value.entityRef !== null)
      issue(
        issues,
        `${path}.entityRef`,
        "RESERVED_ENTITY_BOUND",
        "Reserved code must be unbound.",
      );
    if (value.entityType !== "system.reserved")
      issue(
        issues,
        `${path}.entityType`,
        "RESERVED_ENTITY_TYPE",
        "Reserved code uses system.reserved.",
      );
    if (value.supersededBy !== null)
      issue(
        issues,
        `${path}.supersededBy`,
        "INVALID_SUPERSESSION",
        "Reserved code cannot supersede.",
      );
  } else if (
    ["active", "deprecated", "superseded"].includes(
      value.lifecycleStatus as string,
    )
  ) {
    if (!isSafeText(value.entityRef, 160))
      issue(
        issues,
        `${path}.entityRef`,
        "MISSING_ENTITY_REF",
        "Allocated code requires entityRef.",
      );
    if (value.entityType === "system.reserved")
      issue(
        issues,
        `${path}.entityType`,
        "ALLOCATED_RESERVED_TYPE",
        "Allocated code cannot be reserved.",
      );
    if (value.lifecycleStatus === "superseded" && value.supersededBy === null)
      issue(
        issues,
        `${path}.supersededBy`,
        "MISSING_SUPERSEDED_TARGET",
        "Superseded code needs target.",
      );
    if (value.lifecycleStatus !== "superseded" && value.supersededBy !== null)
      issue(
        issues,
        `${path}.supersededBy`,
        "INVALID_SUPERSESSION",
        "Only superseded entries have target.",
      );
  }
}

function validateCrossEntryRules(
  entries: unknown[],
  issues: MasterCodeValidationIssue[],
) {
  const entryByCode = new Map<string, Record<string, unknown>>();
  const activeEntity = new Map<string, string>();

  entries.forEach((value, index) => {
    if (!isRecord(value) || typeof value.masterCode !== "string") return;
    if (entryByCode.has(value.masterCode))
      issue(
        issues,
        `$.entries[${index}].masterCode`,
        "DUPLICATE_MASTER_CODE",
        "Duplicate Master Code.",
      );
    else entryByCode.set(value.masterCode, value);

    if (
      value.lifecycleStatus === "active" &&
      typeof value.entityType === "string" &&
      typeof value.entityRef === "string"
    ) {
      const entityKey = `${value.entityType}\u0000${value.entityRef}`;
      if (activeEntity.has(entityKey))
        issue(
          issues,
          `$.entries[${index}].entityRef`,
          "DUPLICATE_ACTIVE_ENTITY_ALLOCATION",
          `Entity already has active Master Code ${activeEntity.get(entityKey)}.`,
        );
      else activeEntity.set(entityKey, value.masterCode);
    }
  });

  entries.forEach((value, index) => {
    if (!isRecord(value) || value.lifecycleStatus !== "superseded") return;
    const target = entryByCode.get(value.supersededBy as string);
    if (!target) {
      issue(
        issues,
        `$.entries[${index}].supersededBy`,
        "MISSING_SUPERSEDED_TARGET",
        "Supersession target is missing.",
      );
      return;
    }
    if (target.lifecycleStatus !== "active")
      issue(
        issues,
        `$.entries[${index}].supersededBy`,
        "INVALID_SUPERSEDED_TARGET",
        "Supersession target must be active.",
      );
    if (
      target.entityType !== value.entityType ||
      target.entityRef !== value.entityRef
    )
      issue(
        issues,
        `$.entries[${index}].supersededBy`,
        "SUPERSESSION_IDENTITY_MISMATCH",
        "Supersession target must preserve entity identity.",
      );
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (code: string) => {
    if (visiting.has(code)) {
      issue(
        issues,
        "$.entries",
        "SUPERSESSION_CYCLE",
        "Supersession graph contains a cycle.",
      );
      return;
    }
    if (visited.has(code)) return;
    visiting.add(code);
    const entry = entryByCode.get(code);
    if (
      entry?.lifecycleStatus === "superseded" &&
      typeof entry.supersededBy === "string"
    )
      visit(entry.supersededBy);
    visiting.delete(code);
    visited.add(code);
  };
  for (const code of entryByCode.keys()) visit(code);
}

export function parseMasterCodeRegistryV1(
  input: unknown,
): MasterCodeValidationResult<MasterCodeRegistryV1> {
  const issues: MasterCodeValidationIssue[] = [];
  if (!isRecord(input))
    return {
      ok: false,
      issues: [
        {
          path: "$",
          code: "INVALID_REGISTRY",
          message: "Registry must be an object.",
        },
      ],
    };
  validateExactKeys(
    input,
    ["schemaVersion", "registryRevision", "governanceStatus", "entries"],
    "$",
    issues,
  );
  if (input.schemaVersion !== "1.0")
    issue(
      issues,
      "$.schemaVersion",
      "UNSUPPORTED_VERSION",
      "Expected schema 1.0.",
    );
  if (!isSafeText(input.registryRevision, 120))
    issue(
      issues,
      "$.registryRevision",
      "INVALID_REVISION",
      "Invalid registry revision.",
    );
  if (input.governanceStatus !== "candidate")
    issue(
      issues,
      "$.governanceStatus",
      "INVALID_GOVERNANCE_STATUS",
      "TASK-043 registry must remain candidate pending human review.",
    );
  if (!Array.isArray(input.entries))
    issue(issues, "$.entries", "INVALID_ENTRIES", "Entries must be an array.");
  else {
    input.entries.forEach((entry, index) =>
      validateEntry(entry, index, issues),
    );
    validateCrossEntryRules(input.entries, issues);
  }
  return issues.length
    ? { ok: false, issues }
    : { ok: true, value: structuredClone(input) as MasterCodeRegistryV1 };
}

export function validateMasterCodeRegistryTransitionV1(
  previousInput: unknown,
  nextInput: unknown,
): MasterCodeValidationResult<MasterCodeRegistryV1> {
  const previous = parseMasterCodeRegistryV1(previousInput);
  if (!previous.ok) return previous;
  const next = parseMasterCodeRegistryV1(nextInput);
  if (!next.ok) return next;
  const issues: MasterCodeValidationIssue[] = [];
  const nextByCode = new Map(
    next.value.entries.map((entry) => [entry.masterCode, entry]),
  );

  for (const oldEntry of previous.value.entries) {
    const replacement = nextByCode.get(oldEntry.masterCode);
    if (!replacement) {
      issue(
        issues,
        `$.entries[masterCode=${oldEntry.masterCode}]`,
        "MASTER_CODE_REMOVED",
        "Registry is append-only; historical codes cannot be removed.",
      );
      continue;
    }
    if (replacement.createdRevision !== oldEntry.createdRevision)
      issue(
        issues,
        `$.entries[masterCode=${oldEntry.masterCode}].createdRevision`,
        "CREATED_REVISION_MUTATED",
        "Created revision is immutable.",
      );

    if (oldEntry.lifecycleStatus !== "reserved") {
      if (
        replacement.entityType !== oldEntry.entityType ||
        replacement.entityRef !== oldEntry.entityRef
      )
        issue(
          issues,
          `$.entries[masterCode=${oldEntry.masterCode}]`,
          oldEntry.lifecycleStatus === "deprecated"
            ? "CODE_RECYCLING_AFTER_DEPRECATION"
            : "ACTIVE_ALLOCATION_MUTATED",
          "Allocated Master Code identity cannot change.",
        );
    }

    const allowedTransitions: Record<
      MasterCodeEntryV1["lifecycleStatus"],
      string[]
    > = {
      reserved: ["reserved", "active"],
      active: ["active", "deprecated", "superseded"],
      deprecated: ["deprecated"],
      superseded: ["superseded"],
    };
    if (
      !allowedTransitions[oldEntry.lifecycleStatus].includes(
        replacement.lifecycleStatus,
      )
    )
      issue(
        issues,
        `$.entries[masterCode=${oldEntry.masterCode}].lifecycleStatus`,
        "INVALID_LIFECYCLE_TRANSITION",
        "Lifecycle transition is not allowed.",
      );
  }

  return issues.length ? { ok: false, issues } : next;
}

export function validateRegionAllocationManifestV1(
  input: unknown,
  registryInput: unknown,
  knownRegions: ReadonlyMap<string, string>,
): MasterCodeValidationResult<RegionMasterCodeAllocationManifestV1> {
  const registry = parseMasterCodeRegistryV1(registryInput);
  if (!registry.ok) return registry;
  const issues: MasterCodeValidationIssue[] = [];
  if (!isRecord(input) || !Array.isArray(input.allocations))
    return {
      ok: false,
      issues: [
        {
          path: "$",
          code: "INVALID_ALLOCATION_MANIFEST",
          message: "Invalid manifest.",
        },
      ],
    };
  validateExactKeys(
    input,
    [
      "schemaVersion",
      "registryRevision",
      "sourceGraphRevision",
      "governanceStatus",
      "allocations",
    ],
    "$",
    issues,
  );
  if (input.schemaVersion !== "1.0")
    issue(
      issues,
      "$.schemaVersion",
      "UNSUPPORTED_VERSION",
      "Expected schema 1.0.",
    );
  if (input.registryRevision !== registry.value.registryRevision)
    issue(
      issues,
      "$.registryRevision",
      "REGISTRY_REVISION_MISMATCH",
      "Allocation manifest must name the registry revision it was generated from.",
    );
  if (input.governanceStatus !== "candidate_pending_human_review")
    issue(
      issues,
      "$.governanceStatus",
      "INVALID_GOVERNANCE_STATUS",
      "Allocation remains a candidate pending human review.",
    );
  if (input.allocations.length !== 50)
    issue(
      issues,
      "$.allocations",
      "INVALID_ALLOCATION_COUNT",
      "Expected exactly 50 allocations.",
    );

  const registryByCode = new Map(
    registry.value.entries.map((entry) => [entry.masterCode, entry]),
  );
  const seenRegions = new Set<string>();
  const seenCodes = new Set<string>();
  input.allocations.forEach((raw, index) => {
    const path = `$.allocations[${index}]`;
    if (!isRecord(raw)) {
      issue(
        issues,
        path,
        "INVALID_ALLOCATION",
        "Allocation must be an object.",
      );
      return;
    }
    validateExactKeys(
      raw,
      [
        "regionId",
        "regionType",
        "masterCode",
        "registryEntityType",
        "lifecycleStatus",
        "sourceRefs",
        "provenance",
        "allocationReason",
      ],
      path,
      issues,
    );
    const regionId = raw.regionId;
    const masterCode = raw.masterCode;
    if (typeof regionId !== "string" || !knownRegions.has(regionId))
      issue(
        issues,
        `${path}.regionId`,
        "UNKNOWN_REGION_ALLOCATION",
        "Unknown Region allocation.",
      );
    if (typeof regionId === "string" && seenRegions.has(regionId))
      issue(
        issues,
        `${path}.regionId`,
        "DUPLICATE_REGION_ALLOCATION",
        "Region allocated twice.",
      );
    if (typeof regionId === "string") seenRegions.add(regionId);
    validateMasterCodeShape(masterCode, `${path}.masterCode`, issues);
    if (typeof masterCode === "string" && seenCodes.has(masterCode))
      issue(
        issues,
        `${path}.masterCode`,
        "DUPLICATE_MASTER_CODE",
        "Code allocated twice.",
      );
    if (typeof masterCode === "string") seenCodes.add(masterCode);

    const entry =
      typeof masterCode === "string"
        ? registryByCode.get(masterCode)
        : undefined;
    if (!entry || entry.lifecycleStatus !== "active")
      issue(
        issues,
        `${path}.masterCode`,
        "UNRESOLVED_MASTER_CODE",
        "Code must resolve active.",
      );
    else if (entry.entityRef !== regionId)
      issue(
        issues,
        `${path}.masterCode`,
        "ALLOCATION_IDENTITY_MISMATCH",
        "Registry identity mismatch.",
      );
    if (
      entry &&
      typeof regionId === "string" &&
      entry.entityType !== `region.${knownRegions.get(regionId)}`
    )
      issue(
        issues,
        `${path}.registryEntityType`,
        "ALLOCATION_TYPE_MISMATCH",
        "Region type mismatch.",
      );
    if (entry && raw.registryEntityType !== entry.entityType)
      issue(
        issues,
        `${path}.registryEntityType`,
        "ALLOCATION_TYPE_MISMATCH",
        "Manifest entity type must match the registry.",
      );
    if (raw.lifecycleStatus !== "active")
      issue(
        issues,
        `${path}.lifecycleStatus`,
        "INACTIVE_REGION_ALLOCATION",
        "Published allocation manifest must reference active entries.",
      );

    if (
      typeof masterCode === "string" &&
      (masterCode === regionId ||
        /^JP(?:-RG|-PREF|-MACRO)-/i.test(masterCode) ||
        /^jp-/i.test(masterCode) ||
        masterCode === "JP")
    )
      issue(
        issues,
        `${path}.masterCode`,
        "SIDE_CHANNEL_IDENTIFIER",
        "A non-Master identifier cannot masquerade as canonical.",
      );
  });

  for (const regionId of knownRegions.keys()) {
    if (!seenRegions.has(regionId))
      issue(
        issues,
        "$.allocations",
        "MISSING_REGION_ALLOCATION",
        `Missing ${regionId}.`,
      );
  }
  return issues.length
    ? { ok: false, issues }
    : {
        ok: true,
        value: structuredClone(input) as RegionMasterCodeAllocationManifestV1,
      };
}

export function masterCodeRangeForEntityType(entityType: MasterCodeEntityType) {
  return RANGE_BY_ENTITY_TYPE[entityType];
}
