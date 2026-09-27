import "server-only";

import { createHash } from "node:crypto";
import { normalizePoiSearchText } from "../../shared/contracts/poi-search/query";
import type {
  PoiSearchCardV1,
  PoiSearchMatchKindV1,
  PoiSearchQueryV1,
  PoiSearchResultV1,
} from "../../shared/contracts/poi-search/types";
import { parseCanonicalPoiV1 } from "../../shared/contracts/poi/validation";
import type { CanonicalPoiV1 } from "../../shared/contracts/poi/types";
import type { CanonicalPoiSearchRepository } from "./repository";

type SortKey = { rank: number; primary: string; poiRef: string };
type CursorPayload = {
  version: 1;
  queryHash: string;
  datasetRevision: string;
  after: SortKey;
};
type Match = {
  rank: number;
  value: string;
  locale: string;
  kind: PoiSearchMatchKindV1;
};
type Ranked = { poi: CanonicalPoiV1; match: Match | null; key: SortKey };

const visible = new Set(["active", "temporarily_closed"]);
const error = (
  code:
    | "invalid_request"
    | "repository_unavailable"
    | "canonical_validation_failed",
  message: string,
): PoiSearchResultV1 => ({ ok: false, error: { code, message } });
const compareText = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;
const compareKeys = (left: SortKey, right: SortKey) =>
  left.rank - right.rank ||
  compareText(left.primary, right.primary) ||
  compareText(left.poiRef, right.poiRef);

function fingerprint(query: PoiSearchQueryV1): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        query.q ? normalizePoiSearchText(query.q) : null,
        query.locale,
        query.prefecture,
        query.municipality,
        query.classification,
        query.regionRef,
        query.limit,
      ]),
    )
    .digest("hex");
}

function primaryName(poi: CanonicalPoiV1) {
  const kindOrder = { official: 0, common: 1, translated: 2 };
  return poi.names.localized
    .filter((name) => name.locale === poi.names.primaryLocale)
    .sort(
      (a, b) =>
        kindOrder[a.kind] - kindOrder[b.kind] ||
        compareText(
          normalizePoiSearchText(a.value),
          normalizePoiSearchText(b.value),
        ) ||
        compareText(a.value, b.value),
    )[0]!;
}

function matchName(poi: CanonicalPoiV1, normalizedQuery: string): Match | null {
  if (!normalizedQuery) return null;
  const primary = primaryName(poi);
  const alternatives = [
    ...poi.names.localized.filter((name) => name !== primary),
    ...poi.names.aliases,
  ].sort(
    (a, b) =>
      compareText(
        normalizePoiSearchText(a.value),
        normalizePoiSearchText(b.value),
      ) ||
      compareText(a.locale, b.locale) ||
      compareText(a.value, b.value),
  );
  const names = [primary, ...alternatives];
  let best: Match | null = null;
  for (const [index, name] of names.entries()) {
    const value = normalizePoiSearchText(name.value);
    if (!value) continue;
    let rank: number;
    let kind: PoiSearchMatchKindV1;
    if (value === normalizedQuery) {
      rank = index === 0 ? 0 : 1;
      kind = index === 0 ? "exact_primary" : "exact_alternate";
    } else if (value.startsWith(normalizedQuery)) {
      rank = index === 0 ? 2 : 3;
      kind = index === 0 ? "prefix_primary" : "prefix_alternate";
    } else if (value.includes(normalizedQuery)) {
      rank = 4;
      kind = "substring";
    } else continue;
    if (best === null || rank < best.rank)
      best = { rank, value: name.value, locale: name.locale, kind };
  }
  return best;
}

function displayName(poi: CanonicalPoiV1, locale: string | null) {
  if (locale) {
    const exact = poi.names.localized.find((name) => name.locale === locale);
    if (exact) return exact;
    const language = locale.split("-")[0];
    const languageMatch = poi.names.localized.find(
      (name) => name.locale.split("-")[0] === language,
    );
    if (languageMatch) return languageMatch;
  }
  return primaryName(poi);
}

function card(row: Ranked, locale: string | null): PoiSearchCardV1 {
  const { poi, match } = row;
  const display = displayName(poi, locale);
  return {
    poiRef: poi.internalId,
    masterCode: poi.masterCode,
    displayName: { value: display.value, locale: display.locale },
    match: match
      ? { value: match.value, locale: match.locale, kind: match.kind }
      : null,
    classification: poi.classification.primary,
    prefecture: poi.location.address?.prefecture ?? null,
    municipality: poi.location.address?.municipality ?? null,
    point: poi.location.point
      ? {
          longitude: poi.location.point.longitude,
          latitude: poi.location.point.latitude,
        }
      : null,
    lifecycleStatus: poi.lifecycle.status as PoiSearchCardV1["lifecycleStatus"],
    regionRefs: poi.regionRelations.map((relation) => relation.regionRef),
  };
}

function validRevision(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 120 &&
    !/[\p{Cc}\p{Cf}]/u.test(value)
  );
}

function decodeCursor(value: string): CursorPayload | null {
  try {
    if (!/^[A-Za-z0-9_-]{1,2048}$/.test(value)) return null;
    const bytes = Buffer.from(value, "base64url");
    if (bytes.toString("base64url") !== value) return null;
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return null;
    const payload = parsed as Record<string, unknown>;
    if (
      Object.keys(payload).sort().join(",") !==
        "after,datasetRevision,queryHash,version" ||
      payload.version !== 1 ||
      typeof payload.queryHash !== "string" ||
      !/^[0-9a-f]{64}$/.test(payload.queryHash) ||
      !validRevision(payload.datasetRevision) ||
      payload.after === null ||
      typeof payload.after !== "object" ||
      Array.isArray(payload.after)
    )
      return null;
    const after = payload.after as Record<string, unknown>;
    if (
      Object.keys(after).sort().join(",") !== "poiRef,primary,rank" ||
      !Number.isInteger(after.rank) ||
      (after.rank as number) < 0 ||
      (after.rank as number) > 5 ||
      typeof after.primary !== "string" ||
      after.primary.length > 300 ||
      typeof after.poiRef !== "string" ||
      !/^poi:[a-z0-9][a-z0-9._-]{2,127}$/.test(after.poiRef)
    )
      return null;
    return payload as CursorPayload;
  } catch {
    return null;
  }
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export async function searchCanonicalPois(
  query: PoiSearchQueryV1,
  repository: CanonicalPoiSearchRepository | null,
): Promise<PoiSearchResultV1> {
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && (!cursor || cursor.queryHash !== fingerprint(query)))
    return error("invalid_request", "The search cursor is invalid.");
  if (!repository)
    return error(
      "repository_unavailable",
      "Canonical POI search is not configured.",
    );
  let found: Awaited<
    ReturnType<CanonicalPoiSearchRepository["findCandidates"]>
  >;
  try {
    found = await repository.findCandidates(query);
  } catch {
    return error(
      "repository_unavailable",
      "Canonical POI search is unavailable.",
    );
  }
  if (
    !found ||
    !validRevision(found.datasetRevision) ||
    !Array.isArray(found.records) ||
    found.records.length > 100_000
  )
    return error(
      "canonical_validation_failed",
      "Canonical POI search data is invalid.",
    );
  if (cursor && cursor.datasetRevision !== found.datasetRevision)
    return error("invalid_request", "The search cursor is stale.");
  const normalizedQuery = query.q ? normalizePoiSearchText(query.q) : "";
  const ranked: Ranked[] = [];
  const seen = new Set<string>();
  for (const raw of found.records) {
    const parsed = parseCanonicalPoiV1(raw);
    if (!parsed.ok)
      return error(
        "canonical_validation_failed",
        "Canonical POI search data is invalid.",
      );
    const poi = parsed.value;
    if (seen.has(poi.internalId))
      return error(
        "canonical_validation_failed",
        "Canonical POI search data is invalid.",
      );
    seen.add(poi.internalId);
    if (
      !visible.has(poi.lifecycle.status) ||
      poi.location.supportStatus !== "japan_supported"
    )
      continue;
    if (
      query.prefecture &&
      poi.location.address?.prefecture !== query.prefecture
    )
      continue;
    if (
      query.municipality &&
      poi.location.address?.municipality !== query.municipality
    )
      continue;
    if (
      query.classification &&
      poi.classification.primary !== query.classification
    )
      continue;
    if (
      query.regionRef &&
      !poi.regionRelations.some(
        (relation) => relation.regionRef === query.regionRef,
      )
    )
      continue;
    const match = matchName(poi, normalizedQuery);
    if (normalizedQuery && !match) continue;
    ranked.push({
      poi,
      match,
      key: {
        rank: match?.rank ?? 5,
        primary: normalizePoiSearchText(primaryName(poi).value),
        poiRef: poi.internalId,
      },
    });
  }
  ranked.sort((a, b) => compareKeys(a.key, b.key));
  const remaining = cursor
    ? ranked.filter((row) => compareKeys(row.key, cursor.after) > 0)
    : ranked;
  const selected = remaining.slice(0, query.limit);
  const last = selected.at(-1);
  const nextCursor =
    remaining.length > selected.length && last
      ? encodeCursor({
          version: 1,
          queryHash: fingerprint(query),
          datasetRevision: found.datasetRevision,
          after: last.key,
        })
      : null;
  if (nextCursor && nextCursor.length > 2048)
    return error(
      "canonical_validation_failed",
      "Canonical POI search data is invalid.",
    );
  return {
    ok: true,
    data: { items: selected.map((row) => card(row, query.locale)), nextCursor },
  };
}
