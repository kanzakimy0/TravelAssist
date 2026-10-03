import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildDerivedGtfsPackage,
  prepareDerivedGtfsPackage,
  reviewedDerivedGtfsComponent,
  validateDerivedGtfsInput,
  verifyDerivedGtfsReview,
  TOKACHI_GRANT_URL,
} from "../tools/transport/task-086-derived-gtfs.mjs";
import { assertBaselineGtfsPackage } from "../tools/transport/task-086-licensed-package.mjs";
import {
  canonical,
  exactRecordMap,
  hash,
  id,
  generatePattern,
  generateTransfer,
} from "../tools/transport/task-086-model.mjs";

// Synthetic native feed and review, never a real provider/source-action approval.
const nativeFixture = String.raw`
import base64,copy,csv,importlib.util,io,json,zipfile
from pathlib import Path
s=importlib.util.spec_from_file_location('derived','tools/transport/task-086-extract-derived-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
tables={
 'agency':[['agency_id','agency_name','agency_url'],['test-agency','十勝バス株式会社 ','https://www.tokachibus.jp/']],
 'feed_info':[['feed_version','feed_start_date','feed_end_date'],['fixture-20261001','20261001','20261024']],
 'routes':[['route_id','agency_id','route_long_name','route_type'],['airport','test-agency','空港連絡バス','3']],
 'trips':[['trip_id','route_id','service_id','direction_id'],['out','airport','weekday',''],['in','airport','weekday','']],
 'calendar':[['service_id','monday','tuesday','wednesday','thursday','friday','saturday','sunday','start_date','end_date'],['weekday','1','1','1','1','1','0','0','20261001','20261024']],
 'calendar_dates':[['service_id','date','exception_type']],
 'stops':[['stop_id','stop_name','stop_lat','stop_lon','location_type','parent_station','platform_code'],['office','営業所','42.90','143.1','0','',''],['station10','駅バスターミナル','42.91','143.2','0','','10'],['mid01','中間','42.80','143.21','0','',''],['airport','空港','42.73','143.22','0','',''],['mid02','中間','42.80','143.2101','0','',''],['station6','駅バスターミナル','42.9101','143.2001','0','','6']],
 'stop_times':[['trip_id','stop_id','stop_sequence','pickup_type','drop_off_type','arrival_time','departure_time'],['out','office','1','0','1','07:00:00','07:00:00'],['out','station10','2','0','1','07:10:00','07:10:00'],['out','mid01','3','0','1','07:20:00','07:20:00'],['out','airport','4','1','0','07:40:00','07:40:00'],['in','airport','1','0','1','08:40:00','08:40:00'],['in','mid02','2','1','0','09:00:00','09:00:00'],['in','station6','3','1','0','09:10:00','09:10:00'],['in','office','4','1','0','09:20:00','09:20:00']]
}
def archive():
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w') as z:
  for name,data in tables.items():
   text=io.StringIO();w=csv.writer(text);w.writerows(data);z.writestr(name+'.txt',text.getvalue().encode())
 return b.getvalue()
raw=archive();url='https://www.tokachibus.jp/download/20261001GTFS-airport.zip'
grant=('<link rel="canonical" href="'+m.GRANT_URL+'"><p>乗換案内提供事業者様におかれましてはご自由にお使いいただければと存じます。</p><a href="'+url+'">static GTFS</a>').encode()
r=dict(sourceUrl=url,archiveSha256=m.sha(raw),sourceActionId='test:tokachi-derived',serviceDate='20261002',observedAt='2026-10-02T00:00:00Z',attribution='SYNTHETIC TEST FIXTURE',grantReview=dict(termsUrl=m.GRANT_URL,observedResponseSha256=m.sha(grant),usage='ROUTE_GUIDANCE',validFrom='20261001',validTo='20261024',reviewedAt='2026-10-02T00:00:00Z',reason='Synthetic review fixture; not a real provider approval'),trips=[])
for trip,start,end in [('out',2,4),('in',1,3)]:
 allrows=[dict(zip(tables['stop_times'][0],row)) for row in tables['stop_times'][1:] if row[0]==trip]
 selected=[c for c in allrows if start<=int(c['stop_sequence'])<=end]
 r['trips'].append(dict(sourceTripId=trip,routeId='airport',publishedLineName='空港連絡バス',reviewedStopIds=[c['stop_id'] for c in selected],section=dict(fromStopSequence=start,toStopSequence=end,fullParentCallsSha256=m.sha(allrows),expectedDirectionId='ordered:'+allrows[0]['stop_id']+'>'+allrows[-1]['stop_id'])))
doc=m.extract(raw,grant,r)
print(json.dumps(doc,ensure_ascii=False))`;
function python(code) {
  const out = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-B", "-X", "utf8", "-c", code],
    { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
  );
  assert.equal(out.status, 0, out.stdout + out.stderr);
  return out.stdout;
}
const doc = JSON.parse(python(nativeFixture));
const pack = buildDerivedGtfsPackage(doc);
const date = "2026-10-02T00:00:00Z";
const binding = {
  packageFile: "test-derived.json",
  packageSha256: hash(doc),
  nativeAuditSha256: hash(doc.nativeAudit),
  derivedInputSha256: doc.nativeAudit.derivedInputSha256,
  sourceActionId: doc.nativeAudit.sourceActionId,
};
const action = {
  actionId: binding.sourceActionId,
  state: "RIGHTS_REVIEWED",
  rightsFindings: [
    {
      rightsClass: "DERIVED_STATIC_FACTS_ALLOWED",
      termsUrl: TOKACHI_GRANT_URL,
    },
  ],
  sourcesChecked: [
    {
      url: TOKACHI_GRANT_URL,
      purpose: "terms",
      status: 200,
      contentSha256: doc.nativeAudit.grantResponseSha256,
    },
    {
      url: doc.source.url,
      status: 200,
      contentSha256: doc.source.contentSha256,
      rawPayloadRetained: false,
    },
  ],
  derivedGtfsReviews: [
    {
      decision: "ADMIT_REVIEWED_DERIVED_GTFS_STATIC_INPUT",
      packageSha256: hash(doc),
      nativeAuditSha256: hash(doc.nativeAudit),
      derivedInputSha256: doc.nativeAudit.derivedInputSha256,
      sourceArchiveSha256: doc.source.contentSha256,
      grantResponseSha256: doc.nativeAudit.grantResponseSha256,
      extractorSha256: doc.nativeAudit.extractorSha256,
      validFrom: "20261001",
      validTo: "20261024",
    },
  ],
};
function prepare(
  d = doc,
  b = binding,
  a = action,
  nodes = new Map(),
  sources = null,
  evidence = null,
  artifactDate = date,
) {
  const p = buildDerivedGtfsPackage(d);
  return prepareDerivedGtfsPackage(
    d,
    b,
    a,
    nodes,
    sources ?? exactRecordMap([p.source], "sourceId", "SOURCE"),
    evidence ?? exactRecordMap(p.evidence, "evidenceId", "EVIDENCE"),
    artifactDate,
  );
}
function rehash(d) {
  d.source.derivedProjectionSha256 = hash(d.projection);
  d.nativeAudit.derivedInputSha256 = hash({
    schemaVersion: d.schemaVersion,
    kind: d.kind,
    source: d.source,
    projection: d.projection,
  });
  return {
    ...binding,
    packageSha256: hash(d),
    nativeAuditSha256: hash(d.nativeAudit),
    derivedInputSha256: d.nativeAudit.derivedInputSha256,
  };
}

test("derived GTFS clean rebuild needs only reviewed static input and preserves exact directional points", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task086-derived-input-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "input.json"), JSON.stringify(doc));
  assert.deepEqual(fs.readdirSync(dir), ["input.json"]);
  const rebuilt = JSON.parse(
    fs.readFileSync(path.join(dir, "input.json"), "utf8"),
  );
  const result = prepare(rebuilt);
  assert.equal(result.admitted.length, 5);
  assert.equal(result.groups.flatMap((g) => g.edges).length, 4);
  assert.equal(result.proof.rebuildBasis, "REVIEWED_DERIVED_STATIC_INPUT");
  assert.equal(result.proof.rawByteReproductionAvailable, false);
  assert.equal(
    result.admitted.filter((n) => n.canonicalNameJa === "駅バスターミナル")
      .length,
    2,
  );
  assert.equal(
    result.admitted.filter((n) => n.canonicalNameJa === "中間").length,
    2,
  );
  assert.ok(
    !result.admitted.some((n) => n.identityRecord.stop_id === "office"),
  );
  assert.deepEqual(
    result.groups[0].pattern.callingNodes.map((c) => [
      c.sequence,
      c.pickupType,
      c.dropOffType,
    ]),
    [
      [2, "0", "1"],
      [3, "0", "1"],
      [4, "1", "0"],
    ],
  );
  assert.equal(result.groups[0].pattern.direction, "ordered:office>airport");
  assert.equal(result.groups[1].pattern.direction, "ordered:airport>office");
  assert.equal(hash(buildDerivedGtfsPackage(rebuilt)), hash(pack));
  assert.ok(
    !/arrival_time|departure_time|retainedArchive|fare_rules|shapes/.test(
      JSON.stringify(doc),
    ),
  );
});

test("derived route-guidance grant rejects raw rights, other providers and incomplete or expired reviews", () => {
  for (const mutate of [
    (d) => (d.source.rawPayloadRetained = true),
    (d) => (d.source.rawRedistributionAllowed = true),
    (d) => (d.source.persistenceAllowed = true),
    (d) => (d.source.redistributionAllowed = false),
    (d) => (d.source.retainedArchive = "sources/raw/test.zip"),
    (d) => (d.source.rawByteReproductionAvailable = true),
    (d) => (d.source.rightsClass = "RAW_PERSISTENCE_ALLOWED"),
    (d) => (d.source.license = "CC BY 4.0"),
    (d) => (d.source.rightsReview.termsUrl = "https://other.example/"),
    (d) => (d.source.url = "https://other.example/feed.zip"),
    (d) => (d.source.rightsReview.validTo = "20261001"),
    (d) => (d.source.rightsReview.reason = ""),
    (d) => (d.source.rightsReview.usage = "RAW_REDISTRIBUTION"),
    (d) => delete d.source.rightsReview.reviewedAt,
    (d) => (d.source.agency.agency_name = "Other provider"),
    (d) => (d.source.sourceId = "gtfs:clone"),
  ]) {
    const changed = structuredClone(doc);
    mutate(changed);
    rehash(changed);
    assert.throws(() => validateDerivedGtfsInput(changed), /DERIVED_GTFS_/);
  }
  for (const mutate of [
    (a) => delete a.derivedGtfsReviews,
    (a) => (a.derivedGtfsReviews[0].validTo = "20261001"),
    (a) => (a.derivedGtfsReviews[0].extractorSha256 = "0".repeat(64)),
    (a) => (a.state = "SOURCE_FOUND"),
    (a) => a.sourcesChecked.pop(),
    (a) => (a.sourcesChecked[0].contentSha256 = "0".repeat(64)),
    (a) => (a.sourcesChecked[1].rawPayloadRetained = true),
    (a) => (a.rightsFindings[0].rightsClass = "RAW_PERSISTENCE_ALLOWED"),
  ]) {
    const changed = structuredClone(action);
    mutate(changed);
    assert.throws(
      () => verifyDerivedGtfsReview(doc, binding, changed, date),
      /VERSIONED_REVIEW_BINDING/,
    );
  }
});

test("projection and native audit cannot be forged by recomputing only package-internal hashes", () => {
  for (const mutate of [
    (d) => (d.projection.stops[0].stop_lat = "42.99"),
    (d) => (d.projection.stops[0].stop_name = "forged"),
    (d) => (d.projection.stops[0].platform_code = "other"),
    (d) => (d.projection.stops[0].parent_station = "fake-parent"),
    (d) => (d.projection.parents[0].calls[1].pickup_type = "1"),
    (d) => (d.nativeAudit.parentNativeCallsSha256.out = "0".repeat(64)),
    (d) => (d.nativeAudit.extractorSha256 = "0".repeat(64)),
  ]) {
    const changed = structuredClone(doc);
    mutate(changed);
    for (const s of changed.projection.sections)
      s.parentStaticCallsSha256 = hash(
        changed.projection.parents.find((p) => p.trip.trip_id === s.tripId)
          .calls,
      );
    const updatedBinding = rehash(changed);
    assert.throws(
      () => prepare(changed, updatedBinding),
      /VERSIONED_REVIEW_BINDING/,
    );
  }
  const changed = structuredClone(doc);
  changed.projection.stops[0].stop_lat = "42.99";
  assert.throws(() => validateDerivedGtfsInput(changed), /PROJECTION_HASH/);
});

test("derived input rejects omitted or reversed calls, altered restrictions, wrong direction and inactive calendars", () => {
  for (const mutate of [
    (d) => d.projection.sections[0].reviewedStopIds.splice(1, 1),
    (d) => (d.projection.sections[0].fromStopSequence = 4),
    (d) =>
      (d.projection.sections[0].expectedDirectionId =
        "ordered:station10>airport"),
    (d) => d.projection.parents[0].calls.reverse(),
    (d) => (d.projection.parents[0].calls[1].pickup_type = "2"),
    (d) => (d.projection.parents[0].calls[1].drop_off_type = "3"),
    (d) => (d.projection.parents[0].calendar.friday = "0"),
    (d) =>
      (d.projection.parents[0].exceptions = [
        { service_id: "weekday", date: "20261002", exception_type: "2" },
      ]),
    (d) =>
      (d.projection.parents[0].exceptions = Array(2).fill({
        service_id: "weekday",
        date: "20261002",
        exception_type: "1",
      })),
    (d) => (d.projection.parents[0].calls[1].arrival_time = "07:10:00"),
    (d) => (d.projection.stops[0].shape_id = "shape"),
    (d) => (d.projection.fares = []),
  ]) {
    const changed = structuredClone(doc);
    mutate(changed);
    rehash(changed);
    assert.throws(() => validateDerivedGtfsInput(changed), /DERIVED_GTFS_/);
  }
});

test("native private-byte audit rejects changed projection, changed archive, omitted grant and wrong reviewed flags", () => {
  const code = nativeFixture.replace(
    "print(json.dumps(doc,ensure_ascii=False))",
    String.raw`
assert m.verify(raw,grant,r,doc)==doc['nativeAudit']
for mutate in [lambda d:d['projection']['stops'][0].update(stop_lat='42.99'),lambda d:d['projection']['parents'][0]['calls'][1].update(pickup_type='1'),lambda d:d['nativeAudit'].update(nativeArchiveSha256='0'*64)]:
 d=copy.deepcopy(doc);mutate(d)
 try:m.verify(raw,grant,r,d)
 except ValueError as e:assert 'NATIVE_PROJECTION_MISMATCH' in str(e)
 else:raise AssertionError('forged projection accepted')
for mutate in [lambda q:q.update(archiveSha256='0'*64),lambda q:q['grantReview'].update(observedResponseSha256='0'*64),lambda q:q['grantReview'].update(validTo='20261001'),lambda q:q['trips'][0]['reviewedStopIds'].pop(1),lambda q:q['trips'][0]['section'].update(expectedDirectionId='ordered:station10>airport')]:
 q=copy.deepcopy(r);mutate(q)
 try:m.extract(raw,grant,q)
 except ValueError:pass
 else:raise AssertionError('invalid native audit accepted')
q=copy.deepcopy(r);bad=b'<p>No grant</p>';q['grantReview']['observedResponseSha256']=m.sha(bad)
try:m.extract(raw,bad,q)
except ValueError:pass
else:raise AssertionError('missing grant accepted')
print('native minimal projection audit negatives PASS')`,
  );
  assert.match(python(code), /audit negatives PASS/);
});

test("derived component reuse binds exact platform and reviewed public passage without merging poles", () => {
  const result = prepare(),
    nodes = new Map(result.admitted.map((n) => [n.nodeId, n]));
  const n = result.admitted.find(
    (n) => n.identityRecord.stop_id === "station6",
  );
  const selector = {
    name: n.canonicalNameJa,
    operator: n.operatorRefs[0],
    line: n.lineRefs[0],
    nodeKind: "bus_stop",
    derivedGtfsIdentity: {
      method: "EXACT_REVIEWED_DERIVED_GTFS_STOP_AND_CURRENT_INTERCHANGE",
      currentPassengerAccessReview: "test public terminal passage",
      sourceId: doc.source.sourceId,
      stopId: "station6",
      serviceDate: "20261002",
      expectedPlatformCode: "6",
      recordSha256: hash(n.identityRecord),
      sourceArchiveSha256: doc.source.contentSha256,
      derivedInputSha256: doc.nativeAudit.derivedInputSha256,
      derivedProjectionSha256: doc.source.derivedProjectionSha256,
    },
  };
  const sources = new Map([[doc.source.sourceId, doc.source]]),
    evidence = exactRecordMap(pack.evidence, "evidenceId", "EVIDENCE");
  assert.equal(
    reviewedDerivedGtfsComponent(selector, nodes, sources, evidence).nodeId,
    n.nodeId,
  );
  for (const mutate of [
    (s) => (s.derivedGtfsIdentity.stopId = "station10"),
    (s) => (s.derivedGtfsIdentity.expectedPlatformCode = "10"),
    (s) => (s.derivedGtfsIdentity.derivedInputSha256 = "0".repeat(64)),
    (s) => (s.derivedGtfsIdentity.currentPassengerAccessReview = ""),
    (s) => (s.derivedGtfsIdentity.sourceArchiveSha256 = "0".repeat(64)),
  ]) {
    const changed = structuredClone(selector);
    mutate(changed);
    assert.throws(
      () => reviewedDerivedGtfsComponent(changed, nodes, sources, evidence),
      /DERIVED_GTFS_COMPONENT/,
    );
  }
});

test("conflicting derived source/evidence, duplicate identities and legacy baseline use fail without mutation", () => {
  const sources = new Map([[doc.source.sourceId, doc.source]]),
    evidence = exactRecordMap(pack.evidence, "evidenceId", "EVIDENCE"),
    nodes = new Map();
  const before = canonical([sources, evidence, nodes].map((m) => [...m]));
  const changedSources = new Map(sources);
  changedSources.set(doc.source.sourceId, {
    ...doc.source,
    contentSha256: "0".repeat(64),
  });
  assert.throws(
    () => prepare(doc, binding, action, nodes, changedSources, evidence),
    /SOURCE_EVIDENCE_CONFLICT/,
  );
  const changedEvidence = new Map(evidence),
    ref = pack.evidence[0].evidenceId;
  changedEvidence.set(ref, {
    ...changedEvidence.get(ref),
    sourceSha256: "0".repeat(64),
  });
  assert.throws(
    () => prepare(doc, binding, action, nodes, sources, changedEvidence),
    /SOURCE_EVIDENCE_CONFLICT/,
  );
  const result = prepare();
  const prior = new Map(result.admitted.map((n) => [n.nodeId, n]));
  assert.throws(
    () => prepare(doc, binding, action, prior),
    /EXISTING_IDENTITY_REQUIRES_REVIEW/,
  );
  assert.throws(
    () =>
      exactRecordMap(
        [doc.source, { ...doc.source, url: "other" }],
        "sourceId",
        "SOURCE",
      ),
    /CONFLICTING_SOURCE/,
  );
  assert.throws(
    () => assertBaselineGtfsPackage(doc),
    /EXTENSION_REQUIRES_REMEDIATION/,
  );
  assert.equal(
    canonical([sources, evidence, nodes].map((m) => [...m])),
    before,
  );
});

test("derived pattern cannot impersonate raw reproducibility or alter native boarding restrictions", () => {
  const result = prepare(),
    nodes = new Map(result.admitted.map((n) => [n.nodeId, n])),
    sources = new Map([[doc.source.sourceId, doc.source]]),
    evidence = exactRecordMap(pack.evidence, "evidenceId", "EVIDENCE");
  const p = structuredClone(result.groups[0].pattern);
  p.callingNodes[1].dropOffType = "0";
  assert.throws(
    () => generatePattern(p, nodes, sources, evidence, date),
    /GTFS_PATTERN_SOURCE_BINDING/,
  );
  const fake = new Map(sources);
  fake.set(doc.source.sourceId, {
    ...doc.source,
    rawByteReproductionAvailable: true,
  });
  assert.throws(
    () =>
      generatePattern(result.groups[0].pattern, nodes, fake, evidence, date),
    /DERIVED_GTFS_PATTERN_PROVENANCE/,
  );
});

test("reviewed derived sequence cannot be relabeled as native raw GTFS", () => {
  const result = prepare(),
    nodes = new Map(result.admitted.map((n) => [n.nodeId, n]));
  const pattern = {
    ...result.groups[0].pattern,
    sequenceEvidence: "GTFS_TRIP_STOP_SEQUENCE",
  };
  assert.throws(
    () =>
      generatePattern(
        pattern,
        nodes,
        new Map([[doc.source.sourceId, doc.source]]),
        exactRecordMap(pack.evidence, "evidenceId", "EVIDENCE"),
        date,
      ),
    /CANNOT_CLAIM_RAW_SEQUENCE/,
  );
});

test("official transfer model rejects forged derived selector even when names and lines still match", () => {
  const result = prepare(),
    nodes = new Map(result.admitted.map((n) => [n.nodeId, n]));
  const selected = ["station6", "station10"].map((stop) =>
    result.admitted.find((n) => n.identityRecord.stop_id === stop),
  );
  const components = selected.map((n) => ({
    name: n.canonicalNameJa,
    operator: n.operatorRefs[0],
    line: n.lineRefs[0],
    nodeKind: "bus_stop",
    derivedGtfsIdentity: {
      method: "EXACT_REVIEWED_DERIVED_GTFS_STOP_AND_CURRENT_INTERCHANGE",
      currentPassengerAccessReview:
        "synthetic explicit public terminal passage",
      sourceId: doc.source.sourceId,
      stopId: n.identityRecord.stop_id,
      serviceDate: "20261002",
      expectedPlatformCode: n.identityRecord.platform_code,
      recordSha256: hash(n.identityRecord),
      sourceArchiveSha256: doc.source.contentSha256,
      derivedInputSha256: doc.nativeAudit.derivedInputSha256,
      derivedProjectionSha256: doc.source.derivedProjectionSha256,
    },
  }));
  const publicSource = {
    sourceId: "test:public-passage",
    url: "https://public.example/terminal",
    observedAt: date,
    contentSha256: hash("synthetic public passage"),
    rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
    rawPayloadRetained: false,
    derivedDataAllowed: true,
    redistributionAllowed: true,
    rightsDecision: "TEST_FACT_ONLY",
    rightsReview: {
      scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
      termsUrl: "https://public.example/terms",
      reason: "Synthetic independent public passage fixture",
    },
  };
  const sources = new Map([
      [doc.source.sourceId, doc.source],
      [publicSource.sourceId, publicSource],
    ]),
    evidence = exactRecordMap(pack.evidence, "evidenceId", "EVIDENCE");
  const put = (evidenceId, record) =>
    evidence.set(evidenceId, {
      evidenceId,
      sourceId: publicSource.sourceId,
      sourceSha256: publicSource.contentSha256,
      locator: evidenceId,
      record,
      recordSha256: hash(record),
    });
  const fact = { kind: "transfer", components, directions: [[0, 1]] };
  const transfer = {
    from: selected[0].nodeId,
    to: selected[1].nodeId,
    hubRef: "test:terminal",
    directed: true,
    evidenceKind: "OFFICIAL_INTERCHANGE",
    strictFactBinding: true,
    evidenceRefs: ["resolved"],
    sourceRefs: [publicSource.url],
  };
  put("fact", fact);
  put("resolved", {
    from: transfer.from,
    to: transfer.to,
    hubRef: transfer.hubRef,
    sourceFactRef: "fact",
  });
  assert.doesNotThrow(() =>
    generateTransfer(transfer, nodes, sources, evidence, date),
  );
  for (const mutate of [
    (r) => (r.recordSha256 = "0".repeat(64)),
    (r) => (r.expectedPlatformCode = "10"),
    (r) => (r.currentPassengerAccessReview = ""),
    (r) => (r.derivedInputSha256 = "0".repeat(64)),
    (r) => (r.method = "NAME_ONLY"),
    (r) => (r.sourceArchiveSha256 = "0".repeat(64)),
  ]) {
    const changed = structuredClone(fact);
    mutate(changed.components[0].derivedGtfsIdentity);
    put("fact", changed);
    assert.throws(
      () => generateTransfer(transfer, nodes, sources, evidence, date),
      /OFFICIAL_TRANSFER_SOURCE_BINDING_MISMATCH/,
    );
  }
});

test("derived GTFS explicit reviewed service date preserves old artifact timestamp and native audit binding", () => {
  const result = prepare(
    doc,
    { ...binding, reviewedServiceDate: "20261002" },
    action,
    new Map(),
    null,
    null,
    "2026-10-01T00:00:00Z",
  );
  assert.ok(
    result.groups.every((g) => g.pattern.reviewedServiceDate === "20261002"),
  );
  assert.ok(
    result.groups
      .flatMap((g) => g.edges)
      .every((e) => e.generatedAt === "2026-10-01T00:00:00Z"),
  );
  assert.deepEqual(result.admitted, prepare().admitted);
});
test("derived GTFS override rejects implicit mismatched malformed and expired reviewed dates", () => {
  for (const fields of [
    {},
    { reviewedServiceDate: undefined },
    { reviewedServiceDate: null },
    { reviewedServiceDate: 20261002 },
    { reviewedServiceDate: "20261001" },
    { reviewedServiceDate: "20261003" },
    { reviewedServiceDate: "20260230" },
    { reviewedServiceDate: "20261025" },
  ])
    assert.throws(
      () =>
        prepare(
          doc,
          { ...binding, ...fields },
          action,
          new Map(),
          null,
          null,
          "2026-10-01T00:00:00Z",
        ),
      /DERIVED_GTFS_VERSIONED_REVIEW_BINDING/,
    );
  const expired = structuredClone(action);
  expired.derivedGtfsReviews[0].validTo = "20261001";
  assert.throws(
    () =>
      prepare(
        doc,
        { ...binding, reviewedServiceDate: "20261002" },
        expired,
        new Map(),
        null,
        null,
        "2026-10-01T00:00:00Z",
      ),
    /DERIVED_GTFS_VERSIONED_REVIEW_BINDING/,
  );
});

const cityDoc = JSON.parse(
  python(nativeFixture.replaceAll("GTFS-airport.zip", "GTFS-dia.zip")),
);
function cityReview() {
  const b = {
    ...binding,
    packageSha256: hash(cityDoc),
    nativeAuditSha256: hash(cityDoc.nativeAudit),
    derivedInputSha256: cityDoc.nativeAudit.derivedInputSha256,
  };
  const a = structuredClone(action);
  a.sourcesChecked[0].contentSha256 = cityDoc.nativeAudit.grantResponseSha256;
  a.sourcesChecked[1].url = cityDoc.source.url;
  a.sourcesChecked[1].contentSha256 = cityDoc.source.contentSha256;
  a.derivedGtfsReviews[0] = {
    ...a.derivedGtfsReviews[0],
    packageSha256: b.packageSha256,
    nativeAuditSha256: b.nativeAuditSha256,
    derivedInputSha256: b.derivedInputSha256,
    sourceArchiveSha256: cityDoc.source.contentSha256,
    grantResponseSha256: cityDoc.nativeAudit.grantResponseSha256,
    extractorSha256: cityDoc.nativeAudit.extractorSha256,
  };
  return { b, a };
}
test("Tokachi city dependency preserves independent source identity, local mode and boarding restrictions", () => {
  const { b, a } = cityReview(),
    result = prepare(cityDoc, b, a),
    cityPack = buildDerivedGtfsPackage(cityDoc);
  assert.equal(cityDoc.source.sourceId, "gtfs:tokachi-city");
  assert.ok(result.groups.every((g) => g.pattern.mode === "local_bus"));
  assert.ok(cityPack.lines.every((l) => l.mode === "local_bus"));
  assert.deepEqual(
    result.groups.map((g) =>
      g.pattern.callingNodes.map((c) => [
        c.sequence,
        c.pickupType,
        c.dropOffType,
      ]),
    ),
    prepare().groups.map((g) =>
      g.pattern.callingNodes.map((c) => [
        c.sequence,
        c.pickupType,
        c.dropOffType,
      ]),
    ),
  );
  assert.equal(result.groups.flatMap((g) => g.edges).length, 4);
  const airportIds = new Set(prepare().admitted.map((n) => n.nodeId));
  assert.ok(result.admitted.every((n) => !airportIds.has(n.nodeId)));
  const n = result.admitted.find(
      (n) => n.identityRecord.stop_id === "station6",
    ),
    sources = new Map([[cityDoc.source.sourceId, cityDoc.source]]),
    evidence = exactRecordMap(cityPack.evidence, "evidenceId", "EVIDENCE"),
    nodes = new Map(result.admitted.map((n) => [n.nodeId, n]));
  const selector = {
    name: n.canonicalNameJa,
    operator: n.operatorRefs[0],
    line: n.lineRefs[0],
    nodeKind: "bus_stop",
    derivedGtfsIdentity: {
      method: "EXACT_REVIEWED_DERIVED_GTFS_STOP_AND_CURRENT_INTERCHANGE",
      currentPassengerAccessReview: "Synthetic public passage fixture",
      sourceId: cityDoc.source.sourceId,
      stopId: "station6",
      serviceDate: "20261002",
      expectedPlatformCode: "6",
      recordSha256: hash(n.identityRecord),
      sourceArchiveSha256: cityDoc.source.contentSha256,
      derivedInputSha256: cityDoc.nativeAudit.derivedInputSha256,
      derivedProjectionSha256: cityDoc.source.derivedProjectionSha256,
    },
  };
  assert.equal(
    reviewedDerivedGtfsComponent(selector, nodes, sources, evidence).nodeId,
    n.nodeId,
  );
  selector.derivedGtfsIdentity.sourceId = doc.source.sourceId;
  assert.throws(
    () => reviewedDerivedGtfsComponent(selector, nodes, sources, evidence),
    /DERIVED_GTFS_COMPONENT/,
  );
});
test("Tokachi derived source family cannot be swapped or expanded by rehashing", () => {
  for (const original of [doc, cityDoc])
    for (const mutate of [
      (d) =>
        (d.source.sourceId =
          d.source.sourceId === "gtfs:tokachi-city"
            ? "gtfs:tokachi-airport"
            : "gtfs:tokachi-city"),
      (d) => {
        d.source.url = d.source.url.replace(".zip", "-extra.zip");
        d.source.rightsReview.sourceUrl = d.source.url;
      },
      (d) => {
        d.source.url = d.source.url.replace(
          "www.tokachibus.jp",
          "other.example",
        );
        d.source.rightsReview.sourceUrl = d.source.url;
      },
    ]) {
      const d = structuredClone(original);
      mutate(d);
      rehash(d);
      assert.throws(() => validateDerivedGtfsInput(d), /DERIVED_GTFS_GRANT/);
    }
  const { b, a } = cityReview();
  for (const mutate of [
    (x) => (x.sourcesChecked[1].url = doc.source.url),
    (x) => (x.derivedGtfsReviews[0].validTo = "20261001"),
    (x) => (x.sourcesChecked[1].contentSha256 = "0".repeat(64)),
  ]) {
    const changed = structuredClone(a);
    mutate(changed);
    assert.throws(
      () => prepare(cityDoc, b, changed),
      /VERSIONED_REVIEW_BINDING/,
    );
  }
});
test("native city projection requires its own exact archive link in the same current operator grant", () => {
  const code = nativeFixture
    .replaceAll("GTFS-airport.zip", "GTFS-dia.zip")
    .replace(
      "print(json.dumps(doc,ensure_ascii=False))",
      String.raw`
assert doc['source']['sourceId']=='gtfs:tokachi-city'
assert m.verify(raw,grant,r,doc)==doc['nativeAudit']
bad=grant.replace(b'GTFS-dia.zip',b'GTFS-airport.zip');q=copy.deepcopy(r);q['grantReview']['observedResponseSha256']=m.sha(bad)
try:m.extract(raw,bad,q)
except ValueError as e:assert 'GRANT_CURRENT_ARCHIVE_BINDING' in str(e)
else:raise AssertionError('airport-only link authorized city archive')
for url in ['https://www.tokachibus.jp/download/20261001GTFS-dia-extra.zip','https://other.example/download/20261001GTFS-dia.zip']:
 q=copy.deepcopy(r);q['sourceUrl']=url
 try:m.extract(raw,grant,q)
 except ValueError as e:assert 'SOURCE_SCOPE' in str(e)
 else:raise AssertionError('unsupported archive source accepted')
print('city native negative PASS')`,
    );
  assert.match(python(code), /city native negative PASS/);
});
