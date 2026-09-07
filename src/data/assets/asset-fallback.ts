import {
  getAssetById,
  getDestinationPack,
  isRuntimeUsable,
} from "./asset-registry";
import type { Asset, DestinationPack } from "./asset-types";

export interface FallbackRequest {
  assetId?: string;
  destinationId?: string;
  category?: string;
  decorative?: boolean;
  now?: number;
}
export interface AssetLookup {
  getAssetById: (id: string) => Asset | undefined;
  getDestinationPack: (id: string) => DestinationPack | undefined;
}
export type ResolvedAsset = {
  assetId: string;
  alt: string;
  decorative: boolean;
  degraded: boolean;
} & (
  | { kind: "local"; path: string }
  | { kind: "provider_reference"; provider: string; sourceId: string }
  | { kind: "none" }
);
const globalCategories: Readonly<Record<string, string>> = {
  hotel: "hotel",
  restaurant: "restaurant",
  dining: "restaurant",
  activity: "activity",
  transport: "transport",
  city: "city",
  region: "region",
  attraction: "attraction",
  landmark: "attraction",
  museum: "attraction",
  temple: "attraction",
  shrine: "attraction",
  park: "attraction",
};
const placeholderId = (name: string) =>
  `shared.global.placeholders.${name}.default.001`;
const defaultLookup = { getAssetById, getDestinationPack };
export function resolveAssetFallback(
  request: FallbackRequest,
  lookup: AssetLookup = defaultLookup,
): ResolvedAsset {
  const pack = request.destinationId
    ? lookup.getDestinationPack(request.destinationId)
    : undefined;
  const category =
    request.category && Object.hasOwn(globalCategories, request.category)
      ? globalCategories[request.category]
      : undefined;
  const candidates = [
    request.assetId,
    request.category ? pack?.fallbacks.categories[request.category] : undefined,
    pack?.fallbacks.generic,
    category ? placeholderId(category) : undefined,
    "shared.global.states.no-image.default.001",
  ];
  // Finite list, deduplicated. Malformed fallback cycles cannot recurse.
  for (const id of new Set(candidates)) {
    if (!id) continue;
    const asset = lookup.getAssetById(id);
    if (!asset || !isRuntimeUsable(asset, request.now)) continue;
    const decorative = request.decorative ?? asset.presentation.decorative;
    const common = {
      assetId: id,
      alt: decorative ? "" : asset.presentation.alt,
      decorative,
      degraded: id !== request.assetId,
    };
    if (asset.runtime.kind === "local")
      return { ...common, kind: "local", path: asset.runtime.path };
    if (
      asset.runtime.kind === "provider_reference" &&
      asset.source.provider &&
      asset.source.sourceId
    )
      return {
        ...common,
        kind: "provider_reference",
        provider: asset.source.provider,
        sourceId: asset.source.sourceId,
      };
  }
  return {
    kind: "none",
    assetId: "",
    alt: request.decorative ? "" : "Image unavailable",
    decorative: request.decorative ?? false,
    degraded: true,
  };
}
