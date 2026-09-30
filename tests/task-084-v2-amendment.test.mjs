import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const base = "data/transport/nodes";
const root = `${base}/task-084-b-v2-amendment-review`;
const read = (file) =>
  fs.readFileSync(file, "utf8").trim().split("\n").map(JSON.parse);
const rows = (name) => read(`${root}/${name}.jsonl`);
const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, "utf8"));
const rail = rows("rail-components");

test("TASK-084 amendment artifacts and inputs match their checksums", () => {
  for (const [name, expected] of Object.entries(manifest.artifactSha256)) {
    assert.equal(
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(root, name)))
        .digest("hex"),
      expected,
      name,
    );
  }
  for (const [name, expected] of Object.entries(manifest.inputSha256)) {
    assert.ok(
      !fs.readFileSync(name).includes(Buffer.from("\r\n")),
      `LF input: ${name}`,
    );
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(name)).digest("hex"),
      expected,
      name,
    );
  }
  const batches = manifest.batches.flatMap((b) => read(`${root}/${b.file}`));
  assert.deepEqual(batches, rail);
  assert.ok(manifest.batches.every((b) => b.count <= 200));
});

test("airport screening includes all 97 current identities without heliport/name conflation", () => {
  const airports = rows("airport-97-audit");
  assert.equal(airports.length, 97);
  assert.equal(new Set(airports.map((r) => r.officialName)).size, 97);
  assert.deepEqual(manifest.airport.categoryCounts, {
    A: 28,
    B: 54,
    C: 7,
    D: 8,
  });
  assert.equal(
    airports.find((r) => r.officialName === "千歳").annualUsage,
    null,
  );
  assert.ok(
    airports.find((r) => r.officialName === "新千歳").annualUsage.usageValue >
      0,
  );
  assert.equal(
    airports.find((r) => r.officialName === "礼文").decision,
    "CLOSED/INACTIVE",
  );
  assert.notEqual(
    airports.find((r) => r.officialName === "佐渡").decision,
    "CLOSED/INACTIVE",
  );
  assert.ok(
    airports
      .filter((r) => !r.accessReview.officialAccessGuide)
      .every((r) => r.accessReview.expectedRailComponents === null),
  );
  const yonago = rows("airport-rail-components").find(
    (r) => r.airportName === "美保",
  );
  assert.equal(yonago.stationName, "米子空港");
  assert.equal(yonago.candidateTransportNodeIds.length, 1);
  assert.equal(
    airports.find((r) => r.officialName === "札幌").accessReview
      .expectedRailComponents.length,
    0,
  );
});

test("nationwide discovery stays distinct from official validation and physical deduplication", () => {
  const bus = rows("bus-candidate-official-review");
  const nav = read(
    `${base}/task-084-b-v2-bus-discovery/navitime-discovered-candidates.jsonl`,
  );
  assert.ok(nav.length >= 191);
  assert.equal(new Set(nav.map((r) => r.discoveryRecordId)).size, nav.length);
  assert.equal(bus.filter((r) => r.discovery).length, nav.length);
  assert.ok(
    bus.every(
      (r) =>
        r.usageSource === null ||
        !new URL(r.usageSource).hostname.endsWith("navitime.co.jp"),
    ),
  );
  assert.ok(
    bus
      .filter((r) => !r.fullyOfficialValidated)
      .every((r) => r.decision !== "ACCEPT" && !r.runtimeImportAuthorized),
  );
  assert.equal(manifest.bus.uniquePhysicalFacilityCount, null);
  assert.equal(
    bus.filter((r) => r.name.startsWith("バスターミナル東京八重洲 地下"))
      .length,
    2,
  );
  assert.equal(
    bus.find((r) => r.name === "札幌駅バスターミナル").decision,
    "CLOSED/INACTIVE",
  );
});

test("Shinkansen fallback preserves operator, scope, unit and manual tier review", () => {
  const s = rows("shinkansen-usage-review");
  const find = (name, op) =>
    s.find((r) => r.canonicalNameJa === name && r.operatorRefs[0] === op);
  assert.equal(find("東京", "東日本旅客鉄道").usageValue, 70323);
  assert.equal(
    find("東京", "東日本旅客鉄道").usageMetricType,
    "DAILY_SHINKANSEN_BOARDINGS",
  );
  assert.equal(find("名古屋", "東海旅客鉄道").usageValue, 77000);
  assert.equal(
    find("博多", "九州旅客鉄道").usageMetricType,
    "STATION_COMPLEX_PROXY",
  );
  assert.equal(find("嬉野温泉", "九州旅客鉄道").usageValue, 257);
  assert.equal(find("上越妙高", "西日本旅客鉄道").usageValue, null);
  assert.equal(find("新青森", "北海道旅客鉄道").usageValue, null);
  for (const r of s.filter((r) => r.usageFallbackLevel !== 1)) {
    assert.equal(r.manualLevelReview, true);
    assert.equal(r.proposedNodeLevel, null);
  }
  assert.equal(s.filter((r) => r.usageFallbackLevel === 1).length, 48);
  assert.equal(s.length, manifest.rail.shinkansenComponents);
});

test("operator components stay separate and line lists are not reduced to one N02 feature", () => {
  assert.equal(
    new Set(rail.map((r) => r.proposedTransportNodeId)).size,
    rail.length,
  );
  assert.ok(rail.every((r) => r.operatorRefs.length === 1));
  assert.equal(rail.filter((r) => r.canonicalNameJa === "東京").length, 4);
  assert.equal(rail.filter((r) => r.canonicalNameJa === "品川").length, 3);
  const tokyo = rail.find(
    (r) => r.canonicalNameJa === "東京" && r.modeFamily === "conventional_rail",
  );
  assert.ok(tokyo.lineRefs.length >= 4);
  const shinjuku = rail.find(
    (r) => r.canonicalNameJa === "新宿" && r.operatorRefs[0] === "東京都",
  );
  assert.deepEqual(shinjuku.lineRefs, ["10号線新宿線", "12号線大江戸線"]);
  assert.equal(shinjuku.usageValue, null);
  assert.equal(shinjuku.manualLevelReview, true);
  assert.equal(
    rail.find((r) => r.canonicalNameJa === "さっぽろ").modeFamily,
    "metro",
  );
  assert.equal(
    rail.find(
      (r) => r.canonicalNameJa === "三宮" && r.operatorRefs[0] === "神戸市",
    ).modeFamily,
    "metro",
  );
  assert.equal(
    rail.find((r) => r.canonicalNameJa === "熊本駅前").modeFamily,
    "tram",
  );
  assert.ok(
    rows("hub-component-completeness-review").every(
      (r) =>
        !r.parentHubAssignmentAuthorized &&
        !r.sameNameMergeUsed &&
        !r.distanceOnlyMergeUsed,
    ),
  );
});

test("incomplete national coverage cannot authorize v2 or TASK-085/086", () => {
  assert.equal(manifest.nationalMasterStatus, "REWORK_IN_PROGRESS");
  assert.equal(manifest.nationalMasterPass, false);
  assert.equal(manifest.runtimeImportAuthorized, false);
  assert.equal(manifest.downstream085Authorized, false);
  assert.equal(manifest.downstream086Authorized, false);
  assert.equal(manifest.n03ProductionJoinExecuted, false);
  assert.ok(manifest.hubs.highTierWithoutEstablishedHubAuditScope > 0);
  assert.ok(
    rows("candidate-revision-lineage").some(
      (r) => r.previousMode !== r.currentMode,
    ),
  );
  assert.equal(
    rows("candidate-revision-lineage").filter(
      (r) => r.decision === "ADDED_OFFICIAL_HUB_COMPONENT_REVIEW",
    ).length,
    manifest.candidateRevisionCounts.ADDED_OFFICIAL_HUB_COMPONENT_REVIEW,
  );
});

test("documented interchange boundaries unify Umeda while preserving operators and physical stations", () => {
  const hubs = rows("hub-component-completeness-review");
  const hub = (name) => hubs.find((h) => h.hubReviewName === name);
  const umeda = hub("大阪・梅田");
  assert.equal(umeda.expectedComponents.length, 7);
  assert.equal(umeda.proposedHubLevel, "T0");
  assert.deepEqual(umeda.priorReviewNames, ["大阪", "梅田"]);
  assert.ok(!hub("大阪") && !hub("梅田"));
  assert.equal(
    new Set(
      umeda.expectedComponents.flatMap((c) => c.candidateTransportNodeIds),
    ).size,
    7,
  );
  assert.ok(
    umeda.expectedComponents.every(
      (c) => c.proposedParentHubId === umeda.proposedHubId,
    ),
  );
  assert.equal(hub("なんば・大阪難波").expectedComponents.length, 5);
  assert.equal(hub("天王寺・大阪阿部野橋").expectedComponents.length, 4);
  assert.equal(
    hub("押上・とうきょうスカイツリー").expectedComponents.length,
    5,
  );
  assert.equal(
    hub("押上・とうきょうスカイツリー").expectedComponents.filter(
      (c) => c.operator === "東武鉄道",
    ).length,
    2,
  );
  assert.equal(hub("練馬").expectedComponents.length, 2);
  assert.equal(
    hub("練馬").expectedComponents.find((c) => c.operator === "西武鉄道")
      .lineRefs.length,
    3,
  );
  // Same-name JR Noda and Hanshin Noda belong to different documented areas.
  const noda = rail.filter(
    (r) =>
      r.canonicalNameJa === "野田" &&
      ["西日本旅客鉄道", "阪神電気鉄道"].includes(r.operatorRefs[0]),
  );
  assert.equal(new Set(noda.map((r) => r.proposedParentHubId)).size, 2);
  assert.ok(
    hub("浅草").expectedComponents.every(
      (c) => c.operator !== "首都圏新都市鉄道",
    ),
  );
  for (const h of hubs.filter(
    (r) => r.officialInterchangeBoundaryReview === "DOCUMENTED_INTERCHANGE",
  )) {
    assert.ok(h.boundaryEvidence.length > 0);
    assert.equal(h.missingOperatorModeCount, 0);
    assert.equal(
      h.ambiguousComponentCount,
      h.hubReviewName === "武蔵小杉" ? 1 : 0,
    );
    assert.equal(h.parentHubAssignmentAuthorized, false);
  }
  assert.ok(
    hub("なかもず・中百舌鳥").expectedComponents.every(
      (c) => c.operator !== "泉北高速鉄道",
    ),
  );
});

test("annual airport threshold excludes low-volume identities without dropping their audit history", () => {
  const all = rows("airport-97-audit");
  const selected = rows("airport-planning-candidates");
  assert.equal(all.length, 97);
  assert.equal(selected.length, 86);
  assert.ok(
    selected.every(
      (r) =>
        r.annualUsage.usageValue >= 1000 && r.plannerCandidateEligible === true,
    ),
  );
  const sado = all.find((r) => r.officialName === "佐渡");
  assert.equal(sado.decision, "DEFER_NOT_PLANNER_RELEVANT");
  assert.equal(sado.annualUsage.usageValue, 0);
  assert.equal(sado.proposedNodeLevel, null);
  assert.equal(
    all.find((r) => r.officialName === "千歳").plannerCandidateEligible,
    null,
  );
  assert.equal(
    all.find((r) => r.officialName === "礼文").decision,
    "CLOSED/INACTIVE",
  );
});

test("city coverage expands Tokyo and regional centers without growing Osaka", () => {
  const cities = rows("hub-city-coverage-review");
  const hubs = rows("hub-component-completeness-review");
  assert.equal(
    cities.reduce((n, c) => n + c.currentHubScopes, 0),
    hubs.length,
  );
  assert.equal(
    cities.reduce((n, c) => n + c.previousHubScopes, 0),
    104,
  );
  assert.equal(
    cities.reduce((n, c) => n + c.currentExpectedComponents, 0),
    manifest.hubs.expectedComponents,
  );
  const city = (name) => cities.find((c) => c.cityReviewArea === name);
  assert.equal(
    city("大阪圈").currentHubScopes,
    city("大阪圈").previousHubScopes,
  );
  assert.equal(
    city("大阪圈").currentExpectedComponents,
    city("大阪圈").previousExpectedComponents,
  );
  for (const name of [
    "东京23区",
    "东京多摩",
    "名古屋圈",
    "神户",
    "福冈",
    "札幌",
    "仙台",
    "广岛",
  ])
    assert.ok(city(name).addedHubScopes > 0, name);
  assert.ok(
    cities.every(
      (c) => c.formallyAcceptedHubs === 0 && !c.nationwideCoverageComplete,
    ),
  );
  assert.ok(
    rows("high-tier-hub-coverage-gate")
      .filter((c) => c.proposedNodeLevel === "T0")
      .every((c) => c.reviewScopes.length > 0),
  );
});

test("ambiguous JR Musashi-Kosugi remains withheld and operator modes stay distinct", () => {
  const hubs = rows("hub-component-completeness-review");
  const kosugi = hubs.find((h) => h.hubReviewName === "武蔵小杉");
  assert.deepEqual(
    kosugi.expectedComponents.find((c) => c.operator === "東急電鉄").lineRefs,
    ["東横線", "目黒線"],
  );
  assert.ok(
    hubs
      .find((h) => h.hubReviewName === "日吉")
      .expectedComponents.find((c) => c.operator === "東急電鉄")
      .lineRefs.includes("東急新横浜線"),
  );
  const jr = kosugi.expectedComponents.find(
    (c) => c.operator === "東日本旅客鉄道",
  );
  assert.equal(jr.status, "MULTIPLE_COMPONENT_IDENTITIES_REVIEW_REQUIRED");
  assert.equal(jr.candidateTransportNodeIds.length, 2);
  assert.equal(jr.proposedParentHubId, null);
  assert.ok(
    rail
      .filter((c) =>
        jr.candidateTransportNodeIds.includes(c.proposedTransportNodeId),
      )
      .every((c) => c.proposedParentHubId === null),
  );
  const kamiiida = hubs.find((h) => h.hubReviewName === "上飯田");
  assert.equal(
    kamiiida.expectedComponents.find((c) => c.operator === "名古屋市")
      .modeFamily,
    "metro",
  );
  assert.equal(
    kamiiida.expectedComponents.find((c) => c.operator === "名古屋鉄道")
      .modeFamily,
    "private_rail",
  );
  const tachikawa = hubs.find((h) => h.hubReviewName === "立川");
  assert.deepEqual(
    tachikawa.expectedComponents.map((c) => c.stationName),
    ["立川", "立川北", "立川南"],
  );
  assert.ok(
    hubs
      .find((h) => h.hubReviewName === "蒲田")
      .expectedComponents.every((c) => c.stationName !== "京急蒲田"),
  );
});
