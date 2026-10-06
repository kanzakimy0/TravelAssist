import {
  ABR_DATASET,
  abrSourcesBound,
} from "./task-086-abr-public-facility.mjs";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  canonical,
  hash,
  invariant,
  verifyEvidence,
} from "./task-086-model.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "./task-086-source-actions.mjs";
export const OFFICIAL_BUS_FACILITY_INPUT =
  "research/public-bus-facilities.v1.json";
const safe = (base, relative) => {
  invariant(
    typeof relative === "string" &&
      !relative.includes("\\") &&
      !relative.includes(":") &&
      !path.posix.isAbsolute(relative) &&
      path.posix.normalize(relative) === relative &&
      !relative.split("/").includes(".."),
    "OFFICIAL_BUS_FACILITY_PATH",
  );
  return path.join(base, relative);
};
export function loadOfficialBusFacilityInputs(
  base,
  sources,
  evidence,
  actions,
) {
  const file = path.join(base, OFFICIAL_BUS_FACILITY_INPUT),
    nativeFacilityByAnchor = new Map(),
    candidates = new Map(),
    inputPaths = [];
  if (!fs.existsSync(file))
    return { nativeFacilityByAnchor, candidates, inputPaths };
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  invariant(
    config.schemaVersion === 1 && Array.isArray(config.facilities),
    "OFFICIAL_BUS_FACILITY_SCHEMA",
  );
  inputPaths.push(OFFICIAL_BUS_FACILITY_INPUT);
  for (const entry of config.facilities) {
    const rawPath = safe(base, entry.archivePath),
      body = fs.readFileSync(rawPath);
    invariant(
      hash(body) === entry.extraction.archiveSha256,
      "OFFICIAL_BUS_ARCHIVE_HASH",
    );
    const isABR = entry.extraction.dataset === ABR_DATASET;
    const positionPath = isABR
      ? safe(base, entry.positionArchivePath)
      : undefined;
    if (isABR) {
      invariant(
        hash(fs.readFileSync(positionPath)) ===
          entry.extraction.positionArchiveSha256,
        "ABR_POSITION_ARCHIVE_HASH",
      );
      inputPaths.push(entry.positionArchivePath);
    }
    const n = JSON.parse(
      execFileSync(
        process.env.TASK086_PYTHON ?? "python",
        [
          path.join(
            import.meta.dirname,
            isABR
              ? "task-086-extract-abr-facility.py"
              : "task-086-extract-official-bus-facility.py",
          ),
        ],
        {
          input: JSON.stringify({
            ...entry.extraction,
            archiveAbsolutePath: rawPath,
            ...(isABR ? { positionArchiveAbsolutePath: positionPath } : {}),
          }),
          encoding: "utf8",
          env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
          maxBuffer: 4 * 1024 * 1024,
        },
      ),
    );
    invariant(
      canonical(n) === canonical(entry.nativeIdentity),
      "OFFICIAL_BUS_NATIVE_IDENTITY_CHANGED",
    );
    invariant(
      !nativeFacilityByAnchor.has(n.identityAnchor),
      "OFFICIAL_BUS_DUPLICATE_ANCHOR",
    );
    const identity = evidence.get(entry.nativeIdentityEvidenceRef),
      source = sources.get(identity?.sourceId);
    invariant(
      identity &&
        identity.recordSha256 === hash(n) &&
        canonical(identity.record) === canonical(n) &&
        identity.sourceSha256 === n.archiveSha256 &&
        source?.contentSha256 === n.archiveSha256 &&
        (isABR
          ? abrSourcesBound(
              n,
              [
                entry.nativeIdentityEvidenceRef,
                ...(entry.nativeSupplementalEvidenceRefs ?? []),
              ],
              { sources, evidence },
              { canonical, hash, verifyEvidence },
            )
          : source.license === "CC-BY-4.0") &&
        source.persistenceAllowed === true &&
        source.rawPayloadRetained === true &&
        verifyEvidence([entry.nativeIdentityEvidenceRef], sources, evidence),
      "OFFICIAL_BUS_NATIVE_EVIDENCE",
    );
    invariant(
      Array.isArray(entry.componentEvidenceRefs) &&
        entry.componentEvidenceRefs.length > 0,
      "OFFICIAL_BUS_COMPONENT_REVIEWS_REQUIRED",
    );
    for (const ref of entry.componentEvidenceRefs) {
      const r = evidence.get(ref)?.record;
      invariant(
        r?.kind === "REVIEWED_EXACT_NAMED_PUBLIC_FACILITY_BUS_COMPONENT" &&
          r.identityAnchor === n.identityAnchor &&
          r.identityRecordSha256 === hash(n) &&
          verifyEvidence([ref], sources, evidence),
        "OFFICIAL_BUS_COMPONENT_NOT_BOUND",
      );
      reviewedFactAction(r, actions);
      validateCorroboratingEvidence(r, actions);
      for (const cr of r.currentOfficialFacilityEvidenceRefs ?? []) {
        const c = evidence.get(cr)?.record;
        invariant(
          c && verifyEvidence([cr], sources, evidence),
          "OFFICIAL_BUS_CURRENT_FACILITY_MISSING",
        );
        reviewedFactAction(c, actions);
        validateCorroboratingEvidence(c, actions);
      }
    }
    const reviews = entry.componentEvidenceRefs.map(
      (ref) => evidence.get(ref).record,
    );
    invariant(
      reviews.every((r) => r.publicServiceOperator === entry.serviceOperator),
      "OFFICIAL_BUS_OPERATOR_BINDING",
    );
    const candidate = {
      identityAnchor: n.identityAnchor,
      canonicalNameJa: n.dataset === "P04-20" ? "旧病院前" : n.name,
      nodeKind: "public_pickup_facility",
      mode: "local_bus",
      operatorRefs: [entry.serviceOperator],
      operatorReferenceScope:
        "PUBLIC_SERVICE_ORGANIZER_NOT_UNIDENTIFIED_VEHICLE_CONTRACTOR",
      lineRefs: [entry.lineRef],
      latitude: n.latitude,
      longitude: n.longitude,
      identityRecord: n,
      origin: "TASK_086_OFFICIAL_PUBLIC_FACILITY_AND_BUS",
      evidenceRefs: [
        entry.nativeIdentityEvidenceRef,
        ...(isABR ? entry.nativeSupplementalEvidenceRefs : []),
        ...entry.componentEvidenceRefs,
      ],
      independentReview: {
        decision: "ADMIT_TASK_086_TOPOLOGY",
        recordSha256: hash(n),
        coordinateScope:
          "OFFICIAL_FACILITY_REPRESENTATIVE_NOT_BUS_POLE_ENTRANCE_OR_NAVIGATION",
      },
      hubSemantics: "EXPLICIT_NAMED_PUBLIC_FACILITY_SERVICE_COMPONENT",
    };
    nativeFacilityByAnchor.set(n.identityAnchor, n);
    candidates.set(n.identityAnchor, candidate);
    inputPaths.push(entry.archivePath, ...entry.sourcePackagePaths);
    for (const item of entry.sourcePackagePaths) safe(base, item);
  }
  return {
    nativeFacilityByAnchor,
    candidates,
    inputPaths: [...new Set(inputPaths)],
  };
}
