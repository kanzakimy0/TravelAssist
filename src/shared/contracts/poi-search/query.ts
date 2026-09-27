import { POI_CLASSIFICATIONS } from "../poi/types";
import type { PoiSearchQueryV1 } from "./types";

const PARAMETERS = new Set([
  "q",
  "locale",
  "prefecture",
  "municipality",
  "classification",
  "regionRef",
  "limit",
  "cursor",
]);
const CONTROL = /[\p{Cc}\p{Cf}]/u;
const LOCALE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const REGION_REF = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
const CURSOR = /^[A-Za-z0-9_-]+$/;

export type PoiSearchQueryParseResult =
  { ok: true; value: PoiSearchQueryV1 } | { ok: false; reason: string };

export function normalizePoiSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
}

function bounded(
  value: string | null,
  maximum: number,
  key: string,
): PoiSearchQueryParseResult | string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (
    Array.from(trimmed).length > maximum ||
    CONTROL.test(value) ||
    (trimmed.length > 0 && normalizePoiSearchText(trimmed).length === 0)
  )
    return { ok: false, reason: `invalid_${key}` };
  return trimmed;
}

export function parsePoiSearchQuery(
  params: URLSearchParams,
): PoiSearchQueryParseResult {
  for (const key of params.keys()) {
    if (!PARAMETERS.has(key)) return { ok: false, reason: "unknown_parameter" };
    if (params.getAll(key).length !== 1)
      return { ok: false, reason: "duplicate_parameter" };
  }
  const q = bounded(params.get("q"), 120, "q");
  const locale = bounded(params.get("locale"), 35, "locale");
  const prefecture = bounded(params.get("prefecture"), 80, "prefecture");
  const municipality = bounded(params.get("municipality"), 120, "municipality");
  const classification = bounded(
    params.get("classification"),
    40,
    "classification",
  );
  const regionRef = bounded(params.get("regionRef"), 180, "regionRef");
  const cursor = bounded(params.get("cursor"), 2048, "cursor");
  for (const value of [
    q,
    locale,
    prefecture,
    municipality,
    classification,
    regionRef,
    cursor,
  ])
    if (typeof value === "object" && value !== null && !value.ok) return value;
  const text = q as string | null;
  const lang = locale as string | null;
  const pref = prefecture as string | null;
  const city = municipality as string | null;
  const category = classification as string | null;
  const region = regionRef as string | null;
  const page = cursor as string | null;
  if (lang !== null && !LOCALE.test(lang))
    return { ok: false, reason: "invalid_locale" };
  if (
    category !== null &&
    !POI_CLASSIFICATIONS.includes(
      category as (typeof POI_CLASSIFICATIONS)[number],
    )
  )
    return { ok: false, reason: "invalid_classification" };
  if (region !== null && !REGION_REF.test(region))
    return { ok: false, reason: "invalid_regionRef" };
  if (page !== null && (page.length === 0 || !CURSOR.test(page)))
    return { ok: false, reason: "invalid_cursor" };
  for (const [key, value] of [
    ["prefecture", pref],
    ["municipality", city],
    ["classification", category],
    ["regionRef", region],
  ] as const)
    if (value !== null && value.length === 0)
      return { ok: false, reason: `invalid_${key}` };
  const rawLimit = params.get("limit");
  if (rawLimit !== null && !/^(?:[1-9]|[1-4][0-9]|50)$/.test(rawLimit))
    return { ok: false, reason: "invalid_limit" };
  if (!text && !pref && !city && !category && !region)
    return { ok: false, reason: "unconstrained_query" };
  return {
    ok: true,
    value: {
      q: text || null,
      locale: lang || null,
      prefecture: pref,
      municipality: city,
      classification: category as PoiSearchQueryV1["classification"],
      regionRef: region,
      limit: rawLimit === null ? 20 : Number(rawLimit),
      cursor: page,
    },
  };
}
