// Explicit review migration. Frozen source rows and original receipts remain untouched.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, sha256 } from "./task-085-gate0.mjs";
import {
  admitNodes,
  digest,
  identityFor,
  jsonl,
  generateBatch,
  validExternalId,
} from "./task-085-access-core.mjs";
import {
  CORRECTIONS_PATH,
  relationshipSemantics,
} from "./task-085-review-corrections.mjs";
import { loadInputs } from "./task-085-access-generation.mjs";

assert.ok(
  process.argv.includes("--create-reviewed-migration"),
  "EXPLICIT_MIGRATION_COMMAND_REQUIRED",
);
const baseHead = "445fbfd57d09108b271261a3d24ba51cd83103ad";
const dir = join(ROOT, "data/transport/access/inputs");
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const lines = (f) =>
  readFileSync(join(dir, f), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const records = readdirSync(dir)
  .filter((f) => f.endsWith("source-records.jsonl"))
  .flatMap(lines);
const oldBindings = lines("node-identity-bindings.jsonl");
const baseline = JSON.parse(
  execFileSync(
    "git",
    ["show", baseHead + ":data/transport/access/manifest.json"],
    { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 },
  ),
);
const oldAdmissions = execFileSync(
  "git",
  ["show", baseHead + ":data/transport/access/node-downstream-admission.jsonl"],
  { cwd: ROOT, maxBuffer: 30 * 1024 * 1024 },
)
  .toString()
  .trim()
  .split("\n")
  .map(JSON.parse);
const oldEdges = execFileSync(
  "git",
  ["show", baseHead + ":data/transport/access/topology-confirmed-edges.jsonl"],
  { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 },
)
  .toString()
  .trim()
  .split("\n")
  .map(JSON.parse);
const corrections = records
  .filter((r) => r.sourceRows?.some((s) => !validExternalId(s.stationCode)))
  .map((r) => {
    const old = oldAdmissions.find(
      (n) => n.sourceRecordSha256 === r.sourceRecordSha256,
    );
    assert.ok(old);
    return {
      name: r.name,
      sourceRecordSha256: r.sourceRecordSha256,
      sourceContentSha256: digest(r),
      oldDecision: old.decision,
      oldBinding: oldBindings.find((b) => b.nodeId === old.nodeId),
      newBinding: identityFor(r),
      reason: "MISSING_STATION_CODE_MUST_NOT_BECOME_STRING_NULL",
      sourceRowsRetainedUnmodified: true,
    };
  });
assert.equal(corrections.length, 14, "REVIEW_SCOPE_CHANGED");
const retired = new Set(corrections.map((c) => c.oldBinding.nodeId));
const bindings = [
  ...oldBindings.filter((b) => !retired.has(b.nodeId)),
  ...corrections.map((c) => c.newBinding),
];
const admissions = admitNodes(records, read("source-rights.json"), bindings);
for (const c of corrections)
  c.newDecision = admissions.find(
    (a) => a.sourceRecordSha256 === c.sourceRecordSha256,
  ).decision;
const receipt = {
  schemaVersion: "1.0",
  authorization: "USER_REVIEW_445FBFD5_IDENTITY_AND_ACCESS_CONDITIONS",
  baseHead,
  originalCounts: {
    admittedNodes: baseline.transportAdmission.acceptedTopologyNodes,
    holdRecords: oldAdmissions.filter((n) => !n.downstream085Authorized).length,
    holdUniqueNodeIds: new Set(
      oldAdmissions
        .filter((n) => !n.downstream085Authorized)
        .map((n) => n.nodeId),
    ).size,
  },
  records: corrections,
  evidenceAmendments: [
    {
      poiId: null,
      name: "みさき公園",
      sourceRefs: [
        "https://www.town.misaki.osaka.jp/soshiki/toshi_seibi/sangyo/kannkou/aratanamisakikouen/3141.html",
        "https://www.town.misaki.osaka.jp/material/files/group/20/areamap.pdf",
      ],
      observedOn: "2026-10-01",
      sourcePageUpdatedOn: "2026-07-16",
      sourceDocumentSha256:
        "9d4a0aef6c47c20a897447ed08570e625a024754e2751a43c14f24b882371fa8",
      retentionDecision: "FACTUAL_REVIEW_AND_LOCATOR_ONLY_NO_RAW_DOCUMENT",
      accessConditions: [
        "2026 official area map: A station-front plaza and marked coastal access corridor; C closed. B is parking, not a bus boarding point.",
        "Bus boarding coordinates and bus-stop-to-current-A-entrance join remain HOLD; schematic map is not licensed coordinate evidence.",
      ],
      finding:
        "The current municipal notice and linked area map explicitly establish restricted public opening of area A and the marked passage to Nagamatsu coast. Area C is closed; parking B has separate current-use rules. This is positive opening evidence, not proof of bus boarding coordinates or a complete directional walking route.",
    },
  ],
  baselineEdges: oldEdges.map((e) => ({
    edgeId: e.edgeId,
    nodeId: e.nodeId,
    poiId: e.poiId,
    direction: e.direction,
    nodeSourceRecordSha256: e.provenance.nodeSourceRecordSha256,
    semanticSha256: digest(relationshipSemantics(e)),
  })),
  correctedBaseOutputHashes: {},
};
const canonical = JSON.parse(
  readFileSync(
    join(ROOT, "src/shared/data/canonical-poi-pilot100.v1.json"),
    "utf8",
  ),
);
for (const a of receipt.evidenceAmendments)
  a.poiId = canonical.records.find((p) =>
    p.names.localized.some((n) => n.value === a.name),
  ).internalId;
function save() {
  delete receipt.receiptSha256;
  receipt.receiptSha256 = digest(receipt);
  mkdirSync(dirname(join(ROOT, CORRECTIONS_PATH)), { recursive: true });
  writeFileSync(
    join(ROOT, CORRECTIONS_PATH),
    JSON.stringify(receipt, null, 2) + "\n",
  );
}
save();
const input = loadInputs(ROOT, { includeTargeted: false });
const batch = generateBatch(
  input.pois,
  input.admissions,
  input.research,
  input.observations,
  input.rights,
  input.config,
  input.blockers,
);
receipt.correctedBaseOutputHashes = Object.fromEntries(
  [
    ["node-downstream-admission.jsonl", input.admissions],
    ["topology-confirmed-edges.jsonl", batch.edges],
    ["candidate-node-decisions.jsonl", batch.decisions],
  ].map(([name, rows]) => [name, sha256(jsonl(rows))]),
);
save();
console.log(
  JSON.stringify({
    corrections: corrections.length,
    original: receipt.originalCounts,
    correctedBaseAdmitted: admissions.filter((n) => n.downstream085Authorized)
      .length,
    edges: batch.edges.length,
  }),
);
