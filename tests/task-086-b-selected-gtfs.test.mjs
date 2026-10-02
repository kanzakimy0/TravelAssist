import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { prepareLicensedGtfsPackage } from "../tools/transport/task-086-licensed-package.mjs";
import { hash } from "../tools/transport/task-086-model.mjs";

const packagePath = "data/transport/network/sources/kotoden-airport.json";
const pack = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const raw = fs.readFileSync(
  "data/transport/network/" + pack.source.retainedArchive,
);
const binding = {
  packageFile: "kotoden-airport.json",
  packageSha256: hash(pack),
  sourceActionId: pack.selection.sourceActionId,
};
const action = {
  actionId: binding.sourceActionId,
  state: "RIGHTS_REVIEWED",
  rightsFindings: [{ rightsClass: "RAW_PERSISTENCE_ALLOWED" }],
  sourcesChecked: [
    {
      url: pack.source.url,
      status: 200,
      rawPayloadRetained: true,
      contentSha256: pack.source.contentSha256,
    },
  ],
};
const prepare = (p = pack, b = binding, a = action, bytes = raw) =>
  prepareLicensedGtfsPackage(
    p,
    b,
    a,
    bytes,
    new Map(),
    new Map([[p.source.sourceId, p.source]]),
    new Map(p.evidence.map((e) => [e.evidenceId, e])),
    "2026-10-01T00:00:00Z",
  );

test("TASK086 selected licensed airport package preserves real directional stops and boarding rules", () => {
  const result = prepare();
  assert.equal(result.admitted.length, 22);
  assert.equal(result.groups.length, 2);
  assert.equal(
    result.admitted.filter((n) => n.canonicalNameJa === "高松空港").length,
    2,
  );
  assert.equal(result.groups[0].pattern.callingNodes.length, 11);
  assert.equal(result.groups[1].pattern.callingNodes.length, 12);
  assert.equal(result.groups[0].pattern.callingNodes[1].dropOffType, "1");
  assert.equal(result.groups[1].pattern.callingNodes[1].pickupType, "1");
  assert.throws(
    () => prepare(pack, { ...binding, packageSha256: hash("changed") }),
    /PACKAGE_REVIEW/,
  );
  assert.throws(
    () => prepare(pack, binding, { ...action, state: "SOURCE_FOUND" }),
    /PACKAGE_REVIEW/,
  );
  assert.throws(
    () =>
      prepare(pack, binding, {
        ...action,
        rightsFindings: [{ rightsClass: "REFERENCE_ONLY_DISCOVERY" }],
      }),
    /PACKAGE_REVIEW/,
  );
  assert.throws(
    () => prepare(pack, binding, action, Buffer.from("changed")),
    /PACKAGE_REVIEW/,
  );
  for (const change of [
    (p) => p.patterns[0].callingNodes.splice(2, 1),
    (p) => (p.patterns[0].callingNodes[1].dropOffType = "0"),
    (p) =>
      (p.patterns[0].callingNodes[1].identityAnchor =
        p.patterns[1].callingNodes.at(-1).identityAnchor),
    (p) => (p.nodes[0].identityRecord.stop_name = "unreviewed rename"),
    (p) => (p.selection.serviceDate = "20261002"),
  ]) {
    const changed = structuredClone(pack);
    change(changed);
    assert.throws(
      () => prepare(changed, { ...binding, packageSha256: hash(changed) }),
      /GTFS_|PACKAGE_/,
    );
  }
});

test("TASK086 selected GTFS extraction rejects expired feed, inactive trips, altered scope and conditional boarding", () => {
  const code = String.raw`import copy,importlib.util,io,json,zipfile
from pathlib import Path
s=importlib.util.spec_from_file_location('selected','tools/transport/task-086-extract-selected-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=json.loads(Path('data/transport/network/research/kotoden-airport-selection.json').read_text(encoding='utf8'));raw=Path('data/transport/network/sources/raw/kotoden-bus-20261001.zip').read_bytes();out=m.extract(raw,r)
assert out==json.loads(Path('data/transport/network/sources/kotoden-airport.json').read_text(encoding='utf8'))
def bad(req,blob=raw):
 try:m.extract(blob,req)
 except (ValueError,KeyError):return
 raise AssertionError('invalid request accepted')
for field,value in [('archiveSha256','0'*64),('serviceDate','20270401'),('operator','other'),('agencyId','other')]:
 q=copy.deepcopy(r);q[field]=value;bad(q)
q=copy.deepcopy(r);q['trips'][0]['reviewedStopIds'].pop(1);bad(q)
q=copy.deepcopy(r);q['trips'][0]['routeId']='other';bad(q)
import csv
src=zipfile.ZipFile(io.BytesIO(raw));cal=list(csv.DictReader(io.StringIO(src.read('calendar.txt').decode('utf-8-sig'))));next(c for c in cal if c['service_id']=='10')['thursday']='0';text=io.StringIO();w=csv.DictWriter(text,fieldnames=list(cal[0]));w.writeheader();w.writerows(cal);buf=io.BytesIO()
with zipfile.ZipFile(buf,'w') as z:
 for name in src.namelist():z.writestr(name,text.getvalue().encode() if name=='calendar.txt' else src.read(name))
blob=buf.getvalue();q=copy.deepcopy(r);q['archiveSha256']=m.sha(blob);bad(q,blob)
import csv
src=zipfile.ZipFile(io.BytesIO(raw));calls=list(csv.DictReader(io.StringIO(src.read('stop_times.txt').decode('utf-8-sig'))));row=next(c for c in calls if c['trip_id']==r['trips'][0]['sourceTripId']);row['pickup_type']='2';text=io.StringIO();w=csv.DictWriter(text,fieldnames=list(calls[0]));w.writeheader();w.writerows(calls);buf=io.BytesIO()
with zipfile.ZipFile(buf,'w') as z:
 for name in src.namelist():z.writestr(name,text.getvalue().encode() if name=='stop_times.txt' else src.read(name))
blob=buf.getvalue();q=copy.deepcopy(r);q['archiveSha256']=m.sha(blob);bad(q,blob)
print('selected GTFS semantic checks PASS')`;
  const result = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-X", "utf8", "-c", code],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("TASK086 CC0 selected package binds its distinct license to the reviewed primary terms response", () => {
  const cc0 = JSON.parse(
    fs.readFileSync(
      "data/transport/network/sources/geiyo-saijo-airport.json",
      "utf8",
    ),
  );
  const bytes = fs.readFileSync(
    "data/transport/network/" + cc0.source.retainedArchive,
  );
  const review = {
    actionId: cc0.selection.sourceActionId,
    state: "RIGHTS_REVIEWED",
    rightsFindings: [{ rightsClass: "RAW_PERSISTENCE_ALLOWED" }],
    sourcesChecked: [
      {
        url: cc0.source.url,
        status: 200,
        rawPayloadRetained: true,
        contentSha256: cc0.source.contentSha256,
      },
      {
        url: cc0.source.licenseEvidence.url,
        purpose: "terms",
        status: 200,
        contentSha256: cc0.source.licenseEvidence.observedResponseSha256,
      },
    ],
  };
  const check = (p = cc0, a = review) =>
    prepare(
      p,
      {
        packageFile: "geiyo-saijo-airport.json",
        packageSha256: hash(p),
        sourceActionId: p.selection.sourceActionId,
      },
      a,
      bytes,
    );
  assert.equal(check().admitted.length, 4);
  assert.equal(check().groups.length, 2);
  assert.equal(cc0.source.license, "CC0 1.0");
  assert.equal(cc0.source.rightsDecision, "PASS_CC0_1_0_PUBLIC_DOMAIN");
  for (const change of [
    (p) => (p.source.license = "CC BY 4.0"),
    (p) => (p.selection.license = "CC BY 4.0"),
    (p) => (p.source.rightsDecision = "PASS_CC_BY_4_0_ATTRIBUTION"),
    (p) => (p.source.licenseEvidence.url = "https://unreviewed.example/"),
    (p) => (p.source.licenseEvidence.observedResponseSha256 = "0".repeat(64)),
    (p) => delete p.selection.licenseEvidence,
    (p) => (p.source.license = "unreviewed"),
  ]) {
    const p = structuredClone(cc0);
    change(p);
    assert.throws(() => check(p), /LICENSE_BINDING/);
  }
  assert.throws(
    () =>
      check(cc0, {
        ...review,
        sourcesChecked: review.sourcesChecked.slice(0, 1),
      }),
    /LICENSE_BINDING/,
  );
  assert.throws(
    () =>
      check(cc0, {
        ...review,
        sourcesChecked: review.sourcesChecked.map((s) => ({
          ...s,
          purpose: "topology",
        })),
      }),
    /LICENSE_BINDING/,
  );
});

test("TASK086 CC0 extraction preserves dataset license and rejects missing or unknown license evidence", () => {
  const code = String.raw`import copy,importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('selected','tools/transport/task-086-extract-selected-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
p=json.loads(Path('data/transport/network/sources/geiyo-saijo-airport.json').read_text(encoding='utf8'));r=p['selection'];raw=Path('data/transport/network/'+p['source']['retainedArchive']).read_bytes();assert m.extract(raw,r)==p
for field,value in [('license','unreviewed'),('licenseEvidence',None),('licenseEvidence',{}),('licenseEvidence',{'url':r['datasetUrl'],'observedResponseSha256':'bad'}),('licenseEvidence',{'url':'https://unreviewed.example/','observedResponseSha256':'0'*64})]:
 q=copy.deepcopy(r);q[field]=value
 try:m.extract(raw,q)
 except ValueError as e:assert 'LICENSE' in str(e)
 else:raise AssertionError('unreviewed license accepted')
print('CC0 license evidence checks PASS')`;
  const result = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-X", "utf8", "-c", code],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("TASK086 operator-specific unrestricted GTFS grant binds publisher, dataset and exact primary terms", () => {
  const custom = JSON.parse(
    fs.readFileSync(
      "data/transport/network/sources/nemuro-nakashibetsu-airport.json",
      "utf8",
    ),
  );
  const bytes = fs.readFileSync(
    "data/transport/network/" + custom.source.retainedArchive,
  );
  const review = fs
    .readFileSync("data/transport/network/next-source-actions.jsonl", "utf8")
    .trim()
    .split("\n")
    .map((row) => JSON.parse(row))
    .find((a) => a.actionId === custom.selection.sourceActionId);
  const check = (p = custom, a = review) =>
    prepare(
      p,
      {
        packageFile: "nemuro-nakashibetsu-airport.json",
        packageSha256: hash(p),
        sourceActionId: p.selection.sourceActionId,
      },
      a,
      bytes,
    );
  const result = check();
  assert.equal(result.admitted.length, 58);
  assert.deepEqual(
    result.groups.map((g) => g.pattern.callingNodes.length),
    [33, 33],
  );
  assert.equal(custom.source.license, "Operator unrestricted-use terms");
  assert.equal(custom.source.rightsDecision, "PASS_OPERATOR_UNRESTRICTED_USE");
  assert.equal(
    custom.nodes.filter((n) => n.canonicalNameJa === "中標津空港").length,
    2,
  );
  for (const change of [
    (p) => delete p.source.licenseEvidence,
    (p) => (p.source.license = "CC BY 4.0"),
    (p) => (p.source.rightsDecision = "PASS_CC0_1_0_PUBLIC_DOMAIN"),
    (p) => delete p.selection.licenseEvidence,
    (p) => (p.source.licenseEvidence.publisher = "other operator"),
    (p) =>
      (p.source.licenseEvidence.reviewedDatasetUrl =
        "https://unreviewed.example/"),
    (p) => (p.source.licenseEvidence.scope = "PRIVATE_USE_ONLY"),
    (p) => (p.source.licenseEvidence.observedResponseSha256 = "0".repeat(64)),
  ]) {
    const changed = structuredClone(custom);
    change(changed);
    assert.throws(() => check(changed), /LICENSE_BINDING/);
  }
  for (const change of [
    (a) =>
      (a.sourcesChecked = a.sourcesChecked.filter(
        (s) => s.purpose !== "terms",
      )),
    (a) =>
      (a.sourcesChecked = a.sourcesChecked.map((s) =>
        s.purpose === "terms" ? { ...s, status: 404 } : s,
      )),
    (a) => (a.rightsFindings.at(-1).termsUrl = "https://unreviewed.example/"),
  ]) {
    const changed = structuredClone(review);
    change(changed);
    assert.throws(() => check(custom, changed), /LICENSE_BINDING/);
  }
});

test("TASK086 operator-specific extraction preserves its grant and rejects unreviewed grant metadata", () => {
  const code = String.raw`import copy,importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('selected','tools/transport/task-086-extract-selected-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
p=json.loads(Path('data/transport/network/sources/nemuro-nakashibetsu-airport.json').read_text(encoding='utf8'));r=p['selection'];raw=Path('data/transport/network/'+p['source']['retainedArchive']).read_bytes();assert m.extract(raw,r)==p
cases=[]
for field,value in [('url','http://unreviewed.example/'),('observedResponseSha256','bad'),('publisher','other'),('reviewedDatasetUrl','https://unreviewed.example/'),('scope','PRIVATE_USE_ONLY')]:
 q=copy.deepcopy(r);q['licenseEvidence'][field]=value;cases.append(q)
for value in [None,{}]:
 q=copy.deepcopy(r);q['licenseEvidence']=value;cases.append(q)
for q in cases:
 try:m.extract(raw,q)
 except ValueError as e:assert 'OPERATOR_TERMS_EVIDENCE_REQUIRED' in str(e)
 else:raise AssertionError('unreviewed operator grant accepted')
print('operator-specific grant extraction checks PASS')`;
  const result = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-X", "utf8", "-c", code],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
