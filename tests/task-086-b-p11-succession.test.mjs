import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { hash } from "../tools/transport/task-086-model.mjs";
import { busStopCandidate } from "../tools/transport/task-086-bus-identities.mjs";
function fixture() {
  const record = {
    stopRecordId: "P11-22_06:bs1638",
    stopName: "山形空港",
    operator: "山交ハイヤー（株）",
    historicalRoutes: [{ name: "空港シャトル", typeCode: "1" }],
    latitude: 38.41,
    longitude: 140.37,
    coordinateScope:
      "SAME_OPERATOR_ROAD_STOP_REPRESENTATIVE_NOT_PLATFORM_OR_ENTRANCE",
    identityAsOf: "2022-08",
  };
  const current = {
    recordOperator: record.operator,
    currentOperatorName: "山形交通株式会社",
    currentStopName: record.stopName,
    historicalRoute: "空港シャトル",
    url: "https://operator.example/current",
    observedResponseSha256: "a".repeat(64),
  };
  const succession = {
    method: "PRIMARY_CORPORATE_SUCCESSION_SAME_PUBLIC_STOP",
    recordOperator: record.operator,
    predecessorLegalNames: ["山交ハイヤー株式会社", "山交バス株式会社"],
    currentLegalName: current.currentOperatorName,
    effectiveDate: "2026-04-01",
    reviewedForServiceDate: "2026-10-02",
    physicalStopContinuityReview:
      "Current operator and airport identify the same named public terminal stop; no coordinate or unrelated-operator merge.",
  };
  succession.evidence = {
    url: "https://operator.example/merger",
    observedResponseSha256: "b".repeat(64),
    locator: "Successor official merger and name-change notice",
    predecessorLegalNames: succession.predecessorLegalNames,
    currentLegalName: succession.currentLegalName,
    effectiveDate: succession.effectiveDate,
  };
  const selector = {
    name: record.stopName,
    operator: record.operator,
    line: "p11-stop:" + record.stopRecordId,
    mode: "airport_bus",
    nodeKind: "bus_stop",
    busIdentity: {
      dataset: "P11-22",
      stopRecordId: record.stopRecordId,
      recordSha256: hash(record),
      method: "EXACT_P11_OPERATOR_STOP_AND_CURRENT_SERVICE",
      coordinateScope: record.coordinateScope,
      currentPassengerAccessReview:
        "Reviewed current public stop and actual service",
      currentOperatorEvidence: current,
      currentOperatorSuccessionReview: succession,
    },
  };
  const fact = {
    serviceDate: "2026-10-02",
    corroboratingEvidence: [current, succession.evidence].map((x) => ({
      url: x.url,
      observedResponseSha256: x.observedResponseSha256,
    })),
  };
  return { selector, record, fact };
}
function build({ selector, record, fact }) {
  return busStopCandidate(selector, record, ["native", "current"], fact);
}
test("TASK086 corporate succession preserves exact historical P11 identity and bound review", () => {
  const f = fixture(),
    n = build(f);
  assert.equal(n.operatorRefs[0], f.record.operator);
  assert.equal(n.identityAnchor, "p11:22:P11-22_06:bs1638");
  assert.deepEqual(
    n.independentReview.currentOperatorSuccessionReview,
    f.selector.busIdentity.currentOperatorSuccessionReview,
  );
});
for (const [name, mutate] of [
  [
    "foreign predecessor",
    (r) => (r.predecessorLegalNames = ["別会社株式会社"]),
  ],
  ["wrong historical operator", (r) => (r.recordOperator = "別会社（株）")],
  ["foreign current operator", (r) => (r.currentLegalName = "別会社株式会社")],
  [
    "future effective date",
    (r) => {
      r.effectiveDate = "2026-11-01";
      r.evidence.effectiveDate = r.effectiveDate;
    },
  ],
  ["invalid date", (r) => (r.effectiveDate = "2026-02-30")],
  ["unrelated service date", (r) => (r.reviewedForServiceDate = "2026-10-03")],
  ["missing physical continuity", (r) => (r.physicalStopContinuityReview = "")],
  [
    "unbound notice hash",
    (r) => (r.evidence.observedResponseSha256 = "c".repeat(64)),
  ],
  [
    "unrelated notice predecessor",
    (r) => (r.evidence.predecessorLegalNames = ["別会社株式会社"]),
  ],
  [
    "missing notice predecessor",
    (r) => delete r.evidence.predecessorLegalNames,
  ],
  [
    "unbound notice URL",
    (r) => (r.evidence.url = "https://operator.example/other"),
  ],
  ["notice date mismatch", (r) => (r.evidence.effectiveDate = "2026-03-01")],
])
  test("TASK086 corporate succession rejects " + name, () => {
    const f = fixture();
    mutate(f.selector.busIdentity.currentOperatorSuccessionReview);
    assert.throws(() => build(f), /P11_OPERATOR_SUCCESSION_REVIEW_NOT_BOUND/);
  });
test("TASK086 corporate succession cannot rewrite historic selector operator or native hash", () => {
  for (const kind of ["operator", "hash"]) {
    const f = fixture();
    if (kind === "operator") f.selector.operator = "山形交通株式会社";
    else f.selector.busIdentity.recordSha256 = "c".repeat(64);
    assert.throws(() => build(f), /P11_IDENTITY_SELECTOR_MISMATCH/);
  }
});
test("TASK086 legacy exact operator review has unchanged output without succession metadata", () => {
  const f = fixture();
  delete f.selector.busIdentity.currentOperatorSuccessionReview;
  f.selector.busIdentity.currentOperatorEvidence.currentOperatorName =
    "山交ハイヤー株式会社";
  const n = build(f);
  assert.equal(
    Object.hasOwn(n.independentReview, "currentOperatorSuccessionReview"),
    false,
  );
  assert.equal(n.operatorRefs[0], f.record.operator);
});

function operatorFixture(
  historical,
  currentName,
  url = "https://operator.example/current",
  digest = "a".repeat(64),
) {
  const f = fixture();
  f.record.operator = historical;
  f.selector.operator = historical;
  f.selector.busIdentity.recordSha256 = hash(f.record);
  delete f.selector.busIdentity.currentOperatorSuccessionReview;
  Object.assign(f.selector.busIdentity.currentOperatorEvidence, {
    recordOperator: historical,
    currentOperatorName: currentName,
    url,
    observedResponseSha256: digest,
  });
  f.fact.corroboratingEvidence = [{ url, observedResponseSha256: digest }];
  return f;
}
const municipalCases = [
  [
    "練馬区",
    "練馬区（運行委託：国際興業株式会社）",
    "https://www.city.nerima.tokyo.jp/kurashi/sumai/bus/jikokuhyo/hikawadai_timetable.files/20250601_hikawadai.pdf",
    "436be81afe6b828f2ad09fa5f57ee5d940e55b7b6ab1666c862d703064aedeb0",
  ],
  [
    "宇部市",
    "宇部市交通局",
    "https://ubebus.jp/pages/532/",
    "1f699a6ace10ebe9542cdacc269a89564dfb498d822fe3e2eae8d27e176983b1",
  ],
];

test("TASK086 P11 legal-form and whitespace equality preserves native identity", () => {
  for (const name of [
    "山交ハイヤー株式会社",
    " 山交ハイヤー 株式会社 ",
    "山交ハイヤー　（株）",
  ]) {
    const f = operatorFixture("山交ハイヤー（株）", name),
      n = build(f);
    assert.equal(n.operatorRefs[0], f.record.operator);
    assert.deepEqual(n.identityRecord, f.record);
    assert.deepEqual(
      [n.latitude, n.longitude],
      [f.record.latitude, f.record.longitude],
    );
  }
});

test("TASK086 P11 genuine company change requires succession even with current evidence", () => {
  for (const name of [
    "山形交通株式会社",
    "別会社株式会社",
    "山交ハイヤー株式会社・別会社株式会社",
    "山交ハイヤー株式会社支店",
    "山交ハイヤー(株)",
  ]) {
    assert.throws(
      () => build(operatorFixture("山交ハイヤー（株）", name)),
      /P11_OPERATOR_CONTINUITY_REVIEW_REQUIRED/,
    );
  }
  for (const historical of ["山交バス（株）", "山交ハイヤー（株）"]) {
    assert.throws(
      () => build(operatorFixture(historical, "山形交通株式会社")),
      /P11_OPERATOR_CONTINUITY_REVIEW_REQUIRED/,
    );
  }
});

for (const args of municipalCases)
  test(
    "TASK086 P11 exact municipal description remains evidence-bound: " +
      args[0],
    () => {
      const f = operatorFixture(...args),
        n = build(f);
      assert.equal(n.operatorRefs[0], args[0]);
      assert.deepEqual(n.identityRecord, f.record);
      for (const mutate of [
        (x) =>
          (x.selector.busIdentity.currentOperatorEvidence.currentOperatorName +=
            "本部"),
        (x) =>
          (x.selector.busIdentity.currentOperatorEvidence.currentOperatorName =
            args[0] + "（運行委託：別会社株式会社）"),
        (x) =>
          (x.selector.busIdentity.currentOperatorEvidence.url += "?unreviewed"),
        (x) =>
          (x.selector.busIdentity.currentOperatorEvidence.observedResponseSha256 =
            "c".repeat(64)),
      ]) {
        const changed = structuredClone(f);
        mutate(changed);
        const current = changed.selector.busIdentity.currentOperatorEvidence;
        // Rebinding the generic current observation must not bypass the specifically reviewed alias.
        changed.fact.corroboratingEvidence = [
          {
            url: current.url,
            observedResponseSha256: current.observedResponseSha256,
          },
        ];
        assert.throws(
          () => build(changed),
          /P11_OPERATOR_CONTINUITY_REVIEW_REQUIRED/,
        );
      }
    },
  );

test("TASK086 P11 combined component retains both operators for one actual carrier", () => {
  for (const [old, current, carrier] of [
    [
      "岡山電気軌道（株）・中鉄バス（株）",
      "岡山電気軌道株式会社・中鉄バス株式会社",
      "岡山電気軌道株式会社",
    ],
    [
      "鹿児島交通（株）・南国交通（株）",
      "鹿児島交通株式会社・南国交通株式会社",
      "南国交通株式会社",
    ],
  ]) {
    const f = operatorFixture(old, current);
    f.fact.operator = carrier;
    assert.equal(build(f).operatorRefs[0], old);
    f.selector.busIdentity.currentOperatorEvidence.currentOperatorName =
      carrier;
    assert.throws(() => build(f), /P11_OPERATOR_CONTINUITY_REVIEW_REQUIRED/);
  }
});

test("TASK086 P11 malformed supplied succession cannot hide behind equality or municipal description", () => {
  for (const f of [
    operatorFixture("山交ハイヤー（株）", "山交ハイヤー株式会社"),
    ...municipalCases.map((args) => operatorFixture(...args)),
  ]) {
    for (const invalid of [
      null,
      false,
      "",
      0,
      [],
      {},
      { method: "NAME_ONLY" },
    ]) {
      const changed = structuredClone(f);
      changed.selector.busIdentity.currentOperatorSuccessionReview = invalid;
      assert.throws(
        () => build(changed),
        /P11_OPERATOR_SUCCESSION_REVIEW_NOT_BOUND/,
      );
    }
  }
});

test("TASK086 all retained canonical P11 selectors preserve native operator identity under continuity gate", () => {
  const records = new Map(
    fs
      .readFileSync(
        "data/transport/network/research/p11-identities.jsonl",
        "utf8",
      )
      .trim()
      .split("\n")
      .map((line) => {
        const r = JSON.parse(line);
        return [r.stopRecordId, r];
      }),
  );
  let checked = 0;
  function walk(value, fact, location) {
    if (Array.isArray(value))
      return value.forEach((v, i) => walk(v, fact, location + "/" + i));
    if (!value || typeof value !== "object") return;
    if (["service", "transfer"].includes(value.kind)) fact = value;
    if (value.busIdentity) {
      const record = records.get(value.busIdentity.stopRecordId);
      assert.ok(record, location + ": native record missing");
      const n = busStopCandidate(
        value,
        record,
        ["native-preflight", "current-preflight"],
        fact,
      );
      assert.equal(n.identityAnchor, "p11:22:" + record.stopRecordId, location);
      assert.deepEqual(n.identityRecord, record, location);
      assert.deepEqual(n.operatorRefs, [record.operator], location);
      assert.deepEqual(
        [n.latitude, n.longitude],
        [record.latitude, record.longitude],
        location,
      );
      checked++;
    }
    for (const [k, v] of Object.entries(value))
      walk(v, fact, location + "/" + k);
  }
  for (const name of fs
    .readdirSync("data/transport/network/research/phases")
    .filter((n) => n.endsWith(".json")))
    walk(
      JSON.parse(
        fs.readFileSync(
          "data/transport/network/research/phases/" + name,
          "utf8",
        ),
      ),
      null,
      name,
    );
  assert.ok(
    checked >= 346,
    "The preflight must not silently omit the reviewed canonical selector set",
  );
});
