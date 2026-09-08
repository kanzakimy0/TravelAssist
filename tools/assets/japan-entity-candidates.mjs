import { json, read, parseCsv, CATALOG, isMain } from "./asset-utils.mjs";

export const normalizeName = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[- ](?:shi|cho|machi|mura)$/, "")
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, "");
export const values = (e, p) => {
  const current = (e?.claims?.[p] ?? []).filter(
    (c) => c.rank !== "deprecated" && !c.qualifiers?.P582,
  );
  const selected = current.some((c) => c.rank === "preferred")
    ? current.filter((c) => c.rank === "preferred")
    : current;
  return selected
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter((v) => v !== undefined);
};
export const label = (e, lang) => e?.labels?.[lang]?.value ?? "";
const prefectureCache = new WeakMap();
export function prefectureMap(entities, official) {
  if (prefectureCache.has(entities)) return prefectureCache.get(entities);
  const map = new Map();
  for (const e of Object.values(entities)) {
    if (
      values(e, "P576").length ||
      !values(e, "P31").some(
        (v) => label(entities[v.id], "en") === "prefecture of Japan",
      )
    )
      continue;
    const text = label(e, "en");
    const p = official.prefectures.find(
      (p) =>
        normalizeName(p.name_en) ===
        normalizeName(text.replace(/ Prefecture$/, "")),
    );
    const ja = label(e, "ja");
    if (p && (/ Prefecture$/.test(text) || /都$|道$|府$|県$/.test(ja)))
      map.set(e.id, p.code);
  }
  prefectureCache.set(entities, map);
  return map;
}
export function tracePrefectures(e, entities, prefs) {
  const queue = [{ id: e.id, path: [e.id] }],
    found = [],
    seen = new Set();
  while (queue.length) {
    const item = queue.shift();
    if (seen.has(item.id) || item.path.length > 8) continue;
    seen.add(item.id);
    if (prefs.has(item.id)) {
      found.push({
        code: prefs.get(item.id),
        entity_id: item.id,
        path: item.path,
      });
      continue;
    }
    const kind = values(entities[item.id], "P31")
      .map((v) => label(entities[v.id], "en"))
      .join("; ");
    if (
      item.path.length > 1 &&
      (/region of Japan|province of Japan|former|dissolved/.test(kind) ||
        values(entities[item.id], "P576").length)
    )
      continue;
    for (const v of values(entities[item.id], "P131"))
      if (v.id) queue.push({ id: v.id, path: [...item.path, v.id] });
  }
  return found;
}
export function entityType(e, entities) {
  const types = values(e, "P31")
    .map((v) => label(entities[v.id], "en"))
    .filter(Boolean);
  const desc = e.descriptions?.en?.value ?? "";
  const source = (types.join("; ") + "; " + desc).toLowerCase();
  if (
    values(e, "P576").length ||
    /dissolved municipality|former municipality|former city|former town|government agency/.test(
      source,
    )
  )
    return "other_review_required";
  if (/onsen|hot spring|温泉/.test(source + "; " + label(e, "ja")))
    return "hot_spring_area";
  if (/ski resort|resort area|ski area/.test(source)) return "resort_area";
  if (types.some((t) => t === "town of Japan")) return "town";
  if (types.some((t) => t === "village of Japan")) return "village";
  if (/island group|archipelago/.test(types.join("; "))) return "region";
  if (types.some((t) => /island/.test(t)) || /^island (in|of)/.test(desc))
    return "island";
  if (/prefecture|metropolis/.test(types.join("; ").toLowerCase()))
    return "region";
  if (
    /市$/.test(label(e, "ja")) &&
    (types.some((t) =>
      /city|core cities|designated cities/.test(t.toLowerCase()),
    ) ||
      /^city |^capital city |^designated city |^core city /.test(desc))
  )
    return "city";
  if (
    /historic district|post station|post town|historic village|temple complex and settlement/.test(
      source,
    )
  )
    return "historic_district";
  if (types.some((t) => /town/.test(t.toLowerCase())) || /^town /.test(desc))
    return "town";
  if (
    types.some((t) => /village/.test(t.toLowerCase())) ||
    /^village /.test(desc)
  )
    return "village";
  if (types.some((t) => /ward/.test(t.toLowerCase()))) return "ward";
  if (
    /historic district|post station|post town|historic village|temple complex and settlement/.test(
      source,
    )
  )
    return "historic_district";
  if (
    /national park|lake|valley|peninsula|river|plateau|region of japan|scenic view|sandbar/.test(
      source,
    )
  )
    return "region";
  if (/sightseeing route|tourist route/.test(source))
    return "destination_cluster";
  return "other_review_required";
}
export function seedRegion(code, official) {
  const p = official.prefectures.find((p) => p.code === code);
  if (!p) return "";
  const r = new URL(p.official_url).pathname.split("/")[3];
  return code === "mie"
    ? "kansai"
    : ({
        "hokuriku-shinetsu": "chubu",
        tokai: "chubu",
        kyushu: "kyushu-okinawa",
        okinawa: "kyushu-okinawa",
      }[r] ?? r);
}
export function assessCandidates(seed, snapshot, official) {
  const prefs = prefectureMap(snapshot.entities, official);
  const known =
    official.destinations.find((d) => d.destination_id === seed.destination_id)
      ?.candidates ?? [];
  const knownPrefs = [...new Set(known.map((x) => x.prefecture_code))];
  return (snapshot.searches[seed.destination_id]?.candidates ?? [])
    .filter((c) => snapshot.entities[c.id])
    .map((c) => {
      const e = snapshot.entities[c.id],
        type = entityType(e, snapshot.entities),
        p = tracePrefectures(e, snapshot.entities, prefs);
      const coords = values(e, "P625").filter(
        (v) =>
          v.globe?.endsWith("/Q2") &&
          v.latitude >= 20 &&
          v.latitude <= 46 &&
          v.longitude >= 122 &&
          v.longitude <= 154,
      );
      const names = [
        label(e, "en"),
        ...(e.aliases?.en ?? []).map((a) => a.value),
        c.matched_text,
      ];
      const exact = names.some(
        (n) => normalizeName(n) === normalizeName(seed.destination_name_en),
      );
      const reasons = [];
      if (type === "other_review_required")
        reasons.push("type_or_historical_entity");
      if (!coords.length) reasons.push("missing_Japan_coordinate");
      if (!p.length) reasons.push("missing_prefecture_chain");
      if (p.some((x) => seedRegion(x.code, official) !== seed.region))
        reasons.push("seed_region_mismatch");
      if (
        knownPrefs.length === 1 &&
        p.length &&
        !p.some((x) => knownPrefs.includes(x.code))
      )
        reasons.push("JNTO_prefecture_mismatch");
      const countries = values(e, "P17").map((v) => v.id);
      if (countries.length && !countries.includes("Q17"))
        reasons.push("not_Japan");
      if (!exact) reasons.push("name_alias_not_exact");
      return {
        id: e.id,
        name: label(e, "en"),
        ja: label(e, "ja"),
        zh: label(e, "zh-cn") || label(e, "zh-hans") || label(e, "zh"),
        description: e.descriptions?.en?.value ?? "",
        type,
        classes: values(e, "P31").map((v) => ({
          id: v.id,
          name: label(snapshot.entities[v.id], "en"),
        })),
        prefectures: p,
        coordinates: coords,
        exact,
        reasons,
        score:
          (exact ? 10 : 0) +
          (type === "city" ? 3 : type !== "other_review_required" ? 2 : 0) +
          (knownPrefs.length === 1 && p.some((x) => knownPrefs.includes(x.code))
            ? 2
            : 0),
      };
    })
    .sort(
      (a, b) =>
        a.reasons.length - b.reasons.length ||
        b.score - a.score ||
        a.id.localeCompare(b.id),
    );
}
if (isMain(import.meta.url)) {
  const s = json(CATALOG + "japan-destination-open-evidence.v1.json"),
    o = json(CATALOG + "core-destination-evidence.v1.json");
  const rows = parseCsv(
    read(CATALOG + "core-destination-generation-seed.v1.csv"),
  );
  for (const r of rows) {
    const choices = assessCandidates(r, s, o);
    const c = choices[0];
    console.log(
      r.destination_id +
        " | " +
        (c
          ? `${c.id} ${c.name} / ${c.ja} / ${c.zh} | ${c.type} | ${c.prefectures.map((p) => p.code)} | ${c.reasons.join(",")} | other=${choices.filter((x) => !x.reasons.length).length}`
          : "NO CANDIDATE"),
    );
  }
}
