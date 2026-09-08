// Explicit metadata-only acquisition. The resolver and normal validation stay offline.
import { read, json, writeJson, parseCsv, CATALOG } from "./asset-utils.mjs";
import { existsSync } from "node:fs";
const path = CATALOG + "japan-destination-open-evidence.v1.json";
const snapshot = existsSync(path)
  ? json(path)
  : {
      schemaVersion: 1,
      license: "CC0",
      source: "https://www.wikidata.org",
      searches: {},
      entities: {},
    };
const headers = {
  "User-Agent":
    "TravelAssistEntityAudit/1.0 (https://github.com/kanzakimy0/TravelAssist/issues/189)",
  Accept: "application/json",
};
async function api(params) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const url =
    "https://www.wikidata.org/w/api.php?" +
    new URLSearchParams({ format: "json", maxlag: "5", ...params });
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!r.ok) {
    writeJson(path, snapshot);
    throw Error(
      "Wikidata " +
        r.status +
        "; retry-after=" +
        r.headers.get("retry-after") +
        "; stop, do not bypass rate limits",
    );
  }
  const data = await r.json();
  if (data.error) throw Error(JSON.stringify(data.error));
  return data;
}
const seeds = parseCsv(
  read(CATALOG + "core-destination-generation-seed.v1.csv"),
);
for (let i = 0; i < seeds.length; i++) {
  await Promise.all(
    seeds.slice(i, i + 1).map(async (s) => {
      if (snapshot.searches[s.destination_id]) return;
      const data = await api({
        action: "wbsearchentities",
        search: s.destination_name_en,
        language: "en",
        uselang: "en",
        limit: "8",
      });
      snapshot.searches[s.destination_id] = {
        query: s.destination_name_en,
        candidates: data.search.map((e) => ({
          id: e.id,
          label: e.label,
          description: e.description ?? "",
          matched_text: e.match?.text ?? "",
        })),
      };
    }),
  );
  if (i % 20 === 0) {
    writeJson(path, snapshot);
    console.log(`Search ${Math.min(i + 2, 300)}/300`);
  }
}
const wanted = [
  ...new Set(
    Object.values(snapshot.searches).flatMap((s) =>
      s.candidates.map((c) => c.id),
    ),
  ),
];
snapshot.discarded_entity_ids ??= snapshot.retrieved_date
  ? wanted.filter((id) => !snapshot.entities[id])
  : [];
const review = json(CATALOG + "japan-destination-review.v1.json");
for (const [id, query] of Object.entries(review.queries)) {
  const search = snapshot.searches[id];
  if (search.supplemental_query === query) continue;
  const data = await api({
    action: "wbsearchentities",
    search: query,
    language: /[\u3400-\u9fff]/.test(query) ? "ja" : "en",
    uselang: "en",
    limit: "5",
  });
  search.supplemental_query = query;
  search.candidates = [
    ...new Map(
      [
        ...search.candidates,
        ...data.search.map((e) => ({
          id: e.id,
          label: e.label,
          description: e.description ?? "",
          matched_text: e.match?.text ?? "",
        })),
      ].map((e) => [e.id, e]),
    ).values(),
  ];
  wanted.push(...search.candidates.map((c) => c.id));
  writeJson(path, snapshot);
  console.log("Supplement " + id);
}
const keep = ["P17", "P131", "P31", "P625", "P856", "P576"];
async function load(ids) {
  const missing = ids.filter(
    (id) =>
      !snapshot.entities[id] && !snapshot.discarded_entity_ids.includes(id),
  );
  for (let i = 0; i < missing.length; i += 40) {
    const d = await api({
      action: "wbgetentities",
      ids: missing.slice(i, i + 40).join("|"),
      props: "labels|aliases|descriptions|claims",
      languages: "en|ja|zh|zh-cn|zh-hans",
    });
    for (const e of Object.values(d.entities)) {
      if (e.missing !== undefined) continue;
      snapshot.entities[e.id] = {
        id: e.id,
        revision: e.lastrevid,
        labels: e.labels,
        aliases: e.aliases,
        descriptions: e.descriptions,
        claims: Object.fromEntries(
          keep.filter((p) => e.claims?.[p]).map((p) => [p, e.claims[p]]),
        ),
      };
    }
    writeJson(path, snapshot);
    console.log(`Entities ${Object.keys(snapshot.entities).length}`);
  }
}
await load([...new Set(wanted)]);
for (let depth = 0; depth < 4; depth++) {
  const ids = [
    ...new Set(
      Object.values(snapshot.entities).flatMap((e) =>
        ["P131", "P31"].flatMap((p) =>
          (e.claims[p] ?? [])
            .map((c) => c.mainsnak?.datavalue?.value?.id)
            .filter(Boolean),
        ),
      ),
    ),
  ];
  const missing = ids.filter((id) => !snapshot.entities[id]);
  if (!missing.length) break;
  await load(missing);
}
snapshot.retrieved_date = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
}).format(new Date());
// Retain geographic candidates and their evidence chains; discard irrelevant homonyms.
const roots = new Set(
  wanted.filter((id) => {
    const e = snapshot.entities[id];
    return (
      (e?.claims?.P625 ?? []).some((c) => {
        const v = c.mainsnak?.datavalue?.value;
        return (
          v?.latitude >= 20 &&
          v.latitude <= 46 &&
          v.longitude >= 122 &&
          v.longitude <= 154
        );
      }) ||
      (e?.claims?.P17 ?? []).some(
        (c) => c.mainsnak?.datavalue?.value?.id === "Q17",
      )
    );
  }),
);
for (const choice of Object.values(review.choices)) roots.add(choice.id);
for (let depth = 0; depth < 8; depth++)
  for (const id of [...roots])
    for (const p of ["P131", "P31"])
      for (const c of snapshot.entities[id]?.claims?.[p] ?? []) {
        const q = c.mainsnak?.datavalue?.value?.id;
        if (q) roots.add(q);
      }
snapshot.entities = Object.fromEntries(
  [...roots]
    .sort()
    .filter((id) => snapshot.entities[id])
    .map((id) => {
      const e = snapshot.entities[id];
      e.claims = Object.fromEntries(
        keep
          .filter((p) => e.claims[p])
          .map((p) => [
            p,
            e.claims[p].map((c) => ({
              rank: c.rank,
              mainsnak: { datavalue: c.mainsnak?.datavalue },
              ...(c.qualifiers?.P582
                ? { qualifiers: { P582: c.qualifiers.P582 } }
                : {}),
            })),
          ]),
      );
      return [id, e];
    }),
);
writeJson(path, snapshot);
console.log(
  JSON.stringify({
    searches: Object.keys(snapshot.searches).length,
    entities: Object.keys(snapshot.entities).length,
  }),
);
