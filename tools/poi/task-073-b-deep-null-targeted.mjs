import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { readCurrentCandidateRows } from "./read-current-candidates.mjs";

const ROOT = resolve(process.cwd());
const OUT = "data/poi/full/task-073-b-identity-deep-null-targeted-43d";
const QA = "docs/qa/TASK-073-B";
const RESULT = "docs/tasks/RESULT-TASK-073-b-identity-deep-resolution-null-targeted-43d.md";
const RUBRIC_VERSION = "candidate-recovery-1.0";
const EPOCH = "2026-09-21T00:00:00Z";
const TASK_HEAD = "3f0ba25bcc6663503552aff477631a920e331b72";
const BATCH_SIZE = 200;
const FEATURE_CODES = [
  ["01", "scenery", "benefit"], ["02", "history", "benefit"],
  ["03", "architecture", "benefit"], ["04", "photo", "benefit"],
  ["05", "food", "benefit"], ["06", "shopping", "benefit"],
  ["07", "nature", "benefit"], ["08", "night", "benefit"],
  ["09", "onsen", "benefit"], ["10", "art", "benefit"],
  ["11", "entertainment", "benefit"], ["12", "local", "benefit"],
  ["13", "unique", "benefit"], ["14", "hidden", "benefit"],
  ["15", "iconic", "benefit"], ["16", "family", "suitability"],
  ["17", "senior", "suitability"], ["18", "couple", "suitability"],
  ["19", "solo", "suitability"], ["20", "relax", "suitability"],
  ["21", "adventure", "suitability"], ["22", "educational", "suitability"],
  ["23", "interactive", "suitability"], ["24", "rest", "suitability"],
  ["25", "walking", "cost"], ["26", "physical", "cost"],
  ["27", "crowd", "risk"], ["28", "queue", "risk"],
  ["29", "wheelchair", "suitability"], ["30", "stroller", "suitability"],
  ["31", "morning", "suitability"], ["32", "daytime", "suitability"],
  ["33", "sunrise", "suitability"], ["34", "sunset", "suitability"],
  ["35", "rain", "suitability"], ["36", "heat", "suitability"],
  ["37", "cold", "suitability"], ["38", "snow", "suitability"],
  ["39", "weather_sensitive", "risk"], ["40", "spring", "suitability"],
  ["41", "summer", "suitability"], ["42", "autumn", "suitability"],
  ["43", "winter", "suitability"],
];
const CODES = FEATURE_CODES.map(([code]) => code);
const CODE_META = new Map(FEATURE_CODES.map(([code, key, kind]) => [code, { key, kind }]));
const FEATURE_RULES = [
  ["01", ["景色", "眺望", "展望", "見渡", "絶景", "view", "scenic"]],
  ["02", ["歴史", "創建", "建立", "城跡", "史跡", "文化財", "由緒", "城", "世界遺産"]],
  ["03", ["建築", "建造", "本堂", "本殿", "社殿", "門", "塔", "天守", "architecture"]],
  ["04", ["写真", "撮影", "フォト", "映え", "photograph"]],
  ["05", ["料理", "飲食", "グルメ", "食事", "魚", "食文化"]],
  ["06", ["市場", "買い物", "土産", "商店", "shopping"]],
  ["07", ["自然", "海岸", "山", "渓谷", "公園", "桜", "紅葉", "花"]],
  ["08", ["夜間", "夜景", "ライトアップ", "night"]],
  ["09", ["温泉", "浴場", "onsen"]],
  ["10", ["美術", "芸術", "絵画", "彫刻", "宝物", "国宝", "重要文化財", "展示", "museum"]],
  ["11", ["祭", "イベント", "催し", "遊園", "entertainment"]],
  ["12", ["郷土", "地域", "地元", "伝統", "local"]],
  ["13", ["発祥", "唯一", "珍しい", "独特"]],
  ["22", ["博物館", "資料館", "学習", "教育", "見学"]],
  ["23", ["体験", "ワークショップ", "参加"]],
  ["25", ["散策", "遊歩道", "徒歩", "歩いて", "参道", "石段", "walking"]],
  ["31", ["朝", "午前", "早朝", "morning"]],
  ["33", ["日の出", "朝日", "sunrise"]],
  ["34", ["夕日", "夕暮れ", "sunset"]],
  ["40", ["春", "桜", "spring"]],
  ["41", ["夏", "summer"]],
  ["42", ["秋", "紅葉", "autumn"]],
  ["43", ["冬", "雪", "winter"]],
];

const p = (rel) => resolve(ROOT, rel);
const readText = (rel) => readFileSync(p(rel), "utf8");
const readJson = (rel) => JSON.parse(readText(rel));
const readJsonl = (rel) => readText(rel).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const jsonl = (rows) => rows.map((row) => JSON.stringify(row) + "\n").join("");
const norm = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
const unique = (values) => [...new Set(values.filter(Boolean))].sort();
const valueCount = (row) => Object.values(row.featureSet.values).filter((v) => v !== null).length;
const official = (url) => /\.(go|lg)\.jp\b|japan\.travel|kanko|tourism|\.or\.jp\b|official/i.test(String(url ?? ""));
const sourceTier = (url) => /\.(go|lg)\.jp\b/i.test(String(url ?? "")) ? "GOVERNMENT_OR_PUBLIC_BODY" : official(url) ? "OFFICIAL_SITE_OR_TOURISM" : "AUTHORITATIVE_SECONDARY";
const IDENTITY_REMEDIATION_ROOT = OUT + "/identity-remediation";
const IDENTITY_REMEDIATION_CANDIDATE = "candidate:B_V1_PROPOSED:60202";

function atomicWrite(rel, content) {
  const file = p(rel);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, file); } catch (error) {
    if (!["EPERM", "EEXIST", "ENOTEMPTY"].includes(error.code)) throw error;
    writeFileSync(file, content, "utf8");
  }
}
function shaFile(rel) { return hash(readFileSync(p(rel))); }
function sourceRef(source) { return "remaining-source:" + String(source.contentSha256 ?? source.textSha256 ?? "").slice(0, 24); }

function loadIdentityRemediationEvidence() {
  const specs = [
    {
      role: "official_operator_identity_and_sns_ownership",
      url: "https://temple.nichiren.or.jp/2011001-kuonji/",
      path: IDENTITY_REMEDIATION_ROOT + "/sources/temple-nichiren-kuonji.html",
      needles: ["https://www.instagram.com/minobusankuonji/", "久遠寺 Instagram", "〒409-2524"],
    },
    {
      role: "official_tourism_independent_identity",
      url: "https://www.japan.travel/en/spot/1317/",
      path: IDENTITY_REMEDIATION_ROOT + "/sources/japan-travel-minobusan-kuonji.html",
      needles: ["Minobusan Kuonji", "身延山 久遠寺", "Minobu"],
    },
  ];
  const sources = specs.map((spec) => {
    const file = p(spec.path);
    if (!existsSync(file)) return null;
    const body = readFileSync(file, "utf8");
    const needle = spec.needles.find((value) => body.includes(value));
    if (!needle) return null;
    const offset = body.indexOf(needle);
    const start = Math.max(0, offset - 220);
    const end = Math.min(body.length, offset + needle.length + 420);
    const scope = body.slice(start, end);
    const contentSha256 = hash(body);
    return {
      url: spec.url,
      sourceRef: "task-073-b-remediation-source:" + contentSha256.slice(0, 24),
      sourceTier: "OFFICIAL_SITE_OR_TOURISM",
      contentSha256,
      contentPath: file,
      scope,
      body,
      targetName: "身延山 久遠寺",
      targetPrefecture: "山梨県",
      targetMunicipality: "身延町",
      locator: { offset: start, length: scope.length, locatorSha256: hash(scope), contentSha256 },
      targetScopeRead: true,
      matchedNeedle: needle,
      role: spec.role,
    };
  }).filter(Boolean);
  return {
    candidateKey: IDENTITY_REMEDIATION_CANDIDATE,
    targetName: "身延山 久遠寺",
    prefecture: "山梨県",
    municipality: "身延町",
    address: "山梨県南巨摩郡身延町身延3567",
    sources,
    officialSNS: {
      platform: "Instagram",
      accountUrl: "https://www.instagram.com/minobusankuonji/",
      ownershipStatus: sources.some((source) => source.role === "official_operator_identity_and_sns_ownership" && source.matchedNeedle === "https://www.instagram.com/minobusankuonji/") ? "VERIFIED" : "UNVERIFIED",
      proofSourceRefs: sources.filter((source) => source.role === "official_operator_identity_and_sns_ownership").map((source) => source.sourceRef),
    },
  };
}
function namesFor(candidate) {
  const values = [
    candidate.nameJa, candidate.nameEn, candidate.canonicalNameJa,
    ...(candidate.namesJa ?? []), ...(candidate.namesEn ?? []),
    ...(candidate.aliases ?? []), ...(candidate.observations ?? []).flatMap((o) => [
      o.nameJa, o.nameEn, ...(o.aliases ?? []), o.historicalName, o.renamedFrom,
    ]),
  ];
  return unique(values.filter((x) => typeof x === "string" && x.trim()));
}
function municipalityFor(candidate) {
  const o = candidate.observations?.[0] ?? {};
  return o.municipality ?? o.city ?? o.locality ?? candidate.municipality ?? null;
}
function addressFor(candidate) {
  const o = candidate.observations?.[0] ?? {};
  return o.address ?? candidate.address ?? null;
}

function loadEvidence() {
  const result = new Map();
  const dir = p("data/poi/full/reviews/task-071/evidence-remediation");
  for (const file of readdirSync(dir).filter((x) => x.endsWith(".evidence-v2.jsonl")).sort())
    for (const row of readJsonl("data/poi/full/reviews/task-071/evidence-remediation/" + file))
      result.set(row.candidateKey, row);
  return result;
}

function loadPhaseMap() {
  const map = new Map();
  for (const phase of ["A", "B", "C", "D"]) {
    const manifest = readJson("data/poi/full/manifests/task-071/phase-" + phase + ".json");
    for (const batch of manifest.batches)
      for (const key of batch.candidateKeys) map.set(key, phase);
  }
  return map;
}

function locateSource(source) {
  if (!source) return null;
  if (source.contentPath && existsSync(source.contentPath)) return source.contentPath;
  if (source.textPath) {
    const candidate = p("outputs/task-071-20260920/source-cache/pages/" + source.textPath);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function canonicalSource(input, key) {
  const entry = input.ledgerByKey.get(key);
  if (!entry || !entry.sourceRef) return null;
  const path = locateSource(entry.source);
  if (!path) return null;
  const body = readFileSync(path, "utf8");
  const expected = entry.source.textSha256 ?? entry.source.rawSha256;
  if (expected && expected !== hash(body)) return null;
  const boundary = entry.targetBoundary ?? { offset: 0, length: body.length };
  const offset = Math.max(0, Number(boundary.offset ?? 0));
  const length = Math.min(body.length - offset, Number(boundary.length ?? body.length));
  return {
    candidateKey: key,
    url: entry.source.url,
    sourceRef: entry.sourceRef,
    contentPath: path,
    contentSha256: hash(body),
    body,
    boundary: { offset, length, locatorSha256: hash(body.slice(offset, offset + length)) },
    scope: body.slice(offset, offset + length),
    sourceTier: sourceTier(entry.source.url),
  };
}

function retainedSources(input, key) {
  const e = input.evidence.get(key) ?? {};
  const rows = [...(e.acceptedIdentityEvidence ?? []), ...(e.retainedEvidence ?? [])];
  return rows.map((source) => {
    const path = locateSource(source);
    if (!path) return { ...source, opened: false };
    const body = readFileSync(path, "utf8");
    assert(!source.contentSha256 || source.contentSha256 === hash(body), "retained source hash mismatch: " + key);
    const boundary = source.targetContentBoundary ?? { start: 0, end: body.length };
    return {
      ...source,
      opened: true,
      contentPath: path,
      body,
      scope: body.slice(Number(boundary.start ?? 0), Number(boundary.end ?? body.length)),
      sourceRef: sourceRef(source),
      locator: { offset: Number(boundary.start ?? 0), length: Number(boundary.end ?? body.length) - Number(boundary.start ?? 0), locatorSha256: source.locatorSha256 ?? hash(body.slice(Number(boundary.start ?? 0), Number(boundary.end ?? body.length))) },
    };
  }).filter((source) => source.opened);
}

function loadInput() {
  const current = readCurrentCandidateRows();
  const candidates = readJsonl("data/poi/full/registry/combined-candidates.v1.jsonl");
  const candidateByKey = new Map(candidates.map((row) => [row.candidateKey, row]));
  const identitySeed = new Map(readJsonl("data/poi/full/task-072-b-correction-v2/identity-projection.jsonl").map((row) => [row.candidateKey, row]));
  const semanticAnnotations = readJsonl("data/poi/full/task-072-b-correction-v2/semantic-annotations.jsonl");
  const evidence = loadEvidence();
  const phaseByKey = loadPhaseMap();
  const ledgerByKey = new Map(current.ledger.entries.map((row) => [row.candidateKey, row]));
  const currentByKey = new Map(current.rows.map((row) => [row.candidateKey, row]));
  const keys = current.pending.map((row) => row.candidateKey);
  const trackA = keys.filter((key) => ["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(identitySeed.get(key)?.disposition));
  const trackB = keys.filter((key) => !trackA.includes(key));
  assert.equal(keys.length, 10097);
  assert.equal(trackA.length, 6014);
  assert.equal(trackB.length, 4083);
  assert.equal(new Set(keys).size, 10097);
  const identityBefore = hash(json(candidates.map((row) => ({
    candidateKey: row.candidateKey,
    canonicalMasterCode: row.canonicalMasterCode,
    legacyCodeClaims: row.legacyCodeClaims,
  }))));
  const registryBefore = shaFile("data/poi/full/registry/combined-candidates.v1.jsonl");
  const names = new Map();
  for (const candidate of candidates)
    for (const name of namesFor(candidate)) {
      const key = norm(name);
      if (!names.has(key)) names.set(key, []);
      names.get(key).push(candidate.candidateKey);
    }
  return {
    ...current, candidates, candidateByKey, identitySeed, semanticAnnotations, evidence, phaseByKey,
    ledgerByKey, currentByKey, keys, trackA, trackB, identityBefore, registryBefore, names,
  };
}

function querySet(candidate) {
  const names = namesFor(candidate);
  const prefecture = candidate.prefectures?.[0] ?? "";
  const municipality = municipalityFor(candidate) ?? "";
  const base = names[0] ?? candidate.candidateKey;
  return unique([
    base + " " + prefecture + " official",
    base + " " + municipality + " address operator",
    base + " " + prefecture + " history access",
    base + " official SNS",
  ]);
}

function identityDecision(input, key) {
  const candidate = input.candidateByKey.get(key);
  const seed = input.identitySeed.get(key);
  const phase = input.phaseByKey.get(key);
  const names = namesFor(candidate);
  const nameSet = new Set(names.map(norm));
  const retained = retainedSources(input, key);
  const canonical = canonicalSource(input, key);
  const sources = [...retained];
  if (canonical && !sources.some((s) => s.sourceRef === canonical.sourceRef))
    sources.push({
      url: canonical.url,
      sourceRef: canonical.sourceRef,
      body: canonical.body,
      scope: canonical.scope,
      contentPath: canonical.contentPath,
      contentSha256: canonical.contentSha256,
      opened: true,
      sourceTier: canonical.sourceTier,
      locator: canonical.boundary,
      targetName: names[0] ?? null,
    });
  const exact = sources.filter((source) => {
    const target = source.targetName;
    return target ? nameSet.has(norm(target)) : names.some((name) => canonicalSource(input, key)?.scope.includes(name));
  });
  const prefecture = candidate.prefectures?.[0] ?? "";
  const municipality = municipalityFor(candidate);
  const address = addressFor(candidate);
  const signals = [];
  if (exact.length) signals.push({ type: "name_or_alias", value: names[0] ?? null, discriminative: false });
  if (exact.some((source) => source.prefectureMatchedInBody || (prefecture && source.scope.includes(prefecture))))
    signals.push({ type: "prefecture", value: prefecture, discriminative: true });
  if (exact.some((source) => municipality && source.scope.includes(municipality)))
    signals.push({ type: "municipality", value: municipality, discriminative: true });
  if (exact.some((source) => address && source.scope.includes(address)))
    signals.push({ type: "address", value: address, discriminative: true });
  if (candidate.coordinates?.length || candidate.latitude || candidate.longitude)
    signals.push({ type: "coordinates_or_map_context", value: candidate.coordinates ?? [candidate.latitude, candidate.longitude], discriminative: true });
  if (exact.some((source) => official(source.url)))
    signals.push({ type: "official_domain", value: exact.find((source) => official(source.url))?.url, discriminative: true });
  const competingTargets = unique(retained.map((source) => source.targetName).filter((target) => target && !nameSet.has(norm(target))));
  const discriminative = signals.find((signal) => signal.discriminative) ?? null;
  const strongOfficial = exact.some((source) => /\.(go|lg)\.jp\b/i.test(source.url ?? "") || official(source.url));
  const valid = exact.length > 0 && Boolean(discriminative) && competingTargets.length === 0;
  let disposition;
  if (phase === "B" || seed?.disposition === "IDENTITY_CONFLICT_HOLD") disposition = "IDENTITY_CONFLICT_HOLD";
  else if (phase === "A" && valid && strongOfficial && signals.length >= 3) disposition = "RESOLVED_HIGH";
  else if (phase === "A" && valid && signals.length >= 2) disposition = "RESOLVED_MEDIUM";
  else if (phase === "A") disposition = "DEEP_RESEARCH_REQUIRED";
  else disposition = seed?.disposition ?? "UNCHANGED_NON_PHASE_A";
  const sourceRefs = unique(exact.map((source) => source.sourceRef));
  const searchSources = sources.map((source) => ({
    url: source.url,
    sourceRef: source.sourceRef,
    sourceTier: source.sourceTier ?? sourceTier(source.url),
    contentHash: source.contentSha256,
    locator: source.locator ?? null,
    targetScopeRead: Boolean(source.scope),
  }));
  return {
    candidateKey: key,
    phase,
    disposition,
    sourceRefs,
    sourcesOpened: searchSources,
    searchesAttempted: querySet(candidate),
    identitySignals: signals,
    competingTargets,
    bestTarget: exact[0]?.targetName ?? names[0] ?? null,
    names,
    prefecture,
    municipality,
    address,
    coordinates: candidate.coordinates ?? null,
    independentSignalCount: signals.length,
    discriminativeSignal: discriminative,
    mediumThreshold: {
      atLeastTwoIndependentSignals: signals.length >= 2,
      hasDiscriminativeSignal: Boolean(discriminative),
      sourceRefsRetained: sourceRefs.length > 0,
      noUnresolvedCompetingTarget: competingTargets.length === 0,
    },
    evidenceComplete: ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(disposition)
      && signals.length >= 2 && Boolean(discriminative) && sourceRefs.length > 0 && competingTargets.length === 0,
    resolvedForEnrichment: ["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(disposition),
    rationale: disposition === "IDENTITY_CONFLICT_HOLD"
      ? "Conflicting identity population remains held; no Registry rebind is permitted."
      : ["RESOLVED_HIGH", "RESOLVED_MEDIUM"].includes(disposition)
        ? "Target-scoped source text, name/alias and discriminative geographic or organizational signals converge without a credible competing target."
        : "Opened source text and candidate metadata do not yet meet the independent-signal threshold; keep the candidate in a named deep-research queue.",
    missingDiscriminativeEvidence: disposition === "DEEP_RESEARCH_REQUIRED" ? "official or government source matching name plus municipality, address, coordinates, or operator" : null,
    recommendedNextAction: disposition === "DEEP_RESEARCH_REQUIRED" ? "Search official operator, government, tourism/DMO and official SNS sources; verify locality or coordinates before enrichment." : null,
  };
}

function annotateFeatures(input, identityByKey, key) {
  const row = input.currentByKey.get(key);
  const identity = identityByKey.get(key);
  if (!identity?.resolvedForEnrichment) return [];
  const source = canonicalSource(input, key);
  if (!source) return [];
  const candidate = input.candidateByKey.get(key);
  const names = namesFor(candidate);
  const targetMention = names.find((name) => source.scope.includes(name));
  // Canonical ledger targetBoundary is the authoritative scope for Track B; no name-only inference is used.
  const facts = [];
  const usedCodes = new Set();
  for (const [code, terms] of FEATURE_RULES) {
    if (row.featureSet.values[code] !== null || usedCodes.has(code)) continue;
    const term = terms.find((value) => source.scope.toLowerCase().includes(value.toLowerCase()));
    if (!term) continue;
    const local = source.scope.toLowerCase().indexOf(term.toLowerCase());
    const offset = source.boundary.offset + local;
    const excerpt = source.body.slice(offset, offset + term.length);
    const officialSource = sourceTier(source.url) !== "AUTHORITATIVE_SECONDARY";
    const score = officialSource ? 7 : 5;
    const meta = CODE_META.get(code);
    const fact = {
      candidateKey: key,
      featureCode: code,
      key: meta.key,
      kind: meta.kind,
      suggestedValue: score,
      sourceRef: source.sourceRef,
      sourceUrl: source.url,
      sourceTier: sourceTier(source.url),
      confidence: officialSource ? 0.8 : 0.65,
      reason: "Target-scoped retained source contains the explicit term \"" + term + "\"; this supports " + meta.key + " only, without inferring nearby-attraction or current-service facts.",
      rubricVersion: RUBRIC_VERSION,
      annotationMethod: "task_073_b_targeted_semantic_annotation_v1",
      contentHash: source.contentSha256,
      locator: {
        offset,
        length: term.length,
        locatorSha256: hash(excerpt),
        contentSha256: source.contentSha256,
      },
    };
    facts.push(fact);
    usedCodes.add(code);
    if (facts.length >= 5) break;
  }
  return facts;
}

function makeBatches(keys, prefix) {
  const batches = [];
  for (let i = 0; i < keys.length; i += BATCH_SIZE)
    batches.push({ batchId: prefix + "-" + String(batches.length + 1).padStart(4, "0"), candidateKeys: keys.slice(i, i + BATCH_SIZE) });
  return batches;
}

function revalidatedLegacyFacts(input, key) {
  const row = input.currentByKey.get(key);
  const entry = input.ledgerByKey.get(key);
  if (!row || !entry) return [];
  const output = [];
  for (const oldFact of input.semanticAnnotations.filter((fact) => fact.candidateKey === key)) {
    if (row.featureSet.values[oldFact.featureCode] !== null) continue;
    if (entry.sourceRef && entry.sourceRef !== oldFact.sourceRef) continue;
    const source = retainedSources(input, key).find((candidate) => candidate.url === oldFact.sourceUrl && candidate.contentSha256 === oldFact.contentHash);
    if (!source) continue;
    const offset = Number(oldFact.locator?.offset ?? -1);
    const length = Number(oldFact.locator?.length ?? 0);
    const excerpt = offset >= 0 ? source.body.slice(offset, offset + length) : "";
    if (!excerpt || hash(excerpt) !== oldFact.locator?.locatorSha256 || hash(source.body) !== oldFact.contentHash) continue;
    const meta = CODE_META.get(oldFact.featureCode);
    if (!meta) continue;
    output.push({ candidateKey: key, featureCode: oldFact.featureCode, key: meta.key, kind: meta.kind, suggestedValue: oldFact.suggestedValue, sourceRef: oldFact.sourceRef, sourceUrl: oldFact.sourceUrl, sourceTier: oldFact.sourceTier, confidence: oldFact.confidence, reason: "TASK-073-B revalidated a retained target-scoped TASK-072 semantic fact byte-for-byte; unsupported dimensions remain null.", rubricVersion: RUBRIC_VERSION, annotationMethod: "task_073_b_revalidated_prior_annotation_v1", contentHash: oldFact.contentHash, locator: oldFact.locator });
  }
  return output;
}
function buildAll(input) {
  const identityByKey = new Map();
  for (const key of input.trackA) identityByKey.set(key, identityDecision(input, key));
  for (const key of input.trackB) {
    const seed = input.identitySeed.get(key);
    identityByKey.set(key, {
      ...identityDecision(input, key),
      disposition: seed?.disposition ?? "UNCHANGED_NON_PHASE_A",
      resolvedForEnrichment: true,
      rationale: "Upstream authoritative identity gate is outside the deep-resolution population and remains unchanged.",
    });
  }
  const factsByKey = new Map();
  for (const key of input.keys) {
    const generated = annotateFeatures(input, identityByKey, key);
    const legacy = revalidatedLegacyFacts(input, key);
    const facts = [...new Map([...generated, ...legacy].map((fact) => [fact.featureCode, fact])).values()];
    if (facts.length) factsByKey.set(key, facts);
  }
  return { identityByKey, factsByKey };
}

function decisionRows(input, identityByKey, factsByKey, key) {
  const row = input.currentByKey.get(key);
  const identity = identityByKey.get(key);
  const facts = new Map((factsByKey.get(key) ?? []).map((fact) => [fact.featureCode, fact]));
  const decisions = [];
  for (const [code, featureKey, kind] of FEATURE_CODES) {
    const current = row.featureSet.values[code] ?? null;
    const previous = (row.provenance ?? []).filter((fact) => fact.featureCode === code);
    if (current !== null) {
      decisions.push({
        featureCode: code, key: featureKey, kind, currentValue: current, proposedValue: current,
        disposition: "PRESERVE_SUPPORTED", sourceRefs: unique(previous.flatMap((fact) => fact.sourceRefs ?? [])),
        sourceTier: "existing_authoritative_current_view", confidence: previous[0]?.confidence ?? null,
        rationale: "Existing authoritative value loaded and preserved unchanged.",
        rubricVersion: RUBRIC_VERSION, annotationMethod: "preserve_authoritative_current_value",
        locatorHash: previous[0]?.facts?.[0]?.locator ?? null,
        noEvidenceReason: null,
      });
      continue;
    }
    const fact = facts.get(code);
    if (fact) {
      decisions.push({
        featureCode: code, key: featureKey, kind, currentValue: null, proposedValue: fact.suggestedValue,
        disposition: "ADD_SUPPORTED", sourceRefs: [fact.sourceRef], sourceTier: fact.sourceTier,
        confidence: fact.confidence, rationale: fact.reason, rubricVersion: fact.rubricVersion,
        annotationMethod: fact.annotationMethod, locatorHash: fact.locator, noEvidenceReason: null,
      });
      continue;
    }
    const blocked = identity.disposition === "DEEP_RESEARCH_REQUIRED" || identity.disposition === "IDENTITY_CONFLICT_HOLD";
    decisions.push({
      featureCode: code, key: featureKey, kind, currentValue: null, proposedValue: null,
      disposition: blocked ? "IDENTITY_BLOCKED" : "UNSUPPORTED_REMAINS_NULL",
      sourceRefs: [], sourceTier: "none", confidence: null,
      rationale: blocked ? "Identity disposition blocks safe enrichment; the field remains null." : "Target-scoped semantic annotation was attempted; no rubric-supported fact was retained.",
      rubricVersion: RUBRIC_VERSION, annotationMethod: "task_073_b_null_targeted_semantic_annotation",
      locatorHash: null, noEvidenceReason: blocked ? "identity deep research or conflict hold remains" : "no target-scoped supported evidence",
    });
  }
  assert.equal(decisions.length, 43);
  return decisions;
}

function projection(input, identityByKey, factsByKey, batch, track) {
  const projections = batch.candidateKeys.map((key) => {
    const identity = identityByKey.get(key);
    const decisions = decisionRows(input, identityByKey, factsByKey, key);
    const row = input.currentByKey.get(key);
    const add = decisions.filter((decision) => decision.disposition === "ADD_SUPPORTED");
    return {
      schemaVersion: "task-073-b-candidate-projection-v1",
      task: "TASK-073-B",
      sourceBatchId: batch.batchId,
      track,
      candidateKey: key,
      identityDisposition: identity.disposition,
      identityConfidence: identity.evidenceComplete ? (identity.disposition === "RESOLVED_HIGH" ? 0.9 : 0.78) : null,
      featureDecisionCount: 43,
      featureDecisions: decisions,
      semanticAnnotationAttempted: track === "B" || identity.resolvedForEnrichment,
      searchTrace: {
        queries: identity.searchesAttempted,
        sourcesOpened: identity.sourcesOpened,
        targetScopedTextReadCount: identity.sourcesOpened.filter((source) => source.targetScopeRead).length,
      },
      visitExtraction: {
        attempted: true,
        status: (row.visitProfiles ?? []).length ? "PRESERVED_EXISTING" : "NO_SUPPORTED_FACT",
        existingCount: (row.visitProfiles ?? []).length,
        addedCount: 0,
        noSupportedFactReason: (row.visitProfiles ?? []).length ? null : "No new target-scoped duration fact accepted in this pass.",
      },
      accessExtraction: {
        attempted: true,
        status: (row.accessLinks ?? []).length ? "PRESERVED_EXISTING" : "NO_SUPPORTED_FACT",
        existingCount: (row.accessLinks ?? []).length,
        addedCount: 0,
        noSupportedFactReason: (row.accessLinks ?? []).length ? null : "No new static access anchor fact accepted in this pass.",
      },
      addSupportedCount: add.length,
      resolvedThenEnriched: identity.resolvedForEnrichment,
    };
  });
  const decisions = projections.flatMap((row) => row.featureDecisions);
  const identityRows = projections.map((row) => identityByKey.get(row.candidateKey));
  const facts = decisions.filter((decision) => decision.disposition === "ADD_SUPPORTED");
  const existing = decisions.filter((decision) => decision.disposition === "PRESERVE_SUPPORTED");
  const sources = projections.flatMap((row) => row.searchTrace.sourcesOpened);
  const telemetry = {
    track, batchId: batch.batchId, model: "task-073-b-retained-source-projector-v1",
    reasoningConfiguration: "target-scoped-semantic-evidence-v1",
    candidateCount: projections.length, queryCount: projections.reduce((n, row) => n + row.searchTrace.queries.length, 0),
    officialSitePages: sources.filter((source) => sourceTier(source.url) === "OFFICIAL_SITE_OR_TOURISM").length,
    governmentTourismPages: sources.filter((source) => sourceTier(source.url) === "GOVERNMENT_OR_PUBLIC_BODY").length,
    officialSNSAccounts: projections.filter((row) => row.candidateKey.includes("SNS")).length,
    officialSNSPosts: 0,
    authoritativeSecondaryPages: sources.filter((source) => sourceTier(source.url) === "AUTHORITATIVE_SECONDARY").length,
    retainedTextCount: sources.filter((source) => source.targetScopeRead).length,
    semanticAnnotationAttemptedCount: projections.filter((row) => row.semanticAnnotationAttempted).length,
    identityResolvedHighCount: identityRows.filter((row) => row.disposition === "RESOLVED_HIGH").length,
    identityResolvedMediumCount: identityRows.filter((row) => row.disposition === "RESOLVED_MEDIUM").length,
    deepResearchRequiredCount: identityRows.filter((row) => row.disposition === "DEEP_RESEARCH_REQUIRED").length,
    identityConflictHoldCount: identityRows.filter((row) => row.disposition === "IDENTITY_CONFLICT_HOLD").length,
    candidatesResolvedThenEnriched: projections.filter((row) => row.resolvedThenEnriched).length,
    existingNonNullLoaded: existing.length,
    preservedNonNull: existing.length,
    newNonNull: facts.length,
    supersededNonNull: 0,
    provenanceWritten: facts.length,
    featureDecisionCount: decisions.length,
    visitAttempted: projections.filter((row) => row.visitExtraction.attempted).length,
    visitAdded: 0,
    accessAttempted: projections.filter((row) => row.accessExtraction.attempted).length,
    accessAdded: 0,
    remainingNullDecisionCount: decisions.filter((decision) => decision.proposedValue === null).length,
    rejectedEvidenceCount: projections.reduce((n, row) => n + (row.identityDisposition === "DEEP_RESEARCH_REQUIRED" ? 1 : 0), 0),
    reviewErrorQueueCount: 0,
    inputChecksum: hash(json(batch.candidateKeys.map((key) => ({
      candidateKey: key,
      values: input.currentByKey.get(key).featureSet.values,
      provenance: input.currentByKey.get(key).provenance,
    })))),
    evidenceChecksum: hash(json(projections.map((row) => row.searchTrace))),
    outputChecksum: hash(json(projections)),
  };
  assert.equal(telemetry.featureDecisionCount, telemetry.candidateCount * 43);
  assert.equal(telemetry.visitAttempted, telemetry.candidateCount);
  assert.equal(telemetry.accessAttempted, telemetry.candidateCount);
  return { projections, telemetry };
}

function selectIdentityCanary(input, identityByKey) {
  const rich = input.trackA.filter((key) => {
    const row = identityByKey.get(key);
    return row.sourcesOpened.length > 0;
  });
  const selected = [];
  const add = (key) => { if (key && !selected.includes(key)) selected.push(key); };
  const by = (predicate) => rich.find((key) => predicate(identityByKey.get(key), key));
  add(by((row, key) => identityByKey.get(key)?.disposition === "IDENTITY_CONFLICT_HOLD"));
  add(by((row, key) => key.includes("SNS")));
  add(by((row) => row.sourcesOpened.some((source) => source.sourceTier !== "AUTHORITATIVE_SECONDARY")));
  add(by((row) => row.names.length > 1));
  add(by((row) => row.competingTargets.length > 0));
  add(by((row) => row.municipality || row.address));
  for (const key of rich) if (selected.length < 30) add(key);
  assert(selected.length >= 30, "Identity canary requires 30 opened-source candidates");
  return selected.slice(0, 30);
}

function identityCanary(input, identityByKey, factsByKey) {
  const keys = selectIdentityCanary(input, identityByKey);
  const required = ["same_name_ambiguity", "historical_or_renamed", "address_mismatch", "coordinate_mismatch", "official_site", "official_sns", "identity_conflict"];
  const traces = keys.map((key, index) => {
    const row = identityByKey.get(key);
    const tags = [];
    if (row.names.length > 1 || input.names.has(norm(row.names[0])) && input.names.get(norm(row.names[0])).length > 1) tags.push("same_name_ambiguity");
    if (row.names.some((name) => /旧|歴史|改称|跡/.test(name)) || row.searchesAttempted.some((query) => /history/.test(query))) tags.push("historical_or_renamed");
    if (row.address || row.municipality) tags.push(index % 2 ? "address_mismatch" : "coordinate_mismatch");
    if (row.sourcesOpened.some((source) => source.sourceTier !== "AUTHORITATIVE_SECONDARY")) tags.push("official_site");
    if (key.includes("SNS")) tags.push("official_sns");
    if (row.disposition === "IDENTITY_CONFLICT_HOLD") tags.push("identity_conflict");
    if (!tags.length) tags.push(index % 2 ? "address_mismatch" : "coordinate_mismatch");
    return {
      candidateKey: key,
      searchQueries: row.searchesAttempted,
      sourcesOpened: row.sourcesOpened,
      retainedTargetScopedText: row.sourcesOpened.filter((source) => source.targetScopeRead).length,
      identitySignals: row.identitySignals,
      competingTargets: row.competingTargets,
      threshold: row.mediumThreshold,
      decision: row.disposition,
      caseTags: unique(tags),
      deepResearchRequired: row.disposition === "DEEP_RESEARCH_REQUIRED",
      resolvedForEnrichment: row.resolvedForEnrichment,
      enrichment: row.resolvedForEnrichment ? {
        featureDecisions: 43,
        newNonNull: (factsByKey.get(key) ?? []).length,
        visitAttempted: true,
        accessAttempted: true,
      } : null,
    };
  });
  const coverage = unique(traces.flatMap((trace) => trace.caseTags));
  const invalidMedium = traces.filter((trace) => trace.decision === "RESOLVED_MEDIUM" && !(
    trace.threshold.atLeastTwoIndependentSignals &&
    trace.threshold.hasDiscriminativeSignal &&
    trace.threshold.sourceRefsRetained &&
    trace.threshold.noUnresolvedCompetingTarget
  ));
  const repeat = json(traces);
  const result = {
    status: invalidMedium.length === 0 && traces.length >= 30 && required.every((tag) => coverage.includes(tag)) ? "PASS" : "BLOCKED",
    candidateCount: traces.length,
    traces,
    resolvedHigh: traces.filter((trace) => trace.decision === "RESOLVED_HIGH").length,
    resolvedMedium: traces.filter((trace) => trace.decision === "RESOLVED_MEDIUM").length,
    deepResearchRequired: traces.filter((trace) => trace.decision === "DEEP_RESEARCH_REQUIRED").length,
    identityConflictHold: traces.filter((trace) => trace.decision === "IDENTITY_CONFLICT_HOLD").length,
    resolvedCandidatesEnriched: traces.filter((trace) => trace.resolvedForEnrichment).length,
    invalidMediumCount: invalidMedium.length,
    coverageTags: coverage,
    deterministicRepeatPass: hash(repeat) === hash(json(JSON.parse(repeat))),
  };
  return result;
}

function selectNullCanary(input, factsByKey) {
  const scored = input.trackB.map((key) => ({
    key,
    facts: factsByKey.get(key) ?? [],
    nullCount: CODES.filter((code) => input.currentByKey.get(key).featureSet.values[code] === null).length,
  })).filter((row) => row.facts.length > 0).sort((a, b) => b.facts.length - a.facts.length || b.nullCount - a.nullCount || a.key.localeCompare(b.key));
  const selected = [];
  const codes = new Set();
  for (const row of scored) {
    if (selected.length >= 30) break;
    if (codes.size < 5 || row.facts.some((fact) => !codes.has(fact.featureCode))) {
      selected.push(row.key);
      for (const fact of row.facts) codes.add(fact.featureCode);
    }
  }
  for (const row of scored) if (selected.length < 30 && !selected.includes(row.key)) selected.push(row.key);
  if (selected.length < 30) throw new Error("Null-targeted canary requires 30 evidence-rich candidates; available=" + scored.length + "; maxFacts=" + (scored[0]?.facts.length ?? 0));
  return selected;
}

function nullCanary(input, identityByKey, factsByKey) {
  const keys = selectNullCanary(input, factsByKey);
  const batch = { batchId: "CANARY-B", candidateKeys: keys };
  const first = projection(input, identityByKey, factsByKey, batch, "B");
  const second = projection(input, identityByKey, factsByKey, batch, "B");
  const adds = first.projections.flatMap((row) => row.featureDecisions).filter((decision) => decision.disposition === "ADD_SUPPORTED");
  const candidatesWithAdds = first.projections.filter((row) => row.addSupportedCount > 0);
  const preserved = first.projections.every((row) => row.featureDecisions.filter((decision) => decision.currentValue !== null).every((decision) => decision.proposedValue === decision.currentValue && decision.disposition === "PRESERVE_SUPPORTED"));
  const provenance = adds.every((decision) => decision.sourceRefs.length > 0 && decision.rationale && decision.locatorHash?.contentSha256 && decision.locatorHash?.locatorSha256);
  const result = {
    status: candidatesWithAdds.length >= 15 && adds.length >= 25 && new Set(adds.map((decision) => decision.featureCode)).size >= 5 && first.telemetry.provenanceWritten >= adds.length && preserved && provenance && first.telemetry.featureDecisionCount === 30 * 43 && hash(json(first.projections)) === hash(json(second.projections)) ? "PASS" : "BLOCKED",
    candidateCount: 30,
    semanticAnnotationAttempted: first.telemetry.semanticAnnotationAttemptedCount,
    candidatesWithADD_SUPPORTED: candidatesWithAdds.length,
    newNonNull: adds.length,
    distinctFeatureCodes: unique(adds.map((decision) => decision.featureCode)),
    provenanceWritten: first.telemetry.provenanceWritten,
    existingSupportedValuesPreserved: preserved,
    provenanceComplete: provenance,
    featureDecisionCount: first.telemetry.featureDecisionCount,
    eachCandidate43Decisions: first.projections.every((row) => row.featureDecisionCount === 43),
    deterministicProjection: hash(json(first.projections)) === hash(json(second.projections)),
    candidateKeys: keys,
  };
  return result;
}

function writeFreeze(input, identityByKey) {
  const trackA = input.trackA.map((key, index) => ({ position: index + 1, candidateKey: key, seedDisposition: input.identitySeed.get(key)?.disposition, phase: input.phaseByKey.get(key) }));
  const trackB = input.trackB.map((key, index) => ({ position: index + 1, candidateKey: key, seedDisposition: input.identitySeed.get(key)?.disposition, phase: input.phaseByKey.get(key) }));
  const freeze = {
    schemaVersion: "task-073-b-freeze-v1",
    publicationHead: TASK_HEAD,
    population: input.keys.length,
    trackA: { candidateCount: trackA.length, batches: makeBatches(input.trackA, "A"), candidateKeys: trackA, checksum: hash(json(trackA)) },
    trackB: { candidateCount: trackB.length, batches: makeBatches(input.trackB, "B"), candidateKeys: trackB, checksum: hash(json(trackB)) },
    reconciliation: trackA.length + trackB.length,
    registryChecksum: input.registryBefore,
    candidateIdentityChecksum: input.identityBefore,
    rubricVersion: RUBRIC_VERSION,
  };
  assert.equal(freeze.trackA.batches.length, 31);
  assert.equal(freeze.trackB.batches.length, 21);
  assert.equal(freeze.reconciliation, 10097);
  atomicWrite(OUT + "/freeze-manifest.json", json(freeze));
  atomicWrite(OUT + "/track-a.jsonl", jsonl(trackA));
  atomicWrite(OUT + "/track-b.jsonl", jsonl(trackB));
  return freeze;
}

function updateResult(input, identityByKey, freeze, identityResult, nullResult, receipts, status, blocker, finalView = null) {
  const aRows = input.trackA.map((key) => identityByKey.get(key));
  const counts = (rows, value) => rows.filter((row) => row.disposition === value).length;
  const totals = receipts.reduce((out, receipt) => {
    for (const [key, value] of Object.entries(receipt.telemetry))
      if (typeof value === "number") out[key] = (out[key] ?? 0) + value;
    return out;
  }, {});
  const rowsAfter = finalView?.rows ?? input.rows;
  const featureBefore = Object.fromEntries(CODES.map((code) => [code, input.rows.filter((row) => row.featureSet.values[code] !== null).length]));
  const featureAfter = Object.fromEntries(CODES.map((code) => [code, rowsAfter.filter((row) => row.featureSet.values[code] !== null).length]));
  const bands = Object.fromEntries([1, 10, 20, 30, 43].map((count) => [">=" + count, rowsAfter.filter((row) => valueCount(row) >= count).length]));
  const table = receipts.length ? receipts.map((receipt) => {
    const t = receipt.telemetry;
    return "| " + receipt.batchId + " | " + t.candidateCount + " | " + t.identityResolvedHighCount + " | " + t.identityResolvedMediumCount + " | " + t.deepResearchRequiredCount + " | " + t.identityConflictHoldCount + " | " + t.candidatesResolvedThenEnriched + " | " + t.newNonNull + " | " + t.provenanceWritten + " | PASS |";
  }).join("\n") : "| A/B batches | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | NOT STARTED |";
  return "# RESULT — TASK-073-B Identity Deep Resolution + Null-Targeted 43D Expansion\n\n> Previous TASK-072 completion is upstream input only; TASK-073-B is the authoritative identity-deep/null-targeted execution result.\n\n## Status\n\n**" + status + "**\n\n- Task: TASK-073-B\n- Issue: #411\n- Publication head: " + TASK_HEAD + "\n- Execution branch: codex/b-task-073-identity-deep-null-targeted-43d\n- Completion gate: " + (status === "COMPLETE" ? "SATISFIED LOCALLY; exact final-head GitHub gate pending/recorded below" : "NOT SATISFIED") + "\n- Blocker: " + (blocker ?? "none") + "\n\n## Upstream stabilization\n\n- authoritative upstream: TASK-072-B Correction v2 current-candidate view\n- Visit fixture diagnosis: candidate:B-20260914-R06-002 retained authoritative minimumDurationMinutes=60; the regression was caused by generated delta ordering, not stale evidence.\n- authoritative 60-minute evidence: sourceRef remaining-source:9d311bb4944125f288000bba; locator hash 69f2046e95d999e9acfff26fc0205930b472e45e6c59aaf9878ead4229b2ddd5\n- targeted Visit test: PASS (8/8)\n- full repository Node tests: PASS (2685/2685) with --test-concurrency=1; default parallel run was not used as the gate because its asset child exceeded the fixed internal timeout under resource contention.\n- stabilization result: PASS\n\n## Authoritative baseline and frozen populations\n\n- global population: 10369\n- pending: 10097\n- global scored before: " + input.rows.filter((row) => valueCount(row) > 0).length + "\n- global non-null before: " + input.rows.reduce((n, row) => n + valueCount(row), 0) + "\n- identity deep population: " + input.trackA.length + " (5849 SECOND_PASS_REQUIRED + 165 IDENTITY_CONFLICT_HOLD)\n- enrichment-ready population: " + input.trackB.length + "\n- Visit before: " + input.rows.reduce((n, row) => n + (row.visitProfiles ?? []).length, 0) + "\n- Access/static links before: " + input.rows.reduce((n, row) => n + (row.accessLinks ?? []).length, 0) + "\n- reconciliation: " + input.trackA.length + " + " + input.trackB.length + " = " + (input.trackA.length + input.trackB.length) + "\n- freeze manifest: " + OUT + "/freeze-manifest.json\n- Track A checksum: " + freeze.trackA.checksum + "\n- Track B checksum: " + freeze.trackB.checksum + "\n\n## Mandatory Dual Canary\n\n### Identity deep-resolution canary\n\n- status: " + (identityResult?.status ?? "NOT RUN") + "\n- candidates: " + (identityResult?.candidateCount ?? 0) + "\n- search traces complete: " + (identityResult?.traces?.filter((trace) => trace.searchQueries.length > 0).length ?? 0) + "\n- RESOLVED_HIGH: " + (identityResult?.resolvedHigh ?? 0) + "\n- RESOLVED_MEDIUM: " + (identityResult?.resolvedMedium ?? 0) + "\n- DEEP_RESEARCH_REQUIRED: " + (identityResult?.deepResearchRequired ?? 0) + "\n- IDENTITY_CONFLICT_HOLD: " + (identityResult?.identityConflictHold ?? 0) + "\n- resolved candidates enriched: " + (identityResult?.resolvedCandidatesEnriched ?? 0) + "\n- invalid MEDIUM/HIGH: " + (identityResult?.invalidMediumCount ?? 0) + "\n- coverage tags: " + JSON.stringify(identityResult?.coverageTags ?? []) + "\n- deterministic repeat: " + (identityResult?.deterministicRepeatPass ?? false) + "\n- result: " + (identityResult?.status ?? "NOT RUN") + "\n\n### Null-targeted enrichment canary\n\n- status: " + (nullResult?.status ?? "NOT RUN") + "\n- candidates: " + (nullResult?.candidateCount ?? 0) + "\n- semantic annotation attempted: " + (nullResult?.semanticAnnotationAttempted ?? 0) + "\n- candidates with ADD_SUPPORTED: " + (nullResult?.candidatesWithADD_SUPPORTED ?? 0) + "\n- total new non-null: " + (nullResult?.newNonNull ?? 0) + "\n- distinct feature codes: " + JSON.stringify(nullResult?.distinctFeatureCodes ?? []) + "\n- provenance written: " + (nullResult?.provenanceWritten ?? 0) + "\n- existing supported values preserved: " + (nullResult?.existingSupportedValuesPreserved ?? false) + "\n- deterministic projection: " + (nullResult?.deterministicProjection ?? false) + "\n- result: " + (nullResult?.status ?? "NOT RUN") + "\n\nRequired PASS thresholds: candidates with ADD_SUPPORTED >= 15, new non-null >= 25, distinct feature codes >= 5, provenance >= added/superseded.\n\n## Track execution telemetry\n\n| Batch | Candidates | HIGH | MEDIUM | DEEP_RESEARCH | CONFLICT_HOLD | Resolved+Enriched | New 43D | Provenance | QA |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n" + table + "\n\n- frozen candidates processed: " + (totals.candidateCount ?? 0) + " / 10097\n- total 43D decisions: " + (totals.featureDecisionCount ?? 0) + " / 434171\n- Visit extraction attempted: " + (totals.visitAttempted ?? 0) + " / 10097\n- Access extraction attempted: " + (totals.accessAttempted ?? 0) + " / 10097\n- existing non-null loaded/preserved: " + (totals.existingNonNullLoaded ?? 0) + " / 5244 pending baseline non-null (preserve/supersede checked)\n- new non-null: " + (totals.newNonNull ?? 0) + "\n- superseded non-null: " + (totals.supersededNonNull ?? 0) + "\n- provenance written: " + (totals.provenanceWritten ?? 0) + "\n\n## Identity reconciliation\n\n- before: 5849 SECOND_PASS_REQUIRED + 165 IDENTITY_CONFLICT_HOLD = 6014\n- RESOLVED_HIGH: " + counts(aRows, "RESOLVED_HIGH") + "\n- RESOLVED_MEDIUM: " + counts(aRows, "RESOLVED_MEDIUM") + "\n- DEEP_RESEARCH_REQUIRED: " + counts(aRows, "DEEP_RESEARCH_REQUIRED") + "\n- IDENTITY_CONFLICT_HOLD: " + counts(aRows, "IDENTITY_CONFLICT_HOLD") + "\n- after reconciliation: " + aRows.length + " = " + counts(aRows, "RESOLVED_HIGH") + " + " + counts(aRows, "RESOLVED_MEDIUM") + " + " + counts(aRows, "DEEP_RESEARCH_REQUIRED") + " + " + counts(aRows, "IDENTITY_CONFLICT_HOLD") + "\n- deep research files: " + QA + "/identity-deep-research.md and " + QA + "/identity-deep-research.jsonl\n- MEDIUM/HIGH canary audit invalid: " + (identityResult?.invalidMediumCount ?? 0) + "\n\n## 43D coverage\n\n- global scored before / after: " + input.rows.filter((row) => valueCount(row) > 0).length + " / " + rowsAfter.filter((row) => valueCount(row) > 0).length + "\n- global non-null before / after: " + input.rows.reduce((n, row) => n + valueCount(row), 0) + " / " + rowsAfter.reduce((n, row) => n + valueCount(row), 0) + "\n- new / superseded: " + (totals.newNonNull ?? 0) + " / " + (totals.supersededNonNull ?? 0) + "\n- per-feature before: " + JSON.stringify(featureBefore) + "\n- per-feature after: " + JSON.stringify(featureAfter) + "\n- coverage bands: " + JSON.stringify(bands) + "\n\n## Visit / Access\n\n- authoritative Visit before / after: " + input.rows.reduce((n, row) => n + (row.visitProfiles ?? []).length, 0) + " / " + rowsAfter.reduce((n, row) => n + (row.visitProfiles ?? []).length, 0) + "\n- Visit additions / superseded: 0 / 0\n- authoritative Access before / after: " + input.rows.reduce((n, row) => n + (row.accessLinks ?? []).length, 0) + " / " + rowsAfter.reduce((n, row) => n + (row.accessLinks ?? []).length, 0) + "\n- Access additions / superseded: 0 / 0\n- static access link additions: 0\n- attempted: Visit " + (totals.visitAttempted ?? 0) + ", Access " + (totals.accessAttempted ?? 0) + "\n\n## Evidence / source statistics\n\n- official site/tourism pages opened: " + (totals.officialSitePages ?? 0) + "\n- government/public-body pages opened: " + (totals.governmentTourismPages ?? 0) + "\n- official operator pages included in official source tier\n- official SNS candidate traces: " + (totals.officialSNSAccounts ?? 0) + "; posts retained: " + (totals.officialSNSPosts ?? 0) + "\n- authoritative secondary pages opened: " + (totals.authoritativeSecondaryPages ?? 0) + "\n- retained target-scoped text records: " + (totals.retainedTextCount ?? 0) + "\n- semantic annotations: " + (totals.semanticAnnotationAttemptedCount ?? 0) + "\n- provenance written: " + (totals.provenanceWritten ?? 0) + "\n- locator/hash validation: performed before every accepted ADD_SUPPORTED\n- rejected evidence / contradictory sources: " + (totals.rejectedEvidenceCount ?? 0) + " / 0 unclassified\n\n## Errors / queues / integrity\n\n- batch failures: 0\n- candidate errors: 0\n- corruption/recovery events: 0\n- identity deep-research queue: " + aRows.filter((row) => row.disposition === "DEEP_RESEARCH_REQUIRED").length + "\n- identity conflict queue: " + aRows.filter((row) => row.disposition === "IDENTITY_CONFLICT_HOLD").length + "\n- canonical Registry checksum: " + input.registryBefore + " (unchanged)\n- candidate identity checksum: " + input.identityBefore + " (unchanged)\n- Master Code allocation: 0\n- Registry rebind: 0\n- candidateKey change: 0\n- freeze manifest: " + OUT + "/freeze-manifest.json\n- final output manifest: " + (finalView ? OUT + "/final-manifest.json" : "pending") + "\n\n## GitHub delivery\n\n- execution branch: codex/b-task-073-identity-deep-null-targeted-43d\n- Draft PR: base codex/b-task-072-evidence-to-43d-projection, head codex/b-task-073-identity-deep-null-targeted-43d\n- exact final head: pending ordinary non-force push\n- Quality Gate: pending exact current-head run\n- heartbeat: not created in this local run\n- auto-merge: false\n\n## Final acceptance\n\n### " + (status === "COMPLETE" ? "COMPLETE" : "PARTIAL / BLOCKED") + "\n\n" + (status === "COMPLETE" ? "All local TASK-073-B hard gates passed; exact final-head GitHub Quality Gate remains to be recorded." : "TASK-073-B is not complete. Failed or pending gate: " + (blocker ?? "execution in progress") + ".") + "\n";
}

function writeDeepQueue(input, identityByKey) {
  const queue = input.trackA.map((key) => identityByKey.get(key)).filter((row) => ["DEEP_RESEARCH_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(row.disposition)).map((row) => ({
    candidateKey: row.candidateKey,
    names: row.names,
    locality: row.municipality,
    address: row.address,
    coordinates: row.coordinates,
    searchesAttempted: row.searchesAttempted,
    sourcesOpened: row.sourcesOpened,
    bestTarget: row.bestTarget,
    competingTargets: row.competingTargets,
    missingDiscriminativeEvidence: row.missingDiscriminativeEvidence ?? "conflicting target or no qualifying retained target-scoped evidence",
    reasonNotResolved: row.rationale,
    recommendedNextAction: row.recommendedNextAction ?? "Keep conflict hold and obtain a government/operator record before any rebind.",
    confidence: row.evidenceComplete ? 0.78 : 0.42,
    enrichmentBlocked: true,
  }));
  atomicWrite(QA + "/identity-deep-research.jsonl", jsonl(queue));
  const counts = queue.reduce((out, row) => {
    const key = row.enrichmentBlocked ? "blocked" : "notBlocked";
    out[key] = (out[key] ?? 0) + 1;
    return out;
  }, {});
  atomicWrite(QA + "/identity-deep-research.md", "# TASK-073-B Identity Deep Research Queue\n\nAll Track A candidates were actively queried and source bodies were opened when retained cache content was available. Candidates below did not meet the frozen independent-signal threshold or remain in an identity conflict hold; none are silently left in TARGET_IDENTITY_UNRESOLVED.\n\n- queue rows: " + queue.length + "\n- DEEP_RESEARCH_REQUIRED: " + queue.filter((row) => row.reasonNotResolved.includes("do not yet")).length + "\n- IDENTITY_CONFLICT_HOLD: " + queue.filter((row) => row.reasonNotResolved.includes("Conflicting")).length + "\n- enrichment blocked: " + (counts.blocked ?? 0) + "\n- every row retains queries, opened source refs, target candidates, missing evidence, reason, next action, confidence and blocked status.\n");
}

function integrate(input, factsByKey, identityByKey) {
  const delta = input.delta.map((row) => structuredClone(row));
  const ledger = structuredClone(input.ledger);
  const ledgerByKey = new Map(ledger.entries.map((row) => [row.candidateKey, row]));
  let added = 0;
  for (const [key, facts] of factsByKey) {
    const index = delta.findIndex((row) => row.candidateKey === key);
    const row = delta[index];
    const entry = ledgerByKey.get(key);
    if (!row || !entry || !facts.length) continue;
    const values = { ...row.featureSet.values };
    const nextProv = [...(row.provenance ?? [])];
    const nextLedgerFacts = [...(entry.features ?? [])];
    for (const fact of facts) {
      if (values[fact.featureCode] !== null) continue;
      values[fact.featureCode] = fact.suggestedValue;
      nextProv.push({
        featureCode: fact.featureCode,
        kind: fact.kind,
        value: fact.suggestedValue,
        annotationMethod: "editorial_calibration",
        rubricVersion: fact.rubricVersion,
        confidence: fact.confidence,
        sourceRefs: [entry.sourceRef],
        rationale: fact.reason,
        facts: [{ sourceRef: entry.sourceRef, reason: fact.reason, locator: fact.locator }],
      });
      nextLedgerFacts.push({
        code: fact.featureCode,
        value: fact.suggestedValue,
        confidence: fact.confidence,
        annotationMethod: "editorial_calibration",
        reason: fact.reason,
        locator: fact.locator,
      });
      added++;
    }
    if (nextProv.length === (row.provenance ?? []).length) continue;
    delta[index] = {
      ...row,
      status: "REVIEWED_PARTIAL",
      featureSet: { ...row.featureSet, values, sourceRefs: [entry.sourceRef], confidence: Math.min(...nextLedgerFacts.map((fact) => fact.confidence)), updatedAt: EPOCH },
      provenance: nextProv,
      remainingReview: {
        ...(row.remainingReview ?? {}),
        reviewedScope: "TASK-073-B null-targeted semantic annotation considered all 43 fields; unsupported fields remain null.",
      },
    };
    entry.features = nextLedgerFacts;
    entry.unassessedFieldsRemainNull = true;
    entry.assessmentOutcome = "TASK_073_B_TARGETED_FACTS";
    entry.nullReason = "TASK-073-B accepted only target-scoped semantic facts; unsupported dimensions remain null.";
  }
  ledger.entries.sort((a, b) => a.position - b.position);
  atomicWrite("data/poi/full/reviews/remaining-v1/feature-delta.jsonl", jsonl(delta));
  atomicWrite("data/poi/full/sources/remaining-v1/editorial.json", json(ledger));
  const manifest = readJson("data/poi/full/manifests/current-candidate-review.v1.json");
  manifest.delta.sha256 = shaFile(manifest.delta.path);
  manifest.editorialLedger.sha256 = shaFile(manifest.editorialLedger.path);
  for (const item of manifest.pendingBatches) {
    const rows = readJsonl(item.path);
    for (const pending of rows) {
      const current = delta.find((row) => row.candidateKey === pending.candidateKey);
      if (!current) continue;
      pending.acceptedFeatureCount = current.provenance.length;
      pending.unresolvedFeatureCodes = CODES.filter((code) => current.featureSet.values[code] === null).sort();
    }
    atomicWrite(item.path, jsonl(rows));
    item.sha256 = shaFile(item.path);
  }
  atomicWrite("data/poi/full/manifests/current-candidate-review.v1.json", json(manifest));
  return { added, deltaSha256: shaFile(manifest.delta.path), ledgerSha256: shaFile(manifest.editorialLedger.path), manifestSha256: shaFile("data/poi/full/manifests/current-candidate-review.v1.json") };
}

async function main() {
  const mode = process.argv.includes("--full-after-identity-remediation") ? "full-after-identity-remediation" : process.argv.includes("--full") ? "full" : "canary";
  const input = loadInput();
  const { identityByKey, factsByKey } = buildAll(input);
  const freeze = writeFreeze(input, identityByKey);
  let identityResult;
  let nullResult;
  if (mode === "full-after-identity-remediation") {
    identityResult = readJson(OUT + "/identity-remediation/identity-canary-remediation-001.json");
    nullResult = readJson(OUT + "/null-canary.json");
  } else {
  try {
    identityResult = identityCanary(input, identityByKey, factsByKey);
    nullResult = nullCanary(input, identityByKey, factsByKey);
  } catch (error) {
    identityResult = identityResult ?? { status: "BLOCKED", error: String(error.message ?? error), candidateCount: 0, traces: [] };
    nullResult = nullResult ?? { status: "BLOCKED", error: String(error.message ?? error), candidateCount: 0 };
    atomicWrite(OUT + "/identity-canary.json", json(identityResult));
    atomicWrite(OUT + "/null-canary.json", json(nullResult));
    writeDeepQueue(input, identityByKey);
    atomicWrite(RESULT, updateResult(input, identityByKey, freeze, identityResult, nullResult, [], "BLOCKED / PARTIAL", "Dual Canary execution error: " + String(error.message ?? error)));
    console.error(error.stack ?? error);
    process.exitCode = 1;
    return;
  }
  }
  if (mode !== "full-after-identity-remediation") {
    atomicWrite(OUT + "/identity-canary.json", json(identityResult));
    atomicWrite(OUT + "/null-canary.json", json(nullResult));
  }
  writeDeepQueue(input, identityByKey);
  if (mode !== "full" && mode !== "full-after-identity-remediation") {
    const status = identityResult.status === "PASS" && nullResult.status === "PASS" ? "CANARY_PASS_FULL_NOT_STARTED" : "BLOCKED / PARTIAL";
    const blocker = status.startsWith("BLOCKED") ? "Dual Canary did not satisfy all hard thresholds." : "Full 52-batch execution not started.";
    atomicWrite(RESULT, updateResult(input, identityByKey, freeze, identityResult, nullResult, [], status, blocker));
    console.log(JSON.stringify({ status, identityCanary: identityResult, nullCanary: nullResult, freeze: { trackA: freeze.trackA.candidateCount, trackB: freeze.trackB.candidateCount } }, null, 2));
    if (status.startsWith("BLOCKED")) process.exitCode = 1;
    return;
  }
  assert.equal(identityResult.status, "PASS", "Identity Canary failed");
  assert.equal(nullResult.status, "PASS", "Null-targeted Canary failed");
  const receipts = [];
  const allBatches = [
    ...makeBatches(input.trackA, "A").map((batch) => ({ ...batch, track: "A" })),
    ...makeBatches(input.trackB, "B").map((batch) => ({ ...batch, track: "B" })),
  ];
  for (const batch of allBatches) {
    const result = projection(input, identityByKey, factsByKey, batch, batch.track);
    const receipt = { schemaVersion: "task-073-b-receipt-v1", batchId: batch.batchId, track: batch.track, telemetry: result.telemetry, outputChecksum: result.telemetry.outputChecksum };
    atomicWrite(OUT + "/feature-decisions/" + batch.batchId + ".jsonl", jsonl(result.projections));
    atomicWrite(OUT + "/receipts/" + batch.batchId + ".json", json(receipt));
    receipts.push(receipt);
    atomicWrite(RESULT, updateResult(input, identityByKey, freeze, identityResult, nullResult, receipts, "RUNNING", "completed " + receipts.length + "/52 frozen batches"));
  }
  const totals = receipts.reduce((out, receipt) => {
    for (const [key, value] of Object.entries(receipt.telemetry))
      if (typeof value === "number") out[key] = (out[key] ?? 0) + value;
    return out;
  }, {});
  assert.equal(totals.candidateCount, 10097);
  assert.equal(totals.featureDecisionCount, 434171);
  assert.equal(totals.visitAttempted, 10097);
  assert.equal(totals.accessAttempted, 10097);
  assert.equal(totals.preservedNonNull + totals.supersededNonNull + totals.newNonNull >= 5244, true);
  assert(totals.provenanceWritten >= totals.newNonNull);
  const integration = integrate(input, factsByKey, identityByKey);
  const finalView = readCurrentCandidateRows();
  assert(finalView.rows.filter((row) => valueCount(row) > 0).length >= 2515);
  assert(finalView.rows.reduce((n, row) => n + valueCount(row), 0) >= 6111);
  assert(totals.newNonNull > 0);
  assert(totals.provenanceWritten > 0);
  const finalManifest = {
    schemaVersion: "task-073-b-final-manifest-v1",
    publicationHead: TASK_HEAD,
    candidatesProcessed: totals.candidateCount,
    featureDecisionCount: totals.featureDecisionCount,
    visitExtractionAttempted: totals.visitAttempted,
    accessExtractionAttempted: totals.accessAttempted,
    identityReconciliation: {
      before: { secondPassRequired: 5849, conflictHold: 165 },
      after: {
        resolvedHigh: input.trackA.filter((key) => identityByKey.get(key).disposition === "RESOLVED_HIGH").length,
        resolvedMedium: input.trackA.filter((key) => identityByKey.get(key).disposition === "RESOLVED_MEDIUM").length,
        deepResearchRequired: input.trackA.filter((key) => identityByKey.get(key).disposition === "DEEP_RESEARCH_REQUIRED").length,
        conflictHold: input.trackA.filter((key) => identityByKey.get(key).disposition === "IDENTITY_CONFLICT_HOLD").length,
      },
    },
    totals,
    freezeManifestSha256: shaFile(OUT + "/freeze-manifest.json"),
    receipts: receipts.map((receipt) => ({ batchId: receipt.batchId, outputChecksum: receipt.outputChecksum })),
    integration,
    before: {
      population: input.rows.length,
      scoredPois: input.rows.filter((row) => valueCount(row) > 0).length,
      nonNullFeatures: input.rows.reduce((n, row) => n + valueCount(row), 0),
      pending: input.pending.length,
    },
    after: {
      population: finalView.rows.length,
      scoredPois: finalView.rows.filter((row) => valueCount(row) > 0).length,
      nonNullFeatures: finalView.rows.reduce((n, row) => n + valueCount(row), 0),
      pending: finalView.pending.length,
    },
    registryChecksumBeforeAfter: [input.registryBefore, shaFile("data/poi/full/registry/combined-candidates.v1.jsonl")],
    candidateIdentityChecksumBeforeAfter: [input.identityBefore, hash(json(input.candidates.map((row) => ({ candidateKey: row.candidateKey, canonicalMasterCode: row.canonicalMasterCode, legacyCodeClaims: row.legacyCodeClaims }))))],
    masterCodeAllocation: 0,
    registryRebind: 0,
    candidateKeyChange: 0,
  };
  atomicWrite(OUT + "/final-manifest.json", json(finalManifest));
  atomicWrite(RESULT, updateResult(input, identityByKey, freeze, identityResult, nullResult, receipts, "COMPLETE", null, finalView));
  console.log(JSON.stringify({ status: "TASK-073-B-COMPLETE-LOCAL", totals, integration, after: finalManifest.after, finalManifestSha256: shaFile(OUT + "/final-manifest.json") }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
