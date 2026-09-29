import type { CanonicalPoiV1 } from "../poi/types";
import type { PoiDetailV1 } from "./types";

const PUBLIC_EVIDENCE_KINDS = new Set([
  "official",
  "open_data",
  "human_verified",
  "master_prior",
]);

/** Explicit allowlist. No raw fact, provider ID, locator, asset or rights payload. */
export function projectPoiDetail(poi: CanonicalPoiV1): PoiDetailV1 {
  return {
    schemaVersion: "1.0",
    poiRef: poi.internalId,
    masterCode: poi.masterCode,
    names: {
      primaryLocale: poi.names.primaryLocale,
      localized: poi.names.localized.map(({ locale, value, kind }) => ({
        locale,
        value,
        kind,
      })),
      aliases: poi.names.aliases.map(({ locale, value }) => ({
        locale,
        value,
      })),
    },
    classification: {
      primary: poi.classification.primary,
      secondary: [...poi.classification.secondary],
      tags: [...poi.classification.tags],
    },
    location: {
      supportStatus: poi.location.supportStatus,
      countryCode: poi.location.countryCode,
      point: poi.location.point === null ? null : { ...poi.location.point },
      prefecture: poi.location.address?.prefecture ?? null,
      municipality: poi.location.address?.municipality ?? null,
    },
    lifecycle: { ...poi.lifecycle },
    features:
      poi.features === null
        ? null
        : {
            featureVersion: poi.features.featureVersion,
            values: { ...poi.features.values },
          },
    visitProfiles: poi.visitProfiles.map((profile) => ({
      profileId: profile.profileId,
      visitMode: profile.visitMode,
      status: profile.status,
      minimumDurationMinutes: profile.minimumDurationMinutes,
      recommendedDurationMinutes: profile.recommendedDurationMinutes,
      maximumUsefulDurationMinutes: profile.maximumUsefulDurationMinutes,
      fixedWalkingLoad: profile.fixedWalkingLoad,
      variableWalkingLoad: profile.variableWalkingLoad,
      fixedPhysicalLoad: profile.fixedPhysicalLoad,
      variablePhysicalLoad: profile.variablePhysicalLoad,
      terrainModifier: profile.terrainModifier,
      standingModifier: profile.standingModifier,
      updatedAt: profile.updatedAt,
    })),
    regionRelations: poi.regionRelations.map(
      ({ regionRef, relationType, primary }) => ({
        regionRef,
        relationType,
        primary,
      }),
    ),
    accessAnchors: poi.accessAnchors.map(
      ({ anchorId, transportNodeRef, kind, relationship }) => ({
        anchorId,
        transportNodeRef,
        kind,
        relationship,
      }),
    ),
    evidence: poi.sourceRefs
      .filter(
        (source) =>
          source.rights.persistence === "allowed" &&
          source.rights.redistribution === "allowed" &&
          PUBLIC_EVIDENCE_KINDS.has(source.sourceKind),
      )
      .map((source) => ({
        sourceRef: source.sourceRef,
        sourceKind: source.sourceKind,
        authorityBand: source.authorityBand,
        observedAt: source.observedAt,
        attributionRequired: source.rights.attributionRequired,
      })),
  };
}
