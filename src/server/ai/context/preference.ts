import "server-only";
import type { PreferenceReadResultV1 } from "../../../shared/contracts/preferences/read";
import type { AiPreferenceContextV1 } from "../contracts";

const anonymousContext = (): AiPreferenceContextV1 => ({
  profile: "preference_context_v1",
  status: "anonymous",
  contractVersion: null,
  sourceRevision: null,
  sourceUpdatedAt: null,
  preference: null,
  unavailableReason: null,
});

export function buildPreferenceContext(
  result?: PreferenceReadResultV1 | null,
): AiPreferenceContextV1 {
  if (result === undefined || result === null) return anonymousContext();
  if (!result.ok) {
    if (result.code === "AUTH_REQUIRED") return anonymousContext();
    return {
      profile: "preference_context_v1",
      status: "unavailable",
      contractVersion: null,
      sourceRevision: null,
      sourceUpdatedAt: null,
      preference: null,
      unavailableReason: result.code,
    };
  }
  const missing =
    result.data.sourceRevision === 0 &&
    result.data.sourceUpdatedAt === null &&
    Object.keys(result.data.preference.values).length === 0;
  return {
    profile: "preference_context_v1",
    status: missing ? "missing" : "present",
    contractVersion: result.data.contractVersion,
    sourceRevision: result.data.sourceRevision,
    sourceUpdatedAt: result.data.sourceUpdatedAt,
    preference: result.data.preference,
    unavailableReason: null,
  };
}
