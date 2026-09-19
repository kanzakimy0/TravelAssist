import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  POI_FEATURE_DEFINITIONS,
  POI_FEATURE_CODES,
} from "../../src/shared/contracts/planning/features.ts";
import {
  parsePoiFeatureSetV1,
  parsePoiVisitProfileV1,
} from "../../src/shared/contracts/planning/validation.ts";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const PREFIX = "data/poi/full";
export const INPUTS = [
  `${PREFIX}/registry/combined-candidates.v1.jsonl`,
  `${PREFIX}/sources/retained-article-index.v1.json`,
  `${PREFIX}/sources/reviewed-enrichment-evidence.v1.json`,
  `${PREFIX}/rubrics/candidate-feature-rubric.v1.json`,
  "docs/qa/TASK-068/identity-review.json",
  "src/shared/data/master-code-registry.v1.json",
  "src/shared/contracts/planning/features.ts",
  "src/shared/contracts/planning/validation.ts",
  "tools/poi/enrich-candidates.mjs",
  `${PREFIX}/manifests/recovery-population-lock.v1.json`,
  `${PREFIX}/sources/identity-observations.v1.jsonl`,
];
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const json = (value) => JSON.stringify(value, null, 2) + "\n";
const jsonl = (rows) => rows.map((row) => JSON.stringify(row) + "\n").join("");
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const norm = (x) =>
  x
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
const assert = (ok, text) => {
  if (!ok) throw new Error(text);
};
const unique = (items) => [...new Set(items)].sort(cmp);
const EPOCH = "2026-09-18T00:00:00Z";
const featureKind = Object.fromEntries(
  POI_FEATURE_DEFINITIONS.map(([c, , k]) => [c, k]),
);

export function splitBatches(rows, size = 200) {
  assert(
    Number.isInteger(size) && size > 0 && size <= 200,
    "Invalid batch size",
  );
  const sorted = [...rows].sort((a, b) => cmp(a.candidateKey, b.candidateKey));
  assert(
    new Set(sorted.map((r) => r.candidateKey)).size === sorted.length,
    "Duplicate candidate identity",
  );
  return Array.from({ length: Math.ceil(sorted.length / size) }, (_, i) =>
    sorted.slice(i * size, (i + 1) * size),
  );
}

// Inverted index plus bounded cyclic traversal: O(number of links + N*K), no all-pairs scan.
export function sparseNeighbors(rows, k = 20) {
  assert(Number.isInteger(k) && k >= 0 && k <= 20, "Invalid K");
  const index = new Map();
  for (const r of rows)
    for (const a of r.accessLinks) {
      if (!index.has(a.anchorRef)) index.set(a.anchorRef, []);
      index.get(a.anchorRef).push(r.candidateKey);
    }
  const positions = new Map();
  for (const [ref, members] of index) {
    members.sort(cmp);
    positions.set(ref, new Map(members.map((id, i) => [id, i])));
  }
  const result = new Map();
  let probes = 0;
  for (const r of rows) {
    const targets = new Map();
    for (const a of r.accessLinks) {
      const members = index.get(a.anchorRef);
      const at = positions.get(a.anchorRef).get(r.candidateKey);
      for (
        let i = 1;
        i <= Math.min(k, members.length - 1) && targets.size < k;
        i++
      ) {
        probes++;
        const to = members[(at + i) % members.length];
        if (!targets.has(to))
          targets.set(to, {
            from: r.candidateKey,
            to,
            relation: "shared_access_anchor_candidate",
            anchorRef: a.anchorRef,
            routeFeasibility: "UNKNOWN",
            walkable: null,
          });
      }
      if (targets.size === k) break;
    }
    result.set(
      r.candidateKey,
      [...targets.values()].sort((a, b) => cmp(a.to, b.to)),
    );
  }
  return { result, probes };
}

export function buildDataset(
  candidates,
  articleIndex,
  reviewed,
  rubric,
  heldKeys,
) {
  assert(
    rubric.rubricVersion === "candidate-recovery-1.0",
    "Unsupported rubric version",
  );
  assert(
    JSON.stringify(
      rubric.definitions.map(({ code, key, kind }) => [code, key, kind]),
    ) === JSON.stringify(POI_FEATURE_DEFINITIONS),
    "Frozen feature definitions differ",
  );
  const held = new Set(heldKeys);
  const sorted = splitBatches(candidates).flat();
  const articles = new Map(articleIndex.entries.map((a) => [a.sourceRef, a]));
  assert(
    articles.size === articleIndex.entries.length,
    "Duplicate article reference",
  );
  const evidence = new Map(reviewed.entries.map((a) => [a.sourceRef, a]));
  assert(
    evidence.size === reviewed.entries.length,
    "Duplicate reviewed evidence",
  );
  const byUrl = new Map(articleIndex.entries.map((a) => [a.url, a]));
  assert(byUrl.size === articleIndex.entries.length, "Duplicate article URL");
  for (const e of evidence.values()) {
    const a = articles.get(e.sourceRef);
    assert(
      a?.contentSha256 === e.contentSha256,
      `Evidence content hash mismatch: ${e.sourceRef}`,
    );
    assert(
      new Set(e.features.map((f) => f.code)).size === e.features.length,
      "Duplicate feature evidence",
    );
    for (const item of [
      ...e.features,
      ...e.anchors,
      ...(e.visit ? [e.visit] : []),
    ]) {
      const l = item.locator;
      assert(
        l &&
          Number.isInteger(l.offset) &&
          l.offset >= 0 &&
          Number.isInteger(l.length) &&
          l.length > 0 &&
          l.offset + l.length <= a.targetContentEnd &&
          /^[a-f0-9]{64}$/.test(l.locatorSha256),
        "Evidence locator outside target or malformed",
      );
    }
    for (const f of e.features) {
      assert(
        POI_FEATURE_CODES.includes(f.code) &&
          Number.isInteger(f.value) &&
          f.value >= 0 &&
          f.value <= 9,
        "Invalid reviewed feature",
      );
      assert(
        f.reason &&
          f.locator?.locatorSha256 &&
          f.confidence >= 0 &&
          f.confidence <= 1 &&
          f.annotationMethod === "editorial_calibration",
        "Missing reviewed provenance",
      );
    }
  }
  const matched = new Map();
  const articleUsers = new Map();
  for (const r of sorted) {
    assert(
      r.canonicalMasterCode === null && typeof r.candidateKey === "string",
      "Unexpected canonical allocation in recovery layer",
    );
    const names = new Set(
      [
        ...r.namesJa,
        ...r.namesEn,
        ...r.observations.flatMap((o) => o.aliases ?? []),
      ]
        .filter(Boolean)
        .map(norm),
    );
    const matches = unique(r.evidenceRefs)
      .map((u) => byUrl.get(u))
      .filter(
        (a) =>
          a &&
          [a.nameJa, a.nameEn]
            .filter(Boolean)
            .some((n) => names.has(norm(n))) &&
          r.prefectures.includes(a.prefecture),
      );
    matched.set(r.candidateKey, matches);
    for (const a of matches) {
      if (!articleUsers.has(a.sourceRef)) articleUsers.set(a.sourceRef, []);
      articleUsers.get(a.sourceRef).push(r.candidateKey);
    }
  }
  const anchors = new Map();
  const rows = sorted.map((r) => {
    const matches = matched.get(r.candidateKey);
    const ambiguous = matches.some(
      (a) => articleUsers.get(a.sourceRef).length > 1,
    );
    const quarantine = held.has(r.candidateKey) || ambiguous;
    const facts = quarantine
      ? []
      : matches.map((a) => evidence.get(a.sourceRef)).filter(Boolean);
    const values = Object.fromEntries(POI_FEATURE_CODES.map((c) => [c, null]));
    const provenance = [];
    const reviewReasons = [];
    for (const code of POI_FEATURE_CODES) {
      const fs = facts.flatMap((e) =>
        e.features.filter((f) => f.code === code).map((f) => ({ f, e })),
      );
      if (new Set(fs.map(({ f }) => f.value)).size > 1) {
        reviewReasons.push(`CONFLICTING_FEATURE_${code}`);
        continue;
      }
      if (fs.length) {
        values[code] = fs[0].f.value;
        provenance.push({
          featureCode: code,
          kind: featureKind[code],
          value: values[code],
          annotationMethod: "editorial_calibration",
          rubricVersion: rubric.rubricVersion,
          sourceRefs: fs.map(({ e }) => e.sourceRef),
          confidence: Math.min(...fs.map(({ f }) => f.confidence)),
          reasonCodes: [
            "RETAINED_TARGET_SPECIFIC_FACT",
            "EDITORIAL_REVIEW_REQUIRED",
          ],
          facts: fs.map(({ f, e }) => ({
            sourceRef: e.sourceRef,
            reason: f.reason,
            locator: f.locator,
          })),
        });
      }
    }
    const accessLinks = [];
    for (const e of facts)
      for (const a of e.anchors) {
        assert(
          ["rail_station", "bus_stop", "tram_stop", "port"].includes(a.type) &&
            ["walk", "bus", "tram", "road", "ferry"].includes(a.mode) &&
            a.scope &&
            a.name &&
            a.locator?.locatorSha256 &&
            a.confidence >= 0 &&
            a.confidence <= 1,
          "Invalid static access evidence",
        );
        const ref = `candidate-anchor:${hash(`${a.type}|${norm(a.scope)}|${norm(a.name)}`).slice(0, 24)}`;
        if (!anchors.has(ref))
          anchors.set(ref, {
            anchorRef: ref,
            name: a.name,
            type: a.type,
            localityScope: a.scope,
            identityStatus: "CANDIDATE_NAME_SCOPED_NOT_PROVIDER_ID",
            providerRef: null,
            sourceRefs: [],
          });
        const anchor = anchors.get(ref);
        anchor.sourceRefs = unique([...anchor.sourceRefs, e.sourceRef]);
        if (!accessLinks.some((l) => l.anchorRef === ref))
          accessLinks.push({
            anchorRef: ref,
            accessMode: a.mode,
            sourceRefs: [e.sourceRef],
            confidence: a.confidence,
            locator: a.locator,
            distanceMeters: null,
            durationMinutes: null,
            fare: null,
            lastMileWalkLevel: null,
            barrierFree: null,
            currentService: "UNKNOWN",
          });
      }
    const visits = facts.filter((e) => e.visit);
    const visitProfiles = [];
    if (
      visits.length &&
      new Set(visits.map((e) => e.visit.recommendedDurationMinutes)).size === 1
    ) {
      const v = visits[0].visit;
      const profile = {
        contractVersion: "1.0",
        profileVersion: "1.0",
        profileId: `candidate-visit:${hash(r.candidateKey).slice(0, 24)}`,
        poiRef: r.candidateKey,
        visitMode: "full_visit",
        status: "active",
        minimumDurationMinutes: null,
        recommendedDurationMinutes: v.recommendedDurationMinutes,
        maximumUsefulDurationMinutes: null,
        fixedWalkingLoad: null,
        variableWalkingLoad: null,
        fixedPhysicalLoad: null,
        variablePhysicalLoad: null,
        terrainModifier: null,
        standingModifier: null,
        sourceRefs: visits.map((e) => e.sourceRef),
        confidence: v.confidence,
        updatedAt: EPOCH,
      };
      const parsed = parsePoiVisitProfileV1(profile);
      assert(
        parsed.ok,
        `Invalid shared Visit Profile: ${r.candidateKey} ${JSON.stringify(parsed)}`,
      );
      visitProfiles.push({
        profile,
        completeness: "PARTIAL_NUMERIC_DURATION_ONLY",
        provenance: visits.map((e) => ({ sourceRef: e.sourceRef, ...e.visit })),
      });
    } else if (visits.length) reviewReasons.push("CONFLICTING_VISIT_DURATION");
    const featureSet = {
      contractVersion: "1.0",
      featureVersion: "1.0",
      poiRef: r.candidateKey,
      values,
      sourceRefs: unique(provenance.flatMap((p) => p.sourceRefs)),
      confidence: provenance.length
        ? Math.min(...provenance.map((p) => p.confidence))
        : null,
      updatedAt: EPOCH,
    };
    const parsed = parsePoiFeatureSetV1(featureSet);
    assert(
      parsed.ok,
      `Invalid shared feature shape: ${r.candidateKey} ${JSON.stringify(parsed)}`,
    );
    if (quarantine)
      reviewReasons.push(
        ambiguous ? "SHARED_SOURCE_IDENTITY_AMBIGUITY" : "IDENTITY_HOLD",
      );
    else if (!facts.length)
      reviewReasons.push(
        matches.length
          ? "ATTRIBUTE_SOURCE_NOT_EDITORIALLY_REVIEWED"
          : "NO_MATCHED_RETAINED_ATTRIBUTE_SOURCE",
      );
    if (provenance.length < 43) reviewReasons.push("FEATURES_UNKNOWN");
    if (!visitProfiles.length)
      reviewReasons.push("VISIT_PROFILE_EVIDENCE_MISSING");
    else reviewReasons.push("VISIT_DURATION_BOUNDS_AND_LOAD_UNKNOWN");
    if (!accessLinks.length) reviewReasons.push("ACCESS_EVIDENCE_MISSING");
    return {
      candidateKey: r.candidateKey,
      scope: "CANDIDATE_ONLY_NO_CANONICAL_IMPORT",
      identityInputChecksum: hash(JSON.stringify(r)),
      status: quarantine
        ? "QUARANTINED"
        : facts.length
          ? "PARTIAL"
          : matches.length
            ? "REVIEW_REQUIRED"
            : "SOURCE_UNAVAILABLE",
      matchedSourceRefs: matches.map((a) => a.sourceRef),
      featureSet,
      provenance,
      visitProfiles,
      accessLinks,
      reviewReasons,
      currentFactUsability: "UNKNOWN_REVERIFY_VIA_EXISTING_FACT_POLICY",
      humanReview: "PENDING",
    };
  });
  const graph = sparseNeighbors(rows);
  for (const r of rows) r.neighbors = graph.result.get(r.candidateKey);
  return {
    rows,
    anchors: [...anchors.values()].sort((a, b) =>
      cmp(a.anchorRef, b.anchorRef),
    ),
    neighborProbes: graph.probes,
    articleUsers,
    sourceCoverage: {
      indexedArticles: articleIndex.entries.length,
      bodyAvailable: articleIndex.entries.filter((a) => a.bodyAvailable).length,
      mixedSourceTailDetected: articleIndex.entries.filter(
        (a) => a.mixedSourceTailDetected,
      ).length,
      editorReadArticles: reviewed.reviewedArticleCount,
      usableReviewedArticles: reviewed.entries.length,
      matchedReviewedArticleRefs: reviewed.entries
        .filter((e) => articleUsers.has(e.sourceRef))
        .map((e) => e.sourceRef),
      unattachedReviewedArticleRefs: reviewed.entries
        .filter((e) => !articleUsers.has(e.sourceRef))
        .map((e) => e.sourceRef),
      sourceTier: "official_tourism",
      currentNetworkReverification: false,
      paidProviderCalls: 0,
    },
  };
}

export function sampleRows(rows) {
  const n = Math.min(
    rows.length,
    Math.max(
      Math.min(10, rows.length),
      Math.min(20, Math.ceil(rows.length * 0.1)),
    ),
  );
  return [...rows]
    .sort((a, b) => cmp(hash(a.candidateKey), hash(b.candidateKey)))
    .slice(0, n)
    .map((r) => ({
      candidateKey: r.candidateKey,
      status: r.status,
      known: r.provenance.length,
      check: "MACHINE_INVARIANT_SAMPLE_NOT_HUMAN_REVIEW",
    }));
}

export function generateArtifacts(dataset, inputChecksum, rubricVersion) {
  const files = new Map();
  files.set(
    "docs/qa/TASK-068/source-coverage.json",
    json(dataset.sourceCoverage),
  );
  const batches = [];
  for (const [i, rows] of splitBatches(dataset.rows).entries()) {
    const batchId = `batch-${String(i + 1).padStart(4, "0")}`;
    const path = `${PREFIX}/features/${batchId}.jsonl`;
    const content = jsonl(
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(
            ([key]) =>
              !["visitProfiles", "accessLinks", "neighbors"].includes(key),
          ),
        ),
      ),
    );
    // Independent partitions keep large fields out of feature readers.
    const parts = new Map([
      [path, content],
      [
        `${PREFIX}/visit-profiles/${batchId}.jsonl`,
        jsonl(
          rows.flatMap((r) =>
            r.visitProfiles.map((p) => ({
              candidateKey: r.candidateKey,
              ...p,
            })),
          ),
        ),
      ],
      [
        `${PREFIX}/transport-anchors/${batchId}.jsonl`,
        jsonl(
          rows.flatMap((r) =>
            r.accessLinks.map((a) => ({ candidateKey: r.candidateKey, ...a })),
          ),
        ),
      ],
      [
        `${PREFIX}/neighbors/${batchId}.jsonl`,
        jsonl(rows.flatMap((r) => r.neighbors)),
      ],
    ]);
    for (const [p, text] of parts) files.set(p, text);
    const known = rows.reduce((n, r) => n + r.provenance.length, 0);
    batches.push({
      batchId,
      orderedCandidateKeys: rows.map((r) => r.candidateKey),
      candidateCount: rows.length,
      first: rows[0].candidateKey,
      last: rows.at(-1).candidateKey,
      schemaVersion: "task068-candidate-sidecar-v1",
      rubricVersion,
      inputChecksum: hash(
        inputChecksum + jsonl(rows.map((r) => r.candidateKey)),
      ),
      outputs: [...parts].map(([p, text]) => ({ path: p, sha256: hash(text) })),
      status: "EVALUATED_WITH_REVIEW_GAPS",
      knownFeatures: known,
      nullFeatures: rows.length * 43 - known,
      visitProfileCount: rows.reduce((n, r) => n + r.visitProfiles.length, 0),
      transportLinkCount: rows.reduce((n, r) => n + r.accessLinks.length, 0),
      neighborEdgeCount: rows.reduce((n, r) => n + r.neighbors.length, 0),
      reviewRequiredCount: rows.length,
      errorCount: 0,
      sampling: sampleRows(rows),
      formalIdChecks: "N/A_AMENDED_CANDIDATE_KEYS",
    });
  }
  files.set(
    `${PREFIX}/transport-anchors/anchors.v1.jsonl`,
    jsonl(dataset.anchors),
  );
  const features = POI_FEATURE_DEFINITIONS.map(([code, key, kind]) => ({
    code,
    key,
    kind,
    known: dataset.rows.filter((r) => r.featureSet.values[code] !== null)
      .length,
    null: dataset.rows.filter((r) => r.featureSet.values[code] === null).length,
  }));
  const states = Object.fromEntries(
    unique(dataset.rows.map((r) => r.status)).map((s) => [
      s,
      dataset.rows.filter((r) => r.status === s).length,
    ]),
  );
  const known = features.reduce((n, f) => n + f.known, 0);
  files.set(
    "docs/qa/TASK-068/feature-coverage.json",
    json({
      scope: "APPROVED_CANDIDATE_RECOVERY",
      candidateCount: dataset.rows.length,
      shapeComplete: dataset.rows.length,
      known,
      null: dataset.rows.length * 43 - known,
      features,
      states,
      sourceReadEditorialAnnotations: true,
      independentHumanCalibration: false,
    }),
  );
  files.set(
    "docs/qa/TASK-068/null-coverage.json",
    json({
      unknownIsNull: true,
      noDefaultZeroOrFive: true,
      featureSlots: dataset.rows.length * 43,
      known,
      null: dataset.rows.length * 43 - known,
      features,
    }),
  );
  files.set(
    "docs/qa/TASK-068/visit-profile-coverage.json",
    json({
      candidateCount: dataset.rows.length,
      partialNumericProfiles: dataset.rows.reduce(
        (n, r) => n + r.visitProfiles.length,
        0,
      ),
      completeDurationAndLoadProfiles: 0,
      unsupportedLoadValues: 0,
      note: "No default durations or fixed/variable ratios. Partial profiles cannot certify scheduling or fatigue.",
    }),
  );
  files.set(
    "docs/qa/TASK-068/transport-anchor-coverage.json",
    json({
      anchors: dataset.anchors.length,
      candidatesWithAccess: dataset.rows.filter((r) => r.accessLinks.length)
        .length,
      accessLinks: dataset.rows.reduce((n, r) => n + r.accessLinks.length, 0),
      neighborEdges: dataset.rows.reduce((n, r) => n + r.neighbors.length, 0),
      neighborProbes: dataset.neighborProbes,
      k: 20,
      providerCalls: 0,
      dynamicRouteFacts: 0,
      gatewayProviderMapping: "DEFERRED_FORMAL_IDENTITY_AND_ROUTE_CONTRACT",
      walkabilityCertified: false,
    }),
  );
  files.set(
    "docs/qa/TASK-068/candidate-review-queue.jsonl",
    jsonl(
      dataset.rows.map((r) => ({
        candidateKey: r.candidateKey,
        status: r.status,
        reasons: r.reviewReasons,
        humanReview: r.humanReview,
      })),
    ),
  );
  const manifest = {
    schemaVersion: "task068-enrichment-checkpoint-v1",
    scope: "CANDIDATE_ONLY",
    inputChecksum,
    processed: dataset.rows.length,
    remaining: 0,
    batchTotal: batches.length,
    completedWithReviewGaps: batches.length,
    batches,
    outputs: [...files].map(([path, text]) => ({ path, sha256: hash(text) })),
  };
  files.set("docs/qa/TASK-068/batch-manifest.json", json(manifest));
  return { files, manifest };
}

export function readInputs(root = ROOT) {
  const inputHashes = INPUTS.map((path) => ({
    path,
    sha256: hash(readFileSync(resolve(root, path))),
  }));
  const parse = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
  const candidates = readFileSync(resolve(root, INPUTS[0]), "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  const lock = parse(`${PREFIX}/manifests/recovery-population-lock.v1.json`);
  assert(
    candidates.length === lock.candidateCount,
    "Approved population count changed",
  );
  for (const [path, expected] of Object.entries(lock.hashes))
    assert(
      hash(readFileSync(resolve(root, path))) === expected,
      `Frozen identity/Registry input changed: ${path}`,
    );
  return {
    inputHashes,
    inputChecksum: hash(json(inputHashes)),
    candidates,
    articleIndex: parse(INPUTS[1]),
    reviewed: parse(INPUTS[2]),
    rubric: parse(INPUTS[3]),
    heldKeys: parse(INPUTS[4]).heldCandidateKeys,
  };
}

function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}

export function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (["--resume", "--dry-run", "--check"].includes(key))
      opts[key.slice(2)] = true;
    else if (["--batch", "--from-id", "--to-id"].includes(key)) {
      assert(
        args[i + 1] && !args[i + 1].startsWith("--"),
        `Missing ${key} value`,
      );
      opts[key.slice(2)] = args[++i];
    } else throw new Error(`Unknown argument ${key}`);
  }
  assert(
    !(
      opts.check &&
      (opts.resume ||
        opts["dry-run"] ||
        opts.batch ||
        opts["from-id"] ||
        opts["to-id"])
    ),
    "Check must cover full corpus",
  );
  assert(
    !(opts.batch && (opts["from-id"] || opts["to-id"])),
    "Choose batch or candidate range",
  );
  return opts;
}

export function run(opts, root = ROOT) {
  const startedAt = new Date().toISOString();
  const input = readInputs(root);
  const dataset = buildDataset(
    input.candidates,
    input.articleIndex,
    input.reviewed,
    input.rubric,
    input.heldKeys,
  );
  const { files, manifest } = generateArtifacts(
    dataset,
    input.inputChecksum,
    input.rubric.rubricVersion,
  );
  const same = (p, t) =>
    existsSync(resolve(root, p)) &&
    hash(readFileSync(resolve(root, p))) === hash(t);
  if (opts.check) {
    const failures = [...files].filter(([p, t]) => !same(p, t)).map(([p]) => p);
    assert(
      !failures.length,
      `Non-deterministic/missing output: ${failures.join(",")}`,
    );
    for (const b of manifest.batches) {
      const path = resolve(root, `${PREFIX}/manifests/${b.batchId}.json`);
      assert(existsSync(path), `Missing batch receipt ${b.batchId}`);
      const receipt = JSON.parse(readFileSync(path, "utf8"));
      const { startedAt, completedAt, ...data } = receipt;
      assert(
        Number.isFinite(Date.parse(startedAt)) &&
          Date.parse(completedAt) >= Date.parse(startedAt),
        `Invalid execution dates ${b.batchId}`,
      );
      assert(json(data) === json(b), `Invalid batch receipt ${b.batchId}`);
    }
    assert(
      same(
        `${PREFIX}/manifests/enrichment-inputs.v1.json`,
        json({ inputChecksum: input.inputChecksum, inputs: input.inputHashes }),
      ),
      "Invalid input manifest",
    );
    return {
      mode: "CHECK",
      status: "PASS",
      files: files.size,
      processed: manifest.processed,
      inputChecksum: input.inputChecksum,
    };
  }
  const restricted = !!(opts.batch || opts["from-id"] || opts["to-id"]);
  for (const key of ["from-id", "to-id"])
    if (opts[key])
      assert(
        dataset.rows.some((r) => r.candidateKey === opts[key]),
        `Unknown candidate boundary ${opts[key]}`,
      );
  if (opts["from-id"] && opts["to-id"])
    assert(
      cmp(opts["from-id"], opts["to-id"]) <= 0,
      "Reversed candidate bounds",
    );
  const selected = manifest.batches.filter(
    (b) =>
      (!opts.batch || b.batchId === opts.batch) &&
      (!opts["from-id"] || cmp(b.last, opts["from-id"]) >= 0) &&
      (!opts["to-id"] || cmp(b.first, opts["to-id"]) <= 0),
  );
  assert(selected.length, "No matching batches");
  if (opts["dry-run"])
    return {
      mode: "DRY_RUN",
      writes: 0,
      batches: selected.map((b) => b.batchId),
      rangePolicy:
        "Whole intersecting batches; candidate keys, never formal codes",
      inputChecksum: input.inputChecksum,
    };
  const completions = [];
  for (const batch of selected) {
    const start = new Date().toISOString();
    const outputs = batch.outputs.map((o) => [o.path, files.get(o.path)]);
    let receiptMatches = false;
    try {
      const { startedAt, completedAt, ...receipt } = JSON.parse(
        readFileSync(
          resolve(root, `${PREFIX}/manifests/${batch.batchId}.json`),
          "utf8",
        ),
      );
      receiptMatches =
        json(receipt) === json(batch) &&
        Number.isFinite(Date.parse(startedAt)) &&
        Date.parse(completedAt) >= Date.parse(startedAt);
    } catch {
      /* Missing/interrupted receipt is rebuilt. */
    }
    const skip =
      opts.resume && outputs.every(([p, t]) => same(p, t)) && receiptMatches;
    if (!skip) {
      for (const [p, t] of outputs) atomicWrite(resolve(root, p), t);
      // Receipt is written last. Partial writes are never a completed batch.
      atomicWrite(
        resolve(root, `${PREFIX}/manifests/${batch.batchId}.json`),
        json({
          ...batch,
          startedAt: start,
          completedAt: new Date().toISOString(),
        }),
      );
    }
    completions.push({
      batchId: batch.batchId,
      status: skip ? "SKIPPED_IDENTICAL" : "WRITTEN",
      startedAt: start,
      completedAt: new Date().toISOString(),
    });
  }
  // Global references are safe to refresh. Never certify full completion from a bounded run.
  atomicWrite(
    resolve(root, `${PREFIX}/transport-anchors/anchors.v1.jsonl`),
    files.get(`${PREFIX}/transport-anchors/anchors.v1.jsonl`),
  );
  if (!restricted) {
    for (const [p, t] of files)
      if (!same(p, t)) atomicWrite(resolve(root, p), t);
    atomicWrite(
      resolve(root, `${PREFIX}/manifests/enrichment-inputs.v1.json`),
      json({ inputChecksum: input.inputChecksum, inputs: input.inputHashes }),
    );
  }
  return {
    mode: "RUN",
    status: restricted
      ? "BOUNDED_CHECKPOINT"
      : "CANDIDATE_SCAN_COMPLETE_WITH_GAPS",
    startedAt,
    completedAt: new Date().toISOString(),
    inputChecksum: input.inputChecksum,
    processed: selected.reduce((n, b) => n + b.candidateCount, 0),
    completions,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(json(run(parseArgs(process.argv.slice(2)))));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
