import type { CanonicalPoiV1 } from "../poi/types";
import type { PoiFeatureVectorV1 } from "../planning/features";

/** Only product-safe, static fields cross the public detail boundary. */
export type PoiDetailV1 = {
  schemaVersion: "1.0";
  poiRef: string;
  masterCode: string | null;
  names: CanonicalPoiV1["names"];
  classification: CanonicalPoiV1["classification"];
  location: {
    supportStatus: CanonicalPoiV1["location"]["supportStatus"];
    countryCode: string | null;
    point: CanonicalPoiV1["location"]["point"];
    prefecture: string | null;
    municipality: string | null;
  };
  lifecycle: CanonicalPoiV1["lifecycle"];
  features: {
    featureVersion: "1.0";
    values: PoiFeatureVectorV1;
  } | null;
  visitProfiles: Array<
    Pick<
      CanonicalPoiV1["visitProfiles"][number],
      | "profileId"
      | "visitMode"
      | "status"
      | "minimumDurationMinutes"
      | "recommendedDurationMinutes"
      | "maximumUsefulDurationMinutes"
      | "fixedWalkingLoad"
      | "variableWalkingLoad"
      | "fixedPhysicalLoad"
      | "variablePhysicalLoad"
      | "terrainModifier"
      | "standingModifier"
      | "updatedAt"
    >
  >;
  regionRelations: Array<
    Pick<
      CanonicalPoiV1["regionRelations"][number],
      "regionRef" | "relationType" | "primary"
    >
  >;
  accessAnchors: Array<
    Pick<
      CanonicalPoiV1["accessAnchors"][number],
      "anchorId" | "transportNodeRef" | "kind" | "relationship"
    >
  >;
  evidence: Array<
    Pick<
      CanonicalPoiV1["sourceRefs"][number],
      "sourceRef" | "sourceKind" | "authorityBand" | "observedAt"
    > & { attributionRequired: boolean }
  >;
};
