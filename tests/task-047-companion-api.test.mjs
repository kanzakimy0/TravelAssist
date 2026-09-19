import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  parseCompanionInputV1,
  parseCompanionGroupInputV1,
  MAX_COMPANIONS_PER_USER,
  MAX_COMPANION_GROUPS,
  MAX_COMPANION_GROUP_MEMBERS,
  MOBILITY_NEED_CODES,
  DINING_NEED_CODES,
  ACTIVITY_INTEREST_CODES,
} from "../src/features/companions/domain/companion-v1.ts";
import {
  fromCompanionRow,
  toCompanionColumns,
  fromGroupRow,
} from "../src/server/companions/mapper.ts";
import { parseIfMatch } from "../src/features/companions/persistence/companion-resource.ts";
import {
  companionDraftInput,
  groupDraftInput,
  toCompanionView,
  toGroupView,
  OWNER_MEMBER_ID,
} from "../src/features/companions/persistence/companion-adapter.ts";
import { companionClient } from "../src/features/companions/persistence/companion-client.ts";
import { handleCompanion } from "../src/server/companions/http.ts";
export const input = {
  displayName: "旅伴",
  relationshipCode: "family",
  relationshipLabel: "家人",
  birthDate: null,
  ageGroupFallback: "adult",
  genderCode: null,
  avatarPath: null,
  travelProfile: {
    schemaVersion: "1.0",
    mobilityNeeds: ["reduce_walking"],
    diningNeeds: ["vegetarian"],
    activityInterests: ["museums"],
  },
};
const audit = {
  id: randomUUID(),
  owner_user_id: randomUUID(),
  revision: 1,
  created_at: "2026-09-12T00:00:00Z",
  updated_at: "2026-09-12T00:00:00Z",
};
test("domain -> DB -> canonical round trip excludes owner and DB-only keys", () => {
  const resource = fromCompanionRow({
    ...audit,
    ...toCompanionColumns(parseCompanionInputV1(input, "2026-09-12")),
  });
  assert.deepEqual(
    companionDraftInput(toCompanionView(resource), resource),
    input,
  );
  assert.equal(resource.owner_user_id, undefined);
  assert.deepEqual(resource.travelProfile, input.travelProfile);
});
for (const patch of [
  { ownerUserId: randomUUID() },
  { owner_user_id: randomUUID() },
  { id: randomUUID() },
  { revision: 2 },
  { diningNote: "private" },
  { privateNote: "private" },
  { relationshipCode: "亲友" },
  { genderCode: "女" },
  { birthDate: "2027-01-01" },
  { birthDate: "2024-02-30", ageGroupFallback: null },
  { birthDate: null, ageGroupFallback: null },
  { displayName: "" },
  { displayName: "x".repeat(101) },
  { avatarPath: "blob:test" },
  { avatarPath: "../private" },
  { travelProfile: { ...input.travelProfile, medicalDiagnosis: "private" } },
  { travelProfile: { ...input.travelProfile, mobilityNeeds: ["diagnosis"] } },
])
  test(
    "reject malformed/unsafe companion " + Object.keys(patch).join(","),
    () =>
      assert.throws(() =>
        parseCompanionInputV1({ ...input, ...patch }, "2026-09-12"),
      ),
  );
test("DOB uses sole domain age rules; no age or gender inference", () => {
  const resource = fromCompanionRow({
    ...audit,
    ...toCompanionColumns({
      ...input,
      birthDate: "2024-01-01",
      ageGroupFallback: null,
      travelProfile: {
        schemaVersion: "1.0",
        mobilityNeeds: [],
        diningNeeds: [],
        activityInterests: [],
      },
    }),
  });
  assert.equal(toCompanionView(resource).ageGroup, "infant");
  assert.deepEqual(resource.travelProfile.mobilityNeeds, []);
});
test("all functional codes map round trip and sensitive UI notes are excluded", () => {
  const source = {
    ...input,
    travelProfile: {
      schemaVersion: "1.0",
      mobilityNeeds: [...MOBILITY_NEED_CODES],
      diningNeeds: [...DINING_NEED_CODES],
      activityInterests: [...ACTIVITY_INTEREST_CODES],
    },
  };
  const resource = fromCompanionRow({
    ...audit,
    ...toCompanionColumns(source),
  });
  const draft = {
    ...toCompanionView(resource),
    diningNote: "secret",
    privateNote: "secret",
    avatarUrl: "blob:preview",
  };
  assert.deepEqual(companionDraftInput(draft, resource), source);
  assert.doesNotMatch(
    JSON.stringify(companionDraftInput(draft, resource)),
    /secret|blob:/,
  );
  assert.throws(() => companionDraftInput({ ...draft, isSelf: true }));
});
test("group full ordered snapshot round trip including virtual owner", () => {
  const ids = [randomUUID(), randomUUID()];
  const resource = fromGroupRow(
    { ...audit, name: "同行组合", description: null, includes_owner: true },
    [
      { companion_id: ids[1], sort_order: 1 },
      { companion_id: ids[0], sort_order: 0 },
    ],
  );
  assert.deepEqual(resource.memberIds, ids);
  assert.deepEqual(groupDraftInput(toGroupView(resource)), {
    name: "同行组合",
    includesOwner: true,
    memberIds: ids,
  });
  assert.ok(toGroupView(resource).companionIds.includes(OWNER_MEMBER_ID));
  assert.deepEqual(
    parseCompanionGroupInputV1({
      name: "空组合",
      includesOwner: false,
      memberIds: [],
    }).memberIds,
    [],
  );
});
for (const members of [
  ["self-yuki"],
  [OWNER_MEMBER_ID],
  ["bad"],
  [null],
  Array.from({ length: MAX_COMPANION_GROUP_MEMBERS + 1 }, () => randomUUID()),
])
  test("reject invalid or excessive group members " + members.length, () =>
    assert.throws(() =>
      parseCompanionGroupInputV1({
        name: "组",
        includesOwner: true,
        memberIds: members,
      }),
    ),
  );
test("reject duplicate IDs after UUID normalization", () => {
  const id = randomUUID();
  assert.throws(() =>
    parseCompanionGroupInputV1({
      name: "组",
      includesOwner: false,
      memberIds: [id, id.toUpperCase()],
    }),
  );
});
test("group limit boundary and strict keys", () => {
  const group = {
    name: "组",
    includesOwner: false,
    memberIds: Array.from({ length: MAX_COMPANION_GROUP_MEMBERS }, () =>
      randomUUID(),
    ),
  };
  assert.equal(
    parseCompanionGroupInputV1(group).memberIds.length,
    MAX_COMPANION_GROUP_MEMBERS,
  );
  for (const extra of [
    { description: "private" },
    { ownerUserId: randomUUID() },
    { includesOwner: "true" },
    { name: "x".repeat(101) },
  ])
    assert.throws(() => parseCompanionGroupInputV1({ ...group, ...extra }));
});
for (const value of [
  null,
  "1",
  'W/"1"',
  '"0"',
  '"01"',
  '"-1"',
  '"1.2"',
  '"2147483648"',
  '"1","2"',
])
  test("If-Match rejects " + value, () =>
    assert.throws(() => parseIfMatch(value)),
  );
test("If-Match valid positive DB integer", () => {
  assert.equal(parseIfMatch('"1"'), 1);
  assert.equal(parseIfMatch('"2147483647"'), 2147483647);
});
test("transaction limits match domain source and invoker RLS remains mandatory", () => {
  const sql = readFileSync(
    "supabase/migrations/20260912090000_add_companion_transaction_api.sql",
    "utf8",
  );
  assert.match(sql, new RegExp(">= " + MAX_COMPANIONS_PER_USER));
  assert.match(sql, new RegExp(">= " + MAX_COMPANION_GROUPS));
  assert.match(
    sql,
    new RegExp(
      "cardinality\\(p_member_ids\\) > " + MAX_COMPANION_GROUP_MEMBERS,
    ),
  );
  assert.equal((sql.match(/security invoker/g) || []).length, 2);
  assert.doesNotMatch(sql, /security definer|service_role/i);
});
test("all Companion routes deny anon without configuring credentials", async () => {
  for (const group of [false, true])
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      const response = await handleCompanion(
        new NextRequest("http://localhost/api/companions", { method }),
        group,
        ["PUT", "DELETE"].includes(method) ? audit.id : undefined,
      );
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, "AUTH_REQUIRED");
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
    }
});
test("client sends If-Match, never retries 409, and leaves caller draft untouched", async () => {
  const original = globalThis.fetch,
    calls = [];
  const draft = structuredClone(input),
    before = structuredClone(draft);
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return Response.json(
        { ok: false, error: { code: "STALE_COMPANION_REVISION" } },
        { status: 409 },
      );
    };
    await assert.rejects(
      () =>
        companionClient.save(false, draft, {
          ...draft,
          id: audit.id,
          revision: 4,
        }),
      (e) => e.code === "STALE_COMPANION_REVISION",
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers["If-Match"], '"4"');
    assert.deepEqual(draft, before);
    assert.equal(calls[0].options.credentials, "same-origin");
  } finally {
    globalThis.fetch = original;
  }
});
