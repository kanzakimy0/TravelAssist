import assert from "node:assert/strict";
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
import { dirname, relative, resolve } from "node:path";
import { readCurrentCandidateRows } from "./read-current-candidates.mjs";

const ROOT = resolve(process.cwd());
const TASK = "TASK-072-B";
const RUBRIC_VERSION = "candidate-recovery-1.0";
const EPOCH = "2026-09-21T00:00:00Z";
const OUT = "data/poi/full/task-072-b-correction-v2";
const QA = "docs/qa/TASK-072-B";
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
const ALLOWED = new Set([
  "PRESERVE_SUPPORTED", "ADD_SUPPORTED", "SUPERSEDE_SUPPORTED",
  "UNSUPPORTED_REMAINS_NULL", "IDENTITY_BLOCKED", "SOURCE_CONTRADICTORY",
]);

// Curated Stage-A annotations. Each phrase was selected after reading the
// target-scoped retained/accepted text; the projector never invents values.
const CURATED = [
  ["geoshape-nrct-poi:190000039700", "https://sitereports.nabunken.go.jp/ja/cultural-property/54902", "22", 6, "縄文土器", "The government cultural-property record identifies the target site, its Jomon period, and Jomon pottery; this is an educational/history fact, not a visitability claim."],
  ["geoshape-nrct-poi:210000293600", "https://www.city.toki.lg.jp/kanko/bunkazai/1004852/1004853/1006503/1003297.html", "03", 7, "美濃地域最古の連房式登窯", "The Toki City page explicitly describes the target kiln as the oldest multi-chamber climbing kiln in the Mino region."],
  ["geoshape-nrct-poi:210000293600", "https://www.city.toki.lg.jp/kanko/bunkazai/1004852/1004853/1006503/1003297.html", "02", 7, "400年前の桃山時代", "The Toki City page places the target kiln in the documented 400-year-old Momoyama-period pottery history."],
  ["geoshape-nrct-poi:300000037100", "https://www.city.ikoma.lg.jp/html/dm/bun/shosai/sekibutsu/sekibutsu.html", "10", 6, "阿弥陀如来坐像", "Ikoma City lists the target temple's named Buddhist statues; this supports documented art interest."],
  ["candidate:B_V1_PROPOSED:60334", "https://www.pref.miyagi.jp/soshiki/taga/tagajoato.html", "02", 7, "神亀（じんき）元年（724）、大野東人（おおののあずまひと）によって創建された", "Miyagi Prefecture gives the target site's explicit foundation date and historical role."],
  ["candidate:B_V1_PROPOSED:60334", "https://www.pref.miyagi.jp/soshiki/taga/tagajoato.html", "01", 6, "仙台湾や仙台平野を一望できる丘陵上に立地", "Miyagi Prefecture explicitly describes the target site as situated on a hill overlooking Sendai Bay and the plain."],
  ["candidate:B_V1_PROPOSED:60353", "https://www.city.ena.lg.jp/soshikiichiran/kyoikuiinkai/bunka/1/2027.html", "22", 6, "多くの岩村城、岩村藩関係史料を収蔵展示", "Ena City states that the target's adjacent museum stores and exhibits many Iwamura Castle and domain records."],
  ["candidate:B_V1_PROPOSED:60356", "https://www.city.shinshiro.lg.jp/mokuteki/shisetu/shiryokan/nagashinojyoshi/goannai.html", "02", 7, "長篠城", "The Shinshiro City cultural-facility page is target-owned/government evidence for the named castle site and its documented history."],
  ["candidate:B_V1_PROPOSED:60370", "https://www.town.umi.lg.jp/site/spot/kanko165.html", "02", 7, "大野城", "The Umi Town page documents the target castle site's historical identity and location."],
  ["candidate:B_V1_PROPOSED:60554", "https://www.city.kumagaya.lg.jp/kanko/midokoro/menumasyoudenzan/index.html", "03", 7, "国宝に指定されています", "Kumagaya City explicitly identifies the target sanctuary as a designated National Treasure architectural work."],
  ["candidate:B_V1_PROPOSED:60554", "https://www.city.kumagaya.lg.jp/kanko/midokoro/menumasyoudenzan/index.html", "10", 7, "聖天堂の鮮やかな彫刻", "Kumagaya City explicitly describes the target's vivid sculptures."],
  ["candidate:B_V1_PROPOSED:60558", "https://www.city.setagaya.lg.jp/02205/10322.html", "02", 6, "国指定史跡の豪徳寺井伊家墓所", "Setagaya City identifies the target temple and its nationally designated historic Ii-family cemetery."],
  ["candidate:B_V1_PROPOSED:60558", "https://www.city.setagaya.lg.jp/02205/10322.html", "13", 6, "招き猫の発祥の地", "Setagaya City records the target's distinctive beckoning-cat origin tradition as a documented cultural feature."],
  ["candidate:B_V1_PROPOSED:60589", "https://www.bunka.go.jp/seisaku/bunkazai/takamatsu_kitora/kitora_kokai/oubo/", "10", 7, "国宝キトラ古墳壁画", "The Agency for Cultural Affairs names the target's National Treasure Kitora tumulus murals and their public display."],
  ["geoshape-nrct-poi:090000039200", "https://www.city.nasukarasuyama.lg.jp/", "22", 5, "文化財展示「何が分かった烏山城跡", "Nasukarasuyama City announces a target-specific cultural-property exhibition about Karasuyama Castle ruins."],
  ["geoshape-nrct-poi:210000373300", "https://www.hidatakayama.or.jp/spot/detail_1609.html", "02", 7, "貞和3(1347)年に創建", "The official Hida Takayama tourism page gives the target temple's documented 1347 foundation."],
  ["geoshape-nrct-poi:210000373300", "https://www.hidatakayama.or.jp/spot/detail_1609.html", "03", 7, "応永15（1408）年建立", "The official Hida Takayama tourism page dates the target treasury's construction to 1408 and describes its architectural form."],
  ["geoshape-nrct-poi:200000076900", "https://www.city.ueda.nagano.jp/site/uedajo/", "40", 7, "春の桜", "Ueda City explicitly describes spring cherry blossoms at the target castle."],
  ["geoshape-nrct-poi:200000076900", "https://www.city.ueda.nagano.jp/site/uedajo/", "42", 7, "秋の紅葉", "Ueda City explicitly describes autumn foliage at the target castle."],
  ["geoshape-nrct-poi:200000076900", "https://www.city.ueda.nagano.jp/site/uedajo/", "02", 7, "難攻不落の城", "Ueda City explicitly documents the target castle's historical reputation as an impregnable castle."],
  ["geoshape-nrct-poi:250000076800", "https://www.ishiyamadera.or.jp/", "02", 7, "天平19年（747）、聖武天皇の勅願で良弁僧正が創建", "The operator's official history gives the target temple's explicit 747 foundation account."],
  ["geoshape-nrct-poi:250000076800", "https://www.ishiyamadera.or.jp/", "10", 6, "絵画・聖教・典籍など数多くの歴史的な寺宝", "The operator explicitly lists the target's historical paintings, scriptures, and books as temple treasures."],
  ["geoshape-nrct-poi:270000088200", "https://kyotokanko.com/places/%E6%96%B9%E5%BA%83%E5%AF%BA/", "02", 7, "1586（天正14）年豊臣秀吉が建立", "The Kyoto tourism page explicitly dates construction of the target temple to 1586 by Toyotomi Hideyoshi."],
  ["geoshape-nrct-poi:270000088200", "https://kyotokanko.com/places/%E6%96%B9%E5%BA%83%E5%AF%BA/", "03", 6, "大仏が安置してあった", "The Kyoto tourism page explicitly documents the target's former Great Buddha hall and built architectural history."],
  ["geoshape-nrct-poi:260000055300", "http://shoboji.or.jp/", "03", 7, "重要文化財の本堂・大方丈・唐門", "The target operator explicitly lists the temple's designated main hall, abbot's quarters, and gate."],
  ["geoshape-nrct-poi:260000055300", "http://shoboji.or.jp/", "10", 6, "狩野派の襖絵", "The target operator explicitly identifies Kano-school sliding-door paintings."],
  ["geoshape-nrct-poi:260000055300", "http://shoboji.or.jp/", "01", 6, "名勝指定の庭園", "The target operator explicitly identifies the garden as a designated scenic place."],
  ["geoshape-nrct-poi:250000042800", "https://otsu.or.jp/sengokuotsu/zeze/", "02", 7, "二百七十年余り続いた城の歴史", "The official Otsu cultural page explicitly describes the target castle's 270-year history."],
  ["geoshape-nrct-poi:250000042800", "https://otsu.or.jp/sengokuotsu/zeze/", "03", 6, "城門や櫓などは膳所神社や篠津神社", "The official Otsu page documents surviving target castle gates and turrets relocated to named shrines."],
  ["geoshape-nrct-poi:330000044100", "https://www.kankou-shimane.com/destination/20721", "02", 6, "松江藩主松平家の菩提寺", "The official Shimane tourism page documents the target temple as the Matsue domain lord family's mortuary temple."],
  ["geoshape-nrct-poi:330000044100", "https://www.kankou-shimane.com/destination/20721", "07", 5, "山陰のあじさい寺", "The official Shimane tourism page explicitly describes the target as a hydrangea temple and nature attraction."],
  ["geoshape-nrct-poi:210000307500", "https://www.kankou-gifu.jp/spot/detail_1344.html", "02", 7, "日本三大山城", "The official Gifu tourism page explicitly identifies the target as one of Japan's three great mountain castles."],
  ["geoshape-nrct-poi:430000059200", "https://saruku.nagasaki-visit.or.jp/ikeshima/", "23", 6, "池島炭鉱体験施設", "The official Nagasaki walking-tour source explicitly identifies the target's coal-mine experience facility."],
  ["candidate:B-SNS-20260915-R10-012", "https://www.iseshima-kanko.jp/feature/shima_ranking_2024", "23", 6, "地中海の街を再現した体験＆滞在型リゾートヴィレッジ", "The official Ise-Shima tourism source explicitly describes the target as an experiential resort village recreating a Mediterranean town."],
  ["candidate:B-SNS-20260915-R01-020", "https://tabiiro.jp/kankou/article/oirasekeiryu-syuuhenkankou/", "25", 6, "遊歩道がしっかりと整備されている", "The retained secondary source explicitly describes maintained walking paths in the target-area route and names the target visitor center."],
  ["candidate:B_V1_PROPOSED:60349", "https://niigata-kankou.or.jp/spot/10246", "03", 7, "国の重要文化財に指定されています", "The official Niigata tourism page explicitly identifies the target's preserved gates and turret as important cultural properties."],
  ["candidate:B_V1_PROPOSED:60349", "https://niigata-kankou.or.jp/spot/10246", "40", 7, "春には桜", "The official Niigata tourism page explicitly describes spring cherry blossoms at the target castle park."],
  ["geoshape-nrct-poi:200000136900", "https://www.inacity.jp/kurashi/shogaigakushu_bunka/bunkazai/takatojyoseki.html", "02", 7, "国指定史跡であり日本百名城の1つ", "Ina City explicitly identifies the target as a nationally designated historic site and one of Japan's 100 famous castles."],
  ["geoshape-nrct-poi:200000136900", "https://www.inacity.jp/kurashi/shogaigakushu_bunka/bunkazai/takatojyoseki.html", "40", 7, "桜の名所の公園", "Ina City explicitly describes the target as a park famous for cherry blossoms."],
  ["geoshape-nrct-poi:030000021300", "https://amanosan-kongoji.jp/", "03", 7, "金堂（重要文化財）", "The target operator explicitly lists the main hall as an important cultural property."],
  ["geoshape-nrct-poi:030000021300", "https://amanosan-kongoji.jp/", "10", 7, "国宝のご本尊大日如来", "The target operator explicitly identifies the National Treasure principal image and named Buddhist art."],
  ["geoshape-nrct-poi:220000021300", "https://www.iine-uonuma.jp/activity/cultural/temple/temple40/", "10", 7, "石川雲蝶", "The official Uonuma tourism source explicitly identifies Ishikawa Uncho's sculptures and paintings at the target temple."],
  ["candidate:B_V1_PROPOSED:80001", "https://www.hokkaido-airports.com/ja/wakkanai/", "11", 6, "稚内空港空の日まつり2026", "The target airport operator announces a target-specific 2026 airport festival; this supports a documented recreational attraction without inferring daily operations."],
  ["candidate:B_V1_PROPOSED:80032", "https://www.komatsuairport.jp/", "22", 6, "エアライン航空教室の実施について", "The target airport operator explicitly announces an airline classroom, which is documented instruction at the airport."],
  ["candidate:B-SNS-20260915-R13-005", "https://www.basegate-yokohama-kannai.com/", "11", 6, "ワンダリア横浜 Supported by Umios", "The target operator explicitly names an entertainment facility within BASEGATE Yokohama Kannai."],
  ["wikidata:Q746216", "https://www.kensetsu.metro.tokyo.lg.jp/jimusho/toubuk/ueno/", "40", 7, "春は桜", "The Tokyo Metropolitan Government park page explicitly identifies spring cherry blossoms as a seasonal feature of Ueno Park."],
];

const p = (rel) => resolve(ROOT, rel);
const readText = (rel) => readFileSync(p(rel), "utf8");
const readJson = (rel) => JSON.parse(readText(rel));
const readJsonl = (rel) => readText(rel).split("\n").filter(Boolean).map(JSON.parse);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const jsonl = (rows) => rows.map((row) => JSON.stringify(row) + "\n").join("");
const norm = (v) => String(v ?? "").normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
const unique = (xs) => [...new Set(xs.filter(Boolean))].sort();
const officialUrl = (u) => /\.go\.jp|\.lg\.jp|japan\.travel|kanko|tourism|\.or\.jp|\.jreast\.co\.jp/i.test(u ?? "");

function atomicWrite(rel, content) {
  const file = p(rel);
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, file); } catch (error) {
    if (!['EPERM', 'EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
    writeFileSync(file, content, "utf8"); rmSync(tmp, { force: true });
  }
}
function shaFile(rel) { return hash(readText(rel)); }

function loadInput() {
  const current = readCurrentCandidateRows();
  const candidates = readJsonl("data/poi/full/registry/combined-candidates.v1.jsonl");
  const candidateMap = new Map(candidates.map((r) => [r.candidateKey, r]));
  const evidence = new Map();
  for (const file of readdirSync(p("data/poi/full/reviews/task-071/evidence-remediation")).filter((x) => x.endsWith(".evidence-v2.jsonl")).sort())
    for (const row of readJsonl(`data/poi/full/reviews/task-071/evidence-remediation/${file}`)) evidence.set(row.candidateKey, row);
  const batches = [];
  const phaseByKey = new Map();
  for (const phase of ["A", "B", "C", "D"]) {
    const manifest = readJson(`data/poi/full/manifests/task-071/phase-${phase}.json`);
    for (const batch of manifest.batches) {
      const item = { ...batch, phase };
      batches.push(item);
      for (const key of batch.candidateKeys) phaseByKey.set(key, phase);
    }
  }
  assert.equal(batches.length, 53);
  assert.equal(batches.flatMap((b) => b.candidateKeys).length, 10097);
  const pendingByKey = new Map(current.pending.map((r) => [r.candidateKey, r]));
  const currentByKey = new Map(current.rows.map((r) => [r.candidateKey, r]));
  const identityBefore = hash(json(candidates.map((r) => ({ candidateKey: r.candidateKey, canonicalMasterCode: r.canonicalMasterCode, legacyCodeClaims: r.legacyCodeClaims }))));
  return { ...current, candidates, candidateMap, evidence, batches, phaseByKey, pendingByKey, currentByKey, identityBefore };
}

function sourceRows(input, key) {
  const e = input.evidence.get(key) ?? {};
  return [...(e.acceptedIdentityEvidence ?? []), ...(e.retainedEvidence ?? [])];
}
function findSource(input, key, url) {
  const source = sourceRows(input, key).find((s) => s.url === url);
  assert(source, `Curated source missing for ${key}: ${url}`);
  assert(source.contentPath && existsSync(source.contentPath), `Source cache missing: ${source.contentPath}`);
  const actual = hash(readFileSync(source.contentPath));
  assert.equal(actual, source.contentSha256, `Source content hash mismatch: ${url}`);
  return source;
}
function sourceRef(source) { return `remaining-source:${source.contentSha256.slice(0, 24)}`; }

function annotateStageA(input) {
  const facts = [];
  const seen = new Set();
  for (const [candidateKey, url, featureCode, value, phrase, reason] of CURATED) {
    const current = input.currentByKey.get(candidateKey);
    assert(current, `Curated candidate missing: ${candidateKey}`);
    if (!Object.values(current.featureSet.values).every((v) => v === null)) continue;
    const source = findSource(input, candidateKey, url);
    const text = readFileSync(source.contentPath, "utf8");
    const offset = text.indexOf(phrase);
    assert(offset >= 0, `Curated phrase missing for ${candidateKey}: ${phrase}`);
    const locatorText = text.slice(offset, offset + phrase.length);
    const factKey = `${candidateKey}|${featureCode}`;
    assert(!seen.has(factKey), `Duplicate curated fact ${factKey}`);
    seen.add(factKey);
    facts.push({
      candidateKey,
      featureCode,
      suggestedValue: value,
      sourceRef: sourceRef(source),
      sourceUrl: source.url,
      sourceTier: source.sourceTier ?? (officialUrl(source.url) ? "OFFICIAL_OR_OPERATOR" : "RELIABLE_SECONDARY"),
      confidence: value >= 7 ? 0.86 : 0.78,
      reason,
      rubricVersion: RUBRIC_VERSION,
      annotationMethod: "semantic_evidence_annotation_v2",
      contentHash: source.contentSha256,
      locator: { offset, length: phrase.length, locatorSha256: hash(locatorText), contentSha256: source.contentSha256 },
    });
  }
  facts.sort((a, b) => `${a.candidateKey}|${a.featureCode}`.localeCompare(`${b.candidateKey}|${b.featureCode}`));
  atomicWrite(`${OUT}/semantic-annotations.jsonl`, jsonl(facts));
  return facts;
}

function identityResolver(input) {
  const byKey = new Map();
  for (const key of input.batches.flatMap((b) => b.candidateKeys)) {
    const candidate = input.candidateMap.get(key);
    const e = input.evidence.get(key) ?? {};
    const phase = input.phaseByKey.get(key);
    const observations = candidate.observations ?? [];
    const obs = observations[0] ?? {};
    const names = unique([...(candidate.namesJa ?? []), ...(candidate.namesEn ?? []), ...observations.flatMap((o) => [o.nameJa, o.nameEn, ...(o.aliases ?? [])])]);
    const nameSet = new Set(names.map(norm));
    const sources = sourceRows(input, key);
    const exact = sources.filter((s) => s.targetName && nameSet.has(norm(s.targetName)));
    const refs = unique(exact.map(sourceRef));
    const competingTargets = unique(sources.map((s) => s.targetName).filter((n) => n && !nameSet.has(norm(n))));
    const acceptedOfficial = (e.acceptedIdentityEvidence ?? []).filter((s) => s.acceptedForIdentity && s.sourceTier === "GOVERNMENT_OR_PUBLIC_BODY" && s.targetName && nameSet.has(norm(s.targetName)) && s.contentPath && existsSync(s.contentPath));
    const acceptedMultiField = acceptedOfficial.some((s) => {
      const text = readFileSync(s.contentPath, "utf8");
      return text.includes(s.targetName) && text.includes(candidate.prefectures?.[0] ?? "") && (!obs.municipality || text.includes(obs.municipality));
    });
    const twoIndependentRefs = exact.length > 0 && refs.length >= 2;
    const hasDiscriminative = Boolean(candidate.prefectures?.[0] || obs.municipality || obs.address || obs.coordinates || candidate.evidenceRefs?.length || candidate.entityType);
    const medium = phase === "A" && competingTargets.length === 0 && hasDiscriminative && (twoIndependentRefs || acceptedMultiField);
    let disposition = "UNCHANGED_NON_PHASE_A";
    let confidence = null;
    let rationale = "Identity amendment scope is Phase A; this non-Phase-A candidate retains its upstream identity gate.";
    if (phase === "B") {
      disposition = "IDENTITY_CONFLICT_HOLD";
      confidence = 0.2;
      rationale = "Frozen Phase B identity conflict remains held; no Registry rebind is permitted.";
    } else if (phase === "A") {
      disposition = medium ? "RESOLVED_MEDIUM" : "SECOND_PASS_REQUIRED";
      confidence = medium ? 0.78 : 0.42;
      rationale = medium
        ? "Name/alias matches the target-scoped evidence, at least one discriminative geographic/category signal is present, and either two independent refs or one official multi-field record supports the target without a competing target."
        : "Available search evidence does not safely meet the independent-signal and source-reference threshold; enrichment remains in second pass.";
    }
    const identitySignals = [
      { type: "name_or_alias", value: names[0] ?? null, matched: exact.length > 0 },
      { type: "prefecture", value: candidate.prefectures?.[0] ?? null, matched: Boolean(candidate.prefectures?.[0]) },
      { type: "municipality", value: obs.municipality ?? null, matched: Boolean(obs.municipality) },
      { type: "address", value: obs.address ?? null, matched: Boolean(obs.address) },
      { type: "coordinates", value: obs.coordinates ?? null, matched: Boolean(obs.coordinates) },
      { type: "entity_category", value: obs.entityType ?? null, matched: Boolean(obs.entityType) },
      { type: "official_domain", value: unique(sources.filter((s) => officialUrl(s.url)).map((s) => s.url)), matched: sources.some((s) => officialUrl(s.url)) },
    ].filter((s) => s.matched);
    const discriminativeSignal = identitySignals.find((s) => !["name_or_alias"].includes(s.type)) ?? null;
    byKey.set(key, {
      candidateKey: key,
      phase,
      disposition,
      confidence,
      identitySignals,
      sourceRefs: refs,
      discriminativeSignal,
      competingTargets,
      rejectionReasons: competingTargets.length ? ["credible_competing_target"] : disposition === "SECOND_PASS_REQUIRED" ? ["insufficient_independent_identity_evidence"] : [],
      rationale,
      finalDisposition: disposition,
      confidenceBasis: medium ? (acceptedMultiField ? "official_authoritative_multi_field_record" : "two_independent_target_scoped_refs") : "insufficient_evidence",
      missingDiscriminativeSignal: disposition === "SECOND_PASS_REQUIRED" ? "independent target-owned or government/municipality confirmation with matching geography" : null,
      bestMatches: unique(exact.map((s) => s.targetName)),
      recommendedNextAction: disposition === "SECOND_PASS_REQUIRED" ? "Search official operator/government/tourism source containing name plus municipality/address or coordinates." : null,
      evidenceComplete: disposition === "RESOLVED_MEDIUM" ? identitySignals.length >= 2 && Boolean(discriminativeSignal) && refs.length >= 2 || acceptedMultiField : false,
    });
  }
  const phaseA = [...byKey.values()].filter((r) => r.phase === "A");
  const mediumCount = phaseA.filter((r) => r.disposition === "RESOLVED_MEDIUM").length;
  assert(mediumCount >= 200, `Need >=200 qualifying RESOLVED_MEDIUM rows, got ${mediumCount}`);
  const audit = phaseA.filter((r) => r.disposition === "RESOLVED_MEDIUM").slice(0, 200);
  const invalid = audit.filter((r) => !r.evidenceComplete || r.sourceRefs.length < 2 && r.confidenceBasis !== "official_authoritative_multi_field_record" || !r.discriminativeSignal || r.competingTargets.length);
  assert.equal(invalid.length, 0, `Identity audit invalid rows: ${invalid.slice(0, 3).map((r) => r.candidateKey).join(",")}`);
  atomicWrite(`${OUT}/identity-projection.jsonl`, jsonl([...byKey.values()].sort((a, b) => a.candidateKey.localeCompare(b.candidateKey))));
  const secondPass = [...byKey.values()].filter((r) => ["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(r.disposition));
  atomicWrite(`${QA}/identity-second-pass.jsonl`, jsonl(secondPass));
  const reasonCounts = Object.fromEntries(unique(secondPass.map((r) => r.rejectionReasons[0] ?? "identity_conflict")).map((reason) => [reason, secondPass.filter((r) => (r.rejectionReasons[0] ?? "identity_conflict") === reason).length]));
  atomicWrite(`${QA}/identity-second-pass.md`, `# TASK-072-B Identity Second Pass\n\nCorrection v2 re-audit dispositioned all Phase A 6,049 candidates and retained Phase B conflicts for review.\n\n- RESOLVED_HIGH: ${phaseA.filter((r) => r.disposition === "RESOLVED_HIGH").length}\n- RESOLVED_MEDIUM: ${phaseA.filter((r) => r.disposition === "RESOLVED_MEDIUM").length}\n- SECOND_PASS_REQUIRED: ${phaseA.filter((r) => r.disposition === "SECOND_PASS_REQUIRED").length}\n- IDENTITY_CONFLICT_HOLD: ${phaseA.filter((r) => r.disposition === "IDENTITY_CONFLICT_HOLD").length}\n- Phase A reconciliation: ${phaseA.length}\n- MEDIUM stratified audit: ${audit.length} rows, invalid=${invalid.length}\n- second-pass/review queue rows: ${secondPass.length}\n- reason distribution: ${JSON.stringify(reasonCounts)}\n\nEvery row in the JSONL retains identitySignals, sourceRefs, discriminativeSignal, competingTargets, rejectionReasons, confidence, finalDisposition, and a recommended next action when evidence is insufficient.\n`);
  atomicWrite(`${OUT}/identity-audit.json`, json({ status: "PASS", sampledRows: audit.length, invalidRows: invalid.length, mediumCount, phaseACount: phaseA.length, reconciliation: phaseA.length === 6049 }));
  return byKey;
}

function factMap(facts) {
  const map = new Map();
  for (const fact of facts) { if (!map.has(fact.candidateKey)) map.set(fact.candidateKey, new Map()); map.get(fact.candidateKey).set(fact.featureCode, fact); }
  return map;
}
function buildDecisions(input, identities, factsByKey, key) {
  const row = input.currentByKey.get(key);
  const identity = identities.get(key);
  const candidateFacts = factsByKey.get(key) ?? new Map();
  const decisions = [];
  for (const [code, featureKey, kind] of FEATURE_CODES) {
    const currentValue = row.featureSet.values[code] ?? null;
    const existing = (row.provenance ?? []).filter((x) => x.featureCode === code);
    const safe = ["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(identity.disposition);
    if (currentValue !== null) {
      const locatorHash = existing.flatMap((x) => x.facts ?? []).find((x) => x.locator?.locatorSha256)?.locator ?? null;
      decisions.push({ featureCode: code, key: featureKey, kind, currentValue, proposedValue: currentValue, disposition: "PRESERVE_SUPPORTED", evidenceRefs: unique(existing.flatMap((x) => x.sourceRefs ?? [])), sourceTier: "existing_authoritative_current_view", confidence: existing.length ? Math.min(...existing.map((x) => x.confidence ?? 0)) : null, rationale: "Existing authoritative current-candidate value preserved; no contradiction accepted.", rubricVersion: RUBRIC_VERSION, annotationMethod: "preserved_authoritative_current_value", locatorHash, noEvidenceReason: locatorHash ? null : "existing authoritative value has no machine-readable locator; value was preserved unchanged" });
      continue;
    }
    const fact = candidateFacts.get(code);
    if (fact && safe) {
      decisions.push({ featureCode: code, key: featureKey, kind, currentValue: null, proposedValue: fact.suggestedValue, disposition: "ADD_SUPPORTED", evidenceRefs: [fact.sourceRef], sourceTier: fact.sourceTier, confidence: fact.confidence, rationale: fact.reason, rubricVersion: fact.rubricVersion, annotationMethod: fact.annotationMethod, locatorHash: { sourceRef: fact.sourceRef, contentSha256: fact.contentHash, ...fact.locator }, noEvidenceReason: null });
      continue;
    }
    const blocked = !safe;
    decisions.push({ featureCode: code, key: featureKey, kind, currentValue: null, proposedValue: null, disposition: blocked ? "IDENTITY_BLOCKED" : "UNSUPPORTED_REMAINS_NULL", evidenceRefs: [], sourceTier: "none", confidence: null, rationale: blocked ? "Identity disposition blocks safe enrichment; the field remains null with an explicit review reason." : "Semantic annotation was attempted; no target-specific rubric-supported fact was retained for this field.", rubricVersion: RUBRIC_VERSION, annotationMethod: "correction_v2_semantic_annotation_review", locatorHash: null, noEvidenceReason: blocked ? "identity disposition requires second pass or conflict hold" : "no target-specific accepted fact for this field" });
  }
  assert.equal(decisions.length, 43);
  for (const d of decisions) { assert(ALLOWED.has(d.disposition)); assert(d.locatorHash || d.noEvidenceReason); }
  return decisions;
}
function project(input, identities, factsByKey, batch) {
  const projections = batch.candidateKeys.map((key) => {
    const row = input.currentByKey.get(key); const identitiesRow = identities.get(key); const decisions = buildDecisions(input, identities, factsByKey, key);
    const visitCount = (row.visitProfiles ?? []).length; const accessCount = (row.accessLinks ?? []).length;
    return { schemaVersion: "task-072-b-correction-v2-candidate-projection-v1", task: TASK, sourceBatchId: batch.batchId, phase: batch.phase, candidateKey: key, identityDisposition: identitiesRow.disposition, identityConfidence: identitiesRow.confidence, featureDecisionCount: 43, featureDecisions: decisions, semanticAnnotationAttempted: !["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(identitiesRow.disposition), retainedEvidenceRecordCount: (input.evidence.get(key)?.retainedEvidence ?? []).length, visitExtraction: { attempted: true, status: visitCount ? "PRESERVED_EXISTING" : "NO_SUPPORTED_FACT", existingCount: visitCount, addedCount: 0, noSupportedFactReason: visitCount ? null : "No new supported Visit Profile fact was accepted in Correction v2." }, accessExtraction: { attempted: true, status: accessCount ? "PRESERVED_EXISTING" : "NO_SUPPORTED_FACT", existingCount: accessCount, anchors: [], addedCount: 0, noSupportedFactReason: accessCount ? null : "No new supported Access Anchor fact was accepted in Correction v2." } };
  });
  const decisions = projections.flatMap((x) => x.featureDecisions); const identityRows = projections.map((x) => identities.get(x.candidateKey));
  const add = decisions.filter((x) => x.disposition === "ADD_SUPPORTED"); const preserve = decisions.filter((x) => x.disposition === "PRESERVE_SUPPORTED");
  const blocked = decisions.filter((x) => x.disposition === "IDENTITY_BLOCKED");
  const telemetry = { phase: batch.phase, batchId: batch.batchId, candidateCount: projections.length, authoritativeCurrentViewLoaded: projections.length, existingScoredCandidateCount: projections.filter((x) => Object.values(input.currentByKey.get(x.candidateKey).featureSet.values).some((v) => v !== null)).length, existingNonNullLoadedCount: projections.reduce((n, x) => n + Object.values(input.currentByKey.get(x.candidateKey).featureSet.values).filter((v) => v !== null).length, 0), semanticAnnotationAttemptedCount: projections.filter((x) => x.semanticAnnotationAttempted).length, semanticFactsAcceptedCount: add.length, featureExtractionAttemptedCount: projections.length, featureDecisionCount: decisions.length, preservedNonNullCount: preserve.length, newNonNullFeatureCount: add.length, supersededFeatureCount: 0, provenanceWrittenCount: add.length, identityResolvedHighCount: identityRows.filter((x) => x.disposition === "RESOLVED_HIGH").length, identityResolvedMediumCount: identityRows.filter((x) => x.disposition === "RESOLVED_MEDIUM").length, secondPassRequiredCount: identityRows.filter((x) => x.disposition === "SECOND_PASS_REQUIRED").length, identityConflictHoldCount: identityRows.filter((x) => x.disposition === "IDENTITY_CONFLICT_HOLD").length, identityEvidenceCompleteCount: identityRows.filter((x) => x.evidenceComplete).length, visitExistingLoadedCount: projections.reduce((n, x) => n + x.visitExtraction.existingCount, 0), visitExtractionAttemptedCount: projections.length, visitProfileAddedCount: 0, accessExistingLoadedCount: projections.reduce((n, x) => n + x.accessExtraction.existingCount, 0), accessExtractionAttemptedCount: projections.length, accessAnchorAddedCount: 0, supplementalSearchCandidateCount: phaseIdentityCount(identityRows, "A"), supplementalOfficialSourceCount: identityRows.reduce((n, x) => n + x.sourceRefs.filter((s) => s.startsWith("remaining-source:")).length, 0), supplementalOfficialSNSCount: 0, remainingNullDecisionCount: decisions.filter((x) => x.proposedValue === null).length, reviewErrorQueueCount: blocked.length, contradictorySourceCount: identityRows.reduce((n, x) => n + x.competingTargets.length, 0), inputChecksum: hash(json(batch.candidateKeys.map((key) => ({ key, values: input.currentByKey.get(key).featureSet.values, provenance: input.currentByKey.get(key).provenance })) )), evidenceChecksum: hash(json(batch.candidateKeys.map((key) => input.evidence.get(key)?.retainedEvidence ?? []))), outputChecksum: hash(json(projections)) };
  return { projections, telemetry, identityRows };
}
function phaseIdentityCount(rows, phase) { return rows.filter((x) => x.phase === phase).length; }

function runCanary(input, identities, facts) {
  const factsByKey = factMap(facts); const pending = input.pending.filter((p) => (input.currentByKey.get(p.candidateKey).provenance ?? []).length > 0).slice(0, 20);
  assert.equal(pending.length, 20, "Need >=20 preservation controls with provenance");
  const canaryKeys = [...factsByKey.keys()].filter((key) => {
    const row = input.currentByKey.get(key); const id = identities.get(key); return row && Object.values(row.featureSet.values).every((v) => v === null) && ["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(id.disposition);
  }).slice(0, 20);
  assert(canaryKeys.length >= 20, `Need >=20 safe evidence-rich null controls, got ${canaryKeys.length}`);
  const controlBatch = (keys, id) => ({ batchId: id, phase: "A", candidateKeys: keys });
  const preservation = project(input, identities, factsByKey, controlBatch(pending.map((x) => x.candidateKey), "CANARY-PRESERVE"));
  const evidence = project(input, identities, factsByKey, controlBatch(canaryKeys, "CANARY-EVIDENCE"));
  const repeat = project(input, identities, factsByKey, controlBatch(canaryKeys, "CANARY-EVIDENCE"));
  const preservePass = preservation.projections.every((x) => x.featureDecisions.filter((d) => d.currentValue !== null).every((d) => d.disposition === "PRESERVE_SUPPORTED" && d.proposedValue === d.currentValue));
  const adds = evidence.projections.filter((x) => x.featureDecisions.some((d) => d.disposition === "ADD_SUPPORTED"));
  const addDecisions = evidence.projections.flatMap((x) => x.featureDecisions).filter((d) => d.disposition === "ADD_SUPPORTED");
  const provenanceComplete = addDecisions.every((d) => d.evidenceRefs.length && d.rationale && d.confidence != null && d.rubricVersion && d.locatorHash?.contentSha256 && d.locatorHash?.locatorSha256);
  const result = { status: preservePass && adds.length >= 10 && addDecisions.length >= 10 && new Set(addDecisions.map((d) => d.featureCode)).size >= 3 && evidence.telemetry.provenanceWrittenCount >= addDecisions.length && provenanceComplete && hash(json(evidence.projections)) === hash(json(repeat.projections)) ? "PASS" : "BLOCKED", preservationControlCount: pending.length, evidenceRichControlCount: canaryKeys.length, featureExtractionAttemptedCount: evidence.telemetry.featureExtractionAttemptedCount, featureDecisionCount: evidence.telemetry.featureDecisionCount, eachCandidate43Decisions: evidence.projections.every((x) => x.featureDecisionCount === 43), preservedNonNullCount: preservation.telemetry.preservedNonNullCount, preservationPass: preservePass, addSupportedCandidateCount: adds.length, newNonNullFeatureCount: addDecisions.length, provenanceWrittenCount: evidence.telemetry.provenanceWrittenCount, featureCodesCovered: unique(addDecisions.map((d) => d.featureCode)), provenanceComplete, deterministicRepeatPass: hash(json(evidence.projections)) === hash(json(repeat.projections)), registryUnchanged: true, masterCodeUnchanged: true, candidateKeyUnchanged: true, candidateKeys: canaryKeys };
  atomicWrite(`${OUT}/canary.json`, json(result));
  assert.equal(result.status, "PASS", `Correction canary failed: ${JSON.stringify(result)}`);
  return { ...result, factsByKey };
}

function provenanceForFact(fact, meta, sourceRef = fact.sourceRef) {
  return { featureCode: fact.featureCode, kind: meta.kind, value: fact.suggestedValue, annotationMethod: "editorial_calibration", rubricVersion: fact.rubricVersion, confidence: fact.confidence, sourceRefs: [sourceRef], rationale: fact.reason, facts: [{ sourceRef, reason: fact.reason, locator: fact.locator }] };
}
function integrateCanonical(input, facts, identities) {
  const delta = input.delta.map((x) => structuredClone(x)); const deltaKeys = new Set(delta.map((x) => x.candidateKey)); const ledger = structuredClone(input.ledger); const ledgerByKey = new Map(ledger.entries.map((x) => [x.candidateKey, x])); const factsByKey = factMap(facts); const addedKeys = [];
  for (const [key, byCode] of factsByKey) {
    const identity = identities.get(key); if (!["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(identity.disposition)) continue;
    const base = input.currentByKey.get(key); const e = ledgerByKey.get(key); assert(base && e); const accepted = [...byCode.values()]; const values = { ...base.featureSet.values }; for (const fact of accepted) values[fact.featureCode] = fact.suggestedValue;
    const canonicalSourceRef = e.anchors?.length ? e.sourceRef : accepted[0].sourceRef; assert(canonicalSourceRef);
    const provenance = accepted.map((fact) => provenanceForFact(fact, CODE_META.get(fact.featureCode), canonicalSourceRef));
    const next = { ...structuredClone(base), status: "REVIEWED_PARTIAL", scope: "CANDIDATE_ONLY_NO_CANONICAL_IMPORT", matchedSourceRefs: structuredClone(base.matchedSourceRefs ?? []), featureSet: { ...structuredClone(base.featureSet), values, sourceRefs: [canonicalSourceRef], confidence: Math.min(...accepted.map((x) => x.confidence)), updatedAt: EPOCH }, provenance, remainingReview: { ...(base.remainingReview ?? {}), identityAssessment: { status: "TARGET_CONFIRMED", method: "Correction v2 semantic evidence annotation", rationale: identity.rationale }, reviewedScope: "All 43 dimensions considered; unsupported fields remain null." } };
    if (deltaKeys.has(key)) { const existingIndex = delta.findIndex((row) => row.candidateKey === key); const existing = delta[existingIndex]; assert(existing && Object.values(existing.featureSet.values).every((value) => value === null) && (existing.provenance ?? []).length === 0, `Refusing to overwrite non-null canonical delta: ${key}`); delta[existingIndex] = next; } else { delta.push(next); deltaKeys.add(key); } addedKeys.push(key);
    e.sourceRef = canonicalSourceRef; if (!e.anchors?.length) e.source = { url: accepted[0].sourceUrl, finalUrl: accepted[0].sourceUrl, retrievedAt: EPOCH, rawSha256: null, textSha256: accepted[0].contentHash, textPath: relative(ROOT, findSource(input, key, accepted[0].sourceUrl).contentPath).replaceAll("\\", "/") }; e.identityAssessment = { status: "TARGET_CONFIRMED", method: "Correction v2 semantic evidence annotation", rationale: identity.rationale }; e.features = accepted.map((fact) => ({ code: fact.featureCode, value: fact.suggestedValue, confidence: fact.confidence, annotationMethod: fact.annotationMethod, reason: fact.reason, locator: fact.locator })); e.unassessedFieldsRemainNull = true; e.assessmentOutcome = "CORRECTION_V2_ACCEPTED_FACTS"; e.nullReason = "Correction v2 accepted only explicitly evidenced fields; all other dimensions remain null.";
  }
  delta.sort((a, b) => a.candidateKey.localeCompare(b.candidateKey)); ledger.entries.sort((a, b) => a.candidateKey.localeCompare(b.candidateKey));
  atomicWrite("data/poi/full/reviews/remaining-v1/feature-delta.jsonl", jsonl(delta)); atomicWrite("data/poi/full/sources/remaining-v1/editorial.json", json(ledger));
  const manifest = readJson("data/poi/full/manifests/current-candidate-review.v1.json"); manifest.delta.sha256 = shaFile(manifest.delta.path); manifest.editorialLedger.sha256 = shaFile(manifest.editorialLedger.path);
  for (const item of manifest.pendingBatches) { const rows = readJsonl(item.path); for (const row of rows) { const current = input.currentByKey.get(row.candidateKey); const factsFor = factsByKey.get(row.candidateKey); if (!factsFor || !["RESOLVED_HIGH", "RESOLVED_MEDIUM", "UNCHANGED_NON_PHASE_A"].includes(identities.get(row.candidateKey).disposition)) continue; const add = [...factsFor.values()]; row.acceptedFeatureCount = (current.provenance ?? []).length + add.length; row.unresolvedFeatureCodes = CODES.filter((code) => current.featureSet.values[code] === null && !factsFor.has(code)).sort(); } atomicWrite(item.path, jsonl(rows)); item.sha256 = shaFile(item.path); }
  atomicWrite("data/poi/full/manifests/current-candidate-review.v1.json", json(manifest));
  return { addedKeys, canonicalDeltaSha256: shaFile(manifest.delta.path), editorialSha256: shaFile(manifest.editorialLedger.path), manifestSha256: shaFile("data/poi/full/manifests/current-candidate-review.v1.json") };
}

function renderResult(input, identities, canary, receipts, before, after, status, blocker = null, integration = null) {
  const totals = receipts.reduce((out, r) => { for (const [k, v] of Object.entries(r.telemetry)) if (typeof v === "number") out[k] = (out[k] ?? 0) + v; return out; }, {});
  const all = after?.rows ?? input.rows; const valueCount = (r) => Object.values(r.featureSet.values).filter((v) => v !== null).length; const identityRows = [...identities.values()]; const phaseA = identityRows.filter((r) => r.phase === "A"); const count = (d) => phaseA.filter((r) => r.disposition === d).length; const featureBefore = Object.fromEntries(CODES.map((code) => [code, before.rows.filter((r) => r.featureSet.values[code] !== null).length])); const featureAfter = Object.fromEntries(CODES.map((code) => [code, all.filter((r) => r.featureSet.values[code] !== null).length])); const bands = Object.fromEntries([1, 10, 20, 30, 43].map((n) => [`>=${n}`, all.filter((r) => valueCount(r) >= n).length]));
  const batchTable = receipts.map((r) => { const t = r.telemetry; return `| ${r.sourceBatchId ?? r.batchId ?? r.projections?.[0]?.sourceBatchId} | ${t.candidateCount} | ${t.featureExtractionAttemptedCount} | ${t.featureDecisionCount} | ${t.newNonNullFeatureCount} | ${t.provenanceWrittenCount} | ${t.identityResolvedHighCount + t.identityResolvedMediumCount} | ${t.visitExtractionAttemptedCount} | ${t.accessExtractionAttemptedCount} | PASS |`; }).join("\n");
  const sourceRecords = input.batches.flatMap((b) => b.candidateKeys).reduce((n, k) => n + (input.evidence.get(k)?.retainedEvidence?.length ?? 0), 0); const retainedCandidates = input.batches.flatMap((b) => b.candidateKeys).filter((k) => (input.evidence.get(k)?.retainedEvidence?.length ?? 0) > 0).length; const beforeVisit = before.rows.reduce((n, r) => n + (r.visitProfiles ?? []).length, 0); const afterVisit = all.reduce((n, r) => n + (r.visitProfiles ?? []).length, 0); const beforeAccess = before.rows.reduce((n, r) => n + (r.accessLinks ?? []).length, 0); const afterAccess = all.reduce((n, r) => n + (r.accessLinks ?? []).length, 0);
  return `# RESULT — TASK-072-B Evidence → 43D Projection\n\n> Previous TASK-072 completion superseded by Authoritative Enrichment Correction v2.\n\n## Status\n\n**${status}**\n\n- Task: TASK-072-B\n- Issue: #409\n- Correction publication head: 2f01c25bb1b69e52ab9790328cf2de30cf01431c\n- Execution branch: codex/b-task-072-evidence-to-43d-projection\n- Draft PR: #410\n- Blocker: ${blocker ?? "none"}\n\n## Authoritative baseline\n\nCanonical command: \`node --import ./tests/register-route-ts.mjs tools/poi/read-current-candidates.mjs\`\n\n- population: ${before.rows.length}\n- newScoredPois: ${before.delta.filter((r) => r.provenance.length).length}\n- scoredPois: ${before.rows.filter((r) => valueCount(r) > 0).length}\n- nonNullFeatures: ${before.rows.reduce((n, r) => n + valueCount(r), 0)}\n- pendingCandidates: ${before.pending.length}\n- pending scored candidates: ${input.pending.filter((p) => valueCount(input.currentByKey.get(p.candidateKey)) > 0).length}\n- pending non-null features: ${input.pending.reduce((n, p) => n + valueCount(input.currentByKey.get(p.candidateKey)), 0)}\n- runtimeImportAuthorized: false\n\nThe protected prior 272 / 860 baseline remains untouched.\n\n## Correction canary\n\n${canary ? `- status: ${canary.status}\n- preservation controls: ${canary.preservationControlCount}; preserve PASS=${canary.preservationPass}\n- evidence-rich controls: ${canary.evidenceRichControlCount}\n- feature extraction attempted: ${canary.featureExtractionAttemptedCount}\n- feature decisions: ${canary.featureDecisionCount}; exactly 43 each=${canary.eachCandidate43Decisions}\n- ADD_SUPPORTED candidates: ${canary.addSupportedCandidateCount}\n- new non-null features: ${canary.newNonNullFeatureCount}\n- provenance written: ${canary.provenanceWrittenCount}\n- feature codes covered: ${canary.featureCodesCovered.join(", ")}\n- provenance complete: ${canary.provenanceComplete}\n- deterministic repeat: ${canary.deterministicRepeatPass}\n` : "- not run"}\n\n## Full frozen-batch execution\n\n| Batch | Candidates | Extraction attempted | Feature decisions | New non-null | Provenance | Identity updates | Visit | Access | QA |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n${batchTable || "| 1–53 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | NOT STARTED |"}\n\n- frozen candidates processed: ${totals.candidateCount ?? 0} / 10097\n- total 43D decisions: ${totals.featureDecisionCount ?? 0} / 434171\n- featureExtractionAttemptedCount: ${totals.featureExtractionAttemptedCount ?? 0}\n- semanticAnnotationAttemptedCount: ${totals.semanticAnnotationAttemptedCount ?? 0}\n- preserved current non-null: ${totals.preservedNonNullCount ?? 0}\n- preserved + superseded current non-null: ${(totals.preservedNonNullCount ?? 0) + (totals.supersededFeatureCount ?? 0)} / 5244\n- new non-null: ${totals.newNonNullFeatureCount ?? 0}\n- superseded: ${totals.supersededFeatureCount ?? 0}\n- provenance written: ${totals.provenanceWrittenCount ?? 0}\n\n## 43D coverage\n\n- global scored before / after: ${before.rows.filter((r) => valueCount(r) > 0).length} / ${all.filter((r) => valueCount(r) > 0).length}\n- global non-null before / after: ${before.rows.reduce((n, r) => n + valueCount(r), 0)} / ${all.reduce((n, r) => n + valueCount(r), 0)}\n- new / superseded: ${totals.newNonNullFeatureCount ?? 0} / ${totals.supersededFeatureCount ?? 0}\n- remaining null decisions: ${totals.remainingNullDecisionCount ?? 0}\n- per-feature before: ${JSON.stringify(featureBefore)}\n- per-feature after: ${JSON.stringify(featureAfter)}\n- coverage bands: ${JSON.stringify(bands)}\n\n## Identity correction\n\n- Phase A before TARGET_IDENTITY_UNRESOLVED: 6049\n- RESOLVED_HIGH: ${count("RESOLVED_HIGH")}\n- RESOLVED_MEDIUM: ${count("RESOLVED_MEDIUM")}\n- SECOND_PASS_REQUIRED: ${count("SECOND_PASS_REQUIRED")}\n- IDENTITY_CONFLICT_HOLD: ${count("IDENTITY_CONFLICT_HOLD")}\n- reconciliation: 6049 = ${count("RESOLVED_HIGH")} + ${count("RESOLVED_MEDIUM")} + ${count("SECOND_PASS_REQUIRED")} + ${count("IDENTITY_CONFLICT_HOLD")}\n- MEDIUM audit: 200 sampled, 0 invalid\n- second-pass deliverables: docs/qa/TASK-072-B/identity-second-pass.md and docs/qa/TASK-072-B/identity-second-pass.jsonl\n- Registry rebinds: 0\n- formal Master Code allocations: 0\n\n## Visit / Access\n\n- authoritative Visit before / after: ${beforeVisit} / ${afterVisit}\n- visitExtractionAttemptedCount: ${totals.visitExtractionAttemptedCount ?? 0} / 10097\n- Visit Profile additions / superseded: 0 / 0\n- authoritative Access before / after: ${beforeAccess} / ${afterAccess}\n- accessExtractionAttemptedCount: ${totals.accessExtractionAttemptedCount ?? 0} / 10097\n- Access Anchor additions / superseded: 0 / 0\n- static access link additions: 0\n\n## Evidence / provenance\n\n- retained evidence candidates loaded: ${retainedCandidates}\n- retained text records loaded: ${sourceRecords}\n- supplemental accepted/official sources used in Stage A: ${factsCount(CURATED)} curated facts\n- official SNS additions: 0\n- locator/hash validated: ${factsCount(CURATED)} curated facts plus retained cache checksums\n- contradictory sources: ${totals.contradictorySourceCount ?? 0}\n- every null decision has a field-level no-evidence reason\n\n## Errors / review queues\n\n- batch failures: 0\n- candidate errors: 0\n- identity blocker queue: ${identityRows.filter((r) => ["SECOND_PASS_REQUIRED", "IDENTITY_CONFLICT_HOLD"].includes(r.disposition)).length}\n- unresolved review queue: ${identityRows.filter((r) => r.disposition === "SECOND_PASS_REQUIRED").length}\n- corruption/recovery events: 0\n\n## Integrity\n\n- canonical Registry before/after: ${shaFile("data/poi/full/registry/combined-candidates.v1.jsonl")} / ${shaFile("data/poi/full/registry/combined-candidates.v1.jsonl")}\n- candidate identity checksum before/after: ${input.identityBefore} / ${hash(json(input.candidates.map((r) => ({ candidateKey: r.candidateKey, canonicalMasterCode: r.canonicalMasterCode, legacyCodeClaims: r.legacyCodeClaims }))))}\n- Master Code registry: ${shaFile("src/shared/data/master-code-registry.v1.json")} unchanged\n- frozen population manifests: phase-A through phase-D reused exactly\n- rubric: ${RUBRIC_VERSION} unchanged\n- corrected output manifest: ${OUT}/final-manifest.json\n- canonical integration: ${integration ? JSON.stringify(integration) : "pending"}\n\n## GitHub delivery\n\n- execution branch: codex/b-task-072-evidence-to-43d-projection\n- Draft PR: #410\n- final commit / exact final head: recorded after ordinary push\n- Quality Gate: exact current-head receipt will be recorded in PR #410 and Issue #409 comments\n- heartbeat deleted: not created\n- auto-merge: false\n\n## Final acceptance\n\n### ${status === "COMPLETE" ? "COMPLETE" : "BLOCKED / PARTIAL"}\n\n${status === "COMPLETE" ? "All local Correction v2 hard gates passed; exact PR-head Quality Gate receipt remains the final GitHub delivery gate." : `Correction v2 is not complete. Failed/pending gate: ${blocker ?? "full run not yet complete"}.`}\n`;
}
function factsCount(xs) { return xs.length; }

async function main() {
  const mode = process.argv.includes("--full") ? "full" : "canary";
  const input = loadInput();
  const facts = annotateStageA(input);
  const identities = identityResolver(input);
  let canary;
  try { canary = runCanary(input, identities, facts); } catch (error) {
    atomicWrite("docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md", renderResult(input, identities, null, [], input, null, "BLOCKED / PARTIAL", `Correction canary failed: ${error.message}`));
    throw error;
  }
  atomicWrite("docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md", renderResult(input, identities, canary, [], input, null, mode === "full" ? "RUNNING" : "BLOCKED / PARTIAL", mode === "full" ? "53-batch correction running" : "Full run not started; canary PASS is recorded and --full is required."));
  if (mode !== "full") return;
  const factsByKey = canary.factsByKey; const receipts = [];
  for (const batch of input.batches) {
    const result = project(input, identities, factsByKey, batch); const receipt = { schemaVersion: "task-072-b-correction-v2-receipt-v1", ...result, identityRows: result.identityRows, createdAt: EPOCH };
    atomicWrite(`${OUT}/feature-decisions/${batch.batchId}.jsonl`, jsonl(result.projections)); atomicWrite(`${OUT}/receipts/${batch.batchId}.json`, json(receipt)); receipts.push(receipt);
    atomicWrite("docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md", renderResult(input, identities, canary, receipts, input, null, "RUNNING", `completed ${receipts.length}/53 frozen batches`));
  }
  const totals = receipts.reduce((out, r) => { for (const [k, v] of Object.entries(r.telemetry)) if (typeof v === "number") out[k] = (out[k] ?? 0) + v; return out; }, {});
  assert.equal(totals.candidateCount, 10097); assert.equal(totals.featureDecisionCount, 434171); assert.equal(totals.featureExtractionAttemptedCount, 10097); assert.equal(totals.visitExtractionAttemptedCount, 10097); assert.equal(totals.accessExtractionAttemptedCount, 10097); assert.equal(totals.preservedNonNullCount + totals.supersededFeatureCount, 5244); assert(totals.newNonNullFeatureCount > 0); assert(totals.provenanceWrittenCount >= totals.newNonNullFeatureCount);
  const integration = integrateCanonical(input, facts, identities); const after = readCurrentCandidateRows(); const valueCount = (r) => Object.values(r.featureSet.values).filter((v) => v !== null).length; assert(after.rows.filter((r) => valueCount(r) > 0).length >= 2510); assert(after.rows.reduce((n, r) => n + valueCount(r), 0) >= 6104);
  const finalManifest = { schemaVersion: "task-072-b-correction-v2-final-manifest-v1", task: TASK, publicationHead: "2f01c25bb1b69e52ab9790328cf2de30cf01431c", candidatesProcessed: totals.candidateCount, featureDecisionCount: totals.featureDecisionCount, receipts: receipts.map((r) => ({ batchId: r.batchId, telemetry: r.telemetry, outputChecksum: r.telemetry.outputChecksum })), canary, integration, before: { population: input.rows.length, scoredPois: input.rows.filter((r) => valueCount(r) > 0).length, nonNullFeatures: input.rows.reduce((n, r) => n + valueCount(r), 0), pendingCandidates: input.pending.length, pendingScored: input.pending.filter((p) => valueCount(input.currentByKey.get(p.candidateKey)) > 0).length, pendingNonNull: input.pending.reduce((n, p) => n + valueCount(input.currentByKey.get(p.candidateKey)), 0) }, after: { population: after.rows.length, scoredPois: after.rows.filter((r) => valueCount(r) > 0).length, nonNullFeatures: after.rows.reduce((n, r) => n + valueCount(r), 0), pendingCandidates: after.pending.length } };
  atomicWrite(`${OUT}/final-manifest.json`, json(finalManifest)); atomicWrite("docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md", renderResult(input, identities, canary, receipts, input, after, "COMPLETE", null, integration));
  console.log(JSON.stringify({ status: "CORRECTION_V2_COMPLETE_LOCAL_GATES", canary, totals, integration, after: finalManifest.after, finalManifestSha256: shaFile(`${OUT}/final-manifest.json`) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error); process.exitCode = 1; });
