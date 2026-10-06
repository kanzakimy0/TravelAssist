import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const object = (p) => JSON.parse(read(p));
const jsonl = (p) => read(p).trim().split("\n").filter(Boolean).map(JSON.parse);
const check = (ok, msg) => {
  if (!ok) throw Error(msg);
};
const prefix = "data/poi/full";
const lock = object(`${prefix}/manifests/recovery-population-lock.v1.json`);
for (const [p, h] of Object.entries(lock.hashes))
  check(sha(readFileSync(resolve(root, p))) === h, "Frozen data changed " + p);
const corpus = jsonl(`${prefix}/registry/combined-candidates.v1.jsonl`);
const corpusById = new Map(corpus.map((c) => [c.candidateKey, c]));
const manifest = object("docs/qa/TASK-068/batch-manifest.json");
const parts = (dir) =>
  readdirSync(resolve(root, `${prefix}/${dir}`))
    .filter((p) => /^batch-\d{4}\.jsonl$/.test(p))
    .sort()
    .flatMap((p) => jsonl(`${prefix}/${dir}/${p}`));
const rows = parts("features"),
  visits = parts("visit-profiles"),
  links = parts("transport-anchors"),
  edges = parts("neighbors"),
  anchors = jsonl(`${prefix}/transport-anchors/anchors.v1.jsonl`);
const byId = new Map(rows.map((r) => [r.candidateKey, r]));
check(rows.length === 10369 && byId.size === 10369, "Identity count");
check(
  manifest.batches.length === 52 && manifest.processed === 10369,
  "Batch count",
);
const sources = new Map(
  object(`${prefix}/sources/retained-article-index.v1.json`).entries.map(
    (a) => [a.sourceRef, a],
  ),
);
const evidence = new Map(
  object(`${prefix}/sources/reviewed-enrichment-evidence.v1.json`).entries.map(
    (e) => [e.sourceRef, e],
  ),
);
const counts = {};
let known = 0,
  nulls = 0;
const perPref = {};
for (const r of rows) {
  const original = corpusById.get(r.candidateKey);
  check(
    original && r.identityInputChecksum === sha(JSON.stringify(original)),
    "Identity mutated",
  );
  check(r.scope === "CANDIDATE_ONLY_NO_CANONICAL_IMPORT", "Scope lost");
  const keys = Object.keys(r.featureSet.values);
  check(
    keys.length === 43 &&
      Array.from({ length: 43 }, (_, i) =>
        String(i + 1).padStart(2, "0"),
      ).every((k) => keys.includes(k)),
    "43 keys",
  );
  counts[r.status] = (counts[r.status] ?? 0) + 1;
  const provenance = new Map(r.provenance.map((p) => [p.featureCode, p]));
  check(provenance.size === r.provenance.length, "Duplicate provenance");
  for (const [k, v] of Object.entries(r.featureSet.values)) {
    if (v === null) {
      nulls++;
      check(!provenance.has(k), "Provenance for unknown");
    } else {
      known++;
      check(Number.isInteger(v) && v >= 0 && v <= 9, "Invalid feature");
      const p = provenance.get(k);
      check(
        p?.value === v &&
          p.sourceRefs.length &&
          p.reasonCodes.length &&
          p.annotationMethod === "editorial_calibration",
        "Missing provenance",
      );
      for (const s of p.sourceRefs) {
        const a = sources.get(s);
        check(
          a && original.evidenceRefs.includes(a.url),
          "Untraceable source identity",
        );
        check(
          evidence.get(s)?.features.some((f) => f.code === k && f.value === v),
          "Untraceable annotation",
        );
      }
      for (const pref of original.prefectures) {
        perPref[pref] ??= { candidates: new Set(), known: 0 };
        perPref[pref].candidates.add(r.candidateKey);
        perPref[pref].known++;
      }
    }
  }
  if (r.status === "QUARANTINED")
    check(!r.provenance.length, "Held identity enriched");
  check(
    r.currentFactUsability === "UNKNOWN_REVERIFY_VIA_EXISTING_FACT_POLICY",
    "Freshness overclaim",
  );
}
const anchorIds = new Set(anchors.map((a) => a.anchorRef));
check(anchorIds.size === anchors.length, "Duplicate anchor");
const linkIndex = new Map();
for (const l of links) {
  check(
    byId.has(l.candidateKey) && anchorIds.has(l.anchorRef),
    "Dangling access link",
  );
  check(byId.get(l.candidateKey).status !== "QUARANTINED", "Held transport");
  for (const key of [
    "distanceMeters",
    "durationMinutes",
    "fare",
    "barrierFree",
    "lastMileWalkLevel",
  ])
    check(l[key] === null, "Unevidenced dynamic fact");
  check(l.currentService === "UNKNOWN", "Service certainty");
  if (!linkIndex.has(l.candidateKey)) linkIndex.set(l.candidateKey, new Set());
  check(!linkIndex.get(l.candidateKey).has(l.anchorRef), "Duplicate access");
  linkIndex.get(l.candidateKey).add(l.anchorRef);
}
const directions = new Set(),
  degrees = new Map();
for (const e of edges) {
  check(byId.has(e.from) && byId.has(e.to) && e.from !== e.to, "Invalid edge");
  check(!directions.has(`${e.from}|${e.to}`), "Duplicate direction");
  directions.add(`${e.from}|${e.to}`);
  degrees.set(e.from, (degrees.get(e.from) ?? 0) + 1);
  check(degrees.get(e.from) <= 20, "K exceeded");
  check(
    linkIndex.get(e.from)?.has(e.anchorRef) &&
      linkIndex.get(e.to)?.has(e.anchorRef),
    "Unshared anchor edge",
  );
  check(
    e.walkable === null && e.routeFeasibility === "UNKNOWN",
    "Walkability overclaim",
  );
}
for (const v of visits) {
  const p = v.profile;
  check(
    byId.has(p.poiRef) &&
      p.poiRef === v.candidateKey &&
      byId.get(p.poiRef).status !== "QUARANTINED",
    "Invalid visit identity",
  );
  const durations = [
    p.minimumDurationMinutes,
    p.recommendedDurationMinutes,
    p.maximumUsefulDurationMinutes,
  ].filter((x) => x !== null);
  check(
    durations.every(
      (x, i) =>
        Number.isInteger(x) && x >= 0 && (i === 0 || x >= durations[i - 1]),
    ),
    "Duration order",
  );
  for (const field of [
    "fixedWalkingLoad",
    "variableWalkingLoad",
    "fixedPhysicalLoad",
    "variablePhysicalLoad",
    "terrainModifier",
    "standingModifier",
  ])
    check(p[field] === null, "Invented load split");
  check(
    p.sourceRefs.every(
      (s) =>
        evidence.get(s)?.visit?.recommendedDurationMinutes ===
        p.recommendedDurationMinutes,
    ),
    "Duration evidence",
  );
}
let checksums = 0;
for (const receipt of [
  object(`${prefix}/manifests/combination-checkpoint.v1.json`),
  manifest,
])
  for (const entry of [...(receipt.inputs ?? []), ...receipt.outputs]) {
    check(
      sha(readFileSync(resolve(root, entry.path))) === entry.sha256,
      "Checksum " + entry.path,
    );
    checksums++;
  }
const scanPaths = [
  ...new Set([
    ...manifest.outputs.map((x) => x.path),
    `${prefix}/sources/reviewed-enrichment-evidence.v1.json`,
    `${prefix}/sources/retained-article-index.v1.json`,
    `${prefix}/sources/identity-observations.v1.jsonl`,
  ]),
];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_|sb_secret_)[A-Za-z0-9_]{20,}/,
  /\bsk-[A-Za-z0-9]{24,}/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{15,}/,
];
for (const p of scanPaths)
  check(
    !secretPatterns.some((re) => re.test(read(p))),
    "Credential pattern " + p,
  );
const result = {
  schemaVersion: "task068-independent-candidate-audit-v1",
  status: "PASS",
  candidateCount: rows.length,
  originalObservationCount: 10491,
  states: counts,
  known,
  nulls,
  partialVisitProfiles: visits.length,
  anchorCount: anchors.length,
  accessLinkCount: links.length,
  neighborEdges: edges.length,
  checksumsVerified: checksums,
  credentialPatternFilesScanned: scanPaths.length,
  credentialFindings: 0,
  canonicalHash: lock.hashes["src/shared/data/master-code-registry.v1.json"],
  runtimeImportAuthorized: false,
  coverageByPrefecture: Object.fromEntries(
    Object.entries(perPref).map(([p, v]) => [
      p,
      { candidates: v.candidates.size, known: v.known },
    ]),
  ),
  biasAssessment: {
    status: "INSUFFICIENT_INDEPENDENT_CALIBRATION",
    method:
      "Same rubric across regions; 785/1000-step approaches use burden 7, steep tower stairs use 5. High-risk global rankings and accessibility remain null.",
    knownLimit:
      "Small editorial subset is not representative. It cannot establish absence of regional/category bias.",
  },
};
console.log(JSON.stringify(result, null, 2));
