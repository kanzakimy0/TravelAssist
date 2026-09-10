// Explicit, optional metadata-only refresh. Normal manifest builds are offline.
import { parseCsv, read, writeJson, sha256, CATALOG } from "./asset-utils.mjs";

const origin = "https://www.japan.travel";
const directory = origin + "/en/destinations/";
const clean = (s) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
function links(html) {
  return [
    ...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi),
  ]
    .map((m) => ({
      url: new URL(m[1], origin + "/en/").href,
      label: clean(m[2]),
    }))
    .filter((x) => x.url.startsWith(directory) && x.label.length < 160);
}
async function page(url) {
  if (!url.startsWith(directory))
    throw Error("Only JNTO destination metadata allowed");
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`JNTO ${r.status}: ${url}`);
  return r.text();
}
const index = await page(directory);
const prefectures = [
  ...new Map(
    links(index)
      .filter(
        (x) => new URL(x.url).pathname.split("/").filter(Boolean).length === 4,
      )
      .map((x) => [x.url, x]),
  ).values(),
];
if (prefectures.length !== 47)
  throw Error(`Expected official 47 prefectures, found ${prefectures.length}`);
const allLinks = links(index);
const sources = [];
for (let i = 0; i < prefectures.length; i += 4) {
  const group = await Promise.all(
    prefectures.slice(i, i + 4).map(async (p) => {
      const html = await page(p.url);
      return {
        ...p,
        code: new URL(p.url).pathname.split("/").filter(Boolean).at(-1),
        links: links(html),
      };
    }),
  );
  sources.push(...group);
  console.log(`Read prefecture metadata ${Math.min(i + 4, 47)}/47`);
}
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const seed = parseCsv(
  read(CATALOG + "core-destination-generation-seed.v1.csv"),
);
const evidence = seed.map((s) => {
  const key = normalize(s.destination_name_en);
  const matches = [];
  for (const p of sources) {
    for (const link of [...allLinks, ...p.links]) {
      if (!link.url.startsWith(p.url)) continue;
      const slug = new URL(link.url).pathname.split("/").filter(Boolean).at(-1);
      const regionPath = new URL(p.url).pathname.split("/")[3];
      const region =
        p.code === "mie"
          ? "kansai"
          : ({
              "hokuriku-shinetsu": "chubu",
              tokai: "chubu",
              kyushu: "kyushu-okinawa",
              okinawa: "kyushu-okinawa",
            }[regionPath] ?? regionPath);
      if (region !== s.region) continue;
      const areaSlug = slug.replace(/-and-around$/, "");
      if (
        normalize(slug) === key ||
        normalize(areaSlug) === key ||
        normalize(link.label) === key
      )
        matches.push({
          prefecture_code: p.code,
          official_url: link.url,
          official_label: link.label || slug,
        });
    }
  }
  return {
    destination_id: s.destination_id,
    name_en: s.destination_name_en,
    candidates: [
      ...new Map(matches.map((m) => [m.official_url, m])).values(),
    ].sort((a, b) => a.official_url.localeCompare(b.official_url)),
  };
});
writeJson(CATALOG + "core-destination-evidence.v1.json", {
  schemaVersion: 1,
  source: directory,
  retrieved_date: new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(new Date()),
  source_kind: "official_tourism_directory_metadata",
  rights_note:
    "Place names and source URLs only. No images, article text, coordinates, or image reuse rights acquired.",
  seed_sha256: sha256(
    read(CATALOG + "core-destination-generation-seed.v1.csv").replaceAll(
      "\r\n",
      "\n",
    ),
  ),
  prefectures: sources.map(({ code, label, url }) => ({
    code,
    name_en: label,
    official_url: url,
  })),
  destinations: evidence,
});
console.log(
  JSON.stringify({
    destinations: evidence.length,
    matched: evidence.filter((d) => d.candidates.length).length,
    prefectures: new Set(
      evidence.flatMap((d) => d.candidates.map((c) => c.prefecture_code)),
    ).size,
  }),
);
