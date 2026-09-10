export type AssetStatus =
  | "draft"
  | "review_required"
  | "approved"
  | "rejected"
  | "expired"
  | "acquisition_required"
  | "provider_only";
export type AssetSourceType =
  | "brand_owned"
  | "ai_generated"
  | "licensed_stock"
  | "official_tourism"
  | "wikimedia_commons"
  | "public_domain"
  | "provider_reference"
  | "user_generated"
  | "placeholder";
export type AssetRuntime =
  | { kind: "local"; path: string }
  | { kind: "cdn"; url: string }
  | { kind: "provider_reference" }
  | { kind: "none" };
export interface Asset {
  id: string;
  assetType: string;
  entity: { type: string; id: string };
  locale: string;
  runtime: AssetRuntime;
  source: {
    type: AssetSourceType;
    provider: string | null;
    sourceId: string | null;
    sourceUrl: string | null;
    provenance?: string;
  };
  rights: {
    license: string | null;
    credit: string | null;
    commercialUseAllowed: boolean | null;
    cacheAllowed: boolean | null;
    derivativesAllowed: boolean | null;
    expiresAt: string | null;
    author?: string;
    licenseVersion?: string;
    modified?: boolean;
    modificationNote?: string;
    attributionLocation?: string;
    shareAlike?: boolean;
  };
  presentation: {
    alt: string;
    decorative: boolean;
    width: number | null;
    height: number | null;
    focalPoint: { x: number; y: number };
    /** Normalized protected rectangle; impossible cover crops require review. */
    safeArea?: { x: number; y: number; width: number; height: number };
    brandIconSource?: boolean;
    additionalProfiles?: string[];
  };
  integrity: { sha256: string | null; bytes: number };
  authenticity: "documentary" | "illustrative" | "symbolic";
  status: AssetStatus;
}
export interface DestinationSlot {
  requestId: string;
  assetId: string;
  role: string;
  names: { "zh-CN": string; "ja-JP": string; en: string };
  entity: Asset["entity"];
  resolution: "unresolved" | "candidate_requires_verification";
  target: { width: number; height: number };
  status: AssetStatus;
  notes: string;
}
export interface DestinationPack {
  id: string;
  country: string;
  type: "city" | "region" | "destination-cluster";
  names: { "zh-CN": string; "ja-JP": string; en: string };
  description: string;
  theme: { surface: string; accent: string; ink: string; gradient: string[] };
  slots: {
    desktopHero: DestinationSlot[];
    mobileHero: DestinationSlot[];
    areaCovers: DestinationSlot[];
    landmarkSymbols: DestinationSlot[];
    poiImages: DestinationSlot[];
  };
  fallbacks: { generic: string; categories: Record<string, string> };
  completion: {
    approvedPlaceholders: number;
    requestedAssets: number;
    acquiredAssets: number;
  };
  rightsSummary: {
    approved: number;
    providerOnly: number;
    acquisitionRequired: number;
  };
  lastReviewedAt: string;
}
export interface AssetManifest {
  schemaVersion: 1;
  assets: Asset[];
}
export interface PackManifest {
  schemaVersion: 1;
  packs: DestinationPack[];
}
