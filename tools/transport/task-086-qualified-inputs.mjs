import { execFileSync } from "node:child_process";
import { createHamayusoFacility } from "./task-086-hamayuso-facility.mjs";
import { abrSourcesBound } from "./task-086-abr-private-hotel.mjs";
import fs from "node:fs";
import path from "node:path";
import {
  canonical,
  hash,
  invariant,
  verifyEvidence,
  admitNodes,
} from "./task-086-model.mjs";
import { createPriciaFacility } from "./task-086-pricia-facility.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "./task-086-source-actions.mjs";
export const HOTEL_INPUT = "research/qualified-hotel-facilities.v1.json";
export const QUALIFIED_INPUT = "research/qualified-airport-contexts.v1.json";
export function qualifiedInputPath(base, p) {
  invariant(
    typeof p === "string" &&
      !p.includes("\\") &&
      !p.includes(":") &&
      !path.posix.isAbsolute(p) &&
      path.posix.normalize(p) === p &&
      !p.split("/").includes(".."),
    "QUALIFIED_INPUT_PATH",
  );
  return path.join(base, p);
}
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export function loadQualifiedHotelInputs(base, sources, evidence, actions) {
  const candidates = new Map(),
    nativeFacilityByAnchor = new Map(),
    inputPaths = [];
  const file = path.join(base, HOTEL_INPUT);
  if (!fs.existsSync(file))
    return { candidates, nativeFacilityByAnchor, inputPaths };
  const cfg = read(file);
  invariant(
    cfg.schemaVersion === 1 && Array.isArray(cfg.facilities),
    "QUALIFIED_HOTEL_SCHEMA",
  );
  inputPaths.push(HOTEL_INPUT);
  const factory = createPriciaFacility({
    hash,
    canonical,
    invariant,
    verifyEvidence,
  });
  for (const e of cfg.facilities) {
    if (e.facilityKind === "HAMAYUSO_ABR_PRIVATE_HOTEL") {
      const archive = qualifiedInputPath(base, e.archivePath),
        position = qualifiedInputPath(base, e.positionArchivePath);
      invariant(
        hash(fs.readFileSync(archive)) === e.extraction.archiveSha256 &&
          hash(fs.readFileSync(position)) ===
            e.extraction.positionArchiveSha256,
        "HOTEL_ABR_ARCHIVE_HASH",
      );
      const n = JSON.parse(
        execFileSync(
          process.env.TASK086_PYTHON ?? "python",
          [
            path.join(
              import.meta.dirname,
              "task-086-extract-abr-private-hotel.py",
            ),
          ],
          {
            input: JSON.stringify({
              ...e.extraction,
              archiveAbsolutePath: archive,
              positionArchiveAbsolutePath: position,
            }),
            encoding: "utf8",
            env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
            maxBuffer: 4 * 1024 * 1024,
          },
        ),
      );
      invariant(
        canonical(n) === canonical(e.nativeIdentity),
        "HOTEL_ABR_NATIVE_CHANGED",
      );
      const refs = [e.nativeEvidenceRef, ...e.supplementalEvidenceRefs];
      for (const ref of refs) {
        const row = evidence.get(ref),
          source = sources.get(row?.sourceId);
        invariant(row && source, "HOTEL_ABR_MISSING_EVIDENCE");
        if (source.rightsClass === "RAW_PERSISTENCE_ALLOWED") {
          const a = actions.find(
            (a) => a.actionId === e.nativeActionIds?.[source.nativeArchiveRole],
          );
          invariant(
            a &&
              ["RIGHTS_REVIEWED", "INGESTED"].includes(a.state) &&
              a.rightsFindings.at(-1)?.rightsClass ===
                "RAW_PERSISTENCE_ALLOWED" &&
              a.sourcesChecked.some(
                (x) =>
                  x.url === source.url &&
                  x.contentSha256 === source.contentSha256 &&
                  x.status === 200,
              ),
            "HOTEL_ABR_NATIVE_ACTION",
          );
        } else {
          reviewedFactAction(
            {
              ...row.record,
              factId: row.record.factId ?? row.record.sourceFactId,
            },
            actions,
          );
          validateCorroboratingEvidence(row.record, actions);
        }
      }
      const factory = createHamayusoFacility({
          canonical,
          hash,
          invariant,
          verifyEvidence,
          abrSourcesBound,
        }),
        candidate = factory.candidate(n, refs, { sources, evidence });
      invariant(
        !nativeFacilityByAnchor.has(n.identityAnchor),
        "QUALIFIED_DUPLICATE_IDENTITY",
      );
      nativeFacilityByAnchor.set(n.identityAnchor, n);
      candidates.set(n.identityAnchor, candidate);
      inputPaths.push(
        e.archivePath,
        e.positionArchivePath,
        ...e.sourcePackagePaths,
      );
      continue;
    }
    invariant(
      !e.facilityKind || e.facilityKind === "PRICIA_OSM_HOTEL",
      "QUALIFIED_UNKNOWN_FACILITY_KIND",
    );
    const endpoint = evidence.get(e.endpointEvidenceRef)?.record;
    invariant(endpoint, "QUALIFIED_ENDPOINT_MISSING");
    reviewedFactAction(endpoint, actions);
    validateCorroboratingEvidence(endpoint, actions);
    const native = evidence.get(e.nativeEvidenceRef),
      s = sources.get(native?.sourceId);
    invariant(
      s?.license === "ODbL 1.0" &&
        s.rawPayloadRetained === true &&
        s.persistenceAllowed === true &&
        s.attribution === "© OpenStreetMap contributors" &&
        s.shareAlikeRequired === true,
      "QUALIFIED_NATIVE_LICENSE",
    );
    const action = actions.find((a) => a.actionId === e.nativeActionId);
    invariant(
      action &&
        ["RIGHTS_REVIEWED", "INGESTED"].includes(action.state) &&
        action.rightsFindings.at(-1)?.rightsClass ===
          "RAW_PERSISTENCE_ALLOWED" &&
        action.sourcesChecked.some(
          (x) =>
            x.url === s.url &&
            x.contentSha256 === s.contentSha256 &&
            x.status === 200,
        ),
      "QUALIFIED_NATIVE_ACTION",
    );
    const result = factory.create({
      nativeBytes: fs.readFileSync(qualifiedInputPath(base, e.nativePath)),
      identityRecord: native.record,
      nativeEvidenceRef: e.nativeEvidenceRef,
      endpointEvidenceRef: e.endpointEvidenceRef,
      sources,
      evidence,
    });
    for (const [k, v] of result.nativeFacilityByAnchor) {
      invariant(!nativeFacilityByAnchor.has(k), "QUALIFIED_DUPLICATE_IDENTITY");
      nativeFacilityByAnchor.set(k, v);
      candidates.set(k, result.candidate);
    }
    inputPaths.push(e.nativePath, ...e.sourcePackagePaths);
  }
  for (const p of inputPaths) qualifiedInputPath(base, p);
  return { candidates, nativeFacilityByAnchor, inputPaths };
}
export function bindQualifiedHotelSelector(
  selector,
  factRef,
  { candidates, nodes, sources, evidence, nativeFacilityByAnchor },
) {
  const ref = selector.privateHotelIdentity,
    candidate = candidates.get(ref?.identityAnchor),
    fact = evidence.get(factRef)?.record;
  invariant(
    ((candidate?.origin === "TASK_086_OFFICIAL_PRIVATE_HOTEL_AND_OSM" &&
      fact?.accessContract?.kind === "QUALIFIED_HOTEL_SHUTTLE") ||
      (candidate?.origin === "TASK_086_INDEPENDENT_ABR_PRIVATE_HOTEL" &&
        fact?.accessContract?.kind === "QUALIFIED_PACKAGE_HOTEL_SHUTTLE")) &&
      ref.recordSha256 === hash(candidate.identityRecord) &&
      selector.name === candidate.canonicalNameJa &&
      selector.operator === candidate.operatorRefs[0] &&
      selector.line === candidate.lineRefs[0] &&
      selector.mode === candidate.mode &&
      fact?.kind === "service" &&
      fact.accessContract.hotelIdentityAnchor === candidate.identityAnchor,
    "QUALIFIED_HOTEL_SELECTOR_BINDING",
  );
  const node = admitNodes(
    [
      {
        ...candidate,
        evidenceRefs: [...new Set([...candidate.evidenceRefs, factRef])],
      },
    ],
    sources,
    evidence,
    [],
    { nativeFacilityByAnchor },
  )[0];
  invariant(
    node.decision === "ADMIT_TASK_086_TOPOLOGY",
    "QUALIFIED_HOTEL_ADMISSION",
  );
  const prior = nodes.get(node.nodeId);
  invariant(
    !prior || prior.identitySignature === node.identitySignature,
    "QUALIFIED_HOTEL_REBIND",
  );
  if (prior)
    node.evidenceRefs = [
      ...new Set([...prior.evidenceRefs, ...node.evidenceRefs]),
    ].sort();
  nodes.set(node.nodeId, node);
  return node.nodeId;
}
export function loadQualifiedContextInputs(base) {
  const file = path.join(base, QUALIFIED_INPUT);
  if (!fs.existsSync(file)) return { contexts: [], inputPaths: [] };
  const cfg = read(file);
  invariant(
    cfg.schemaVersion === 1 && Array.isArray(cfg.contexts),
    "QUALIFIED_CONTEXT_SCHEMA",
  );
  const inputPaths = [QUALIFIED_INPUT],
    actions = fs
      .readFileSync(path.join(base, "next-source-actions.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(JSON.parse),
    contexts = [];
  for (const entry of cfg.contexts) {
    const c = entry.context;
    invariant(
      c?.kind === "EXPLICIT_CONDITIONAL_PLANNING" &&
        c.publicStructureOnly === false &&
        !Object.hasOwn(c, "odValidationContext") &&
        !Object.hasOwn(c, "qualificationReview") &&
        !Object.hasOwn(c, "qualifiedInputBindings") &&
        !Object.hasOwn(c, "evidenceContextSha256"),
      "QUALIFIED_NO_EMBEDDED_TRUST",
    );
    const review = read(qualifiedInputPath(base, entry.reviewPath)),
      bindings = [];
    inputPaths.push(entry.reviewPath, review.phaseFile);
    for (const b of review.inputBindings) {
      const p = qualifiedInputPath(base, b.path);
      bindings.push([b.path, hash(fs.readFileSync(p))]);
      inputPaths.push(b.path);
    }
    let error = null;
    try {
      const phase = read(qualifiedInputPath(base, review.phaseFile));
      invariant(
        phase.phaseId === review.phaseId &&
          canonical(phase.facts.map((f) => [f.factId, hash(f)])) ===
            canonical(review.factBindings),
        "QUALIFIED_PHASE_FACT_BINDING",
      );
      for (const f of phase.facts) {
        reviewedFactAction(f, actions);
        validateCorroboratingEvidence(f, actions);
        for (const o of f.conditionEvidence ?? [])
          reviewedFactAction({ ...o, factId: o.conditionId }, actions);
      }
    } catch (e) {
      error = e.message;
    }
    contexts.push({
      ...c,
      qualificationReview: review,
      qualifiedInputBindings: bindings,
      qualificationInputError: error,
    });
  }
  return { contexts, inputPaths: [...new Set(inputPaths)] };
}
