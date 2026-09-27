import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewIdentities } from "./review-identities.mjs";

export const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const unique = (values) => [...new Set(values.filter(Boolean))].sort(compare);
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const normalized = (value) =>
  (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function combine(observations, decisionFile) {
  const records = new Map();
  const parents = new Map();
  for (const observation of observations) {
    const id = observation.sourceRecordId;
    requireValue(
      typeof id === "string" && id.length > 0 && !records.has(id),
      `Duplicate/missing source identity: ${id}`,
    );
    requireValue(
      observation.nameJa || observation.nameEn,
      `Missing name: ${id}`,
    );
    requireValue(
      Array.isArray(observation.codeClaims) &&
        Array.isArray(observation.evidenceRefs),
      `Missing provenance: ${id}`,
    );
    for (const claim of observation.codeClaims) {
      requireValue(
        typeof claim.masterCode === "string" &&
          /^\d{5}$/.test(claim.masterCode),
        `Invalid five-digit legacy claim: ${id}`,
      );
      requireValue(
        [
          "legacy_effective_not_canonical",
          "legacy_proposal_not_canonical",
        ].includes(claim.kind),
        `Unsupported claim kind: ${id}`,
      );
    }
    for (const ref of observation.evidenceRefs) {
      requireValue(/^https?:\/\//.test(ref), `Invalid evidence URL: ${id}`);
    }
    records.set(id, observation);
    parents.set(id, id);
  }
  const root = (id) => {
    let current = id;
    while (parents.get(current) !== current) current = parents.get(current);
    while (parents.get(id) !== id) {
      const next = parents.get(id);
      parents.set(id, current);
      id = next;
    }
    return current;
  };
  const decisions = [...decisionFile.decisions].sort((a, b) =>
    compare(a.left + "\0" + a.right, b.left + "\0" + b.right),
  );
  const links = new Set();
  for (const decision of decisions) {
    const { left, right } = decision;
    requireValue(
      left !== right && records.has(left) && records.has(right),
      `Unknown/self decision: ${left} / ${right}`,
    );
    const pair = [left, right].sort(compare).join("\0");
    requireValue(!links.has(pair), `Duplicate decision: ${pair}`);
    links.add(pair);
    requireValue(
      decision.decision === "MERGE_CANDIDATE_IDENTITY" &&
        [
          "editorial_bilingual_address_comparison",
          "official_source_identity_review",
        ].includes(decision.method),
      `Unsupported merge method: ${left}`,
    );
    requireValue(
      typeof decision.reason === "string" && decision.reason.length > 0,
      `Missing reason: ${left}`,
    );
    const l = records.get(left),
      r = records.get(right);
    requireValue(
      normalized(l.nameJa) &&
        normalized(l.nameJa) === normalized(r.nameJa) &&
        normalized(l.prefecture) === normalized(r.prefecture) &&
        ((l.address && r.address) ||
          decision.method === "official_source_identity_review"),
      `Identity decision needs matching names/prefecture and address evidence: ${left}`,
    );
    if (decision.method === "official_source_identity_review") {
      requireValue(
        Array.isArray(decision.officialEvidence) &&
          decision.officialEvidence.length > 0 &&
          decision.officialEvidence.every(
            (item) =>
              /^https:\/\//.test(item.url) &&
              typeof item.address === "string" &&
              item.address.length > 0 &&
              item.checkedAt === "2026-09-18",
          ),
        `Missing official identity evidence: ${left}`,
      );
    }
    requireValue(
      decision.evidence?.length === 2,
      `Missing decision evidence: ${left}`,
    );
    for (const record of [l, r]) {
      const evidence = decision.evidence.find(
        (value) => value.sourceRecordId === record.sourceRecordId,
      );
      requireValue(
        evidence?.name === record.nameJa &&
          evidence?.address === record.address &&
          JSON.stringify(evidence.sourceRefs) ===
            JSON.stringify(record.evidenceRefs),
        `Stale decision evidence: ${record.sourceRecordId}`,
      );
    }
    const a = root(left),
      b = root(right);
    if (a !== b)
      parents.set(compare(a, b) < 0 ? b : a, compare(a, b) < 0 ? a : b);
  }
  const groups = new Map();
  for (const record of records.values()) {
    const key = root(record.sourceRecordId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  const rows = [...groups.values()]
    .map((members) => {
      members.sort((a, b) => compare(a.sourceRecordId, b.sourceRecordId));
      const ids = members.map((member) => member.sourceRecordId);
      const key =
        ids.find((id) => id.startsWith("geoshape-nrct-poi:")) ?? ids[0];
      return {
        candidateKey: key,
        canonicalMasterCode: null,
        status: "CANDIDATE_ONLY_IDENTITY_GATE_PENDING",
        namesJa: unique(members.map((m) => m.nameJa)),
        namesEn: unique(members.map((m) => m.nameEn)),
        prefectures: unique(members.map((m) => m.prefecture)),
        addresses: unique(members.map((m) => m.address)),
        sourceRecordIds: ids,
        legacyCodeClaims: members
          .flatMap((m) =>
            m.codeClaims.map((claim) => ({
              ...claim,
              sourceRecordId: m.sourceRecordId,
            })),
          )
          .sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b))),
        evidenceRefs: unique(members.flatMap((m) => m.evidenceRefs)),
        // Lossless member records preserve conflicting facts; none is made authoritative.
        observations: members,
      };
    })
    .sort((a, b) => compare(a.candidateKey, b.candidateKey));
  const codeIndex = new Map();
  const nameIndex = new Map();
  for (const row of rows) {
    for (const claim of row.legacyCodeClaims) {
      if (!codeIndex.has(claim.masterCode))
        codeIndex.set(claim.masterCode, new Map());
      const bindings = codeIndex.get(claim.masterCode);
      if (!bindings.has(row.candidateKey)) bindings.set(row.candidateKey, []);
      bindings.get(row.candidateKey).push(claim);
    }
    for (const member of row.observations) {
      for (const [language, name] of [
        ["ja", member.nameJa],
        ["en", member.nameEn],
      ]) {
        if (!normalized(name) || !normalized(member.prefecture)) continue;
        const key = `${language}:${normalized(member.prefecture)}:${normalized(name)}`;
        if (!nameIndex.has(key)) nameIndex.set(key, new Set());
        nameIndex.get(key).add(row.candidateKey);
      }
    }
  }
  const codeConflicts = [...codeIndex.entries()]
    .filter(([, bindings]) => bindings.size > 1)
    .sort(([a], [b]) => compare(a, b))
    .map(([masterCode, bindings]) => ({
      masterCode,
      status: "UNRESOLVED_DO_NOT_ALLOCATE",
      bindings: [...bindings.entries()]
        .sort(([a], [b]) => compare(a, b))
        .map(([candidateKey, claims]) => ({ candidateKey, claims })),
    }));
  const possibleDuplicates = [...nameIndex.entries()]
    .filter(([, keys]) => keys.size > 1)
    .sort(([a], [b]) => compare(a, b))
    .map(([normalizedNameAndPrefecture, keys]) => ({
      normalizedNameAndPrefecture,
      candidateKeys: [...keys].sort(compare),
      status: "REVIEW_ONLY_NOT_AN_IDENTITY_ASSERTION",
    }));
  const countsBySource = {};
  for (const observation of [...observations].sort((a, b) =>
    compare(a.sourceId, b.sourceId),
  ))
    countsBySource[observation.sourceId] =
      (countsBySource[observation.sourceId] ?? 0) + 1;
  return {
    rows,
    codeConflicts,
    possibleDuplicates,
    summary: {
      inputObservationCount: observations.length,
      uniqueCandidateCount: rows.length,
      explicitCandidateMergeLinks: decisions.length,
      observationsCollapsed: observations.length - rows.length,
      countsBySource,
      distinctLegacyClaimCodes: codeIndex.size,
      conflictedLegacyCodes: codeConflicts.length,
      possibleDuplicateGroups: possibleDuplicates.length,
      missingHistoricalCodeMappings: observations.filter(
        (o) => o.prior2979 && o.codeClaims.length === 0,
      ).length,
      candidatesWithoutAnyCodeClaim: rows.filter(
        (r) => r.legacyCodeClaims.length === 0,
      ).length,
      canonicalAllocatedPois: 0,
      occupiedCorpusLocked: false,
    },
  };
}

export function csvCell(value) {
  let text = String(value ?? "").replace(/\r\n?/g, "\n");
  // CSV is for spreadsheet review. Prevent provider text becoming a formula.
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function generateOutputs(rootDirectory) {
  const inputPath = "data/poi/full/sources/identity-observations.v1.jsonl";
  const decisionPath = "data/poi/full/sources/identity-decisions.v1.json";
  const manifestPath = "data/poi/full/sources/source-manifest.v1.json";
  const input = readFileSync(resolve(rootDirectory, inputPath), "utf8");
  const decisionText = readFileSync(
    resolve(rootDirectory, decisionPath),
    "utf8",
  );
  const manifestText = readFileSync(
    resolve(rootDirectory, manifestPath),
    "utf8",
  );
  const manifest = JSON.parse(manifestText);
  requireValue(
    sha256(input) === manifest.normalizedInputSha256,
    "Normalized input checksum mismatch",
  );
  const observations = input
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  requireValue(
    observations.length === manifest.inputObservationCount,
    "Input count mismatch",
  );
  const result = combine(observations, JSON.parse(decisionText));
  const reviewPaths = [
    "identity-review-baseline.v1.json",
    "identity-official-evidence.v1.json",
    "identity-review-policy.v1.json",
    "legacy-code-lineage.v1.json",
  ].map((name) => "data/poi/full/sources/" + name);
  const reviewInputs = reviewPaths.map((path) => ({
    path,
    content: readFileSync(resolve(rootDirectory, path), "utf8"),
  }));
  const [baseline, officialEvidence, policy, lineage] = reviewInputs.map(
    (entry) => JSON.parse(entry.content),
  );
  const review = reviewIdentities(
    result.rows,
    baseline,
    officialEvidence,
    policy,
  );
  requireValue(
    lineage.total === result.codeConflicts.length &&
      lineage.collisions.length === lineage.total,
    "Code lineage count drift",
  );
  const conflictsByCode = new Map(
    result.codeConflicts.map((item) => [item.masterCode, item]),
  );
  for (const entry of lineage.collisions) {
    const claims =
      conflictsByCode
        .get(entry.masterCode)
        ?.bindings.flatMap((item) => item.claims) ?? [];
    for (const [version, sourceId] of [
      [entry.priorVersion, entry.priorSourceId],
      [entry.laterVersion, entry.laterSourceId],
    ])
      requireValue(
        claims.some(
          (claim) =>
            claim.sourceVersion === version &&
            claim.sourceRecordId === "geoshape-nrct-poi:" + sourceId,
        ),
        "Code lineage binding drift: " + entry.masterCode,
      );
  }
  const outputs = new Map();
  outputs.set(
    "data/poi/full/registry/combined-candidates.v1.jsonl",
    result.rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
  );
  const header = [
    "candidate_key_NOT_master_code",
    "canonical_master_code",
    "names_ja",
    "names_en",
    "prefectures",
    "addresses",
    "entity_types",
    "historical_coordinates_NOT_navigation_verified",
    "legacy_code_claims_NOT_approved",
    "source_record_ids",
    "source_urls",
    "identity_status",
  ];
  const csvRows = result.rows.map((row) => [
    row.candidateKey,
    "",
    row.namesJa.join(" | "),
    row.namesEn.join(" | "),
    row.prefectures.join(" | "),
    row.addresses.join(" | "),
    unique(row.observations.map((o) => o.entityType)).join(" | "),
    JSON.stringify(
      row.observations
        .filter((o) => o.coordinates)
        .map((o) => ({ sourceRecordId: o.sourceRecordId, ...o.coordinates })),
    ),
    row.legacyCodeClaims
      .map((c) => `${c.masterCode} [${c.sourceVersion}; ${c.kind}]`)
      .join(" | "),
    row.sourceRecordIds.join(" | "),
    row.evidenceRefs.join(" | "),
    row.status,
  ]);
  outputs.set(
    "data/poi/full/registry/combined-candidates.v1.csv",
    "\uFEFF" +
      [header, ...csvRows].map((row) => row.map(csvCell).join(",")).join("\n") +
      "\n",
  );
  outputs.set(
    "docs/qa/TASK-068/duplicate-audit.json",
    json({
      schemaVersion: "task068-candidate-duplicate-audit-v1",
      ...result.summary,
      reviewedNameGroups: review.reviewedGroupCount,
      heldIdentityGroups: review.heldGroupCount,
      codeConflicts: result.codeConflicts,
      possibleDuplicates: result.possibleDuplicates,
    }),
  );
  outputs.set(
    "docs/qa/TASK-068/review-queue.json",
    json({
      schemaVersion: "task068-candidate-review-v1",
      status: "IDENTITY_GATE_PENDING",
      codeConflictCount: result.codeConflicts.length,
      nameBucketCount: review.heldGroupCount,
      rawNameBucketCount: result.possibleDuplicates.length,
      reviewedNameBucketCount: review.reviewedGroupCount,
      historicalMappingCount: result.summary.missingHistoricalCodeMappings,
      entries: [
        ...result.codeConflicts.map((c) => ({
          reason: "LEGACY_CODE_COLLISION",
          code: c.masterCode,
          candidateKeys: c.bindings.map((b) => b.candidateKey),
        })),
        ...review.groups
          .filter((g) => g.quarantinedFromEnrichment)
          .map((g) => ({
            reason: g.status,
            groupKey: g.groupKey,
            candidateKeys: g.currentCandidateKeys,
            evidenceFile: "identity-review.json",
          })),
        {
          reason: "HISTORICAL_CODE_MAPPING_UNAVAILABLE",
          sourceRecordIds: observations
            .filter((o) => o.prior2979 && !o.codeClaims.length)
            .map((o) => o.sourceRecordId)
            .sort(compare),
        },
      ],
    }),
  );
  const byKey = new Map(result.rows.map((row) => [row.candidateKey, row]));
  const conflictRows = result.codeConflicts.flatMap((conflict) =>
    conflict.bindings.map((binding) => {
      const row = byKey.get(binding.candidateKey);
      return [
        conflict.masterCode,
        binding.candidateKey,
        row.namesJa.join(" | "),
        row.addresses.join(" | "),
        unique(binding.claims.map((c) => c.sourceVersion)).join(" | "),
        "UNRESOLVED_DO_NOT_ALLOCATE",
      ];
    }),
  );
  outputs.set(
    "data/poi/full/registry/master-code-conflicts.v1.csv",
    "\uFEFF" +
      [
        [
          "legacy_code_NOT_approved",
          "candidate_key",
          "names_ja",
          "addresses",
          "source_versions",
          "status",
        ],
        ...conflictRows,
      ]
        .map((row) => row.map(csvCell).join(","))
        .join("\n") +
      "\n",
  );
  outputs.set("docs/qa/TASK-068/identity-review.json", json(review));
  const renderCsv = (header, rows) =>
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") +
    "\n";
  outputs.set(
    "data/poi/full/registry/identity-review.v1.csv",
    renderCsv(
      [
        "name_group",
        "decision",
        "quarantined_from_enrichment",
        "candidate_keys",
        "addresses",
        "reason",
        "official_evidence_urls",
      ],
      review.groups.map((group) => [
        group.groupKey,
        group.status,
        group.quarantinedFromEnrichment,
        group.currentCandidateKeys.join(" | "),
        group.candidates.map((r) => r.addresses.join(" / ")).join(" | "),
        group.reason,
        group.supplementalOfficialEvidence.map((e) => e.url).join(" | "),
      ]),
    ),
  );
  outputs.set(
    "data/poi/full/registry/code-lineage-review.v1.csv",
    renderCsv(
      [
        "legacy_code_NOT_approved",
        "v38_name",
        "v38_source_id",
        "v371_name",
        "v371_source_id",
        "cause",
        "recommended_candidate_version_NOT_allocation",
        "status",
      ],
      lineage.collisions.map((entry) => [
        entry.masterCode,
        entry.priorName,
        entry.priorSourceId,
        entry.laterName,
        entry.laterSourceId,
        entry.cause,
        "v3.7.1",
        entry.resolution,
      ]),
    ),
  );
  outputs.set(
    "data/poi/full/registry/unmapped-history.v1.csv",
    renderCsv(
      [
        "source_record_id",
        "name_ja",
        "historical_address",
        "master_code_UNKNOWN",
        "source_url",
      ],
      observations
        .filter((o) => o.prior2979)
        .map((o) => [
          o.sourceRecordId,
          o.nameJa,
          o.address,
          "",
          o.evidenceRefs.join(" | "),
        ]),
    ),
  );
  const agreement = [];
  for (const row of result.rows) {
    const index = new Map();
    for (const claim of row.legacyCodeClaims.filter(
      (c) => c.kind === "legacy_effective_not_canonical",
    )) {
      if (!index.has(claim.masterCode)) index.set(claim.masterCode, []);
      index.get(claim.masterCode).push(claim);
    }
    for (const [masterCode, claims] of index)
      if (
        !conflictsByCode.has(masterCode) &&
        new Set(claims.map((c) => c.sourceVersion)).size === 2 &&
        new Set(claims.map((c) => c.sourceRecordId)).size === 1
      )
        agreement.push({
          masterCodeClaim: masterCode,
          sourceRecordId: claims[0].sourceRecordId,
          candidateKey: row.candidateKey,
          versions: unique(claims.map((c) => c.sourceVersion)),
          status: "VERSIONS_AGREE_NOT_CANONICAL_ALLOCATION",
        });
  }
  agreement.sort((a, b) => compare(a.masterCodeClaim, b.masterCodeClaim));
  requireValue(
    agreement.length === lineage.unambiguousNew5021CodeBindings,
    "Version agreement count drift",
  );
  outputs.set(
    "data/poi/full/registry/agreed-legacy-claims.v1.jsonl",
    agreement.map((row) => JSON.stringify(row)).join("\n") + "\n",
  );
  const files = [...outputs].map(([path, content]) => ({
    path,
    sha256: sha256(content),
    bytes: Buffer.byteLength(content),
  }));
  outputs.set(
    "data/poi/full/manifests/combination-checkpoint.v1.json",
    json({
      schemaVersion: "task068-combination-checkpoint-v1",
      status: "COMBINED_CANDIDATE_LIST_READY_IDENTITY_GATE_PENDING",
      scope:
        "Source-record unique candidate groups, not a certified canonical POI universe.",
      ...result.summary,
      reviewedIdentityGroups: review.reviewedGroupCount,
      heldIdentityGroups: review.heldGroupCount,
      heldCandidateCount: review.heldCandidateKeys.length,
      unambiguousLegacyCodeClaims: agreement.length,
      inputs: [
        { path: inputPath, sha256: sha256(input) },
        { path: decisionPath, sha256: sha256(decisionText) },
        { path: manifestPath, sha256: sha256(manifestText) },
        ...reviewInputs.map((entry) => ({
          path: entry.path,
          sha256: sha256(entry.content),
        })),
      ],
      outputs: files,
    }),
  );
  return { outputs, summary: result.summary };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = process.argv[2] ?? "--check";
  requireValue(
    ["--write", "--check", "--dry-run"].includes(mode),
    "Usage: node tools/poi/combine-corpus.mjs [--write|--check|--dry-run]",
  );
  const rootDirectory = fileURLToPath(new URL("../../", import.meta.url));
  const { outputs, summary } = generateOutputs(rootDirectory);
  for (const [path, content] of outputs) {
    const absolute = resolve(rootDirectory, path);
    if (mode === "--write") {
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content);
    }
    if (mode === "--check")
      requireValue(
        readFileSync(absolute, "utf8") === content,
        `Generated output drift: ${path}`,
      );
  }
  console.log(
    JSON.stringify({ mode, ...summary, outputs: outputs.size }, null, 2),
  );
}
