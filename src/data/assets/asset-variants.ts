import sourceCatalog from "../../../docs/assets/catalog/asset-source-catalog.v1.json" with { type: "json" };
import variantCatalog from "../../../docs/assets/catalog/asset-variants.v1.json" with { type: "json" };
import usageCatalog from "../../../docs/assets/catalog/asset-usage-map.v1.json" with { type: "json" };
import { getAssetById, isRuntimeUsable } from "./asset-registry";
import { resolveAssetFallback } from "./asset-fallback";
import type { Asset } from "./asset-types";
export type VariantStatus =
  | "exact"
  | "alias"
  | "degraded"
  | "fallback"
  | "review_required"
  | "unavailable";
export type AssetContext =
  | "hero-desktop"
  | "hero-mobile"
  | "background-desktop"
  | "background-mobile"
  | "region-tile"
  | "card-landscape"
  | "card-wide"
  | "card-square"
  | "map-popup"
  | "map-pin-thumb"
  | "timeline-thumb"
  | "search-thumb"
  | "share-og";
export interface AssetSource {
  sourceId: string;
  assetId: string;
  path: string;
  scope: string;
  mediaType: string;
  width: number | null;
  height: number | null;
  bytes: number;
  sha256: string;
  assetRole: string | null;
  processingEligibility: boolean;
  processingBlockReason: string | null;
}
export interface AssetVariant {
  variantId: string;
  assetId: string;
  sourceId: string;
  profileId: string;
  kind:
    "physical" | "alias" | "vector-token" | "source-provided" | "unavailable";
  path: string | null;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number;
  sha256: string | null;
  sourceSha256: string;
  runtimeUsable: boolean;
  status: VariantStatus;
  errorCode: string | null;
  aliasOf: string | null;
  aliasReason: string | null;
  degraded: boolean;
}
export interface AssetUsage {
  assetId: string | null;
  sourcePath: string;
  sourceFile: string;
  line: number;
  referenceType: string;
  resolved: boolean;
}
export interface VariantResolution {
  assetId: string;
  profileId: string;
  src: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  status: VariantStatus;
  degraded: boolean;
  variant: AssetVariant | null;
}
export interface VariantLookup {
  sources: readonly AssetSource[];
  variants: readonly AssetVariant[];
  usages: readonly AssetUsage[];
  asset: (id: string) => Asset | undefined;
  fallback: (id: string) => {
    path: string;
    assetId: string;
    alt: string;
    width: number | null;
    height: number | null;
  } | null;
}
const toUrl = (path: string | null) =>
  path?.startsWith("public/media/") && !path.includes("..")
    ? path.slice(6)
    : null;
export function createVariantRegistry(lookup: VariantLookup) {
  function permitted(v: AssetVariant) {
    const a = lookup.asset(v.assetId),
      source = lookup.sources.find((s) => s.sourceId === v.sourceId);
    return !!(
      a &&
      a.runtime.kind === "local" &&
      isRuntimeUsable(a) &&
      source &&
      source.assetId === a.id &&
      source.sha256 === a.integrity.sha256 &&
      v.sourceSha256 === source.sha256 &&
      v.runtimeUsable &&
      v.status !== "review_required" &&
      v.kind !== "unavailable" &&
      toUrl(v.path)
    );
  }
  function resolveVariant(
    v: AssetVariant | undefined,
  ): AssetVariant | undefined {
    if (!v || !permitted(v)) return undefined;
    const seen = new Set<string>();
    let target = v;
    while (target.kind === "alias") {
      if (seen.has(target.variantId)) return undefined;
      seen.add(target.variantId);
      const next = lookup.variants.find(
        (item) => item.variantId === target.aliasOf,
      );
      if (!next || !permitted(next)) return undefined;
      target = next;
    }
    if (
      target.kind !== "physical" &&
      target.kind !== "vector-token" &&
      target.kind !== "source-provided"
    )
      return undefined;
    if (
      target.path !== v.path ||
      target.sha256 !== v.sha256 ||
      target.width !== v.width ||
      target.height !== v.height
    )
      return undefined;
    return v;
  }
  function result(
    v: AssetVariant,
    profileId: string,
    status: VariantStatus,
  ): VariantResolution {
    const a = lookup.asset(v.assetId);
    return {
      assetId: v.assetId,
      profileId,
      src: toUrl(v.path),
      width: v.width,
      height: v.height,
      alt: a?.presentation.decorative
        ? ""
        : (a?.presentation.alt ?? "Image unavailable"),
      status,
      degraded: !["exact", "alias"].includes(status),
      variant: structuredClone(v),
    };
  }
  function getAssetVariant(
    assetId: string,
    profileId: string,
  ): VariantResolution {
    const requested = lookup.variants.find(
      (v) => v.assetId === assetId && v.profileId === profileId,
    );
    const exact = resolveVariant(requested);
    if (exact)
      return result(
        exact,
        profileId,
        exact.degraded
          ? "degraded"
          : exact.kind === "alias"
            ? "alias"
            : "exact",
      );
    const generic = lookup.variants
      .filter(
        (v) =>
          v.assetId === assetId && ["sm", "md", "lg"].includes(v.profileId),
      )
      .map(resolveVariant)
      .filter((v): v is AssetVariant => !!v)
      .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    if (generic)
      return result(
        generic,
        profileId,
        requested?.status === "review_required"
          ? "review_required"
          : "degraded",
      );
    const fallback = lookup.fallback(assetId);
    return {
      assetId: fallback?.assetId ?? assetId,
      profileId,
      src: fallback?.path ?? null,
      width: fallback?.width ?? null,
      height: fallback?.height ?? null,
      alt: fallback?.alt ?? "Image unavailable",
      status:
        requested?.status === "review_required"
          ? "review_required"
          : fallback
            ? "fallback"
            : "unavailable",
      degraded: true,
      variant: null,
    };
  }
  function getResponsiveImageProps(assetId: string, context: AssetContext) {
    const selected = getAssetVariant(assetId, context),
      fallback = lookup.fallback(assetId);
    const candidates = lookup.variants
      .filter(
        (v) =>
          v.assetId === assetId &&
          ["sm", "md", "lg", context].includes(v.profileId),
      )
      .map(resolveVariant)
      .filter(
        (v): v is AssetVariant =>
          !!v && v.kind !== "vector-token" && !!v.width && !!v.height,
      );
    const widths = new Map<number, string>();
    // Only equal aspect ratios can share a srcSet. A landscape crop must not select a square generic file.
    const ratio =
      selected.width && selected.height
        ? selected.width / selected.height
        : null;
    for (const v of candidates)
      if (
        v.width &&
        v.height &&
        ratio &&
        Math.abs(v.width / v.height - ratio) < 0.015
      )
        widths.set(v.width, toUrl(v.path)!);
    return {
      src: selected.src,
      srcSet: [...widths]
        .sort((a, b) => a[0] - b[0])
        .map(([w, path]) => `${path} ${w}w`)
        .join(", "),
      sizes:
        context.includes("hero") || context.includes("background")
          ? "100vw"
          : context === "map-pin-thumb"
            ? "128px"
            : "(max-width: 640px) 100vw, 50vw",
      width: selected.width,
      height: selected.height,
      alt: selected.alt,
      fallbackSrc: fallback?.path ?? null,
      status: selected.status,
    };
  }
  return {
    getAssetSource: (id: string) =>
      structuredClone(lookup.sources.find((s) => s.assetId === id)),
    getAssetVariant,
    getResponsiveAsset: (id: string, context: AssetContext) =>
      getAssetVariant(id, context),
    getResponsiveImageProps,
    getVectorDisplaySize: (id: string, sizeToken: string) => {
      const v = resolveVariant(
        lookup.variants.find(
          (v) =>
            v.assetId === id &&
            v.profileId === sizeToken &&
            v.kind === "vector-token",
        ),
      );
      return v
        ? { width: v.width!, height: v.height!, src: toUrl(v.path)! }
        : null;
    },
    listMissingVariants: () =>
      structuredClone(
        lookup.variants.filter(
          (v) =>
            v.kind === "unavailable" ||
            v.status === "review_required" ||
            v.degraded,
        ),
      ),
    listAssetUsages: (id: string) =>
      structuredClone(lookup.usages.filter((u) => u.assetId === id)),
  };
}
const registry = createVariantRegistry({
  sources: sourceCatalog.sources,
  variants: variantCatalog.variants as AssetVariant[],
  usages: usageCatalog.references,
  asset: getAssetById,
  fallback: (id) => {
    const requested = getAssetById(id),
      resolved = resolveAssetFallback({
        assetId: id,
        destinationId: requested?.entity.id,
        category: requested?.entity.type,
      });
    if (resolved.kind !== "local") return null;
    const a = getAssetById(resolved.assetId);
    return {
      path: resolved.path,
      assetId: resolved.assetId,
      alt: resolved.alt,
      width: a?.presentation.width ?? null,
      height: a?.presentation.height ?? null,
    };
  },
});
export const {
  getAssetSource,
  getAssetVariant,
  getResponsiveAsset,
  getResponsiveImageProps,
  getVectorDisplaySize,
  listMissingVariants,
  listAssetUsages,
} = registry;
