import manifest from "../../../docs/assets/catalog/asset-manifest.v1.json" with { type: "json" };
import destinations from "../../../docs/assets/catalog/destination-packs.v1.json" with { type: "json" };
import type {
  Asset,
  AssetManifest,
  DestinationPack,
  PackManifest,
} from "./asset-types";

// Build-time JSON is checked by assets:validate. Return snapshots so consumers cannot
// mutate the singleton registry and accidentally approve rights or poison fallbacks.
const assets: Asset[] = (manifest as AssetManifest).assets;
const packs: DestinationPack[] = (destinations as PackManifest).packs;
export function getAssetById(id: string): Asset | undefined {
  const asset = assets.find((item) => item.id === id);
  return asset ? structuredClone(asset) : undefined;
}
export function getDestinationPack(id: string): DestinationPack | undefined {
  const pack = packs.find((item) => item.id === id);
  return pack ? structuredClone(pack) : undefined;
}
export function listAssetsByType(type: string): Asset[] {
  return structuredClone(assets.filter((asset) => asset.assetType === type));
}
export function isRuntimeUsable(
  asset: Asset | undefined,
  now: number = Date.now(),
): boolean {
  if (!asset || !Number.isFinite(now)) return false;
  const r = asset.rights;
  if (
    !r.license?.trim() ||
    /^(?:any-license|internet|unknown.*)$/i.test(r.license) ||
    !r.credit?.trim() ||
    r.commercialUseAllowed !== true
  )
    return false;
  if (
    r.expiresAt !== null &&
    (!Number.isFinite(Date.parse(r.expiresAt)) ||
      Date.parse(r.expiresAt) <= now)
  )
    return false;
  if (asset.status === "provider_only")
    return (
      asset.runtime.kind === "provider_reference" &&
      asset.source.type === "provider_reference" &&
      Boolean(asset.source.provider && asset.source.sourceId) &&
      !("path" in asset.runtime) &&
      !("url" in asset.runtime) &&
      asset.integrity.bytes === 0 &&
      asset.integrity.sha256 === null &&
      r.cacheAllowed === false
    );
  if (
    asset.status !== "approved" ||
    !asset.source.provider ||
    !asset.source.sourceId ||
    (["ai_generated", "placeholder"].includes(asset.source.type) &&
      asset.authenticity === "documentary") ||
    r.cacheAllowed !== true ||
    r.derivativesAllowed !== true
  )
    return false;
  // CDN delivery requires a future authorized adapter. Never hotlink in this foundation.
  return (
    asset.runtime.kind === "local" &&
    /^\/media\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:svg|png|jpe?g|webp|gif|avif)$/.test(
      asset.runtime.path,
    )
  );
}
