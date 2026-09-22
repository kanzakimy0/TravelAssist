import { createHash } from "node:crypto";

const norm = (value) =>
  (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\s]/gu, "");
const order = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function reviewIdentities(rows, baseline, officialEvidence, policy) {
  const bySource = new Map();
  for (const row of rows)
    for (const id of row.sourceRecordIds) {
      requireValue(!bySource.has(id), `Source identity appears twice: ${id}`);
      bySource.set(id, row);
    }
  const holds = new Map(
    policy.crossSourceHolds.map((item) => [item.groupKey, item.reason]),
  );
  const factsBySource = new Map();
  for (const fact of officialEvidence.records) {
    requireValue(
      /^https:\/\//.test(fact.url) &&
        fact.address &&
        fact.appliesToSourceRecordIds?.length,
      "Invalid official evidence",
    );
    for (const id of fact.appliesToSourceRecordIds) {
      requireValue(
        bySource.has(id),
        `Official evidence has unknown source: ${id}`,
      );
      if (!factsBySource.has(id)) factsBySource.set(id, []);
      factsBySource.get(id).push(fact);
    }
  }
  const seenGroups = new Set();
  const groups = baseline.groups
    .map((group) => {
      requireValue(
        !seenGroups.has(group.groupKey),
        `Duplicate baseline group: ${group.groupKey}`,
      );
      seenGroups.add(group.groupKey);
      const current = new Map();
      for (const id of group.sourceRecordIds) {
        const row = bySource.get(id);
        requireValue(row, `Baseline source disappeared: ${id}`);
        current.set(row.candidateKey, row);
      }
      const candidates = [...current.values()].sort((a, b) =>
        order(a.candidateKey, b.candidateKey),
      );
      const addressIndex = new Map(),
        coordinateIndex = new Map();
      const official = [];
      for (const row of candidates) {
        for (const id of row.sourceRecordIds)
          official.push(...(factsBySource.get(id) ?? []));
        for (const address of row.addresses) {
          const key = norm(address);
          if (!addressIndex.has(key)) addressIndex.set(key, new Set());
          addressIndex.get(key).add(row.candidateKey);
        }
        for (const member of row.observations) {
          if (!member.coordinates) continue;
          const key = `${member.coordinates.latitude},${member.coordinates.longitude}`;
          if (!coordinateIndex.has(key)) coordinateIndex.set(key, new Set());
          coordinateIndex.get(key).add(row.candidateKey);
        }
      }
      const sharedAddress = [...addressIndex.values()].some(
        (keys) => keys.size > 1,
      );
      const sharedCoordinates = [...coordinateIndex.values()].some(
        (keys) => keys.size > 1,
      );
      let status, reason;
      if (!group.groupKey.split(":").at(-1)) {
        status = "IGNORED_PLACEHOLDER_NAME";
        reason =
          "Punctuation-only English names normalized to empty; no identity relationship.";
      } else if (candidates.length === 1) {
        status = "MERGED_SUPPORTED";
        reason =
          "All baseline members now belong to one explicit evidence-backed candidate group; no Master Code allocated.";
      } else if (holds.has(group.groupKey)) {
        status = "HOLD_CROSS_SOURCE_LOCATION_CONFLICT";
        reason = holds.get(group.groupKey);
      } else if (sharedCoordinates) {
        status = "HOLD_SOURCE_IDENTITY_AMBIGUITY";
        reason =
          "Different historical provider entries share an estimated coordinate; same name/address/point does not establish an alias.";
      } else if (sharedAddress) {
        status = "HOLD_ADDRESS_COORDINATE_CONTRADICTION";
        reason =
          "Same retained address is attached to different historical points. Do not merge or silently correct source geography.";
      } else if (
        candidates.some(
          (row) =>
            !row.addresses.length &&
            !row.sourceRecordIds.some((id) => factsBySource.has(id)),
        )
      ) {
        status = "HOLD_INSUFFICIENT_LOCATION_EVIDENCE";
        reason =
          "A source lacks address evidence; shared name is insufficient.";
      } else {
        status = "KEEP_SEPARATE_DISTINCT_SOURCE_LOCATIONS";
        reason =
          "Source identities have different locality/address evidence. Retain separate candidates; this is not current existence or navigation certification.";
      }
      const sourceEvidence = candidates.flatMap((row) => row.observations);
      return {
        groupKey: group.groupKey,
        baselineCandidateKeys: group.candidateKeys,
        currentCandidateKeys: candidates.map((row) => row.candidateKey),
        sourceRecordIds: [...group.sourceRecordIds].sort(order),
        status,
        reason,
        quarantinedFromEnrichment: status.startsWith("HOLD_"),
        retainedSharedAddress: sharedAddress,
        retainedSharedCoordinates: sharedCoordinates,
        candidates: candidates.map((row) => ({
          candidateKey: row.candidateKey,
          namesJa: row.namesJa,
          addresses: row.addresses,
          coordinates: row.observations
            .filter((o) => o.coordinates)
            .map((o) => ({
              sourceRecordId: o.sourceRecordId,
              ...o.coordinates,
            })),
          evidenceRefs: row.evidenceRefs,
        })),
        supplementalOfficialEvidence: [
          ...new Map(official.map((e) => [e.url, e])).values(),
        ],
        sourceEvidenceSha256: createHash("sha256")
          .update(JSON.stringify(sourceEvidence))
          .digest("hex"),
      };
    })
    .sort((a, b) => order(a.groupKey, b.groupKey));
  const counts = {};
  for (const group of groups)
    counts[group.status] = (counts[group.status] ?? 0) + 1;
  const held = groups.filter((g) => g.quarantinedFromEnrichment);
  return {
    schemaVersion: "task068-identity-review-round2-v1",
    reviewMethod:
      "Editorial review of source identities, bilingual addresses and targeted primary-source corroboration; not human adjudication.",
    baselineGroupCount: baseline.groups.length,
    reviewedGroupCount: groups.length,
    statusCounts: counts,
    heldGroupCount: held.length,
    heldCandidateKeys: [
      ...new Set(held.flatMap((g) => g.currentCandidateKeys)),
    ].sort(order),
    supplementalOfficialFacts: officialEvidence.records.length,
    canonicalAllocationsChanged: 0,
    groups,
  };
}
