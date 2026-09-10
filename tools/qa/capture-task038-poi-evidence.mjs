import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TASK038_SOURCE_POIS } from "./task038-source-pois.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUTPUT = path.join(ROOT, "docs/qa/TASK-038/poi-sample-100.json");
const PILOT_VERSION = "task-038-v1";

const normalizeTitle = (value) => value.replaceAll("_", " ");

async function resolveBatch(rows) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "pageprops|coordinates",
    redirects: "1",
    titles: rows.map(([title]) => title).join("|"),
  });

  const response = await fetch(url, {
    headers: {
      "user-agent": "TravelAssist-TASK-038-evidence-capture/1.0",
    },
  });
  if (!response.ok)
    throw new Error(`Wikimedia source query failed: ${response.status}`);
  const payload = await response.json();
  const aliases = new Map(rows.map(([title]) => [title, title]));
  for (const item of payload.query.normalized ?? [])
    aliases.set(item.from, item.to);
  for (const item of payload.query.redirects ?? []) {
    for (const [source, target] of aliases) {
      if (target === item.from) aliases.set(source, item.to);
    }
  }
  const pages = new Map(
    Object.values(payload.query.pages).map((page) => [
      normalizeTitle(page.title),
      page,
    ]),
  );

  return rows.map((row) => {
    const page = pages.get(normalizeTitle(aliases.get(row[0]) ?? row[0]));
    if (!page || "missing" in page || !page.pageprops?.wikibase_item) {
      throw new Error(`Unresolved public evidence entity: ${row[0]}`);
    }
    return { row, page };
  });
}

const resolved = [];
for (let offset = 0; offset < TASK038_SOURCE_POIS.length; offset += 50) {
  resolved.push(
    ...(await resolveBatch(TASK038_SOURCE_POIS.slice(offset, offset + 50))),
  );
}

const stableOrder = [...resolved].sort((a, b) =>
  createHash("sha256")
    .update(`${PILOT_VERSION}:${a.page.pageprops.wikibase_item}`)
    .digest("hex")
    .localeCompare(
      createHash("sha256")
        .update(`${PILOT_VERSION}:${b.page.pageprops.wikibase_item}`)
        .digest("hex"),
    ),
);
const holdoutIds = new Set(
  stableOrder.slice(0, 20).map(({ page }) => page.pageprops.wikibase_item),
);

const sample = resolved.map(({ row, page }, index) => {
  const [requestedTitle, prefecture, region, archetypeTags] = row;
  const qid = page.pageprops.wikibase_item;
  const canonicalName = page.title;
  const coordinate = page.coordinates?.[0]
    ? {
        latitude: page.coordinates[0].lat,
        longitude: page.coordinates[0].lon,
        evidenceStatus: "open_knowledge_page_coordinate",
      }
    : null;
  return {
    sampleIndex: index + 1,
    poiRef: `wikidata:${qid}`,
    canonicalName,
    requestedTitle,
    countryCode: "JP",
    prefecture,
    region,
    archetypeTags,
    coordinate,
    sourceRefs: [
      `https://www.wikidata.org/wiki/${qid}`,
      `https://en.wikipedia.org/wiki/${encodeURIComponent(canonicalName.replaceAll(" ", "_"))}`,
    ],
    evidenceRefs: [`wikidata:${qid}`, `enwiki:${page.pageid}`],
    evidenceTier: "traceable_open_knowledge_entity",
    sampleSelectionReason: "stratified_geography_and_experience_archetype",
    splitAssignment: holdoutIds.has(qid) ? "holdout" : "calibration",
  };
});

if (new Set(sample.map((row) => row.poiRef)).size !== 100) {
  throw new Error("POI evidence capture produced duplicate identities");
}

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify({ pilotVersion: PILOT_VERSION, sourcePolicy: "CC0 Wikidata identity plus linked English Wikipedia page; no descriptions or media copied", rows: sample }, null, 2)}\n`,
);
console.log(`Captured ${sample.length} verified public entities to ${OUTPUT}`);
