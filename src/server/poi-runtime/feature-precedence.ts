import "server-only";

import {
  POI_FEATURE_CODES,
  type PoiFeatureCode,
  type PoiFeatureSetV1,
} from "../../shared/contracts/planning/features";
import { parsePoiFeatureSetV1 } from "../../shared/contracts/planning/validation";

/** Current operational ratings may override only their corresponding dynamic baseline dimension. */
const DYNAMIC_CODES = new Set<PoiFeatureCode>([
  "27",
  "28", // crowd, queue
  "29",
  "30", // wheelchair, stroller
  "31",
  "32",
  "33",
  "34", // time suitability
  "35",
  "36",
  "37",
  "38",
  "39", // weather suitability/sensitivity
  "40",
  "41",
  "42",
  "43", // seasonal suitability
]);

export type CurrentFeature43Fact = {
  featureCode: PoiFeatureCode;
  value: number;
  sourceRef: string;
  observedAt: string;
  expiresAt: string;
};

export type EffectiveFeature43Selection = {
  featureSet: PoiFeatureSetV1;
  sources: Record<
    PoiFeatureCode,
    "TRUSTED_INTERNAL_BASELINE" | "FRESH_CURRENT_FACT"
  >;
  currentFactSourceRefs: Partial<Record<PoiFeatureCode, string>>;
};

/**
 * A same-scale, fresh current fact wins; stale facts leave the baseline intact.
 * Operational booleans (open/closed, step-free access) belong to scoring hard
 * constraints, not fabricated 0–9 Feature43 replacements.
 */
export function selectEffectiveFeature43(
  baseline: PoiFeatureSetV1,
  currentFacts: readonly CurrentFeature43Fact[],
  evaluationAt: string,
): EffectiveFeature43Selection {
  if (
    !parsePoiFeatureSetV1(baseline).ok ||
    !Number.isFinite(Date.parse(evaluationAt))
  )
    throw new Error("FEATURE43_PRECEDENCE_INVALID_INPUT");
  const effective = structuredClone(baseline);
  const sources = Object.fromEntries(
    POI_FEATURE_CODES.map((code) => [code, "TRUSTED_INTERNAL_BASELINE"]),
  ) as EffectiveFeature43Selection["sources"];
  const currentFactSourceRefs: EffectiveFeature43Selection["currentFactSourceRefs"] =
    {};
  const seen = new Set<PoiFeatureCode>();
  const now = Date.parse(evaluationAt);
  for (const fact of currentFacts) {
    const observed = Date.parse(fact.observedAt);
    const expires = Date.parse(fact.expiresAt);
    if (
      !DYNAMIC_CODES.has(fact.featureCode) ||
      seen.has(fact.featureCode) ||
      !Number.isInteger(fact.value) ||
      fact.value < 0 ||
      fact.value > 9 ||
      typeof fact.sourceRef !== "string" ||
      fact.sourceRef.trim() !== fact.sourceRef ||
      fact.sourceRef.length === 0 ||
      !Number.isFinite(observed) ||
      !Number.isFinite(expires) ||
      observed >= expires
    )
      throw new Error("FEATURE43_PRECEDENCE_INVALID_CURRENT_FACT");
    seen.add(fact.featureCode);
    if (observed <= now && now < expires) {
      effective.values[fact.featureCode] = fact.value as
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      sources[fact.featureCode] = "FRESH_CURRENT_FACT";
      currentFactSourceRefs[fact.featureCode] = fact.sourceRef;
    }
  }
  return { featureSet: effective, sources, currentFactSourceRefs };
}
