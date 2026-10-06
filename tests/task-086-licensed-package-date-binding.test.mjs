import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { prepareLicensedGtfsPackage } from "../tools/transport/task-086-licensed-package.mjs";
import {
  admitNodes,
  exactRecordMap,
  hash,
} from "../tools/transport/task-086-model.mjs";

const basePackage = JSON.parse(
  fs.readFileSync(
    "data/transport/network/sources/oitakotsu-airport.json",
    "utf8",
  ),
);
const descriptor = basePackage.source;
const raw = fs.readFileSync(
  `data/transport/network/${descriptor.retainedArchive}`,
);
const extraction = String.raw`import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('selected','tools/transport/task-086-extract-selected-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
request=json.loads(Path('tests/fixtures/task-086-gtfs-agency-subset/oita-reviewed-section.json').read_text(encoding='utf8'))
raw=Path('data/transport/network/'+request['retainedArchive']).read_bytes()
print(json.dumps(m.extract(raw,request),ensure_ascii=False))`;
const extracted = spawnSync(
  process.platform === "win32" ? "python" : "python3",
  ["-B", "-X", "utf8", "-c", extraction],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
assert.equal(extracted.status, 0, extracted.stdout + extracted.stderr);
const pack = JSON.parse(extracted.stdout);
assert.equal(hash(raw), pack.source.contentSha256);
assert.equal(hash(pack.source), hash(descriptor));
const sources = exactRecordMap([descriptor, pack.source], "sourceId", "SOURCE");
const evidenceRows = [...basePackage.evidence, ...pack.evidence];
const evidence = exactRecordMap(evidenceRows, "evidenceId", "EVIDENCE");
const baseline = new Map(
  admitNodes(basePackage.nodes, sources, evidence).map((n) => [n.nodeId, n]),
);
const action = {
  actionId: pack.selection.sourceActionId,
  state: "RIGHTS_REVIEWED",
  rightsFindings: [{ rightsClass: "RAW_PERSISTENCE_ALLOWED" }],
  sourcesChecked: [
    {
      url: descriptor.url,
      status: 200,
      rawPayloadRetained: true,
      contentSha256: hash(raw),
    },
  ],
};
const generatedAt = "2026-10-01T00:00:00Z";
const binding = {
  packageFile: "oitakotsu-niagemachi-airport-return-package.json",
  packageSha256: hash(pack),
  sourceActionId: action.actionId,
};
function prepare(reviewedServiceDate) {
  const dateBinding = { ...binding };
  if (reviewedServiceDate !== undefined)
    dateBinding.reviewedServiceDate = reviewedServiceDate;
  return prepareLicensedGtfsPackage(
    pack,
    dateBinding,
    action,
    raw,
    baseline,
    sources,
    evidence,
    generatedAt,
    basePackage.lines,
    basePackage.patterns,
  );
}

test("licensed GTFS package requires the reviewed service date when fixed artifact time differs", () => {
  assert.equal(pack.selection.serviceDate, "20261002");
  assert.equal(generatedAt.slice(0, 10), "2026-10-01");
  assert.throws(() => prepare(), /LICENSED_GTFS_PACKAGE_REVIEW_MISMATCH/);
  assert.throws(
    () => prepare("20261003"),
    /LICENSED_GTFS_PACKAGE_REVIEW_MISMATCH/,
  );
  const admitted = prepare("20261002");
  assert.equal(admitted.groups.length, 1);
  assert.equal(admitted.groups[0].edges.length, 8);
  assert.equal(
    admitted.groups[0].pattern.callingNodes[0].identityAnchor,
    "gtfs:oitakotsu-airport:stop:85 2",
  );
  assert.equal(
    admitted.groups[0].pattern.callingNodes.at(-1).identityAnchor,
    "gtfs:oitakotsu-airport:stop:2032 0",
  );
});
