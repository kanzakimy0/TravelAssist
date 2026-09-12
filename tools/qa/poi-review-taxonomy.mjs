import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SAMPLE_PATH = path.join(ROOT, "docs/qa/TASK-038/poi-sample-100.json");
const OUTPUT_PATH = path.join(
  ROOT,
  "docs/qa/TASK-039/poi-review-taxonomy-v2.json",
);

export const TAXONOMY_VERSION = "task-039-review-taxonomy-v2";

export const CATEGORY_LABELS = Object.freeze({
  aquarium: "Aquarium",
  art_island: "Art island or cultural destination",
  bridge_landmark: "Bridge or engineering landmark",
  castle: "Castle",
  cultural_district: "Historic or cultural district",
  food_district: "Food and entertainment district",
  garden: "Garden",
  historic_site: "Historic site",
  historic_village: "Historic village",
  lake: "Lake or waterside landscape",
  market: "Market",
  memorial: "Memorial site",
  mountain: "Mountain or volcano",
  museum: "Museum or educational venue",
  national_park: "National park or protected natural area",
  natural_landscape: "Natural landscape",
  observation_landmark: "Observation landmark",
  onsen_destination: "Hot-spring destination",
  park: "Park",
  scenic_district: "Scenic district",
  shrine: "Shrine",
  temple: "Temple",
  theme_park: "Theme park or interactive attraction",
  urban_landmark: "Urban landmark or district",
  wildlife_park: "Wildlife park",
  zoo: "Zoo",
});

// This is deliberately explicit. A generic tag-priority function previously
// classified a zoo as a natural landscape and parks as museums. Review-facing
// identity must not depend on whichever secondary tag happens to sort first.
export const CATEGORY_BY_NAME = Object.freeze({
  "Sapporo Clock Tower": "historic_site",
  "Odori Park": "park",
  "Moerenuma Park": "park",
  "Historical Village of Hokkaido": "historic_village",
  "Asahiyama Zoo": "zoo",
  "Lake Mashū": "lake",
  "Sapporo TV Tower": "observation_landmark",
  "Shiretoko National Park": "national_park",
  "Hirosaki Castle": "castle",
  "Sannai-Maruyama Site": "historic_site",
  "Lake Towada": "lake",
  "Oirase River": "natural_landscape",
  "Chūson-ji": "temple",
  "Mōtsū-ji": "temple",
  Matsushima: "natural_landscape",
  Zuihōden: "historic_site",
  "Yama-dera": "temple",
  "Ginzan Onsen": "onsen_destination",
  "Tokyo Tower": "observation_landmark",
  "Tokyo Skytree": "observation_landmark",
  "Sensō-ji": "temple",
  "Meiji Shrine": "shrine",
  "Tokyo National Museum": "museum",
  "Ghibli Museum": "museum",
  "Tsukiji fish market": "market",
  "Shibuya Crossing": "urban_landmark",
  "Ueno Park": "park",
  "National Museum of Nature and Science": "museum",
  "Kōtoku-in": "temple",
  "Tsurugaoka Hachimangū": "shrine",
  "Hakone Open-Air Museum": "museum",
  "Yokohama Chinatown": "food_district",
  "Tokyo Disneyland": "theme_park",
  "Nikkō Tōshō-gū": "shrine",
  "Kusatsu Onsen": "onsen_destination",
  "Kenroku-en": "garden",
  "Kanazawa Castle": "castle",
  "Shirakawa, Gifu (village)": "historic_village",
  "Takayama Jin'ya": "historic_site",
  "Matsumoto Castle": "castle",
  "Jigokudani Monkey Park": "wildlife_park",
  "Zenkō-ji": "temple",
  "Lake Kawaguchi": "lake",
  "Fuji-Q Highland": "theme_park",
  "Mount Fuji": "mountain",
  "Nagoya Castle": "castle",
  "Atsuta Shrine": "shrine",
  "Toyota Commemorative Museum of Industry and Technology": "museum",
  "Ise Shrine": "shrine",
  "Kiyomizu-dera": "temple",
  "Fushimi Inari-taisha": "shrine",
  "Kinkaku-ji": "temple",
  Arashiyama: "scenic_district",
  "Nijō Castle": "castle",
  Gion: "cultural_district",
  "Kyoto National Museum": "museum",
  "Nishiki Market": "market",
  "Osaka Castle": "castle",
  Dōtonbori: "food_district",
  "Universal Studios Japan": "theme_park",
  "Osaka Aquarium Kaiyukan": "aquarium",
  "Shitennō-ji": "temple",
  "Sumiyoshi-taisha": "shrine",
  "Tōdai-ji": "temple",
  "Nara Park": "wildlife_park",
  "Himeji Castle": "castle",
  "Arima Onsen": "onsen_destination",
  "Itsukushima Shrine": "shrine",
  "Hiroshima Peace Memorial": "memorial",
  "Hiroshima Peace Memorial Museum": "museum",
  "Kōraku-en": "garden",
  "Ohara Museum of Art": "museum",
  "Adachi Museum of Art": "museum",
  "Izumo-taisha": "shrine",
  "Tottori Sand Dunes": "natural_landscape",
  "Kintai Bridge": "bridge_landmark",
  "Rurikō-ji": "temple",
  "Dōgo Onsen": "onsen_destination",
  "Matsuyama Castle (Iyo)": "castle",
  "Ritsurin Garden": "garden",
  "Kōchi Castle": "castle",
  "Naruto whirlpools": "natural_landscape",
  "Iya Valley": "natural_landscape",
  "Ōtsuka Museum of Art": "museum",
  Naoshima: "art_island",
  "Dazaifu Tenmangū": "shrine",
  "Nagasaki Peace Park": "memorial",
  "Glover Garden": "garden",
  "Huis Ten Bosch (theme park)": "theme_park",
  "Kumamoto Castle": "castle",
  "Amanoiwato Shrine": "shrine",
  "Beppu Onsen": "onsen_destination",
  "Mount Aso": "mountain",
  Sakurajima: "mountain",
  Yakushima: "national_park",
  "Shuri Castle": "castle",
  "Okinawa Churaumi Aquarium": "aquarium",
  "Okinawa World": "theme_park",
  "Cape Manzamo": "natural_landscape",
  "Okinawa Prefectural Museum": "museum",
});

const NATURE_CATEGORIES = new Set([
  "art_island",
  "garden",
  "lake",
  "mountain",
  "national_park",
  "natural_landscape",
  "park",
  "scenic_district",
  "wildlife_park",
]);
const HISTORY_CATEGORIES = new Set([
  "bridge_landmark",
  "castle",
  "cultural_district",
  "historic_site",
  "historic_village",
  "memorial",
  "shrine",
  "temple",
]);
const FAMILY_CATEGORIES = new Set([
  "aquarium",
  "museum",
  "theme_park",
  "wildlife_park",
  "zoo",
]);
const RELAXED_CATEGORIES = new Set(["garden", "onsen_destination", "park"]);

const hasAny = (tags, expected) => expected.some((tag) => tags.includes(tag));

export function applicableScenarios(poi, primaryCategory) {
  const tags = poi.archetypeTags;
  const scenarios = [];
  const add = (scenarioId, condition) =>
    condition && scenarios.push(scenarioId);
  add("first-time-iconic", tags.includes("iconic"));
  add("hidden-local", hasAny(tags, ["hidden", "local"]));
  add(
    "photo-scenery",
    hasAny(tags, ["photo", "scenic", "viewpoint", "garden", "mountain"]) ||
      NATURE_CATEGORIES.has(primaryCategory),
  );
  add(
    "history-architecture",
    hasAny(tags, ["historic", "architecture", "temple", "shrine"]) ||
      HISTORY_CATEGORIES.has(primaryCategory),
  );
  add(
    "food-focused",
    hasAny(tags, ["food", "market"]) || primaryCategory === "food_district",
  );
  add("shopping-city", hasAny(tags, ["shopping", "urban"]));
  add("nature-traveler", NATURE_CATEGORIES.has(primaryCategory));
  add(
    "art-educational",
    hasAny(tags, ["art", "museum", "educational"]) ||
      ["aquarium", "zoo"].includes(primaryCategory),
  );
  add(
    "family-interactive",
    hasAny(tags, ["family", "interactive", "entertainment"]) ||
      FAMILY_CATEGORIES.has(primaryCategory),
  );
  add(
    "relaxed-rest",
    hasAny(tags, ["relaxation", "low_burden"]) ||
      RELAXED_CATEGORIES.has(primaryCategory),
  );
  add("low-walking", tags.includes("low_burden"));
  add(
    "low-crowd",
    hasAny(tags, ["hidden", "local"]) && !tags.includes("crowded"),
  );
  return scenarios;
}

export function buildTaxonomyAudit(sample) {
  if (!Array.isArray(sample?.rows) || sample.rows.length !== 100) {
    throw new Error("Taxonomy audit requires exactly 100 POIs");
  }
  const rows = sample.rows.map((poi) => {
    const primaryCategory = CATEGORY_BY_NAME[poi.canonicalName];
    if (!primaryCategory || !CATEGORY_LABELS[primaryCategory]) {
      throw new Error(
        `Missing canonical review category: ${poi.canonicalName}`,
      );
    }
    return {
      poiRef: poi.poiRef,
      canonicalName: poi.canonicalName,
      primaryCategory,
      primaryCategoryLabel: CATEGORY_LABELS[primaryCategory],
      applicableScenarios: applicableScenarios(poi, primaryCategory),
      sourceRefs: [...poi.sourceRefs],
      classificationStatus: "provisional_evidence_linked_review",
      classificationReason:
        "Explicit POI identity classification; secondary experience tags do not determine the primary category by priority order.",
    };
  });
  if (new Set(rows.map((row) => row.poiRef)).size !== 100) {
    throw new Error("Duplicate POI identity in taxonomy audit");
  }
  if (rows.some((row) => row.applicableScenarios.length === 0)) {
    throw new Error(
      "Every pilot POI needs at least one review applicability lane",
    );
  }
  return {
    taxonomyVersion: TAXONOMY_VERSION,
    status: "provisional_review_correction",
    sourceSampleVersion: sample.pilotVersion,
    categorySemantics:
      "Primary category describes what the place is. Scenario applicability describes which traveler questions it can reasonably enter.",
    rows,
  };
}

export async function generateTaxonomyAudit() {
  const sample = JSON.parse(await readFile(SAMPLE_PATH, "utf8"));
  const audit = buildTaxonomyAudit(sample);
  const formatted = await prettier.format(
    `${JSON.stringify(audit, null, 2)}\n`,
    {
      parser: "json",
    },
  );
  const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
  await writeFile(temporary, formatted, "utf8");
  await rename(temporary, OUTPUT_PATH);
  return audit;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const audit = await generateTaxonomyAudit();
  console.log(
    JSON.stringify({
      taxonomyVersion: audit.taxonomyVersion,
      rows: audit.rows.length,
      categories: new Set(audit.rows.map((row) => row.primaryCategory)).size,
    }),
  );
}
