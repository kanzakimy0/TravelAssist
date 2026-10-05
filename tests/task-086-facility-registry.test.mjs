import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { loadOfficialBusFacilityInputs } from "../tools/transport/task-086-official-facility-bus-registry.mjs";
const d = path.join(import.meta.dirname, "fixtures/task-086-onboard-request"),
  reg = d + "/registration",
  read = (p) => JSON.parse(fs.readFileSync(p, "utf8")),
  conf = read(reg + "/research/public-bus-facilities.v1.json");
const packs = fs
  .readdirSync(reg + "/sources")
  .filter((n) => n.endsWith(".json"))
  .map((n) => read(reg + "/sources/" + n));
const sources = new Map(packs.map((p) => [p.source.sourceId, p.source])),
  evidence = new Map(
    packs.flatMap((p) => p.evidence).map((e) => [e.evidenceId, e]),
  );
const actions = read(d + "/source-packet.json").sourceRights;
function extract(entry, change) {
  const request = {
    ...structuredClone(entry.extraction),
    archiveAbsolutePath: reg + "/" + entry.archivePath,
  };
  change(request);
  return execFileSync(
    process.env.TASK086_PYTHON ?? "python",
    [
      path.resolve(
        import.meta.dirname,
        "../tools/transport/task-086-extract-official-bus-facility.py",
      ),
    ],
    {
      input: JSON.stringify(request),
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}
test("persisted licensed archives actually extract two exact native records", () => {
  const r = loadOfficialBusFacilityInputs(reg, sources, evidence, actions);
  assert.equal(r.candidates.size, 2);
  assert.equal(r.nativeFacilityByAnchor.size, 2);
  assert.ok(r.inputPaths.includes("research/public-bus-facilities.v1.json"));
  for (const e of conf.facilities)
    assert.deepEqual(JSON.parse(extract(e, () => {})), e.nativeIdentity);
});
for (const [name, idx, mutate, code] of [
  [
    "archive changed",
    0,
    (r) => (r.archiveSha256 = "0".repeat(64)),
    "ARCHIVE_CHANGED",
  ],
  [
    "member changed",
    0,
    (r) => (r.memberSha256 = "0".repeat(64)),
    "MEMBER_CHANGED",
  ],
  [
    "wrong physical feature",
    0,
    (r) => r.featureIndex++,
    "NATIVE_RECORD_CHANGED",
  ],
  [
    "wrong native record hash",
    0,
    (r) => (r.nativeRecordSha256 = "0".repeat(64)),
    "NATIVE_RECORD_CHANGED",
  ],
  [
    "CSV header changed",
    1,
    (r) => (r.header[0] += "wrong"),
    "CSV_LAYOUT_CHANGED",
  ],
  ["CSV row count changed", 1, (r) => r.rowCount--, "CSV_LAYOUT_CHANGED"],
  [
    "CSV empty row count changed",
    1,
    (r) => r.emptyRowCount--,
    "EMPTY_ROWS_CHANGED",
  ],
  [
    "CSV record shifted",
    1,
    (r) => r.logicalRowIndex--,
    "NATIVE_RECORD_CHANGED",
  ],
  [
    "unknown dataset",
    0,
    (r) => (r.dataset = "GOOGLE_MAP"),
    "UNREVIEWED_DATASET",
  ],
])
  test("source parser rejects " + name, () =>
    assert.throws(
      () => extract(conf.facilities[idx], mutate),
      new RegExp(code),
    ),
  );
test("withdrawn native source permissions reject actual registry loader", () => {
  const s = new Map(sources),
    e = conf.facilities[0],
    sid = evidence.get(e.nativeIdentityEvidenceRef).sourceId;
  s.set(sid, { ...s.get(sid), persistenceAllowed: false });
  assert.throws(
    () => loadOfficialBusFacilityInputs(reg, s, evidence, actions),
    /NATIVE_EVIDENCE/,
  );
});
test("stripped native evidence rejected before facility admission", () => {
  const e = new Map(evidence);
  e.delete(conf.facilities[0].nativeIdentityEvidenceRef);
  assert.throws(
    () => loadOfficialBusFacilityInputs(reg, sources, e, actions),
    /NATIVE_EVIDENCE/,
  );
});
test("removed current named component review cannot pass persisted loader", () => {
  const e = new Map(evidence);
  e.delete(conf.facilities[0].componentEvidenceRefs[0]);
  assert.throws(
    () => loadOfficialBusFacilityInputs(reg, sources, e, actions),
    /COMPONENT_NOT_BOUND/,
  );
});
test("removed source action cannot pass persisted loader", () =>
  assert.throws(() =>
    loadOfficialBusFacilityInputs(reg, sources, evidence, []),
  ));
