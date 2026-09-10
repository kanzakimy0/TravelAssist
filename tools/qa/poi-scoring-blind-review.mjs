import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

import { scorePoi } from "./poi-scoring-pilot.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SOURCE_DIR = path.join(ROOT, "docs/qa/TASK-038");
const OUTPUT_DIR = path.join(ROOT, "docs/qa/TASK-039");

export const REVIEW_VERSION = "task-039-v1";
export const REVIEW_CODES = ["R1", "R2"];
export const GROUP_COUNTS = Object.freeze({
  primary_validation: 96,
  near_score_diagnostic: 24,
  machine_benchmark_audit: 12,
  hidden_repeat: 12,
});
export const RESPONSE_CHOICES = ["A", "B", "TIE", "INSUFFICIENT_INFO"];
export const CONFIDENCE_CHOICES = ["high", "medium", "low"];

const SCENARIO_INTENTS = Object.freeze({
  "first-time-iconic":
    "A first-time visitor wants a memorable, widely recognizable introduction to Japan.",
  "hidden-local":
    "A repeat visitor prefers locally distinctive places away from the most obvious headline sights.",
  "photo-scenery":
    "A traveler prioritizes rewarding photography opportunities and attractive scenery.",
  "history-architecture":
    "A traveler is especially interested in history, heritage, and architecture.",
  "food-focused":
    "A traveler wants food culture and local eating experiences to lead the day.",
  "shopping-city":
    "A traveler prefers shopping, lively neighborhoods, and contemporary city experiences.",
  "nature-traveler":
    "A traveler wants nature, landscapes, parks, or outdoor exploration.",
  "art-educational":
    "A traveler prioritizes art, museums, and educational cultural experiences.",
  "family-interactive":
    "A family group prefers engaging, interactive places with broad age appeal.",
  "relaxed-rest":
    "A traveler wants a calm, restorative day with a relaxed pace.",
  "low-walking":
    "A traveler has low tolerance for prolonged walking or physical effort.",
  "low-crowd": "A traveler has low tolerance for crowds and long queues.",
});

const NEUTRAL_CATEGORY_PRIORITY = [
  ["temple", "Temple or religious site"],
  ["shrine", "Shrine or religious site"],
  ["museum", "Museum"],
  ["art", "Art or cultural venue"],
  ["garden", "Garden"],
  ["park", "Park"],
  ["mountain", "Mountain or highland place"],
  ["viewpoint", "Scenic viewpoint"],
  ["nature", "Natural place"],
  ["historic", "Historic place"],
  ["architecture", "Architectural landmark"],
  ["market", "Market"],
  ["food", "Food-related place"],
  ["shopping", "Shopping area"],
  ["onsen", "Hot-spring place"],
  ["entertainment", "Entertainment venue"],
  ["urban", "Urban place"],
];

const FORBIDDEN_REVIEWER_KEYS = new Set([
  "archetypetags",
  "candidate",
  "candidatescore",
  "confidenceadjustment",
  "coverageexponent",
  "dominantcodes",
  "enginescore",
  "expected",
  "featurecodes",
  "featureset",
  "gammA".toLowerCase(),
  "machineconfidence",
  "machineexpected",
  "machinereasoncodes",
  "parameters",
  "partition",
  "poifeature",
  "reasoncodes",
  "score",
  "scoregap",
  "splitassignment",
  "targettags",
  "values",
  "weights",
]);

const FORBIDDEN_REVIEWER_VALUES = [
  "candidate-0457",
  "calibration",
  "holdout",
  "machine expected",
  "score gap",
  "engine score",
  "reasoncodes",
  "archetypetags",
  "poifeature",
];

export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const stableRank = (seed) => sha256(`${REVIEW_VERSION}:${seed}`);
const stableSort = (rows, seedFor) =>
  [...rows].sort((a, b) => {
    const left = stableRank(seedFor(a));
    const right = stableRank(seedFor(b));
    return left.localeCompare(right);
  });

const unorderedPair = (poiA, poiB) => [poiA, poiB].sort().join("::");
export const canonicalPairKey = (scenarioId, poiA, poiB) =>
  `${scenarioId}::${unorderedPair(poiA, poiB)}`;

const publicScenario = (scenario) => ({
  scenarioId: scenario.scenarioId,
  title: scenario.name,
  travelerIntent:
    SCENARIO_INTENTS[scenario.scenarioId] ?? scenario.intent ?? scenario.name,
});

const broadCategory = (poi) =>
  NEUTRAL_CATEGORY_PRIORITY.find(([tag]) =>
    poi.archetypeTags.includes(tag),
  )?.[1] ?? "Place of interest";

const identityCard = (poi) => ({
  name: poi.canonicalName,
  prefecture: poi.prefecture,
  region: poi.region,
  broadCategory: broadCategory(poi),
  evidenceUrls: [...poi.sourceRefs],
});

const toCanonicalItem = (
  index,
  group,
  scenario,
  poiA,
  poiB,
  internal = {},
) => ({
  canonicalItemId: `C${String(index + 1).padStart(3, "0")}`,
  canonicalPairKey: canonicalPairKey(
    scenario.scenarioId,
    poiA.poiRef,
    poiB.poiRef,
  ),
  group,
  scenario: publicScenario(scenario),
  canonicalPoiA: poiA.poiRef,
  canonicalPoiB: poiB.poiRef,
  poiA: identityCard(poiA),
  poiB: identityCard(poiB),
  internal,
});

function primaryItems(sample, scenarios) {
  const items = [];
  const useCount = new Map(sample.map((poi) => [poi.poiRef, 0]));
  const prefectureUse = new Map();
  const used = new Set();

  for (const scenario of scenarios) {
    const candidates = [];
    for (let left = 0; left < sample.length; left += 1) {
      for (let right = left + 1; right < sample.length; right += 1) {
        const poiA = sample[left];
        const poiB = sample[right];
        if (poiA.prefecture === poiB.prefecture) continue;
        candidates.push({ poiA, poiB });
      }
    }
    const ranked = stableSort(
      candidates,
      ({ poiA, poiB }) =>
        `primary:${scenario.scenarioId}:${unorderedPair(poiA.poiRef, poiB.poiRef)}`,
    );
    let selected = 0;
    for (const pair of ranked) {
      const key = canonicalPairKey(
        scenario.scenarioId,
        pair.poiA.poiRef,
        pair.poiB.poiRef,
      );
      if (used.has(key)) continue;
      if ((useCount.get(pair.poiA.poiRef) ?? 0) >= 3) continue;
      if ((useCount.get(pair.poiB.poiRef) ?? 0) >= 3) continue;
      if ((prefectureUse.get(pair.poiA.prefecture) ?? 0) >= 20) continue;
      if ((prefectureUse.get(pair.poiB.prefecture) ?? 0) >= 20) continue;
      items.push({
        group: "primary_validation",
        scenario,
        ...pair,
        internal: {},
      });
      used.add(key);
      useCount.set(pair.poiA.poiRef, (useCount.get(pair.poiA.poiRef) ?? 0) + 1);
      useCount.set(pair.poiB.poiRef, (useCount.get(pair.poiB.poiRef) ?? 0) + 1);
      prefectureUse.set(
        pair.poiA.prefecture,
        (prefectureUse.get(pair.poiA.prefecture) ?? 0) + 1,
      );
      prefectureUse.set(
        pair.poiB.prefecture,
        (prefectureUse.get(pair.poiB.prefecture) ?? 0) + 1,
      );
      selected += 1;
      if (selected === 8) break;
    }
    if (selected !== 8) {
      throw new Error(
        `Unable to select 8 primary items for ${scenario.scenarioId}`,
      );
    }
  }
  return items;
}

function nearScoreItems(sample, scenarios, featureByPoi, candidate, usedKeys) {
  const items = [];
  for (const scenario of scenarios) {
    const scored = sample.map((poi) => ({
      poi,
      score: scorePoi(featureByPoi.get(poi.poiRef), scenario, candidate).value,
    }));
    const candidates = [];
    for (let left = 0; left < scored.length; left += 1) {
      for (let right = left + 1; right < scored.length; right += 1) {
        const poiA = scored[left];
        const poiB = scored[right];
        const key = canonicalPairKey(
          scenario.scenarioId,
          poiA.poi.poiRef,
          poiB.poi.poiRef,
        );
        if (usedKeys.has(key)) continue;
        candidates.push({
          poiA: poiA.poi,
          poiB: poiB.poi,
          scoreA: poiA.score,
          scoreB: poiB.score,
          scoreGap: Math.abs(poiA.score - poiB.score),
        });
      }
    }
    candidates.sort(
      (a, b) =>
        a.scoreGap - b.scoreGap ||
        stableRank(
          `near:${scenario.scenarioId}:${unorderedPair(a.poiA.poiRef, a.poiB.poiRef)}`,
        ).localeCompare(
          stableRank(
            `near:${scenario.scenarioId}:${unorderedPair(b.poiA.poiRef, b.poiB.poiRef)}`,
          ),
        ),
    );
    for (const selected of candidates.slice(0, 2)) {
      const key = canonicalPairKey(
        scenario.scenarioId,
        selected.poiA.poiRef,
        selected.poiB.poiRef,
      );
      usedKeys.add(key);
      items.push({
        group: "near_score_diagnostic",
        scenario,
        poiA: selected.poiA,
        poiB: selected.poiB,
        internal: {
          candidateReference: "TASK-038 selected candidate",
          scoreA: selected.scoreA,
          scoreB: selected.scoreB,
          scoreGap: selected.scoreGap,
        },
      });
    }
  }
  return items;
}

function machineAuditItems(sampleByRef, scenarios, benchmark, usedKeys) {
  const bands = ["high", "medium", "low"];
  const items = [];
  for (const [index, scenario] of scenarios.entries()) {
    const desiredBand = bands[index % bands.length];
    const eligible = benchmark.filter((row) => {
      const key = canonicalPairKey(row.scenarioId, row.poiA, row.poiB);
      return (
        row.scenarioId === scenario.scenarioId &&
        !usedKeys.has(key) &&
        sampleByRef.has(row.poiA) &&
        sampleByRef.has(row.poiB)
      );
    });
    const bandRows = eligible.filter(
      (row) => row.confidenceBand === desiredBand,
    );
    const pool = bandRows.length > 0 ? bandRows : eligible;
    const selected = stableSort(
      pool,
      (row) => `audit:${scenario.scenarioId}:${row.judgmentId}`,
    )[0];
    if (!selected) {
      throw new Error(
        `Unable to select machine audit item for ${scenario.scenarioId}`,
      );
    }
    const key = canonicalPairKey(
      selected.scenarioId,
      selected.poiA,
      selected.poiB,
    );
    usedKeys.add(key);
    items.push({
      group: "machine_benchmark_audit",
      scenario,
      poiA: sampleByRef.get(selected.poiA),
      poiB: sampleByRef.get(selected.poiB),
      internal: {
        benchmarkJudgmentId: selected.judgmentId,
        machineExpected: selected.expected,
        machineConfidence: selected.confidenceBand,
        machineReasonCodes: selected.reasonCodes,
      },
    });
  }
  return items;
}

function hiddenRepeatItems(nonRepeatItems, scenarios) {
  return scenarios.map((scenario) => {
    const source = stableSort(
      nonRepeatItems.filter(
        (item) =>
          item.scenario.scenarioId === scenario.scenarioId &&
          item.group === "primary_validation",
      ),
      (item) => `repeat-source:${scenario.scenarioId}:${item.canonicalPairKey}`,
    )[0];
    return {
      ...source,
      canonicalItemId: null,
      group: "hidden_repeat",
      internal: { repeatOfCanonicalItemId: source.canonicalItemId },
    };
  });
}

export function buildCanonicalReviewSet(inputs) {
  const sample = inputs.sample.rows;
  const scenarios = inputs.scenarios.rows;
  const sampleByRef = new Map(sample.map((poi) => [poi.poiRef, poi]));
  const featureByPoi = new Map(
    inputs.features.rows.map((row) => [row.poiRef, row.featureSet]),
  );

  const primaryRaw = primaryItems(sample, scenarios);
  const primary = primaryRaw.map((item, index) =>
    toCanonicalItem(
      index,
      item.group,
      item.scenario,
      item.poiA,
      item.poiB,
      item.internal,
    ),
  );
  const usedKeys = new Set(primary.map((item) => item.canonicalPairKey));
  const nearRaw = nearScoreItems(
    sample,
    scenarios,
    featureByPoi,
    inputs.parameters.selectedCandidate,
    usedKeys,
  );
  const near = nearRaw.map((item, index) =>
    toCanonicalItem(
      primary.length + index,
      item.group,
      item.scenario,
      item.poiA,
      item.poiB,
      item.internal,
    ),
  );
  const auditRaw = machineAuditItems(
    sampleByRef,
    scenarios,
    inputs.benchmark.rows,
    usedKeys,
  );
  const audit = auditRaw.map((item, index) =>
    toCanonicalItem(
      primary.length + near.length + index,
      item.group,
      item.scenario,
      item.poiA,
      item.poiB,
      item.internal,
    ),
  );
  const nonRepeat = [...primary, ...near, ...audit];
  const repeats = hiddenRepeatItems(nonRepeat, scenarios).map(
    (item, index) => ({
      ...item,
      canonicalItemId: `C${String(nonRepeat.length + index + 1).padStart(3, "0")}`,
    }),
  );
  return [...nonRepeat, ...repeats];
}

const blindId = (reviewerCode, canonicalItemId) =>
  `${reviewerCode}-${stableRank(`blind:${reviewerCode}:${canonicalItemId}`).slice(0, 12).toUpperCase()}`;

function orderedItemsForReviewer(canonicalItems, reviewerCode) {
  const nonRepeat = stableSort(
    canonicalItems.filter((item) => item.group !== "hidden_repeat"),
    (item) => `order:${reviewerCode}:${item.canonicalItemId}`,
  );
  const result = [...nonRepeat];
  const repeats = stableSort(
    canonicalItems.filter((item) => item.group === "hidden_repeat"),
    (item) => `repeat-order:${reviewerCode}:${item.canonicalItemId}`,
  );
  for (const repeat of repeats) {
    const sourceId = repeat.internal.repeatOfCanonicalItemId;
    const sourceIndex = result.findIndex(
      (item) => item.canonicalItemId === sourceId,
    );
    const available = Math.max(1, result.length - sourceIndex - 1);
    const offset =
      8 +
      (Number.parseInt(
        stableRank(
          `repeat-gap:${reviewerCode}:${repeat.canonicalItemId}`,
        ).slice(0, 8),
        16,
      ) %
        Math.max(1, available - 7));
    result.splice(Math.min(result.length, sourceIndex + offset), 0, repeat);
  }
  return result;
}

export function buildReviewerPack(canonicalItems, reviewerCode) {
  if (!REVIEW_CODES.includes(reviewerCode)) {
    throw new Error(`Unsupported reviewer code: ${reviewerCode}`);
  }
  const orientationByCanonicalId = new Map();
  const items = orderedItemsForReviewer(canonicalItems, reviewerCode).map(
    (item, rowIndex) => {
      const repeatOf = item.internal.repeatOfCanonicalItemId;
      let swapped =
        Number.parseInt(
          stableRank(
            `orientation:${reviewerCode}:${item.canonicalItemId}`,
          ).slice(0, 2),
          16,
        ) %
          2 ===
        1;
      if (repeatOf) {
        const sourceSwapped = orientationByCanonicalId.get(repeatOf);
        const flipRepeat =
          Number.parseInt(
            stableRank(
              `repeat-flip:${reviewerCode}:${item.canonicalItemId}`,
            ).slice(0, 2),
            16,
          ) %
            2 ===
          1;
        swapped = flipRepeat ? !sourceSwapped : sourceSwapped;
      }
      orientationByCanonicalId.set(item.canonicalItemId, swapped);
      return {
        rowNumber: rowIndex + 1,
        blindItemId: blindId(reviewerCode, item.canonicalItemId),
        scenario: item.scenario,
        poiA: swapped ? item.poiB : item.poiA,
        poiB: swapped ? item.poiA : item.poiB,
        answerOptions: [...RESPONSE_CHOICES],
        confidenceOptions: [...CONFIDENCE_CHOICES],
        noteOptional: true,
      };
    },
  );
  return {
    reviewVersion: REVIEW_VERSION,
    reviewerCode,
    instructions:
      "Use only this pack and reviewer-guidance.md. Work independently and do not inspect TASK-038 or internal TASK-039 files.",
    itemCount: items.length,
    items,
  };
}

export function buildInternalMap(canonicalItems, packs, parameterSha256) {
  const canonicalById = new Map(
    canonicalItems.map((item) => [item.canonicalItemId, item]),
  );
  const reviewers = Object.fromEntries(
    packs.map((pack) => [
      pack.reviewerCode,
      pack.items.map((visible) => {
        const canonicalItemId = canonicalItems.find(
          (item) =>
            blindId(pack.reviewerCode, item.canonicalItemId) ===
            visible.blindItemId,
        )?.canonicalItemId;
        const canonical = canonicalById.get(canonicalItemId);
        const displayedAIsCanonicalA =
          visible.poiA.name === canonical.poiA.name &&
          visible.poiA.evidenceUrls[0] === canonical.poiA.evidenceUrls[0];
        return {
          blindItemId: visible.blindItemId,
          canonicalItemId,
          displayedAIsCanonicalA,
        };
      }),
    ]),
  );
  return {
    warning: "INTERNAL — DO NOT PROVIDE TO REVIEWERS BEFORE RESPONSE FREEZE",
    reviewVersion: REVIEW_VERSION,
    task038ParameterSearchSha256: parameterSha256,
    itemCount: canonicalItems.length,
    composition: Object.fromEntries(
      Object.keys(GROUP_COUNTS).map((group) => [
        group,
        canonicalItems.filter((item) => item.group === group).length,
      ]),
    ),
    canonicalItems: canonicalItems.map((item) => ({
      canonicalItemId: item.canonicalItemId,
      canonicalPairKey: item.canonicalPairKey,
      group: item.group,
      scenarioId: item.scenario.scenarioId,
      canonicalPoiA: item.canonicalPoiA,
      canonicalPoiB: item.canonicalPoiB,
      repeatOfCanonicalItemId: item.internal.repeatOfCanonicalItemId ?? null,
      hiddenMachineReferences: item.internal,
    })),
    reviewers,
  };
}

function walk(value, pathParts = [], findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walk(item, [...pathParts, String(index)], findings),
    );
    return findings;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
      if (FORBIDDEN_REVIEWER_KEYS.has(normalizedKey)) {
        findings.push({
          path: [...pathParts, key].join("."),
          type: "forbidden_key",
        });
      }
      walk(child, [...pathParts, key], findings);
    }
    return findings;
  }
  if (typeof value === "string") {
    const normalizedValue = value.toLowerCase();
    for (const forbidden of FORBIDDEN_REVIEWER_VALUES) {
      if (normalizedValue.includes(forbidden)) {
        findings.push({
          path: pathParts.join("."),
          type: "forbidden_value",
          fingerprint: sha256(forbidden).slice(0, 12),
        });
      }
    }
  }
  return findings;
}

export function auditReviewerPack(pack) {
  const findings = walk(pack);
  return {
    reviewerCode: pack.reviewerCode,
    passed: findings.length === 0,
    findings,
  };
}

export function responseTemplate() {
  return {
    reviewVersion: REVIEW_VERSION,
    reviewerCode: null,
    submittedAt: null,
    sourcePackSha256: null,
    instructions:
      "Copy all blindItemId values from one assigned pack. Fill each choice and confidence yourself; leave note null when no note is needed.",
    allowedChoices: [...RESPONSE_CHOICES],
    allowedConfidence: [...CONFIDENCE_CHOICES],
    responses: [
      {
        blindItemId: "<copy-from-assigned-pack>",
        choice: null,
        confidence: null,
        note: null,
      },
    ],
  };
}

export function validateReviewerResponse(response, pack) {
  const issues = [];
  if (response?.reviewVersion !== REVIEW_VERSION) issues.push("reviewVersion");
  if (response?.reviewerCode !== pack.reviewerCode) issues.push("reviewerCode");
  if (
    !response?.submittedAt ||
    Number.isNaN(Date.parse(response.submittedAt))
  ) {
    issues.push("submittedAt");
  }
  const expected = new Set(pack.items.map((item) => item.blindItemId));
  const seen = new Set();
  if (!Array.isArray(response?.responses)) {
    issues.push("responses_not_array");
  } else {
    for (const row of response.responses) {
      if (!expected.has(row.blindItemId))
        issues.push(`unknown:${row.blindItemId}`);
      if (seen.has(row.blindItemId))
        issues.push(`duplicate:${row.blindItemId}`);
      seen.add(row.blindItemId);
      if (!RESPONSE_CHOICES.includes(row.choice))
        issues.push(`choice:${row.blindItemId}`);
      if (!CONFIDENCE_CHOICES.includes(row.confidence)) {
        issues.push(`confidence:${row.blindItemId}`);
      }
      if (!(row.note === null || typeof row.note === "string")) {
        issues.push(`note:${row.blindItemId}`);
      }
    }
    for (const id of expected) if (!seen.has(id)) issues.push(`missing:${id}`);
  }
  return { ok: issues.length === 0, issues };
}

export function normalizeReviewerResponse(response, pack, internalMap) {
  const validation = validateReviewerResponse(response, pack);
  if (!validation.ok)
    throw new Error(
      `Invalid reviewer response: ${validation.issues.join(",")}`,
    );
  const mapping = new Map(
    internalMap.reviewers[pack.reviewerCode].map((row) => [
      row.blindItemId,
      row,
    ]),
  );
  return response.responses.map((row) => {
    const map = mapping.get(row.blindItemId);
    let canonicalChoice = row.choice;
    if (row.choice === "A" || row.choice === "B") {
      canonicalChoice = map.displayedAIsCanonicalA
        ? row.choice
        : row.choice === "A"
          ? "B"
          : "A";
    }
    return {
      canonicalItemId: map.canonicalItemId,
      canonicalChoice,
      confidence: row.confidence,
      note: row.note,
    };
  });
}

const kappa = (pairs) => {
  if (pairs.length === 0) return null;
  const categories = RESPONSE_CHOICES;
  const observed =
    pairs.filter(([left, right]) => left === right).length / pairs.length;
  const expected = categories.reduce((sum, category) => {
    const left =
      pairs.filter(([value]) => value === category).length / pairs.length;
    const right =
      pairs.filter(([, value]) => value === category).length / pairs.length;
    return sum + left * right;
  }, 0);
  return expected === 1 ? 1 : (observed - expected) / (1 - expected);
};

export function calculateAgreement(normalizedR1, normalizedR2, internalMap) {
  const byR1 = new Map(normalizedR1.map((row) => [row.canonicalItemId, row]));
  const byR2 = new Map(normalizedR2.map((row) => [row.canonicalItemId, row]));
  const groupById = new Map(
    internalMap.canonicalItems.map((item) => [
      item.canonicalItemId,
      item.group,
    ]),
  );
  const itemById = new Map(
    internalMap.canonicalItems.map((item) => [item.canonicalItemId, item]),
  );
  const comparedRows = [...byR1.keys()]
    .filter((id) => byR2.has(id) && groupById.get(id) !== "hidden_repeat")
    .map((id) => ({
      canonicalItemId: id,
      scenarioId: itemById.get(id).scenarioId,
      left: byR1.get(id).canonicalChoice,
      right: byR2.get(id).canonicalChoice,
    }));
  const rows = comparedRows.map((row) => [row.left, row.right]);
  const withoutInsufficient = rows.filter(
    ([left, right]) =>
      left !== "INSUFFICIENT_INFO" && right !== "INSUFFICIENT_INFO",
  );
  const scenarioIds = [
    ...new Set(comparedRows.map((row) => row.scenarioId)),
  ].sort();
  return {
    compared: rows.length,
    rawExactAgreement:
      rows.filter(([left, right]) => left === right).length / rows.length,
    agreementExcludingInsufficient:
      withoutInsufficient.length === 0
        ? null
        : withoutInsufficient.filter(([left, right]) => left === right).length /
          withoutInsufficient.length,
    cohenKappa: kappa(rows),
    insufficientInformationRate:
      rows.filter(([left, right]) =>
        [left, right].includes("INSUFFICIENT_INFO"),
      ).length / rows.length,
    aBVersusTieDisagreements: rows.filter(
      ([left, right]) =>
        (left === "TIE" && ["A", "B"].includes(right)) ||
        (right === "TIE" && ["A", "B"].includes(left)),
    ).length,
    perScenario: Object.fromEntries(
      scenarioIds.map((scenarioId) => {
        const scoped = comparedRows.filter(
          (row) => row.scenarioId === scenarioId,
        );
        return [
          scenarioId,
          {
            compared: scoped.length,
            exactAgreement:
              scoped.filter((row) => row.left === row.right).length /
              scoped.length,
          },
        ];
      }),
    ),
  };
}

export function calculateRepeatConsistency(normalized, internalMap) {
  const byId = new Map(
    normalized.map((row) => [row.canonicalItemId, row.canonicalChoice]),
  );
  const repeats = internalMap.canonicalItems.filter(
    (item) => item.group === "hidden_repeat",
  );
  const consistent = repeats.filter(
    (item) =>
      byId.get(item.canonicalItemId) === byId.get(item.repeatOfCanonicalItemId),
  ).length;
  return {
    compared: repeats.length,
    consistent,
    rate: consistent / repeats.length,
  };
}

export function buildAdjudicationPack({
  normalizedR1,
  normalizedR2,
  canonicalItems,
}) {
  const r1 = new Map(normalizedR1.map((row) => [row.canonicalItemId, row]));
  const r2 = new Map(normalizedR2.map((row) => [row.canonicalItemId, row]));
  const disagreements = canonicalItems.filter(
    (item) =>
      item.group === "primary_validation" &&
      r1.get(item.canonicalItemId)?.canonicalChoice !==
        r2.get(item.canonicalItemId)?.canonicalChoice,
  );
  return {
    reviewVersion: REVIEW_VERSION,
    adjudicatorCode: "R3",
    instructions:
      "Resolve these independently. R1/R2 answers and all machine information are intentionally omitted.",
    itemCount: disagreements.length,
    items: stableSort(
      disagreements,
      (item) => `adjudication:${item.canonicalItemId}`,
    ).map((item, index) => ({
      rowNumber: index + 1,
      blindItemId: `R3-${stableRank(`adjudication:${item.canonicalItemId}`).slice(0, 12).toUpperCase()}`,
      scenario: item.scenario,
      poiA: item.poiA,
      poiB: item.poiB,
      answerOptions: [...RESPONSE_CHOICES],
      confidenceOptions: [...CONFIDENCE_CHOICES],
      noteOptional: true,
    })),
  };
}

export function freezeHumanGold({ reviewers, adjudications, internalMap }) {
  if (!Array.isArray(reviewers) || reviewers.length < 2) {
    throw new Error(
      "At least two independent human reviewer responses are required",
    );
  }
  const agreement = calculateAgreement(reviewers[0], reviewers[1], internalMap);
  const repeatRates = reviewers.map(
    (rows) => calculateRepeatConsistency(rows, internalMap).rate,
  );
  if (
    repeatRates.some((rate) => rate < 0.85) ||
    agreement.rawExactAgreement < 0.7 ||
    (agreement.cohenKappa !== null && agreement.cohenKappa < 0.55)
  ) {
    throw new Error("insufficient_human_agreement");
  }
  const adjudicationById = new Map(
    (adjudications ?? []).map((row) => [row.canonicalItemId, row.choice]),
  );
  const left = new Map(reviewers[0].map((row) => [row.canonicalItemId, row]));
  const right = new Map(reviewers[1].map((row) => [row.canonicalItemId, row]));
  const rows = internalMap.canonicalItems
    .filter((item) => item.group !== "hidden_repeat")
    .map((item) => {
      const r1 = left.get(item.canonicalItemId);
      const r2 = right.get(item.canonicalItemId);
      if (!r1 || !r2)
        throw new Error(`Missing normalized response: ${item.canonicalItemId}`);
      let choice =
        r1.canonicalChoice === r2.canonicalChoice
          ? r1.canonicalChoice
          : adjudicationById.get(item.canonicalItemId);
      if (!choice && item.group === "primary_validation") {
        throw new Error(`Adjudication required: ${item.canonicalItemId}`);
      }
      choice ??= "UNRESOLVED";
      const confidence =
        choice === "UNRESOLVED"
          ? null
          : r1.confidence === "high" && r2.confidence === "high"
            ? "high"
            : r1.confidence !== "low" && r2.confidence !== "low"
              ? "medium"
              : "low";
      return {
        canonicalItemId: item.canonicalItemId,
        choice,
        confidence,
        reviewerProvenance: ["R1", "R2"],
      };
    });
  const payload = { reviewVersion: REVIEW_VERSION, rows };
  return { ...payload, sha256: sha256(JSON.stringify(payload)) };
}

const candidateOutcome = (left, right) => {
  const delta = left - right;
  if (Math.abs(delta) <= 1.5) return "TIE";
  return delta > 0 ? "A" : "B";
};

export function evaluateCandidateOnce({
  humanGold,
  expectedHumanGoldSha256,
  parameterFile,
  canonicalItems,
  featureRows,
  scenarios,
}) {
  if (!humanGold?.sha256 || humanGold.sha256 !== expectedHumanGoldSha256) {
    throw new Error(
      "Frozen Human Gold checksum is required before candidate evaluation",
    );
  }
  if (
    sha256(
      JSON.stringify({
        reviewVersion: humanGold.reviewVersion,
        rows: humanGold.rows,
      }),
    ) !== humanGold.sha256
  ) {
    throw new Error("Human Gold checksum mismatch");
  }
  const before = sha256(parameterFile);
  const parsed = JSON.parse(parameterFile);
  if (!canonicalItems || !featureRows || !scenarios) {
    throw new Error(
      "Canonical review set, features, and scenarios are required",
    );
  }
  const config = parsed.selectedCandidate;
  const goldById = new Map(
    humanGold.rows.map((row) => [row.canonicalItemId, row]),
  );
  const featureByPoi = new Map(
    featureRows.map((row) => [row.poiRef, row.featureSet]),
  );
  const scenarioById = new Map(scenarios.map((row) => [row.scenarioId, row]));
  const evaluated = canonicalItems
    .filter((item) => item.group !== "hidden_repeat")
    .map((item) => {
      const gold = goldById.get(item.canonicalItemId);
      if (!gold || ["UNRESOLVED", "INSUFFICIENT_INFO"].includes(gold.choice))
        return null;
      const scenario = scenarioById.get(item.scenario.scenarioId);
      const scoreA = scorePoi(
        featureByPoi.get(item.canonicalPoiA),
        scenario,
        config,
      ).value;
      const scoreB = scorePoi(
        featureByPoi.get(item.canonicalPoiB),
        scenario,
        config,
      ).value;
      const prediction = candidateOutcome(scoreA, scoreB);
      return {
        canonicalItemId: item.canonicalItemId,
        group: item.group,
        scenarioId: item.scenario.scenarioId,
        goldChoice: gold.choice,
        goldConfidence: gold.confidence,
        prediction,
        correct: prediction === gold.choice,
      };
    })
    .filter(Boolean);
  const primary = evaluated.filter((row) => row.group === "primary_validation");
  const ratio = (rows) =>
    rows.length === 0
      ? null
      : rows.filter((row) => row.correct).length / rows.length;
  const result = {
    status:
      primary.length >= 60 ? "evaluated_once" : "insufficient_human_coverage",
    candidateReference: parsed.selectedCandidate.configId,
    humanGoldSha256: humanGold.sha256,
    usablePrimaryCount: primary.length,
    primaryHighConfidenceAgreement: ratio(
      primary.filter((row) => row.goldConfidence === "high"),
    ),
    primaryHighMediumAgreement: ratio(
      primary.filter((row) => ["high", "medium"].includes(row.goldConfidence)),
    ),
    overallPrimaryAgreement: ratio(primary),
    diagnosticGroups: Object.fromEntries(
      ["near_score_diagnostic", "machine_benchmark_audit"].map((group) => [
        group,
        {
          usable: evaluated.filter((row) => row.group === group).length,
          agreement: ratio(evaluated.filter((row) => row.group === group)),
        },
      ]),
    ),
  };
  if (sha256(parameterFile) !== before)
    throw new Error("TASK-038 candidate config mutated");
  return result;
}

async function readJson(name) {
  return JSON.parse(await readFile(path.join(SOURCE_DIR, name), "utf8"));
}

async function writeJson(name, value) {
  const formatted = await prettier.format(
    `${JSON.stringify(value, null, 2)}\n`,
    {
      parser: "json",
    },
  );
  await writeFile(path.join(OUTPUT_DIR, name), formatted);
}

export async function prepareBlindReview() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const parameterFile = await readFile(
    path.join(SOURCE_DIR, "parameter-search.json"),
    "utf8",
  );
  const inputs = {
    sample: await readJson("poi-sample-100.json"),
    scenarios: await readJson("preference-scenarios.json"),
    features: await readJson("poi-feature-annotations.json"),
    benchmark: await readJson("pairwise-benchmark.json"),
    parameters: JSON.parse(parameterFile),
  };
  const canonicalItems = buildCanonicalReviewSet(inputs);
  const packs = REVIEW_CODES.map((code) =>
    buildReviewerPack(canonicalItems, code),
  );
  const parameterSha256 = sha256(parameterFile);
  const internalMap = buildInternalMap(canonicalItems, packs, parameterSha256);
  const audits = packs.map(auditReviewerPack);
  if (audits.some((audit) => !audit.passed)) {
    throw new Error("Reviewer pack leakage audit failed");
  }
  await Promise.all([
    ...packs.map((pack) =>
      writeJson(`reviewer-pack-${pack.reviewerCode.toLowerCase()}.json`, pack),
    ),
    writeJson("reviewer-response-template.json", responseTemplate()),
    writeJson("internal-review-map.json", internalMap),
    writeJson("leakage-audit.json", {
      reviewVersion: REVIEW_VERSION,
      auditedFiles: packs.map(
        (pack) => `reviewer-pack-${pack.reviewerCode.toLowerCase()}.json`,
      ),
      forbiddenKeyAndValuePolicy: "TASK-039 section 5",
      results: audits,
      passed: audits.every((audit) => audit.passed),
    }),
  ]);
  const packChecksums = Object.fromEntries(
    await Promise.all(
      packs.map(async (pack) => [
        pack.reviewerCode,
        sha256(
          await readFile(
            path.join(
              OUTPUT_DIR,
              `reviewer-pack-${pack.reviewerCode.toLowerCase()}.json`,
            ),
          ),
        ),
      ]),
    ),
  );
  const summary = {
    status: "prepared_awaiting_human_review",
    total: canonicalItems.length,
    composition: internalMap.composition,
    scenariosWithPrimary: new Set(
      canonicalItems
        .filter((item) => item.group === "primary_validation")
        .map((item) => item.scenario.scenarioId),
    ).size,
    packChecksums,
    parameterSha256,
    humanJudgmentsFabricated: false,
  };
  console.log(JSON.stringify(summary, null, 2));
  return { ...summary, canonicalItems, packs, internalMap, audits };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await prepareBlindReview();
}
