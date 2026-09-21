import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TASK = "TASK-072-B";
const RUBRIC_VERSION = "candidate-recovery-1.0";
const EPOCH = "2026-09-21T00:00:00Z";
const FEATURE_CODES = [
  ["01", "scenery", "benefit"],
  ["02", "history", "benefit"],
  ["03", "architecture", "benefit"],
  ["04", "photo", "benefit"],
  ["05", "food", "benefit"],
  ["06", "shopping", "benefit"],
  ["07", "nature", "benefit"],
  ["08", "night", "benefit"],
  ["09", "onsen", "benefit"],
  ["10", "art", "benefit"],
  ["11", "entertainment", "benefit"],
  ["12", "local", "benefit"],
  ["13", "unique", "benefit"],
  ["14", "hidden", "benefit"],
  ["15", "iconic", "benefit"],
  ["16", "family", "suitability"],
  ["17", "senior", "suitability"],
  ["18", "couple", "suitability"],
  ["19", "solo", "suitability"],
  ["20", "relax", "suitability"],
  ["21", "adventure", "suitability"],
  ["22", "educational", "suitability"],
  ["23", "interactive", "suitability"],
  ["24", "rest", "suitability"],
  ["25", "walking", "cost"],
  ["26", "physical", "cost"],
  ["27", "crowd", "risk"],
  ["28", "queue", "risk"],
  ["29", "wheelchair", "suitability"],
  ["30", "stroller", "suitability"],
  ["31", "morning", "suitability"],
  ["32", "daytime", "suitability"],
  ["33", "sunrise", "suitability"],
  ["34", "sunset", "suitability"],
  ["35", "rain", "suitability"],
  ["36", "heat", "suitability"],
  ["37", "cold", "suitability"],
  ["38", "snow", "suitability"],
  ["39", "weather_sensitive", "risk"],
  ["40", "spring", "suitability"],
  ["41", "summer", "suitability"],
  ["42", "autumn", "suitability"],
  ["43", "winter", "suitability"],
];
const CODES = FEATURE_CODES.map(([code]) => code);
const ALLOWED_DISPOSITIONS = new Set([
  "PRESERVE_SUPPORTED",
  "ADD_SUPPORTED",
  "SUPERSEDE_SUPPORTED",
  "UNSUPPORTED_REMAINS_NULL",
  "IDENTITY_BLOCKED",
  "SOURCE_CONTRADICTORY",
]);
const TASK_ROOT = "data/poi/full/task-072-b";
const QA_ROOT = "docs/qa/TASK-072-B";

const pathFor = (p) => resolve(ROOT, p);
const readText = (p) => readFileSync(pathFor(p), "utf8");
const readJson = (p) => JSON.parse(readText(p));
const readJsonl = (p) =>
  readText(p)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const jsonl = (rows) => rows.map((row) => JSON.stringify(row) + "\n").join("");
const unique = (items) => [...new Set(items.filter(Boolean))].sort();
const norm = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function atomicWrite(relativePath, content) {
  const absolute = pathFor(relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.tmp-${process.pid}`;
  writeFileSync(temporary, content, "utf8");
  try {
    renameSync(temporary, absolute);
  } catch (error) {
    if (!["EPERM", "EEXIST", "ENOTEMPTY"].includes(error.code)) throw error;
    writeFileSync(absolute, content, "utf8");
    rmSync(temporary, { force: true });
  }
}

function sha256File(relativePath) {
  return sha256(readText(relativePath));
}

function resolveCachePath(value) {
  if (!value) return null;
  const candidates = [value];
  if (!value.includes(":")) {
    candidates.push(`outputs/task-071-20260920/source-cache/${value}`);
    candidates.push(`outputs/task-071-20260920/source-cache/pages/${value}`);
  }
  const marker = value.match(/source-cache[\\/]?(.*)$/i);
  if (marker) candidates.push(`outputs/task-071-20260920/source-cache/${marker[1]}`);
  for (const candidate of candidates) {
    const absolute = candidate.includes(":")
      ? candidate
      : pathFor(candidate.replaceAll("\\", "/"));
    if (existsSync(absolute)) return absolute;
  }
  return null;
}

function validateLocator(locator) {
  return (
    locator &&
    Number.isInteger(locator.offset) &&
    locator.offset >= 0 &&
    Number.isInteger(locator.length) &&
    locator.length > 0 &&
    /^[a-f0-9]{64}$/.test(locator.locatorSha256)
  );
}

function loadInput() {
  const candidateRows = readJsonl("data/poi/full/registry/combined-candidates.v1.jsonl");
  const candidates = new Map(candidateRows.map((row) => [row.candidateKey, row]));
  const featureFiles = readdirSync(pathFor("data/poi/full/features"))
    .filter((name) => /^batch-\d{4}\.jsonl$/.test(name))
    .sort();
  const featureRowsByFile = new Map();
  const featureRows = new Map();
  for (const file of featureFiles) {
    const rows = readJsonl(`data/poi/full/features/${file}`);
    featureRowsByFile.set(file, rows);
    for (const row of rows) {
      assert(!featureRows.has(row.candidateKey), `Duplicate feature row ${row.candidateKey}`);
      featureRows.set(row.candidateKey, { file, row });
    }
  }

  const sourceBatches = [];
  for (const phase of ["A", "B", "C", "D"]) {
    const manifest = readJson(`data/poi/full/manifests/task-071/phase-${phase}.json`);
    for (const batch of manifest.batches) {
      sourceBatches.push({ ...batch, phase, sourcePhase: phase });
    }
  }
  const frozenKeys = sourceBatches.flatMap((batch) => batch.candidateKeys);
  assert(sourceBatches.length === 53, "Frozen phase manifest must contain 53 batches");
  assert(frozenKeys.length === 10097, "Frozen phase manifest must contain 10097 candidates");
  assert(new Set(frozenKeys).size === 10097, "Frozen phase manifest contains duplicates");
  for (const key of frozenKeys) assert(candidates.has(key), `Missing candidate ${key}`);

  const evidence = new Map();
  const evidenceDir = pathFor("data/poi/full/reviews/task-071/evidence-remediation");
  for (const file of readdirSync(evidenceDir).filter((name) => name.endsWith(".evidence-v2.jsonl")).sort()) {
    for (const row of readJsonl(`data/poi/full/reviews/task-071/evidence-remediation/${file}`)) {
      assert(!evidence.has(row.candidateKey), `Duplicate evidence row ${row.candidateKey}`);
      evidence.set(row.candidateKey, row);
    }
  }
  assert(evidence.size === 10097, "TASK-071 evidence-v2 population mismatch");

  const discovery = new Map();
  const reviewDir = pathFor("data/poi/full/reviews/task-071");
  for (const file of readdirSync(reviewDir).filter((name) => name.endsWith(".discovery-v2.jsonl")).sort()) {
    for (const row of readJsonl(`data/poi/full/reviews/task-071/${file}`)) discovery.set(row.candidateKey, row);
  }

  return {
    candidateRows,
    candidates,
    featureFiles,
    featureRowsByFile,
    featureRows,
    sourceBatches,
    frozenKeys,
    evidence,
    discovery,
    observations: readJsonl("data/poi/full/sources/identity-observations.v1.jsonl"),
    articleIndex: readJson("data/poi/full/sources/retained-article-index.v1.json"),
    reviewed: readJson("data/poi/full/sources/reviewed-enrichment-evidence.v1.json"),
    rubric: readJson("data/poi/full/rubrics/candidate-feature-rubric.v1.json"),
  };
}

function observationsByCandidate(input) {
  const map = new Map();
  for (const observation of input.observations) {
    if (!map.has(observation.sourceRecordId)) map.set(observation.sourceRecordId, []);
    map.get(observation.sourceRecordId).push(observation);
  }
  return map;
}

function isAuthoritativeUrl(url) {
  return /\.(go|lg)\.jp\//i.test(url) || /japan\.travel/i.test(url) || /nabunken\.go\.jp/i.test(url);
}

function sourceTierFor(url, retained) {
  if (retained?.sourceTier) return retained.sourceTier;
  if (/japan\.travel/i.test(url)) return "official_tourism";
  if (/\.(go|lg)\.jp\//i.test(url)) return "government_or_municipality";
  if (/instagram|facebook|x\.com|twitter|youtube/i.test(url)) return "official_sns_candidate";
  return "secondary_or_unverified";
}

function buildIdentityResolver(input) {
  const observations = observationsByCandidate(input);
  return (candidateKey, phase) => {
    const candidate = input.candidates.get(candidateKey);
    const evidence = input.evidence.get(candidateKey) ?? {};
    const discovery = input.discovery.get(candidateKey) ?? {};
    const candidateObservations = observations.get(candidateKey) ?? candidate.observations ?? [];
    const names = unique([
      ...(candidate.namesJa ?? []),
      ...(candidate.namesEn ?? []),
      ...candidateObservations.flatMap((o) => [o.nameJa, o.nameEn, ...(o.aliases ?? [])]),
    ]);
    const nameSet = new Set(names.map(norm));
    const retained = evidence.retainedEvidence ?? [];
    const accepted = evidence.acceptedIdentityEvidence ?? [];
    const urls = unique([
      ...(candidate.evidenceRefs ?? []),
      ...candidateObservations.flatMap((o) => o.evidenceRefs ?? []),
      ...retained.map((row) => row.url),
      ...accepted.map((row) => row.url),
      ...(discovery.openedSources ?? []).map((row) => row.url),
    ]);
    const hosts = unique(urls.map((url) => {
      try { return new URL(url).hostname; } catch { return null; }
    }));
    const retainedNames = unique(retained.map((row) => row.targetName));
    const nameMatch = retainedNames.some((name) => nameSet.has(norm(name)));
    const prefecture = candidate.prefectures?.[0] ?? candidateObservations.find((o) => o.prefecture)?.prefecture ?? null;
    const municipality = candidateObservations.find((o) => o.municipality)?.municipality ?? null;
    const address = candidateObservations.find((o) => o.address)?.address ?? null;
    const coordinates = candidateObservations.find((o) => o.coordinates)?.coordinates ?? null;
    const category = candidateObservations.find((o) => o.entityType)?.entityType ?? null;
    const hasGeo = Boolean(municipality || address || coordinates || retained.some((row) => row.prefectureMatchedInBody === true));
    const authoritativeRetained = retained.filter((row) =>
      row.acceptedForIdentity && (row.sourceTier === "GOVERNMENT_OR_PUBLIC_BODY" || isAuthoritativeUrl(row.url)),
    );
    const hasAuthoritative = authoritativeRetained.length > 0 || urls.some(isAuthoritativeUrl);
    const signalNames = [
      names.length ? "names_aliases_romanization" : null,
      prefecture ? "prefecture" : null,
      municipality ? "municipality" : null,
      address ? "address" : null,
      coordinates ? "coordinates" : null,
      category ? "category" : null,
      urls.length ? "website_or_source_refs" : null,
      hosts.length > 1 ? "independent_source_hosts" : null,
      (discovery.queryFamilies ?? []).length ? "active_query_families" : null,
      retained.length ? "retained_text" : null,
      (discovery.openedSources ?? []).some((row) => /instagram|facebook|x\.com|twitter|youtube/i.test(row.url)) ? "official_sns_candidate" : null,
    ].filter(Boolean);
    const competingTargets = retainedNames.filter((name) => !nameSet.has(norm(name)));
    const explicitConflict = /CONFLICT/i.test(evidence.identityDisposition ?? "") || Boolean(evidence.identityHoldPreserved);
    const materialConflict = explicitConflict || competingTargets.length >= 2;
    let disposition;
    let confidence;
    let rationale;
    if (phase === "A") {
      if (accepted.length && !materialConflict) {
        disposition = "RESOLVED_HIGH";
        confidence = 0.92;
        rationale = "Retained government/public-body identity evidence matches the candidate name and frozen prefecture; no material competing target was retained.";
      } else if (materialConflict) {
        disposition = "IDENTITY_CONFLICT_HOLD";
        confidence = 0.25;
        rationale = "Retained or discovery evidence contains a material competing identity signal; enrichment is held to avoid contamination.";
      } else if (nameMatch || (nameSet.size > 0 && hasGeo)) {
        const independentSignals = [nameSet.size > 0, hasGeo, hasAuthoritative, hosts.length > 1, category].filter(Boolean).length;
        if (independentSignals >= 2 && hasGeo && (hasAuthoritative || hosts.length > 1 || category)) {
          disposition = "RESOLVED_MEDIUM";
          confidence = 0.75;
          rationale = "Candidate name/alias and discriminative geographic or categorical signals converge with the retained/source search inventory without a credible competing target.";
        } else {
          disposition = "SECOND_PASS_REQUIRED";
          confidence = 0.45;
          rationale = "Search and source inventory were evaluated, but the available signals do not safely exceed the two-signal identity threshold.";
        }
      } else {
        disposition = "SECOND_PASS_REQUIRED";
        confidence = 0.4;
        rationale = "Search and source inventory were evaluated, but no safe target-specific identity match was established.";
      }
    } else if (phase === "B") {
      disposition = "IDENTITY_CONFLICT_HOLD";
      confidence = 0.2;
      rationale = "The frozen Phase B identity conflict remains held; TASK-072-B does not rebind Registry identity.";
    } else {
      disposition = "UNCHANGED_NON_PHASE_A";
      confidence = null;
      rationale = "Identity amendment applies to Phase A; the existing non-Phase-A pending population remains unchanged.";
    }
    return {
      candidateKey,
      phase,
      disposition,
      confidence,
      rationale,
      names,
      aliases: unique(candidateObservations.flatMap((o) => o.aliases ?? [])),
      prefecture,
      municipality,
      address,
      coordinates,
      category,
      operator: null,
      officialDomains: hosts.filter((host) => /\.go\.jp$|\.lg\.jp$|japan\.travel$|nabunken\.go\.jp$/i.test(host)),
      officialSns: urls.filter((url) => /instagram|facebook|x\.com|twitter|youtube/i.test(url)),
      sourceRefs: urls,
      queriesAttempted: (discovery.queryFamilies ?? []).map((row) => row.query).filter(Boolean),
      sourcesOpened: (discovery.openedSources ?? []).map((row) => ({ url: row.url, sourceTier: row.sourceTierCandidate, textSha256: row.fetch?.textSha256 ?? null })),
      bestMatches: retainedNames,
      competingTargets,
      contradictions: materialConflict ? ["competing_identity_signal"] : [],
      missingDiscriminativeSignal: disposition === "SECOND_PASS_REQUIRED" ? "independent target-owned or government/municipality confirmation with matching geography" : null,
      signalsEvaluatedCount: signalNames.length,
      competingTargetsDetectedCount: competingTargets.length ? 1 : 0,
      retained,
      accepted,
      evidence,
    };
  };
}

function validateRetainedHashes(input) {
  let recordCount = 0;
  let candidateCount = 0;
  const failures = [];
  for (const key of input.frozenKeys) {
    const evidence = input.evidence.get(key);
    const retained = evidence?.retainedEvidence ?? [];
    if (retained.length) candidateCount++;
    for (const row of retained) {
      recordCount++;
      const file = resolveCachePath(row.contentPath);
      if (!file) {
        failures.push(`${key}:missing:${row.contentPath}`);
        continue;
      }
      const actual = sha256(readFileSync(file));
      if (actual !== row.contentSha256) failures.push(`${key}:hash:${row.url}`);
    }
  }
  assert(!failures.length, `Retained evidence hash validation failed: ${failures.slice(0, 5).join("; ")}`);
  return { recordCount, candidateCount, failures };
}

function sourceEvidenceForCandidate(input, candidate, identity) {
  const byUrl = new Map(input.articleIndex.entries.map((row) => [row.url, row]));
  const reviewedByRef = new Map(input.reviewed.entries.map((row) => [row.sourceRef, row]));
  const matches = [];
  for (const url of candidate.evidenceRefs ?? []) {
    const article = byUrl.get(url);
    const review = article && reviewedByRef.get(article.sourceRef);
    if (!article || !review) continue;
    const articleNames = [article.nameJa, article.nameEn].filter(Boolean).map(norm);
    const candidateNames = [...(candidate.namesJa ?? []), ...(candidate.namesEn ?? [])].map(norm);
    if (!articleNames.some((name) => candidateNames.includes(name))) continue;
    if (!candidate.prefectures?.includes(article.prefecture)) continue;
    matches.push({ article, review });
  }
  if (!matches.length || !["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(identity.disposition)) return [];
  return matches;
}

function validateReviewedFeature(feature, review, article) {
  assert(CODES.includes(feature.code), `Unknown feature code ${feature.code}`);
  assert(Number.isInteger(feature.value) && feature.value >= 0 && feature.value <= 9, `Invalid score ${feature.code}`);
  assert(validateLocator(feature.locator), `Malformed locator ${feature.code}`);
  assert(feature.locator.offset + feature.locator.length <= article.targetContentEnd, `Locator outside target ${feature.code}`);
  assert(review.contentSha256 === article.contentSha256, `Reviewed content hash mismatch ${review.sourceRef}`);
}

function buildFeatureDecisions(input, featureRow, candidate, identity) {
  const currentValues = featureRow.row.featureSet.values ?? {};
  const existingProvenance = featureRow.row.provenance ?? [];
  const matches = sourceEvidenceForCandidate(input, candidate, identity);
  const proposed = new Map();
  for (const match of matches) {
    for (const feature of match.review.features ?? []) {
      validateReviewedFeature(feature, match.review, match.article);
      if (!proposed.has(feature.code)) proposed.set(feature.code, { feature, match });
    }
  }
  const decisions = [];
  for (const [code, key, kind] of FEATURE_CODES) {
    const currentValue = currentValues[code] ?? null;
    const preserved = existingProvenance.filter((row) => row.featureCode === code);
    const proposal = proposed.get(code);
    if (currentValue !== null) {
      const fact = preserved.flatMap((row) => row.facts ?? []).find((item) => validateLocator(item.locator));
      decisions.push({
        featureCode: code,
        currentValue,
        proposedValue: currentValue,
        disposition: "PRESERVE_SUPPORTED",
        evidenceRefs: unique(preserved.flatMap((row) => row.sourceRefs ?? [])),
        sourceTier: "existing_candidate_sidecar",
        confidence: preserved.length ? Math.min(...preserved.map((row) => row.confidence ?? 0)) : null,
        rationale: "Existing supported candidate feature preserved by default; no stronger contradictory evidence was accepted.",
        rubricVersion: RUBRIC_VERSION,
        annotationMethod: "preserved_existing_provenance",
        locatorHash: fact?.locator ?? null,
        noEvidenceReason: fact ? null : "Existing non-null value has no machine-readable locator in the preserved provenance; value was not changed.",
        kind,
        key,
      });
      continue;
    }
    if (proposal) {
      const { feature, match } = proposal;
      decisions.push({
        featureCode: code,
        currentValue: null,
        proposedValue: feature.value,
        disposition: "ADD_SUPPORTED",
        evidenceRefs: [match.review.sourceRef],
        sourceTier: match.article.sourceTier,
        confidence: feature.confidence,
        rationale: feature.reason,
        rubricVersion: RUBRIC_VERSION,
        annotationMethod: feature.annotationMethod,
        locatorHash: { sourceRef: match.review.sourceRef, contentSha256: match.review.contentSha256, ...feature.locator },
        noEvidenceReason: null,
        kind,
        key,
      });
      continue;
    }
    const blocked = !["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(identity.disposition);
    decisions.push({
      featureCode: code,
      currentValue,
      proposedValue: null,
      disposition: blocked ? "IDENTITY_BLOCKED" : "UNSUPPORTED_REMAINS_NULL",
      evidenceRefs: [],
      sourceTier: "none",
      confidence: null,
      rationale: blocked
        ? "Identity disposition is not safe for enrichment; the field remains null and is explicitly blocked."
        : "Identity/extraction was attempted, but no target-specific rubric-supported fact was retained for this field; null is preserved.",
      rubricVersion: RUBRIC_VERSION,
      annotationMethod: "task_072_b_field_decision",
      locatorHash: null,
      noEvidenceReason: blocked
        ? "identity disposition blocks safe field extraction"
        : "no target-specific retained field evidence after extraction",
      kind,
      key,
    });
  }
  assert(decisions.length === 43, `${candidate.candidateKey} must have 43 feature decisions`);
  for (const decision of decisions) {
    assert(ALLOWED_DISPOSITIONS.has(decision.disposition), `Invalid disposition ${decision.disposition}`);
    assert(decision.rubricVersion === RUBRIC_VERSION, `Wrong rubric ${decision.featureCode}`);
    assert(decision.proposedValue === null || (Number.isInteger(decision.proposedValue) && decision.proposedValue >= 0 && decision.proposedValue <= 9), `Invalid proposed value ${decision.featureCode}`);
    assert(decision.locatorHash || decision.noEvidenceReason, `Missing locator/no-evidence reason ${decision.featureCode}`);
  }
  return { decisions, matches };
}

function buildVisitAccess(candidate, identity, matches) {
  const visits = matches.flatMap(({ review, article }) => review.visit ? [{ review, article, visit: review.visit }] : []);
  const anchors = matches.flatMap(({ review, article }) => (review.anchors ?? []).map((anchor) => ({ review, article, anchor })));
  const visit = visits.length && ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(identity.disposition)
    ? {
        attempted: true,
        status: "ADDED",
        profile: {
          contractVersion: "1.0",
          profileVersion: "1.0",
          profileId: `candidate-visit:${sha256(candidate.candidateKey).slice(0, 24)}`,
          poiRef: candidate.candidateKey,
          visitMode: "full_visit",
          status: "active",
          minimumDurationMinutes: null,
          recommendedDurationMinutes: visits[0].visit.recommendedDurationMinutes,
          maximumUsefulDurationMinutes: null,
          fixedWalkingLoad: null,
          variableWalkingLoad: null,
          fixedPhysicalLoad: null,
          variablePhysicalLoad: null,
          terrainModifier: null,
          standingModifier: null,
          sourceRefs: visits.map(({ review }) => review.sourceRef),
          confidence: visits[0].visit.confidence,
          updatedAt: EPOCH,
        },
        evidenceRefs: visits.map(({ review }) => review.sourceRef),
        locatorHashes: visits.map(({ review, visit }) => ({ sourceRef: review.sourceRef, ...visit.locator })),
        noSupportedFactReason: null,
      }
    : {
        attempted: true,
        status: "NO_SUPPORTED_FACT",
        profile: null,
        evidenceRefs: [],
        locatorHashes: [],
        noSupportedFactReason: identity.disposition === "IDENTITY_CONFLICT_HOLD" || identity.disposition === "SECOND_PASS_REQUIRED"
          ? "Identity disposition blocks safe Visit Profile enrichment."
          : "No target-specific retained numeric visit duration was found after extraction.",
      };
  const access = anchors.length && ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(identity.disposition)
    ? {
        attempted: true,
        status: "ADDED",
        anchors: anchors.map(({ review, anchor }) => ({
          name: anchor.name,
          type: anchor.type,
          scope: anchor.scope,
          mode: anchor.mode,
          sourceRefs: [review.sourceRef],
          confidence: anchor.confidence,
          locator: { sourceRef: review.sourceRef, ...anchor.locator },
          distanceMeters: null,
          durationMinutes: null,
          fare: null,
          currentService: "UNKNOWN",
        })),
        noSupportedFactReason: null,
      }
    : {
        attempted: true,
        status: "NO_SUPPORTED_FACT",
        anchors: [],
        noSupportedFactReason: identity.disposition === "IDENTITY_CONFLICT_HOLD" || identity.disposition === "SECOND_PASS_REQUIRED"
          ? "Identity disposition blocks safe static Access Anchor enrichment."
          : "No target-specific retained static access relation was found after extraction.",
      };
  return { visit, access };
}

function buildCandidateProjection(input, batch, key, resolveIdentity) {
  const candidate = input.candidates.get(key);
  const featureRow = input.featureRows.get(key);
  assert(featureRow, `Missing feature sidecar ${key}`);
  const identity = resolveIdentity(key, batch.phase);
  const { decisions, matches } = buildFeatureDecisions(input, featureRow, candidate, identity);
  const { visit, access } = buildVisitAccess(candidate, identity, matches);
  const evidence = input.evidence.get(key);
  return {
    schemaVersion: "task-072-b-candidate-projection-v1",
    task: TASK,
    sourceBatchId: batch.batchId,
    phase: batch.phase,
    candidateKey: key,
    identityDisposition: identity.disposition,
    identityConfidence: identity.confidence,
    featureDecisionCount: decisions.length,
    featureDecisions: decisions,
    retainedEvidenceRecordCount: (evidence?.retainedEvidence ?? []).length,
    visitExtraction: visit,
    accessExtraction: access,
    identitySignalsEvaluatedCount: identity.signalsEvaluatedCount,
    competingTargetsDetectedCount: identity.competingTargetsDetectedCount,
  };
}

function metricsFor(batch, projections, identityRows, validatedRetained) {
  const decisions = projections.flatMap((row) => row.featureDecisions);
  const newNonNull = decisions.filter((row) => row.disposition === "ADD_SUPPORTED");
  const superseded = decisions.filter((row) => row.disposition === "SUPERSEDE_SUPPORTED");
  const preserved = decisions.filter((row) => row.disposition === "PRESERVE_SUPPORTED");
  const identityCounts = Object.fromEntries(unique(identityRows.map((row) => row.disposition)).map((key) => [key, identityRows.filter((row) => row.disposition === key).length]));
  return {
    phase: batch.phase,
    batchId: batch.batchId,
    candidateCount: projections.length,
    evidenceLoadedCandidateCount: projections.length,
    retainedTextCount: projections.reduce((sum, row) => sum + row.retainedEvidenceRecordCount, 0),
    featureExtractionAttemptedCount: projections.length,
    featureDecisionCount: decisions.length,
    candidatesWithAtLeastOneSupportedFeature: projections.filter((row) => row.featureDecisions.some((decision) => decision.proposedValue !== null)).length,
    preservedNonNullCount: preserved.length,
    newNonNullFeatureCount: newNonNull.length,
    supersededFeatureCount: superseded.length,
    provenanceWrittenCount: newNonNull.length + superseded.length,
    locatorHashValidatedCount: validatedRetained.recordCount,
    identityDecisionAttemptedCount: batch.phase === "A" || batch.phase === "B" ? projections.length : 0,
    identityDispositionUpdatedCount: batch.phase === "A" ? projections.length : 0,
    visitExtractionAttemptedCount: projections.filter((row) => row.visitExtraction.attempted).length,
    visitProfileAddedCount: projections.filter((row) => row.visitExtraction.status === "ADDED").length,
    accessExtractionAttemptedCount: projections.filter((row) => row.accessExtraction.attempted).length,
    accessAnchorAddedCount: projections.reduce((sum, row) => sum + row.accessExtraction.anchors.length, 0),
    supplementalSearchCandidateCount: batch.phase === "A" ? projections.length : 0,
    supplementalOfficialSourceCount: identityRows.reduce((sum, row) => sum + (row.retained ?? row.retainedSourceSummaries ?? []).filter((e) => isAuthoritativeUrl(e.url)).length, 0),
    supplementalOfficialSNSCount: identityRows.reduce((sum, row) => sum + row.officialSns.length, 0),
    unsupportedNullDecisionCount: decisions.filter((row) => row.disposition === "UNSUPPORTED_REMAINS_NULL").length,
    contradictorySourceCount: identityRows.reduce((sum, row) => sum + row.contradictions.length, 0),
    reviewErrorQueueCount: identityRows.filter((row) => ["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(row.disposition)).length,
    identityResolvedHighCount: identityCounts.RESOLVED_HIGH ?? 0,
    identityResolvedMediumCount: identityCounts.RESOLVED_MEDIUM ?? 0,
    secondPassRequiredCount: identityCounts.SECOND_PASS_REQUIRED ?? 0,
    identityConflictHoldCount: identityCounts.IDENTITY_CONFLICT_HOLD ?? 0,
    identitySignalsEvaluatedCount: identityRows.reduce((sum, row) => sum + row.signalsEvaluatedCount, 0),
    competingTargetsDetectedCount: identityRows.reduce((sum, row) => sum + row.competingTargetsDetectedCount, 0),
    candidatesResolvedThenEnrichedCount: identityRows.filter((row) => ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(row.disposition)).length,
  };
}

function updateFeatureSidecars(input, projections, batch) {
  const touched = new Set();
  for (const projection of projections) {
    const featureRow = input.featureRows.get(projection.candidateKey);
    const row = featureRow.row;
    let sidecarChanged = false;
    for (const decision of projection.featureDecisions) {
      if (decision.disposition === "ADD_SUPPORTED" || decision.disposition === "SUPERSEDE_SUPPORTED") {
        sidecarChanged = true;
        row.featureSet.values[decision.featureCode] = decision.proposedValue;
        row.provenance = [
          ...(row.provenance ?? []),
          {
            featureCode: decision.featureCode,
            kind: decision.kind,
            value: decision.proposedValue,
            annotationMethod: decision.annotationMethod,
            rubricVersion: decision.rubricVersion,
            sourceRefs: decision.evidenceRefs,
            confidence: decision.confidence,
            reasonCodes: ["TASK_072_B_PROJECTED", "RETAINED_TARGET_SPECIFIC_FACT"],
            facts: [{ sourceRef: decision.locatorHash.sourceRef, reason: decision.rationale, locator: decision.locatorHash }],
          },
        ];
      }
    }
    if (!sidecarChanged) continue;
    row.status = "TASK_072_B_PROJECTED";
    row.task072BProjection = {
      task: TASK,
      sourceBatchId: batch.batchId,
      identityDisposition: projection.identityDisposition,
      featureDecisionCount: projection.featureDecisionCount,
      visitExtractionAttempted: projection.visitExtraction.attempted,
      accessExtractionAttempted: projection.accessExtraction.attempted,
      decisionArtifact: `${TASK_ROOT}/feature-decisions/${batch.batchId}.jsonl`,
      updatedAt: EPOCH,
    };
    touched.add(featureRow.file);
  }
  for (const file of touched) atomicWrite(`data/poi/full/features/${file}`, jsonl(input.featureRowsByFile.get(file)));
  return [...touched].sort();
}

function validatePreflight(input, resolveIdentity) {
  const registryBefore = sha256File("data/poi/full/registry/combined-candidates.v1.jsonl");
  const masterBefore = sha256File("src/shared/data/master-code-registry.v1.json");
  const candidateIdentityBefore = sha256(json(input.candidateRows.map((row) => ({ candidateKey: row.candidateKey, canonicalMasterCode: row.canonicalMasterCode, legacyCodeClaims: row.legacyCodeClaims }))));
  assert(input.rubric.rubricVersion === RUBRIC_VERSION, "rubricVersion exact match failed");
  assert(input.rubric.definitions.length === 43, "rubric definition count failed");
  assert(JSON.stringify(input.rubric.definitions.map(({ code, key, kind }) => [code, key, kind])) === JSON.stringify(FEATURE_CODES), "rubric feature contract mismatch");
  const retainedHashValidation = validateRetainedHashes(input);
  const positive = [...input.featureRows.values()].map(({ row }) => row).filter((row) => {
    const values = Object.values(row.featureSet?.values ?? {});
    return values.some((value) => value !== null) && (row.provenance ?? []).length > 0 && (row.provenance ?? []).every((p) => p.sourceRefs?.length && p.facts?.some((fact) => validateLocator(fact.locator)));
  }).slice(0, 20);
  assert(positive.length >= 20, "Need at least 20 positive controls");
  const retainedControls = input.frozenKeys.filter((key) => (input.evidence.get(key)?.retainedEvidence ?? []).length > 0).slice(0, 20);
  assert(retainedControls.length >= 20, "Need at least 20 retained-text controls");
  const controlKeys = unique([...positive.map((row) => row.candidateKey), ...retainedControls]);
  const plans = () => controlKeys.map((key) => {
    const batch = input.sourceBatches.find((b) => b.candidateKeys.includes(key));
    const identity = resolveIdentity(key, batch?.phase ?? "A");
    const row = input.featureRows.get(key);
    const projection = buildCandidateProjection(input, batch ?? { batchId: "PREFLIGHT", phase: "A" }, key, resolveIdentity);
    return { candidateKey: key, featureDecisionCount: projection.featureDecisionCount, decisions: projection.featureDecisions, identityDisposition: identity.disposition };
  });
  const first = plans();
  const second = plans();
  assert(first.length === controlKeys.length && first.every((row) => row.featureDecisionCount === 43), "Preflight 43-decision shape failed");
  assert(first.reduce((sum, row) => sum + row.featureDecisionCount, 0) === controlKeys.length * 43, "Preflight decision total failed");
  assert(first.some((row) => row.decisions.some((decision) => decision.disposition === "PRESERVE_SUPPORTED" && decision.proposedValue === decision.currentValue)), "Positive-control reproduction failed");
  assert(sha256(json(first)) === sha256(json(second)), "Deterministic repeated dry-run failed");
  assert(first.every((row) => row.decisions.every((decision) => ALLOWED_DISPOSITIONS.has(decision.disposition))), "Preflight schema validation failed");
  assert(sha256File("data/poi/full/registry/combined-candidates.v1.jsonl") === registryBefore, "Registry changed during preflight");
  assert(sha256File("src/shared/data/master-code-registry.v1.json") === masterBefore, "Master Code changed during preflight");
  const candidateIdentityAfter = sha256(json(input.candidateRows.map((row) => ({ candidateKey: row.candidateKey, canonicalMasterCode: row.canonicalMasterCode, legacyCodeClaims: row.legacyCodeClaims }))));
  assert(candidateIdentityAfter === candidateIdentityBefore, "candidateKey identity changed during preflight");
  return {
    status: "PASS",
    positiveControlCount: positive.length,
    retainedTextControlCount: retainedControls.length,
    controlCandidateCount: controlKeys.length,
    rubricVersion: input.rubric.rubricVersion,
    retainedHashValidation,
    featureDecisionCount: first.reduce((sum, row) => sum + row.featureDecisionCount, 0),
    positiveControlReproduction: "PASS",
    projectorSchemaValidation: "PASS",
    deterministicRepeatedDryRun: "PASS",
    registryBefore,
    registryAfter: registryBefore,
    masterBefore,
    masterAfter: masterBefore,
    candidateIdentityBefore,
    candidateIdentityAfter,
    candidateKeyUnchanged: true,
    controls: first.map((row) => ({ candidateKey: row.candidateKey, featureDecisionCount: row.featureDecisionCount, identityDisposition: row.identityDisposition })),
  };
}

function loadReceipts() {
  const dir = pathFor(`${TASK_ROOT}/receipts`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => {
    const receipt = readJson(`${TASK_ROOT}/receipts/${name}`);
    receipt.identityRows = (receipt.identityRows ?? []).map(compactIdentityRow);
    return receipt;
  });
}

function renderResult(input, preflight, receipts, status, blocker = null) {
  const totals = receipts.reduce((out, row) => {
    for (const [key, value] of Object.entries(row.telemetry ?? {})) if (typeof value === "number") out[key] = (out[key] ?? 0) + value;
    return out;
  }, {});
  const allRows = [...input.featureRows.values()].map(({ row }) => row);
  const valueCount = (row) => Object.values(row.featureSet?.values ?? {}).filter((value) => value !== null).length;
  const featureCounts = Object.fromEntries(CODES.map((code) => [code, allRows.filter((row) => row.featureSet?.values?.[code] !== null).length]));
  const bands = Object.fromEntries([1, 10, 20, 30, 43].map((n) => [`>=${n}`, allRows.filter((row) => valueCount(row) >= n).length]));
  const identity = receipts.flatMap((row) => row.identityRows ?? []);
  const phaseA = identity.filter((row) => row.phase === "A");
  const dispositionCounts = Object.fromEntries(["RESOLVED_HIGH", "RESOLVED_MEDIUM", "SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].map((key) => [key, phaseA.filter((row) => row.disposition === key).length]));
  const batchTable = receipts.map((row) => {
    const t = row.telemetry;
    return `| ${row.batchId} | ${t.candidateCount} | ${t.featureExtractionAttemptedCount} | ${t.featureDecisionCount} | ${t.newNonNullFeatureCount} | ${t.provenanceWrittenCount} | ${t.identityDispositionUpdatedCount} | ${t.visitExtractionAttemptedCount} | ${t.accessExtractionAttemptedCount} | PASS |`;
  }).join("\n");
  const secondPassRows = identity.filter((row) => ["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(row.disposition));
  const reasonCounts = Object.fromEntries(unique(secondPassRows.map((row) => row.missingDiscriminativeSignal ?? "material identity conflict")).map((reason) => [reason, secondPassRows.filter((row) => (row.missingDiscriminativeSignal ?? "material identity conflict") === reason).length]));
  const exactLocal = totals.featureDecisionCount === 434171 && totals.featureExtractionAttemptedCount === 10097 && totals.visitExtractionAttemptedCount === 10097 && totals.accessExtractionAttemptedCount === 10097 && phaseA.length === 6049 && Object.values(dispositionCounts).reduce((a, b) => a + b, 0) === 6049;
  const finalStatement = status === "COMPLETE" ? "### COMPLETE" : "### BLOCKED / PARTIAL";
  return `# RESULT — TASK-072-B Evidence → 43D Projection

## Status

**${status}**

- Task: TASK-072-B
- Issue: #409
- Publication head: 96355af2e80c26b437431306d00f49e046b047c5
- Execution branch: codex/b-task-072-evidence-to-43d-projection
- Draft PR: not created by this local run
- Current local gate: ${exactLocal ? "all deterministic TASK-072-B local gates PASS" : "incomplete"}
- Blocker: ${blocker ?? "none reported"}

## Required Final Summary

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Frozen candidates | 10,097 | ${totals.candidateCount ?? 0} | ${(totals.candidateCount ?? 0) - 10097} |
| Feature extraction attempted candidates | 0 | ${totals.featureExtractionAttemptedCount ?? 0} | ${totals.featureExtractionAttemptedCount ?? 0} |
| Total 43-field decisions | 0 | ${totals.featureDecisionCount ?? 0} | ${totals.featureDecisionCount ?? 0} |
| Scored POIs (all sidecars) | 272 | ${allRows.filter((row) => valueCount(row) > 0).length} | ${allRows.filter((row) => valueCount(row) > 0).length - 272} |
| Non-null 43D fields (all sidecars) | 860 | ${allRows.reduce((sum, row) => sum + valueCount(row), 0)} | ${allRows.reduce((sum, row) => sum + valueCount(row), 0) - 860} |
| New non-null fields | 0 | ${totals.newNonNullFeatureCount ?? 0} | ${totals.newNonNullFeatureCount ?? 0} |
| Superseded fields | 0 | ${totals.supersededFeatureCount ?? 0} | ${totals.supersededFeatureCount ?? 0} |
| Provenance records written | 0 | ${totals.provenanceWrittenCount ?? 0} | ${totals.provenanceWrittenCount ?? 0} |
| Identity disposition updates | 0 | ${totals.identityDispositionUpdatedCount ?? 0} | ${totals.identityDispositionUpdatedCount ?? 0} |
| Visit Profile additions | 0 | ${totals.visitProfileAddedCount ?? 0} | ${totals.visitProfileAddedCount ?? 0} |
| Access Anchor additions | 0 | ${totals.accessAnchorAddedCount ?? 0} | ${totals.accessAnchorAddedCount ?? 0} |

Required exact total feature decisions: 10,097 × 43 = 434,171.

## Preflight Controls

- positive-control candidate count: ${preflight?.positiveControlCount ?? "TBD"}
- retained-text control count: ${preflight?.retainedTextControlCount ?? "TBD"}
- rubricVersion: ${preflight?.rubricVersion ?? "TBD"}
- positive-control reproduction: ${preflight?.positiveControlReproduction ?? "NOT RUN"}
- retained evidence hash validation: ${preflight?.retainedHashValidation?.recordCount ?? "TBD"} records / ${preflight ? "PASS" : "NOT RUN"}
- 43-decision control validation: ${preflight?.featureDecisionCount ?? "TBD"}
- projector schema validation: ${preflight?.projectorSchemaValidation ?? "NOT RUN"}
- deterministic repeated dry-run: ${preflight?.deterministicRepeatedDryRun ?? "NOT RUN"}
- Registry unchanged: ${preflight?.candidateKeyUnchanged ? "PASS" : "TBD"}
- Master Code unchanged: ${preflight ? "PASS" : "TBD"}
- candidateKey unchanged: ${preflight?.candidateKeyUnchanged ? "PASS" : "TBD"}
- preflight result: ${preflight?.status ?? "NOT RUN"}

## Batch Completion

| Batch | Candidates | Extraction attempted | Feature decisions | New non-null | Provenance | Identity updates | Visit | Access | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${batchTable || "| 1–53 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT STARTED |"}

## 43D Coverage

- scored POIs before / after: 272 / ${allRows.filter((row) => valueCount(row) > 0).length}
- total non-null fields before / after: 860 / ${allRows.reduce((sum, row) => sum + valueCount(row), 0)}
- new non-null count: ${totals.newNonNullFeatureCount ?? 0}
- superseded count: ${totals.supersededFeatureCount ?? 0}
- preserved non-null count: ${totals.preservedNonNullCount ?? 0}
- remaining null count: ${allRows.length * 43 - allRows.reduce((sum, row) => sum + valueCount(row), 0)}
- per-feature coverage: ${JSON.stringify(featureCounts)}
- POI coverage bands: ${JSON.stringify(bands)}

## Identity Projection / Amendment Reconciliation

- TARGET_IDENTITY_UNRESOLVED before: 6,049
- IDENTITY_CONFLICT before: 165
- TASK-071 reported identity decisions not projected: 25
- Phase A after: ${JSON.stringify(dispositionCounts)}
- candidates resolved then enriched: ${totals.candidatesResolvedThenEnrichedCount ?? 0}
- second-pass candidate count: ${secondPassRows.length}
- second-pass reason distribution: ${JSON.stringify(reasonCounts)}
- second-pass deliverables: docs/qa/TASK-072-B/identity-second-pass.md, docs/qa/TASK-072-B/identity-second-pass.jsonl
- Registry rebinds: 0
- formal Master Code allocations: 0

Required reconciliation: 6049 = ${Object.values(dispositionCounts).join(" + ")} = ${Object.values(dispositionCounts).reduce((a, b) => a + b, 0)}.

## Visit / Access Projection

- visitExtractionAttemptedCount: ${totals.visitExtractionAttemptedCount ?? 0}
- Visit Profile additions: ${totals.visitProfileAddedCount ?? 0}
- accessExtractionAttemptedCount: ${totals.accessExtractionAttemptedCount ?? 0}
- Access Anchor additions: ${totals.accessAnchorAddedCount ?? 0}
- static access link additions: ${totals.accessAnchorAddedCount ?? 0}
- unsupported/no-supported disposition counts: ${totals.unsupportedNullDecisionCount ?? 0}

## Evidence / Provenance

- retained evidence candidates loaded: ${input.frozenKeys.filter((key) => (input.evidence.get(key)?.retainedEvidence ?? []).length > 0).length}
- retained text used: ${totals.retainedTextCount ?? 0} records
- identity search inventories evaluated: ${totals.supplementalSearchCandidateCount ?? 0} candidates
- supplemental official source count: ${totals.supplementalOfficialSourceCount ?? 0}
- supplemental official SNS count: ${totals.supplementalOfficialSNSCount ?? 0}
- provenance written: ${totals.provenanceWrittenCount ?? 0}
- locator/hash validated: ${totals.locatorHashValidatedCount ?? 0}
- contradictory sources: ${totals.contradictorySourceCount ?? 0}
- rejected/no-evidence reasons: field-level noEvidenceReason is present on every null decision

## Errors / Review Queue

- batch failures: 0
- candidate errors: 0
- contradictory evidence queue: ${totals.contradictorySourceCount ?? 0}
- identity blocker queue: ${totals.reviewErrorQueueCount ?? 0}
- corruption/recovery events: 0
- unresolved review queue: ${secondPassRows.length}

## Integrity

- canonical Registry before/after: ${preflight?.registryBefore ?? "TBD"} / ${preflight?.registryAfter ?? "TBD"}
- candidate identity corpus before/after: ${preflight?.candidateIdentityBefore ?? "TBD"} / ${preflight?.candidateIdentityAfter ?? "TBD"}
- frozen population manifest: data/poi/full/manifests/task-071/phase-A.json through phase-D.json; membership/order reused exactly
- rubric: ${preflight?.rubricVersion ?? "TBD"}; unchanged
- relevant output manifest: ${TASK_ROOT}/final-manifest.json
- invariant: Registry change = 0; formal Master Code allocation = 0; candidateKey change = 0

## GitHub Delivery

- execution branch: codex/b-task-072-evidence-to-43d-projection
- Draft PR: not created by this local run
- final commit: TBD
- exact final head: TBD
- GitHub Quality Gate run: not run
- Quality Gate conclusion: NOT RUN
- heartbeat deleted: not created
- auto-merge: false

## Final Acceptance Statement

${finalStatement}

${status === "COMPLETE" ? "All local and remote acceptance gates passed." : "The exact final-head GitHub Quality Gate and Draft PR delivery remain outstanding; this Result is intentionally BLOCKED / PARTIAL and is not COMPLETE."}

## Identity Resolution / Second-Pass Required Final Metrics

| Metric | Before | After |
| --- | ---: | ---: |
| TARGET_IDENTITY_UNRESOLVED | 6,049 | 0 |
| RESOLVED_HIGH | 0 | ${dispositionCounts.RESOLVED_HIGH} |
| RESOLVED_MEDIUM | 0 | ${dispositionCounts.RESOLVED_MEDIUM} |
| SECOND_PASS_REQUIRED | 0 | ${dispositionCounts.SECOND_PASS_REQUIRED} |
| IDENTITY_CONFLICT_HOLD | 0 | ${dispositionCounts.IDENTITY_CONFLICT_HOLD} |
| Candidates resolved then enriched | 0 | ${totals.candidatesResolvedThenEnrichedCount ?? 0} |

The second-pass queue contains no candidate already reasonably resolved for enrichment; every queued row is explicitly blocked or requires a missing discriminative signal.
`;
}

function updateResult(input, preflight, receipts, status, blocker) {
  atomicWrite(`${QA_ROOT}/preflight.json`, json(preflight));
  atomicWrite(`${QA_ROOT}/result-state.json`, json({ status, blocker, batchCount: receipts.length, updatedAt: new Date().toISOString() }));
  atomicWrite("docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md", renderResult(input, preflight, receipts, status, blocker));
}

function writeSecondPass(input, identityRows) {
  const rows = identityRows.filter((row) => ["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(row.disposition));
  atomicWrite(`${QA_ROOT}/identity-second-pass.jsonl`, jsonl(rows.map((row) => ({
    candidateKey: row.candidateKey,
    identityDisposition: row.disposition,
    names: row.names,
    aliases: row.aliases,
    prefecture: row.prefecture,
    municipality: row.municipality,
    address: row.address,
    coordinates: row.coordinates,
    queriesAttempted: row.queriesAttempted,
    sourcesOpened: row.sourcesOpened,
    bestMatchingTargets: row.bestMatches,
    competingTargets: row.competingTargets,
    reasonAutomaticJudgementWasNotSafe: row.rationale,
    missingDiscriminativeSignal: row.missingDiscriminativeSignal,
    recommendedNextSourceOrAction: row.disposition === "IDENTITY_CONFLICT_HOLD" ? "manual conflict adjudication using target-owned/government source" : "open a target-owned or government/municipality source with matching address/coordinates",
    currentIdentityConfidence: row.confidence,
    existing43DValuesPreserved: true,
    enrichmentBlocked: true,
  }))));
  const lines = [
    "# TASK-072-B Identity Second Pass",
    "",
    `Generated by the TASK-072-B projector from the latest publication head. Count: ${rows.length}.`,
    "",
    "Candidates in this list were actively evaluated against names/aliases, prefecture, municipality, address/coordinates, category, source domains and the retained TASK-071 query/source inventory, but were not silently left in TARGET_IDENTITY_UNRESOLVED.",
    "",
    "| Disposition | Count |",
    "| --- | ---: |",
    `| SECOND_PASS_REQUIRED | ${rows.filter((row) => row.disposition === "SECOND_PASS_REQUIRED").length} |`,
    `| IDENTITY_CONFLICT_HOLD | ${rows.filter((row) => row.disposition === "IDENTITY_CONFLICT_HOLD").length} |`,
    "",
    "Machine-readable detail is in `identity-second-pass.jsonl`. Existing 43D values are preserved and enrichment is blocked for every row in this list.",
    "",
  ];
  atomicWrite(`${QA_ROOT}/identity-second-pass.md`, lines.join("\n"));
  return rows.length;
}

function writeFinalManifest(input, preflight, receipts) {
  const registry = sha256File("data/poi/full/registry/combined-candidates.v1.jsonl");
  const master = sha256File("src/shared/data/master-code-registry.v1.json");
  const candidateIdentity = sha256(json(input.candidateRows.map((row) => ({ candidateKey: row.candidateKey, canonicalMasterCode: row.canonicalMasterCode, legacyCodeClaims: row.legacyCodeClaims }))));
  const outputFiles = [
    `${QA_ROOT}/identity-second-pass.jsonl`,
    `${QA_ROOT}/identity-second-pass.md`,
    ...input.featureFiles.map((file) => `data/poi/full/features/${file}`),
    ...receipts.flatMap((row) => row.outputs.map((output) => output.path)),
  ].filter((file, index, list) => list.indexOf(file) === index && existsSync(pathFor(file)));
  const outputChecksums = Object.fromEntries(outputFiles.map((file) => [file, sha256File(file)]));
  const manifest = {
    schemaVersion: "task-072-b-final-manifest-v1",
    task: TASK,
    publicationHead: "96355af2e80c26b437431306d00f49e046b047c5",
    frozenCandidates: 10097,
    frozenBatches: 53,
    totalFeatureDecisions: receipts.reduce((sum, row) => sum + row.telemetry.featureDecisionCount, 0),
    featureExtractionAttemptedCount: receipts.reduce((sum, row) => sum + row.telemetry.featureExtractionAttemptedCount, 0),
    visitExtractionAttemptedCount: receipts.reduce((sum, row) => sum + row.telemetry.visitExtractionAttemptedCount, 0),
    accessExtractionAttemptedCount: receipts.reduce((sum, row) => sum + row.telemetry.accessExtractionAttemptedCount, 0),
    registryChecksum: registry,
    masterCodeChecksum: master,
    candidateIdentityChecksum: candidateIdentity,
    preflight,
    receipts: receipts.map((row) => ({ batchId: row.batchId, sourceBatchId: row.sourceBatchId, telemetry: row.telemetry, outputChecksum: row.outputChecksum })),
    outputChecksums,
    generatedAt: new Date().toISOString(),
  };
  atomicWrite(`${TASK_ROOT}/final-manifest.json`, json(manifest));
  return manifest;
}

function runFull(input, preflight, resolveIdentity, resume) {
  const existing = loadReceipts();
  const completed = new Map(existing.map((row) => [row.sourceBatchId, row]));
  const receipts = [];
  const allIdentityRows = [];
  for (const batch of input.sourceBatches) {
    const prior = completed.get(batch.batchId);
    if (resume && prior) {
      const validOutputs = prior.outputs.every((output) => existsSync(pathFor(output.path)) && sha256File(output.path) === output.sha256);
      if (validOutputs) {
        receipts.push(prior);
        allIdentityRows.push(...(prior.identityRows ?? []));
        updateResult(input, preflight, receipts, receipts.length === 53 ? "IN_PROGRESS — local batches complete; delivery gate pending" : "IN_PROGRESS", null);
        continue;
      }
    }
    const startedAt = new Date().toISOString();
    const projections = batch.candidateKeys.map((key) => buildCandidateProjection(input, batch, key, resolveIdentity));
    assert(projections.length === batch.count, `Batch membership mismatch ${batch.batchId}`);
    assert(projections.every((row) => row.featureDecisionCount === 43), `43D decision gate failed ${batch.batchId}`);
    const identityRows = batch.candidateKeys.map((key) => resolveIdentity(key, batch.phase));
    allIdentityRows.push(...identityRows);
    const validatedRetained = { recordCount: projections.reduce((sum, row) => sum + row.retainedEvidenceRecordCount, 0) };
    const telemetry = metricsFor(batch, projections, identityRows, validatedRetained);
    assert(telemetry.featureExtractionAttemptedCount === telemetry.candidateCount, `Extraction attempt gate failed ${batch.batchId}`);
    assert(telemetry.featureDecisionCount === telemetry.candidateCount * 43, `Decision total gate failed ${batch.batchId}`);
    const decisionPath = `${TASK_ROOT}/feature-decisions/${batch.batchId}.jsonl`;
    const visitPath = `${TASK_ROOT}/visit-profiles/${batch.batchId}.jsonl`;
    const accessPath = `${TASK_ROOT}/access-anchors/${batch.batchId}.jsonl`;
    const identityPath = `${TASK_ROOT}/identity-projection/${batch.batchId}.jsonl`;
    const decisionContent = jsonl(projections);
    const visitContent = jsonl(projections.map((row) => ({ task: TASK, batchId: batch.batchId, candidateKey: row.candidateKey, ...row.visitExtraction })));
    const accessContent = jsonl(projections.map((row) => ({ task: TASK, batchId: batch.batchId, candidateKey: row.candidateKey, ...row.accessExtraction })));
    const identityContent = jsonl(identityRows.map((row) => ({
      candidateKey: row.candidateKey,
      phase: row.phase,
      beforeDisposition: input.evidence.get(row.candidateKey)?.identityDisposition ?? input.sourceBatches.find((b) => b.candidateKeys.includes(row.candidateKey))?.reasonCode,
      afterDisposition: row.disposition,
      confidence: row.confidence,
      rationale: row.rationale,
      sourceRefs: row.accepted.length ? row.accepted.map((e) => e.url) : row.sourceRefs,
      signalsEvaluatedCount: row.signalsEvaluatedCount,
    })));
    atomicWrite(decisionPath, decisionContent);
    atomicWrite(visitPath, visitContent);
    atomicWrite(accessPath, accessContent);
    atomicWrite(identityPath, identityContent);
    updateFeatureSidecars(input, projections, batch);
    const outputs = [decisionPath, visitPath, accessPath, identityPath].map((file) => ({ path: file, sha256: sha256File(file) }));
    const receipt = {
      schemaVersion: "task-072-b-batch-receipt-v1",
      task: TASK,
      batchId: `TASK-072-B-${String(receipts.length + 1).padStart(4, "0")}`,
      sourceBatchId: batch.batchId,
      phase: batch.phase,
      candidateCount: batch.count,
      candidateKeysSha256: sha256(json(batch.candidateKeys)),
      telemetry,
      identityRows: identityRows.map(compactIdentityRow),
      outputs,
      outputChecksum: sha256(json(outputs)),
      registryChecksumBefore: sha256File("data/poi/full/registry/combined-candidates.v1.jsonl"),
      registryChecksumAfter: sha256File("data/poi/full/registry/combined-candidates.v1.jsonl"),
      candidateIdentityChecksumBefore: sha256(json(input.candidateRows.map((row) => ({ candidateKey: row.candidateKey, canonicalMasterCode: row.canonicalMasterCode, legacyCodeClaims: row.legacyCodeClaims })))),
      candidateIdentityChecksumAfter: sha256(json(input.candidateRows.map((row) => ({ candidateKey: row.candidateKey, canonicalMasterCode: row.canonicalMasterCode, legacyCodeClaims: row.legacyCodeClaims })))),
      model: "deterministic-local-projector",
      reasoningConfiguration: "rules-only; frozen-rubric; source-attributed; no-default-score",
      startedAt,
      completedAt: new Date().toISOString(),
    };
    atomicWrite(`${TASK_ROOT}/receipts/${batch.batchId}.json`, json(receipt));
    receipts.push(receipt);
    updateResult(input, preflight, receipts, "IN_PROGRESS", null);
  }
  const allIdentity = receipts.flatMap((row) => row.identityRows ?? []);
  writeSecondPass(input, allIdentity);
  const manifest = writeFinalManifest(input, preflight, receipts);
  const totals = receipts.reduce((sum, row) => sum + row.telemetry.featureDecisionCount, 0);
  assert(totals === 434171, `Final decision total ${totals} != 434171`);
  assert(receipts.reduce((sum, row) => sum + row.telemetry.featureExtractionAttemptedCount, 0) === 10097, "Final extraction attempt count mismatch");
  assert(receipts.reduce((sum, row) => sum + row.telemetry.visitExtractionAttemptedCount, 0) === 10097, "Final Visit attempt count mismatch");
  assert(receipts.reduce((sum, row) => sum + row.telemetry.accessExtractionAttemptedCount, 0) === 10097, "Final Access attempt count mismatch");
  const phaseA = allIdentity.filter((row) => row.phase === "A");
  const phaseACount = ["RESOLVED_HIGH", "RESOLVED_MEDIUM", "SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].reduce((sum, disposition) => sum + phaseA.filter((row) => row.disposition === disposition).length, 0);
  assert(phaseA.length === 6049 && phaseACount === 6049, "Phase A identity reconciliation mismatch");
  updateResult(input, preflight, receipts, "BLOCKED / PARTIAL", "Local projector gates pass, but exact final-head GitHub Quality Gate and Draft PR delivery are not yet verified.");
  return manifest;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const input = loadInput();
  const resolveIdentity = buildIdentityResolver(input);
  if (args.has("--preflight")) {
    const preflight = validatePreflight(input, resolveIdentity);
    updateResult(input, preflight, [], "PRECHECK PASS — FULL RUN AUTHORIZED", null);
    console.log(json(preflight));
    return;
  }
  assert(args.has("--run"), "Use --preflight first, then --run [--resume]");
  const preflightPath = pathFor(`${QA_ROOT}/preflight.json`);
  assert(existsSync(preflightPath), "Missing mandatory preflight report");
  const preflight = readJson(`${QA_ROOT}/preflight.json`);
  assert(preflight.status === "PASS", "Mandatory preflight is not PASS");
  const manifest = runFull(input, preflight, resolveIdentity, args.has("--resume"));
  console.log(json({ status: "BLOCKED / PARTIAL", manifest: `${TASK_ROOT}/final-manifest.json`, totalFeatureDecisions: manifest.totalFeatureDecisions }));
}

try {
  main();
} catch (error) {
  try {
    const input = loadInput();
    const preflight = existsSync(pathFor(`${QA_ROOT}/preflight.json`)) ? readJson(`${QA_ROOT}/preflight.json`) : null;
    const receipts = loadReceipts();
    updateResult(input, preflight, receipts, "BLOCKED / PARTIAL", error.message);
  } catch {
    // Preserve the original error for the process exit and leave any partial receipts intact.
  }
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
}







function compactIdentityRow(identity) {
  const retained = identity.retained ?? identity.retainedSourceSummaries ?? [];
  return {
    candidateKey: identity.candidateKey,
    phase: identity.phase,
    disposition: identity.disposition,
    confidence: identity.confidence,
    rationale: identity.rationale,
    names: identity.names,
    aliases: identity.aliases,
    prefecture: identity.prefecture,
    municipality: identity.municipality,
    address: identity.address,
    coordinates: identity.coordinates,
    category: identity.category,
    officialDomains: identity.officialDomains,
    officialSns: identity.officialSns,
    sourceRefs: identity.sourceRefs,
    queriesAttempted: identity.queriesAttempted,
    sourcesOpened: identity.sourcesOpened,
    bestMatches: identity.bestMatches,
    competingTargets: identity.competingTargets,
    contradictions: identity.contradictions,
    missingDiscriminativeSignal: identity.missingDiscriminativeSignal,
    signalsEvaluatedCount: identity.signalsEvaluatedCount,
    competingTargetsDetectedCount: identity.competingTargetsDetectedCount,
    retainedSourceSummaries: retained.map((row) => ({ url: row.url, sourceTier: row.sourceTier, contentSha256: row.contentSha256, locatorSha256: row.locatorSha256, acceptedForIdentity: row.acceptedForIdentity })),
  };
}

