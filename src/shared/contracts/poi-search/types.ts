import type { PoiClassification, PoiLifecycleStatus } from "../poi/types";

export type PoiSearchQueryV1 = {
  q: string | null;
  locale: string | null;
  prefecture: string | null;
  municipality: string | null;
  classification: PoiClassification | null;
  regionRef: string | null;
  limit: number;
  cursor: string | null;
};

export type PoiSearchMatchKindV1 =
  | "exact_primary"
  | "exact_alternate"
  | "prefix_primary"
  | "prefix_alternate"
  | "substring";

export type PoiSearchCardV1 = {
  poiRef: string;
  masterCode: string | null;
  displayName: { value: string; locale: string };
  match: {
    value: string;
    locale: string;
    kind: PoiSearchMatchKindV1;
  } | null;
  classification: PoiClassification;
  prefecture: string | null;
  municipality: string | null;
  point: { longitude: number; latitude: number } | null;
  lifecycleStatus: Extract<PoiLifecycleStatus, "active" | "temporarily_closed">;
  regionRefs: string[];
};

export type PoiSearchResponseV1 = {
  ok: true;
  data: { items: PoiSearchCardV1[]; nextCursor: string | null };
};

export type PoiSearchErrorCodeV1 =
  "invalid_request" | "repository_unavailable" | "canonical_validation_failed";

export type PoiSearchErrorV1 = {
  ok: false;
  error: { code: PoiSearchErrorCodeV1; message: string };
};

export type PoiSearchResultV1 = PoiSearchResponseV1 | PoiSearchErrorV1;
