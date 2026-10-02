import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import {
  prepareLicensedGtfsPackage,
  assertBaselineGtfsPackage,
} from "../tools/transport/task-086-licensed-package.mjs";
import {
  admitNodes,
  canonical,
  exactRecordMap,
  generatePattern,
  hash,
  id,
} from "../tools/transport/task-086-model.mjs";

const base = JSON.parse(
  fs.readFileSync("data/transport/network/sources/nagasaki-bus.json", "utf8"),
);
const raw = fs.readFileSync(
  "data/transport/network/" + base.source.retainedArchive,
);
const date = "2026-10-02T00:00:00Z";
const extraction = String.raw`
import copy,csv,importlib.util,io,json,sys,zipfile
from pathlib import Path
s=importlib.util.spec_from_file_location('selected','tools/transport/task-086-extract-selected-gtfs.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
p=json.loads(Path('data/transport/network/sources/nagasaki-bus.json').read_text(encoding='utf8'));source=p['source'];raw=Path('data/transport/network/'+source['retainedArchive']).read_bytes()
z=zipfile.ZipFile(io.BytesIO(raw))
def rows(n):return list(csv.DictReader(io.StringIO(z.read(n+'.txt').decode('utf-8-sig'))))
trip=next(t for t in rows('trips') if t['trip_id']=='023101_1_001_0');route=next(r for r in rows('routes') if r['route_id']==trip['route_id'])
calls=sorted([c for c in rows('stop_times') if c['trip_id']==trip['trip_id']],key=lambda c:int(c['stop_sequence']))
r=dict(sourceId=source['sourceId'],sourceUrl=source['url'],datasetUrl=source['datasetUrl'],archiveSha256=source['contentSha256'],retainedArchive=source['retainedArchive'],observedAt=source['observedAt'],attribution=source['attribution'],serviceDate='20261002',agencyId=route['agency_id'],operator=source['agencies'][0]['agency_name'],sourceActionId='test:reviewed-retained-gtfs',mode='local_bus',purpose='required_gateway',baseSource=source,existingAnchorReuse=dict(method='EXACT_EXISTING_GTFS_ANCHOR_SAME_ARCHIVE',sourceDescriptorSha256=m.sha(source)),trips=[])
for start,end in json.load(sys.stdin):
 selected=[c for c in calls if start<=int(c['stop_sequence'])<=end]
 r['trips'].append(dict(sourceTripId=trip['trip_id'],routeId=trip['route_id'],publishedLineName=route['route_long_name'],reviewedStopIds=[c['stop_id'] for c in selected],section=dict(fromStopSequence=start,toStopSequence=end,fullParentCallsSha256=m.sha(calls),expectedDirectionId=trip['direction_id'])))
print(json.dumps(m.extract(raw,r),ensure_ascii=False))`;
function extract(sections = [[48, 52]]) {
  const out = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-B", "-X", "utf8", "-c", extraction],
    {
      input: JSON.stringify(sections),
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  assert.equal(out.status, 0, out.stderr);
  return JSON.parse(out.stdout);
}
const pack = extract();
const sourceMap = exactRecordMap(
  [base.source, pack.source],
  "sourceId",
  "SOURCE",
);
const baseEvidence = exactRecordMap(base.evidence, "evidenceId", "EVIDENCE");
const baseline = new Map(
  admitNodes(base.nodes, sourceMap, baseEvidence).map((n) => [n.nodeId, n]),
);
const action = {
  actionId: pack.selection.sourceActionId,
  state: "RIGHTS_REVIEWED",
  rightsFindings: [{ rightsClass: "RAW_PERSISTENCE_ALLOWED" }],
  sourcesChecked: [
    {
      url: base.source.url,
      status: 200,
      rawPayloadRetained: true,
      contentSha256: hash(raw),
    },
  ],
};
function check(
  p = pack,
  nodes = baseline,
  lines = [],
  patterns = [],
  sources = sourceMap,
  ev = null,
  bindingFields = {},
  artifactDate = date,
) {
  return prepareLicensedGtfsPackage(
    p,
    {
      packageSha256: hash(p),
      sourceActionId: action.actionId,
      ...bindingFields,
    },
    action,
    raw,
    nodes,
    sources,
    ev ??
      exactRecordMap(
        [...base.evidence, ...p.evidence],
        "evidenceId",
        "EVIDENCE",
      ),
    artifactDate,
    lines,
    patterns,
  );
}

test("GTFS section pilot retains five exact existing stops and creates four directed edges with no new admissions", () => {
  const before = canonical([...baseline]);
  const result = check();
  assert.equal(result.admitted.length, 0);
  assert.equal(result.reused.length, 5);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].edges.length, 4);
  assert.deepEqual(
    result.groups[0].pattern.callingNodes.map((c) => c.sequence),
    [48, 49, 50, 51, 52],
  );
  assert.deepEqual(
    result.groups[0].pattern.callingNodes.map((c) => [
      c.pickupType,
      c.dropOffType,
    ]),
    Array(5).fill(["0", "0"]),
  );
  assert.equal(canonical([...baseline]), before);
  assert.deepEqual(pack.source, base.source);
  for (const node of result.updatedNodes) {
    const old = baseline.get(node.nodeId);
    for (const key of Object.keys(old).filter(
      (k) => !["lineRefs", "sourceRefs", "evidenceRefs"].includes(k),
    ))
      assert.deepEqual(node[key], old[key]);
    assert.ok(node.lineRefs.includes(pack.patterns[0].lineRef));
  }
});

test("GTFS sections reuse exact route identities and reject duplicate sections without mutating inputs", () => {
  const first = check();
  const nodes = new Map(baseline);
  for (const n of first.updatedNodes) nodes.set(n.nodeId, n);
  const next = extract([[49, 52]]);
  const before = canonical([...nodes]);
  const result = check(
    next,
    nodes,
    first.lines,
    first.groups.map((g) => g.pattern),
  );
  assert.equal(result.admitted.length, 0);
  assert.deepEqual(result.lines, first.lines);
  assert.equal(result.groups[0].edges.length, 3);
  assert.throws(
    () =>
      check(
        pack,
        nodes,
        first.lines,
        first.groups.map((g) => g.pattern),
      ),
    /DUPLICATE_PATTERN/,
  );
  for (const mutate of [
    (l) => (l.operatorRef = "other"),
    (l) => (l.sourceRoute.route_id = "other"),
    (l) => (l.name = "other"),
    (l) => (l.mode = "highway_bus"),
  ]) {
    const lines = structuredClone(first.lines);
    mutate(lines[0]);
    assert.throws(() => check(next, nodes, lines), /DUPLICATE_LINE/);
  }
  assert.equal(canonical([...nodes]), before);
  const split = check(
    extract([
      [48, 50],
      [50, 52],
    ]),
  );
  assert.equal(split.reused.length, 5);
  assert.equal(split.groups.flatMap((g) => g.edges).length, 4);
  assert.notEqual(
    split.groups[0].pattern.servicePatternId,
    split.groups[1].pattern.servicePatternId,
  );
});

test("GTFS reuse rejects different identities, coordinates, provenance and source rebinding", () => {
  const target = id("node", pack.nodes[0].identityAnchor);
  const mutations = [
    (n) => (n.identityAnchor = n.identityAnchor.replace(/_01$/, "_05")),
    (n) => (n.identityRecord.platform_code = "other"),
    (n) => (n.identityRecord.parent_station = "other"),
    (n) => (n.identityRecord.location_type = "1"),
    (n) => (n.identityRecord.stop_name = "other"),
    (n) => (n.latitude += 0.001),
    (n) => (n.independentReview.recordSha256 = "0".repeat(64)),
    (n) => (n.evidenceRefs = []),
    (n) => (n.decision = "HOLD"),
    (n) => (n.origin = "TASK_084_V1"),
    (n) => (n.operatorRefs = ["other"]),
  ];
  for (const mutate of mutations) {
    const nodes = structuredClone(baseline);
    mutate(nodes.get(target));
    const before = canonical([...nodes]);
    assert.throws(() => check(pack, nodes), /EXISTING_ANCHOR_MISMATCH/);
    assert.equal(canonical([...nodes]), before);
  }
  const sources = new Map(sourceMap);
  sources.set(base.source.sourceId, {
    ...base.source,
    contentSha256: "0".repeat(64),
  });
  assert.throws(
    () => check(pack, baseline, [], [], sources),
    /SOURCE_DESCRIPTOR/,
  );
  const ev = exactRecordMap(
    [...base.evidence, ...pack.evidence],
    "evidenceId",
    "EVIDENCE",
  );
  const ref = baseline.get(target).evidenceRefs[0];
  ev.set(ref, { ...ev.get(ref), locator: "stops.txt:opposite-pole" });
  assert.throws(
    () => check(pack, baseline, [], [], sourceMap, ev),
    /ANCHOR_MISMATCH|EVIDENCE_DESCRIPTOR_MISMATCH/,
  );
});

test("GTFS archive verification rejects fabricated section evidence even when all local hashes are recomputed", () => {
  for (const mutate of [
    (p) => p.patterns[0].callingNodes.splice(1, 1),
    (p) => p.patterns[0].callingNodes.reverse(),
    (p) => (p.patterns[0].callingNodes[1].pickupType = "1"),
    (p) => (p.patterns[0].direction = "0"),
    (p) =>
      (p.selection.trips[0].section.fullParentCallsSha256 = "0".repeat(64)),
    (p) => (p.selection.trips[0].section.expectedDirectionId = "0"),
    (p) => p.selection.trips[0].reviewedStopIds.splice(1, 1),
    (p) => (p.selection.serviceDate = "20261003"),
    (p) => {
      p.nodes[0].latitude += 0.1;
      p.nodes[0].identityRecord.stop_lat = String(p.nodes[0].latitude);
    },
    (p) =>
      (p.nodes[0].identityAnchor =
        "other-feed:stop:" + p.nodes[0].identityRecord.stop_id),
    (p) =>
      (p.selection.existingAnchorReuse.sourceDescriptorSha256 = "0".repeat(64)),
    (p) => (p.selection.baseSource.feedInfo.feed_version = "other"),
    (p) => {
      const e = p.evidence.find((e) => e.record.section);
      e.record.calls[1].pickup_type = "2";
      e.recordSha256 = hash(e.record);
    },
  ]) {
    const changed = structuredClone(pack);
    mutate(changed);
    assert.throws(() => check(changed), /GTFS_|CONFLICTING_/);
  }
});

test("model independently binds section to full parent calendar, direction, sequence and restrictions", () => {
  const result = check();
  const pattern = result.groups[0].pattern;
  const nodes = new Map(baseline);
  for (const n of result.updatedNodes) nodes.set(n.nodeId, n);
  for (const mutation of [
    (p, row) => row.record.calls.splice(1, 1),
    (p, row) => row.record.calls.reverse(),
    (p, row) => {
      row.record.calls[1].pickup_type = "1";
      p.callingNodes[1].pickupType = "1";
    },
    (p, row, parent) => {
      parent.record.calendar.friday = "0";
      row.record.calendar.friday = "0";
    },
    (p, row, parent) => {
      parent.record.trip.trip_id = "other";
      row.record.trip.trip_id = "other";
    },
    (p, row) => {
      row.record.section.fullParentCallsSha256 = "0".repeat(64);
      p.gtfsSection = row.record.section;
    },
    (p, row, parent) => {
      parent.record.exceptions = [
        {
          service_id: parent.record.trip.service_id,
          date: "20261002",
          exception_type: "2",
        },
      ];
      row.record.exceptions = parent.record.exceptions;
    },
  ]) {
    const p = structuredClone(pattern),
      records = structuredClone(pack.evidence);
    const row = records.find((e) => e.evidenceId === p.evidenceRefs[0]);
    const parent = records.find(
      (e) => e.evidenceId === row.record.section.parentEvidenceRef,
    );
    mutation(p, row, parent);
    row.recordSha256 = hash(row.record);
    parent.recordSha256 = hash(parent.record);
    const ev = exactRecordMap(
      [...base.evidence, ...records],
      "evidenceId",
      "EVIDENCE",
    );
    assert.throws(
      () => generatePattern(p, nodes, sourceMap, ev, date),
      /GTFS_PATTERN_SOURCE_BINDING/,
    );
  }
});

test("source/evidence loaders reject conflicting duplicate IDs and baseline rejects unsupported extension packages", () => {
  assert.equal(
    exactRecordMap(
      [base.source, structuredClone(base.source)],
      "sourceId",
      "SOURCE",
    ).size,
    1,
  );
  assert.throws(
    () =>
      exactRecordMap(
        [base.source, { ...base.source, url: "https://different.example/" }],
        "sourceId",
        "SOURCE",
      ),
    /CONFLICTING_SOURCE/,
  );
  const e = pack.evidence[0];
  assert.throws(
    () =>
      exactRecordMap(
        [e, { ...e, sourceSha256: "0".repeat(64) }],
        "evidenceId",
        "EVIDENCE",
      ),
    /CONFLICTING_EVIDENCE/,
  );
  assert.doesNotThrow(() => assertBaselineGtfsPackage(base));
  assert.throws(
    () => assertBaselineGtfsPackage(pack),
    /EXTENSION_REQUIRES_REMEDIATION/,
  );
  const onlySection = structuredClone(pack);
  delete onlySection.selection.existingAnchorReuse;
  delete onlySection.selection.baseSource;
  assert.throws(
    () => assertBaselineGtfsPackage(onlySection),
    /EXTENSION_REQUIRES_REMEDIATION/,
  );
});

test("mixed section admits only the missing exact stop and preserves reused node levels", () => {
  const nodes = new Map(baseline);
  const missing = id("node", pack.nodes[2].identityAnchor);
  nodes.delete(missing);
  const result = check(pack, nodes);
  assert.equal(result.admitted.length, 1);
  assert.equal(result.admitted[0].nodeId, missing);
  assert.equal(result.reused.length, 4);
  assert.equal(result.groups[0].edges.length, 4);
  assert.ok(!nodes.has(missing));
  for (const n of result.updatedNodes)
    assert.equal(n.nodeLevel, nodes.get(n.nodeId).nodeLevel);
});

test("section extraction rejects inactive calendar, endpoint ambiguity, parent hash, direction and skipped middle calls", () => {
  const code = extraction.replace(
    "print(json.dumps(m.extract(raw,r),ensure_ascii=False))",
    String.raw`
def bad(q):
 try:m.extract(raw,q)
 except (ValueError,KeyError):return
 raise AssertionError('invalid section accepted')
for mutate in [
 lambda q:q.update(serviceDate='20261003'),
 lambda q:q['trips'][0]['section'].update(fromStopSequence=52,toStopSequence=48),
 lambda q:q['trips'][0]['section'].update(fromStopSequence=9999),
 lambda q:q['trips'][0]['section'].update(fullParentCallsSha256='0'*64),
 lambda q:q['trips'][0]['section'].update(expectedDirectionId='0'),
 lambda q:q['trips'][0]['reviewedStopIds'].pop(1),
 lambda q:q['trips'].append(copy.deepcopy(q['trips'][0])),
 lambda q:q['baseSource'].update(retainedArchive='other.zip'),
]:
 q=copy.deepcopy(r);mutate(q);bad(q)
# No direction_id: section uses full trip endpoints, never truncated endpoints.
trip['direction_id']=''
all_trips=rows('trips');next(t for t in all_trips if t['trip_id']==trip['trip_id'])['direction_id']=''
text=io.StringIO();w=csv.DictWriter(text,fieldnames=list(all_trips[0]));w.writeheader();w.writerows(all_trips)
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w') as target:
 for name in z.namelist():target.writestr(name,text.getvalue().encode() if name=='trips.txt' else z.read(name))
raw=buf.getvalue();r.pop('baseSource');r.pop('existingAnchorReuse');r['archiveSha256']=m.sha(raw)
r['trips'][0]['section']['expectedDirectionId']='ordered:'+calls[0]['stop_id']+'>'+calls[-1]['stop_id']
out=m.extract(raw,r);assert out['patterns'][0]['direction']==r['trips'][0]['section']['expectedDirectionId']
assert out['patterns'][0]['direction']!='ordered:'+r['trips'][0]['reviewedStopIds'][0]+'>'+r['trips'][0]['reviewedStopIds'][-1]
print('section extraction negatives and parent fallback direction PASS')`,
  );
  const out = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    ["-B", "-X", "utf8", "-c", code],
    { input: "[[48,52]]", encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  assert.equal(out.status, 0, out.stdout + out.stderr);
});

test("existing-feed reuse cannot silently admit an entirely cloned node set", () => {
  assert.throws(() => check(pack, new Map()), /REUSE_ANCHOR_REQUIRED/);
});

test("conflicting map construction leaves source and evidence inputs unchanged", () => {
  for (const [rows, key, label] of [
    [
      [base.source, { ...base.source, url: "https://different.example/" }],
      "sourceId",
      "SOURCE",
    ],
    [
      [pack.evidence[0], { ...pack.evidence[0], sourceSha256: "0".repeat(64) }],
      "evidenceId",
      "EVIDENCE",
    ],
  ]) {
    const before = canonical(rows);
    assert.throws(() => exactRecordMap(rows, key, label), /CONFLICTING_/);
    assert.equal(canonical(rows), before);
  }
});

test("GTFS explicit reviewed service date preserves artifact timestamp and native section semantics", () => {
  const explicit = check(
    pack,
    baseline,
    [],
    [],
    sourceMap,
    null,
    { reviewedServiceDate: "20261002" },
    "2026-10-01T00:00:00Z",
  );
  const legacy = check();
  assert.equal(
    Object.hasOwn(legacy.groups[0].pattern, "reviewedServiceDate"),
    false,
  );
  assert.equal(explicit.groups[0].pattern.reviewedServiceDate, "20261002");
  assert.deepEqual(explicit.admitted, legacy.admitted);
  assert.deepEqual(explicit.updatedNodes, legacy.updatedNodes);
  assert.deepEqual(
    explicit.groups[0].edges.map((e) => ({ ...e, generatedAt: date })),
    legacy.groups[0].edges,
  );
  assert.ok(
    explicit.groups[0].edges.every(
      (e) => e.generatedAt === "2026-10-01T00:00:00Z",
    ),
  );
});
test("GTFS explicit reviewed service date rejects missing mismatched malformed and package-injected overrides", () => {
  for (const fields of [
    {},
    { reviewedServiceDate: undefined },
    { reviewedServiceDate: null },
    { reviewedServiceDate: 20261002 },
    { reviewedServiceDate: "20261001" },
    { reviewedServiceDate: "20261003" },
    { reviewedServiceDate: "20260230" },
  ])
    assert.throws(
      () =>
        check(
          pack,
          baseline,
          [],
          [],
          sourceMap,
          null,
          fields,
          "2026-10-01T00:00:00Z",
        ),
      /LICENSED_GTFS_PACKAGE_REVIEW_MISMATCH/,
    );
  const p = structuredClone(pack);
  p.patterns[0].reviewedServiceDate = "20261002";
  assert.throws(() => check(p), /LICENSED_GTFS_PACKAGE_REVIEW_MISMATCH/);
});
test("GTFS model explicit reviewed date remains bound to full native parent and cannot be deleted for another artifact day", () => {
  const r = check(
    pack,
    baseline,
    [],
    [],
    sourceMap,
    null,
    { reviewedServiceDate: "20261002" },
    "2026-10-01T00:00:00Z",
  );
  const ns = new Map(baseline);
  r.updatedNodes.forEach((n) => ns.set(n.nodeId, n));
  const ev = exactRecordMap(
    [...base.evidence, ...pack.evidence],
    "evidenceId",
    "EVIDENCE",
  );
  for (const dateValue of [undefined, "20261003", "20260230"]) {
    const p = structuredClone(r.groups[0].pattern);
    if (dateValue === undefined) delete p.reviewedServiceDate;
    else p.reviewedServiceDate = dateValue;
    assert.throws(
      () => generatePattern(p, ns, sourceMap, ev, "2026-10-01T00:00:00Z"),
      /GTFS_PATTERN_SOURCE_BINDING_MISMATCH/,
    );
  }
});
test("GTFS explicit reviewed date cannot rehash a weekday native section into an inactive service date", () => {
  const p = structuredClone(pack);
  p.selection.serviceDate = "20261003";
  assert.throws(
    () =>
      check(
        p,
        baseline,
        [],
        [],
        sourceMap,
        null,
        { reviewedServiceDate: "20261003" },
        "2026-10-01T00:00:00Z",
      ),
    /GTFS_/,
  );
});
