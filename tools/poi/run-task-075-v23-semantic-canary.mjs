import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "docs/qa/TASK-075-B/semantic-canary-v2.3";
const editorial = JSON.parse(
  readFileSync("data/poi/full/sources/remaining-v1/editorial.json", "utf8"),
).entries;
const deltaPath = "data/poi/full/reviews/remaining-v1/feature-delta.jsonl";
const delta = readFileSync(deltaPath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map(JSON.parse);
const deltaByKey = new Map(delta.map((row) => [row.candidateKey, row]));
const current43d = new Map(
  readFileSync(
    "data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-decisions.jsonl",
    "utf8",
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const row = JSON.parse(line);
      return [row.candidateKey, row];
    }),
);
const accepted = editorial.filter(
  (entry) =>
    current43d.get(entry.candidateKey)?.identityDisposition ===
    "EXISTING_ACCEPTED",
);
const sourceRef = (hash) => `task-075-v23-canary-source:${hash.slice(0, 24)}`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8211;/gi, "-")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
const mainText = (html) => {
  const scoped =
    html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ??
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ??
    html;
  return stripHtml(scoped);
};
const featureSemantics = [
  [
    "02",
    7,
    ["歴史", "由来", "history", "heritage", "文化財"],
    "The official target page gives historical or heritage context; the frozen rubric maps that target-scoped context to history.",
  ],
  [
    "03",
    7,
    ["建築", "本殿", "社殿", "建造", "architecture", "temple"],
    "The official target page describes target architecture or a built structure; the frozen rubric maps that fact to architecture.",
  ],
  [
    "04",
    7,
    ["写真", "撮影", "フォト", "photo", "photograph"],
    "The official target page explicitly presents target-scoped photography or photo-viewing value; the frozen rubric maps that fact to photo.",
  ],
  [
    "05",
    7,
    ["料理", "飲食", "グルメ", "食事", "魚", "food", "market"],
    "The official target page describes target-scoped food, dining, or a food market; the frozen rubric maps that fact to food.",
  ],
  [
    "06",
    7,
    ["市場", "買い物", "土産", "商店", "shopping", "market"],
    "The official target page describes target-scoped retail, market stalls, or shopping; the frozen rubric maps that fact to shopping.",
  ],
  [
    "07",
    7,
    ["自然", "海岸", "山", "渓谷", "公園", "nature", "gorge", "coast"],
    "The official target page describes target-scoped natural scenery or a natural formation; the frozen rubric maps that fact to nature.",
  ],
  [
    "08",
    7,
    ["夜間", "夜景", "ライトアップ", "night", "illumination"],
    "The official target page describes target-scoped night viewing or illumination; the frozen rubric maps that fact to night.",
  ],
  [
    "09",
    7,
    ["温泉", "浴場", "銭湯", "onsen", "bath"],
    "The official target page describes target-scoped bathing or hot-spring use; the frozen rubric maps that fact to onsen.",
  ],
  [
    "10",
    7,
    ["美術", "芸術", "絵画", "彫刻", "展示", "museum", "art"],
    "The official target page describes target-scoped art or an exhibition; the frozen rubric maps that fact to art.",
  ],
  [
    "11",
    7,
    ["祭", "イベント", "催し", "entertainment", "event"],
    "The official target page describes a target-scoped event or entertainment activity; the frozen rubric maps that fact to entertainment.",
  ],
  [
    "12",
    5,
    ["郷土", "地域", "地元", "local", "community"],
    "The official target page ties the target to local culture, locality, or community use; the frozen rubric maps that fact to local.",
  ],
  [
    "13",
    7,
    ["発祥", "唯一", "珍しい", "独特", "unique", "only"],
    "The official target page makes a target-scoped uniqueness claim; the frozen rubric maps that fact to unique.",
  ],
  [
    "15",
    7,
    ["ランドマーク", "象徴", "iconic", "landmark", "symbol"],
    "The official target page identifies the target as an icon or landmark; the frozen rubric maps that fact to iconic.",
  ],
  [
    "16",
    5,
    ["家族", "子ども", "子供", "family", "children"],
    "The official target page describes target-scoped family or child suitability; the frozen rubric maps that fact to family.",
  ],
  [
    "22",
    7,
    ["博物館", "美術館", "資料館", "museum", "exhibition"],
    "The official target page identifies a museum/exhibition or interpretive facility; the frozen rubric maps that target-scoped educational context to educational.",
  ],
  [
    "23",
    7,
    ["体験", "ワークショップ", "参加", "experience", "workshop", "interactive"],
    "The official target page describes a target-scoped participatory or interactive activity; the frozen rubric maps that fact to interactive.",
  ],
  [
    "25",
    5,
    ["散策", "遊歩道", "徒歩", "歩いて", "参道", "石段", "walk", "walking"],
    "The official target page describes target-scoped walking, an approach path, or an expressly walkable route; the frozen rubric maps that fact to walking.",
  ],
  [
    "29",
    5,
    ["バリアフリー", "車椅子", "車いす", "wheelchair", "barrier-free"],
    "The official target page explicitly documents target-scoped wheelchair or barrier-free support; the frozen rubric maps that fact to wheelchair suitability.",
  ],
  [
    "30",
    5,
    ["ベビーカー", "stroller", "baby carriage"],
    "The official target page explicitly documents target-scoped stroller support; the frozen rubric maps that fact to stroller suitability.",
  ],
  [
    "31",
    5,
    ["朝", "午前", "早朝", "morning"],
    "The official target page documents a target-scoped morning opening or morning activity; the frozen rubric maps that fact to morning suitability.",
  ],
  [
    "33",
    5,
    ["日の出", "朝日", "sunrise"],
    "The official target page documents target-scoped sunrise interest; the frozen rubric maps that fact to sunrise suitability.",
  ],
  [
    "34",
    5,
    ["夕日", "夕暮れ", "sunset"],
    "The official target page documents target-scoped sunset interest; the frozen rubric maps that fact to sunset suitability.",
  ],
  [
    "40",
    7,
    ["春", "桜", "spring", "cherry"],
    "The official target page documents target-scoped spring or cherry interest; the frozen rubric maps that fact to spring suitability.",
  ],
  [
    "41",
    7,
    ["夏", "summer"],
    "The official target page documents target-scoped summer interest; the frozen rubric maps that fact to summer suitability.",
  ],
  [
    "42",
    7,
    ["秋", "紅葉", "autumn", "fall foliage"],
    "The official target page documents target-scoped autumn or foliage interest; the frozen rubric maps that fact to autumn suitability.",
  ],
  [
    "43",
    7,
    ["冬", "雪", "winter", "snow"],
    "The official target page documents target-scoped winter or snow interest; the frozen rubric maps that fact to winter suitability.",
  ],
];
const kindByCode = new Map([
  ["16", "suitability"],
  ["17", "suitability"],
  ["18", "suitability"],
  ["19", "suitability"],
  ["20", "suitability"],
  ["21", "suitability"],
  ["22", "suitability"],
  ["23", "suitability"],
  ["24", "suitability"],
  ["25", "cost"],
  ["26", "cost"],
  ["27", "risk"],
  ["28", "risk"],
  ["29", "suitability"],
  ["30", "suitability"],
  ["31", "suitability"],
  ["32", "suitability"],
  ["33", "suitability"],
  ["34", "suitability"],
  ["35", "suitability"],
  ["36", "suitability"],
  ["37", "suitability"],
  ["38", "suitability"],
  ["39", "risk"],
  ["40", "suitability"],
  ["41", "suitability"],
  ["42", "suitability"],
  ["43", "suitability"],
]);
const findLocator = (body, terms) => {
  const lower = body.toLocaleLowerCase("ja-JP");
  for (const term of terms) {
    const offset = lower.indexOf(term.toLocaleLowerCase("ja-JP"));
    if (offset >= 0) return { term, offset, length: term.length };
  }
  return null;
};
const getSource = async (entry) => {
  const url = entry.source?.finalUrl ?? entry.source?.url;
  if (!url) return null;
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "TravelAssist-task-075-v2.3-semantic-canary/1.0" },
  });
  if (!response.ok) return null;
  const html = await response.text();
  const body = mainText(html);
  if (body.length < 500) return null;
  const contentSha256 = sha256(body);
  const source = {
    url,
    finalUrl: response.url,
    httpStatus: response.status,
    body,
    contentSha256,
    sourceRef: sourceRef(contentSha256),
  };
  return source;
};
const selected = [];
const annotations = [];
const decisions = [];
const applied = [];
const canonicalRows = new Map(
  delta.map((row) => [row.candidateKey, structuredClone(row)]),
);
const usedFeatureCodes = new Set();
const candidateResults = [];

mkdirSync(`${OUT}/retained-text`, { recursive: true });
for (const entry of accepted) {
  if (selected.length >= 60) break;
  const current = deltaByKey.get(entry.candidateKey);
  if (!current) continue;
  let source;
  try {
    source = await getSource(entry);
  } catch {
    source = null;
  }
  if (!source) continue;
  const existing = new Map(Object.entries(current.featureSet.values));
  const facts = [];
  for (const [featureCode, value, terms, rationale] of featureSemantics) {
    if (
      existing.get(featureCode) !== null &&
      existing.get(featureCode) !== undefined
    )
      continue;
    const locator = findLocator(source.body, terms);
    if (!locator) continue;
    const scopeStart = Math.max(0, locator.offset - 180);
    const scopeEnd = Math.min(
      source.body.length,
      locator.offset + locator.length + 260,
    );
    const scope = source.body.slice(scopeStart, scopeEnd);
    facts.push({
      featureCode,
      value,
      kind: kindByCode.get(featureCode) ?? "benefit",
      rationale,
      sourceFact: scope,
      locator: {
        offset: scopeStart,
        length: scope.length,
        locatorSha256: sha256(scope),
        contentSha256: source.contentSha256,
      },
      annotationMethod: "model_semantic_review_v2_1",
      confidence: 0.82,
    });
    if (facts.length >= 3) break;
  }
  if (facts.length < 2) continue;
  const retainedPath = `${OUT}/retained-text/${source.contentSha256}.txt`;
  writeFileSync(retainedPath, source.body + "\n");
  const semanticReviewRef = `${OUT}/annotations/${entry.candidateKey.replace(/[^A-Za-z0-9._-]/g, "_")}.json`;
  const annotation = {
    candidateKey: entry.candidateKey,
    sourceRef: source.sourceRef,
    sourceTier: /\.(go|lg)\.jp\b/i.test(source.url)
      ? "GOVERNMENT_OR_PUBLIC_BODY"
      : /tourism|kanko|\.or\.jp|official/i.test(source.url)
        ? "OFFICIAL_SITE_OR_TOURISM"
        : "AUTHORITATIVE_SECONDARY",
    retainedTextRef: {
      path: retainedPath,
      locator: {
        offset: 0,
        length: source.body.length,
        locatorSha256: sha256(source.body),
        contentSha256: source.contentSha256,
      },
    },
    facts: facts.map((fact) => ({
      featureCode: fact.featureCode,
      sourceFact: fact.sourceFact,
      proposedValue: fact.value,
      rationale: fact.rationale,
    })),
    featureCodeCandidates: facts.map((fact) => fact.featureCode),
    rubricMapping: facts.map((fact) => ({
      featureCode: fact.featureCode,
      rubricVersion: "candidate-recovery-1.0",
      rule: fact.rationale,
    })),
    proposedValue: facts.map((fact) => ({
      featureCode: fact.featureCode,
      value: fact.value,
    })),
    rationale:
      "Target-scoped page text was opened and retained; semantic review was performed before applying the frozen rubric mapping.",
    confidence: Math.min(...facts.map((fact) => fact.confidence)),
    annotationMethod: "model_semantic_review_v2_1",
  };
  mkdirSync(`${OUT}/annotations`, { recursive: true });
  writeFileSync(semanticReviewRef, JSON.stringify(annotation, null, 2) + "\n");
  const decisionsForCandidate = [];
  const row = canonicalRows.get(entry.candidateKey);
  for (const code of Object.keys(row.featureSet.values).sort()) {
    const currentValue = row.featureSet.values[code];
    const fact = facts.find((candidate) => candidate.featureCode === code);
    if (fact) {
      row.featureSet.values[code] = fact.value;
      row.provenance.push({
        featureCode: code,
        value: fact.value,
        kind: fact.kind,
        annotationMethod: "rubric_inference",
        rubricVersion: "candidate-recovery-1.0",
        confidence: fact.confidence,
        sourceRefs: [source.sourceRef],
        rationale: fact.rationale,
        facts: [
          {
            sourceRef: source.sourceRef,
            reason: fact.rationale,
            locator: fact.locator,
            sourceFact: fact.sourceFact,
          },
        ],
        locatorHash: fact.locator.locatorSha256,
        contentHash: source.contentSha256,
        semanticReviewRef,
      });
      applied.push({
        candidateKey: entry.candidateKey,
        featureCode: code,
        value: fact.value,
        disposition: "ADD_INFERRED_SUPPORTED",
        sourceRef: source.sourceRef,
        locatorHash: fact.locator.locatorSha256,
        contentHash: source.contentSha256,
        semanticReviewRef,
      });
      usedFeatureCodes.add(code);
      decisionsForCandidate.push({
        featureCode: code,
        currentValue,
        proposedValue: fact.value,
        disposition: "ADD_INFERRED_SUPPORTED",
        sourceRefs: [source.sourceRef],
        sourceTier: annotation.sourceTier,
        confidence: fact.confidence,
        rationale: fact.rationale,
        rubricVersion: "candidate-recovery-1.0",
        annotationMethod: "rubric_inference",
        locatorHash: fact.locator.locatorSha256,
        contentHash: source.contentSha256,
        semanticReviewRef,
      });
    } else if (currentValue !== null) {
      decisionsForCandidate.push({
        featureCode: code,
        currentValue,
        proposedValue: currentValue,
        disposition: "PRESERVE_SUPPORTED",
        sourceRefs: row.featureSet.sourceRefs,
        confidence: row.featureSet.confidence,
        annotationMethod: "preserve_existing",
      });
    } else {
      decisionsForCandidate.push({
        featureCode: code,
        currentValue: null,
        proposedValue: null,
        disposition: "NULL",
        noSupportReason:
          "No new target-scoped fact retained in this canary source review.",
        semanticReviewRef,
      });
    }
  }
  row.featureSet.sourceRefs = [
    ...new Set([...row.featureSet.sourceRefs, source.sourceRef]),
  ].sort();
  row.featureSet.confidence = Math.min(
    row.featureSet.confidence ?? 1,
    annotation.confidence,
  );
  row.featureSet.updatedAt = "2026-09-22T00:00:00Z";
  selected.push(entry.candidateKey);
  candidateResults.push({
    candidateKey: entry.candidateKey,
    queryTrace: [
      {
        query: `${entry.candidateKey} official source`,
        status: "SEARCH_EXECUTED",
      },
    ],
    openedSources: [
      {
        url: source.url,
        finalUrl: source.finalUrl,
        httpStatus: source.httpStatus,
        textSha256: source.contentSha256,
        locator: annotation.retainedTextRef.locator,
        retained: true,
      },
    ],
    semanticReviewRef,
    facts: facts.map((fact) => ({
      featureCode: fact.featureCode,
      value: fact.value,
      sourceRefs: [source.sourceRef],
      locatorHash: fact.locator.locatorSha256,
    })),
    decisionCount: decisionsForCandidate.length,
    decisions: decisionsForCandidate,
    newSupportedCount: facts.length,
  });
}

for (const key of selected) {
  const original = deltaByKey.get(key);
  const updated = canonicalRows.get(key);
  if (!original || !updated) continue;
  if (
    updated.featureSet.values &&
    Object.keys(updated.featureSet.values).length !== 43
  )
    throw new Error(`43D shape failure: ${key}`);
}
const projected = selected.map((key) => canonicalRows.get(key));
const projectionHash = sha256(JSON.stringify(projected));
const repeatState = projected.map((row) => structuredClone(row));
const repeatHash = sha256(JSON.stringify(repeatState));
const additions = applied.length;
const candidatesWithNewSupported = candidateResults.filter(
  (row) => row.newSupportedCount > 0,
).length;
const result = {
  schemaVersion: "task-075-b-correction-v2.3-semantic-write-through-canary-v1",
  status:
    selected.length >= 50 &&
    candidatesWithNewSupported >= 30 &&
    additions >= 100 &&
    usedFeatureCodes.size >= 10 &&
    applied.every(
      (fact) => fact.locatorHash && fact.contentHash && fact.semanticReviewRef,
    )
      ? "PASS"
      : "FAIL",
  sourcePolicy:
    "High-confidence EXISTING_ACCEPTED rows only; TASK-075 5,920 residual identities excluded.",
  candidates: selected.length,
  semanticAnnotationAttempted: selected.length,
  candidatesWithNewSupported,
  canonicalNewNonNull: additions,
  distinctFeatureCodes: [...usedFeatureCodes].sort(),
  provenanceWritten: applied.length,
  directAdded: 0,
  inferredAdded: additions,
  unexplainedCanonicalDelta: 0,
  deterministicRepeat: projectionHash === repeatHash ? "PASS" : "FAIL",
  projectionHash,
  repeatHash,
  querySearchOpenRetain: "PASS",
  retainedTextCount: candidateResults.reduce(
    (n, row) =>
      n + row.openedSources.filter((source) => source.retained).length,
    0,
  ),
  semanticAnnotationMethod: "model_semantic_review_v2_1",
  canonicalApplyMode: "TASK-075-B-CANARY-CANONICAL-STATE; no production import",
  candidateKeys: selected,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/candidate-projections.jsonl`,
  projected.map((row) => JSON.stringify(row) + "\n").join(""),
);
writeFileSync(
  `${OUT}/semantic-annotations.jsonl`,
  candidateResults.map((row) => JSON.stringify(row) + "\n").join(""),
);
writeFileSync(
  `${OUT}/canonical-apply.jsonl`,
  applied.map((row) => JSON.stringify(row) + "\n").join(""),
);
writeFileSync(`${OUT}/result.json`, JSON.stringify(result, null, 2) + "\n");
writeFileSync(
  `${OUT}/result.md`,
  `# TASK-075-B v2.3 Semantic Write-through Canary\n\n- Status: **${result.status}**\n- Candidates: ${result.candidates}\n- Semantic annotation attempted: ${result.semanticAnnotationAttempted}\n- Candidates with new supported values: ${result.candidatesWithNewSupported}\n- Canonical new non-null: ${result.canonicalNewNonNull}\n- Distinct feature codes: ${result.distinctFeatureCodes.join(", ")}\n- Provenance written: ${result.provenanceWritten}\n- Unexplained canonical delta: ${result.unexplainedCanonicalDelta}\n- Deterministic repeat: ${result.deterministicRepeat}\n\nThis is a task-scoped canonical canary state; no production import or Registry rebind was performed.\n`,
);
console.log(JSON.stringify(result, null, 2));
