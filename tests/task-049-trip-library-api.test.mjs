import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { NextRequest } from "next/server";
import {
  parseTripDraftRequest,
  parseTripSaveRequest,
  parseTripCopyRequest,
  parseTripIfMatch,
  TRIP_HTTP_MAX_BYTES,
} from "../src/features/trip-library/persistence/requests.ts";
import {
  parseTripListQuery,
  encodeTripCursor,
} from "../src/server/trip-library/query.ts";
import { creationIntentHash } from "../src/server/trip-library/repository.ts";
import {
  readPrivateJson,
  PRIVATE_HTTP_MAX_BYTES,
} from "../src/server/private-http.ts";
import { saveTripPlan } from "../src/shared/contracts/trip-library/client.ts";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
  minimalDraftFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import { planAtBytes, patch } from "./task-048-trip-fixtures.mjs";
const create = () => ({
  schemaVersion: "1.0",
  creationKey: randomUUID(),
  draftFacts: fullDraftFixture(),
  wizardProgress: progressFixture(),
  partySelection: { includesOwner: true, companionIds: [] },
});
const bad = (run, code = "INVALID_REQUEST") =>
  assert.throws(run, (e) => e.code === code);
test("create delegates canonical content and normalizes absent patch/reference date", () => {
  const input = create(),
    parsed = parseTripDraftRequest(input, true);
  assert.deepEqual(parsed.preferenceOverridePatch, patch());
  assert.equal(
    parsed.partySelection.ageReferenceDate,
    input.draftFacts.dates.departure,
  );
  parsed.draftFacts.title = "detached";
  assert.notEqual(input.draftFacts.title, "detached");
});
for (const key of [
  "owner",
  "ownerUserId",
  "owner_user_id",
  "id",
  "storageRevision",
  "preferenceSnapshot",
  "preferenceSourceRevision",
  "partySnapshot",
  "createdAt",
  "updatedAt",
  "frozenAt",
  "canonicalTripId",
  "planSnapshot",
  "reservation",
  "favorites",
])
  test("create rejects client " + key, () =>
    bad(() => parseTripDraftRequest({ ...create(), [key]: null }, true)),
  );
for (const field of [
  "schemaVersion",
  "creationKey",
  "draftFacts",
  "wizardProgress",
  "partySelection",
])
  test("create requires " + field, () => {
    const input = create();
    delete input[field];
    bad(() => parseTripDraftRequest(input, true));
  });
for (const value of [null, [], {}, "1.0", 1])
  test("reject invalid create input " + JSON.stringify(value), () =>
    bad(() => parseTripDraftRequest(value, true)),
  );
test("no hidden/accessor top-level fields execute", () => {
  const input = create();
  let ran = false;
  Object.defineProperty(input, "owner", {
    get() {
      ran = true;
      return randomUUID();
    },
  });
  bad(() => parseTripDraftRequest(input, true));
  assert.equal(ran, false);
});
test("planned/undecided dates require explicit strict date; exact departure wins", () => {
  const input = create();
  input.draftFacts = minimalDraftFixture();
  bad(() => parseTripDraftRequest(input, true));
  input.partySelection.ageReferenceDate = "2027-02-29";
  bad(() => parseTripDraftRequest(input, true));
  input.partySelection.ageReferenceDate = "2028-02-29";
  assert.equal(
    parseTripDraftRequest(input, true).partySelection.ageReferenceDate,
    "2028-02-29",
  );
  input.draftFacts = fullDraftFixture();
  assert.equal(
    parseTripDraftRequest(input, true).partySelection.ageReferenceDate,
    "2027-04-10",
  );
});
test("party bounds, duplicates after UUID normalization, unknown snapshot fields", () => {
  const input = create();
  const id = randomUUID();
  input.partySelection.companionIds = [id, id.toUpperCase()];
  bad(() => parseTripDraftRequest(input, true));
  input.partySelection.companionIds = Array.from({ length: 101 }, randomUUID);
  bad(() => parseTripDraftRequest(input, true));
  input.partySelection.companionIds = Array.from({ length: 100 }, randomUUID);
  assert.equal(
    parseTripDraftRequest(input, true).partySelection.companionIds.length,
    100,
  );
  input.partySelection.birthDate = "1990-01-01";
  bad(() => parseTripDraftRequest(input, true));
});
test("canonical invalid draft and progress have stable errors", () => {
  const input = create();
  input.draftFacts.selectedDay = 1;
  bad(() => parseTripDraftRequest(input, true), "INVALID_TRIP_DRAFT_INPUT");
  delete input.draftFacts.selectedDay;
  input.wizardProgress.phase = "made_up";
  bad(() => parseTripDraftRequest(input, true), "INVALID_TRIP_DRAFT_INPUT");
});
test("patch remains accepted sparse set/unset semantics", () => {
  const input = create();
  input.preferenceOverridePatch = patch({ "mobility.noBus": false });
  assert.deepEqual(
    parseTripDraftRequest(input, true).preferenceOverridePatch,
    input.preferenceOverridePatch,
  );
  input.preferenceOverridePatch = patch({ "mobility.noBus": true }, [
    "mobility.noBus",
  ]);
  bad(
    () => parseTripDraftRequest(input, true),
    "INVALID_TRIP_PREFERENCE_PATCH",
  );
});
test("PUT full replacement has exactly four fields and no creation identity", () => {
  const input = create();
  delete input.schemaVersion;
  delete input.creationKey;
  bad(() => parseTripDraftRequest(input));
  input.preferenceOverridePatch = patch();
  assert.equal(parseTripDraftRequest(input).creationKey, undefined);
  input.schemaVersion = "1.0";
  bad(() => parseTripDraftRequest(input));
});
for (const value of [
  null,
  "",
  "1",
  '"0"',
  '"01"',
  '"2147483648"',
  '"99999999999999999999"',
  "*",
  'W/"1"',
  '"1", "2"',
  ' "1"',
  '"1.0"',
  '"-1"',
])
  test("If-Match rejects " + JSON.stringify(value), () =>
    bad(() => parseTripIfMatch(value)),
  );
test("If-Match accepts exact positive int32", () => {
  assert.equal(parseTripIfMatch('"1"'), 1);
  assert.equal(parseTripIfMatch('"2147483647"'), 2147483647);
});
test("save delegates exact A plan without inventing canonical IDs or revisions", () => {
  const plan = fullSnapshotFixture(),
    result = parseTripSaveRequest({ schemaVersion: "1.0", planSnapshot: plan });
  assert.deepEqual(result, plan);
  assert.notEqual(result, plan);
  bad(
    () => parseTripSaveRequest({ schemaVersion: "1.0", planSnapshot: null }),
    "INVALID_TRIP_PLAN_INPUT",
  );
  plan.trip.activePlanId = "not-present";
  bad(
    () => parseTripSaveRequest({ schemaVersion: "1.0", planSnapshot: plan }),
    "INVALID_TRIP_PLAN_INPUT",
  );
});
for (const key of [
  "ownerUserId",
  "draftFacts",
  "canonicalTripId",
  "storageRevision",
  "preferenceSnapshot",
])
  test("save rejects " + key, () =>
    bad(() =>
      parseTripSaveRequest({
        schemaVersion: "1.0",
        planSnapshot: fullSnapshotFixture(),
        [key]: null,
      }),
    ),
  );
test("copy strict versioned new key only", () => {
  const key = randomUUID();
  assert.equal(
    parseTripCopyRequest({ schemaVersion: "1.0", creationKey: key }),
    key,
  );
  bad(() =>
    parseTripCopyRequest({
      schemaVersion: "1.0",
      creationKey: key,
      planSnapshot: null,
    }),
  );
  bad(() => parseTripCopyRequest({ schemaVersion: "2.0", creationKey: key }));
});
for (const query of [
  "owner=x",
  "limit=0",
  "limit=51",
  "limit=01",
  "limit=1.1",
  "state=upcoming",
  "state=",
  "state=draft&state=saved",
  "limit=1&limit=2",
  "cursor=",
  "cursor=abc=",
  "cursor=" + "x".repeat(257),
])
  test("list rejects " + query.slice(0, 65), () =>
    bad(() => parseTripListQuery(new URLSearchParams(query))),
  );
test("strict opaque cursor roundtrip retains microseconds and ordering tuple", () => {
  const cursor = { id: randomUUID(), updatedAt: "2026-09-12T01:02:03.123456Z" },
    token = encodeTripCursor(cursor);
  assert.deepEqual(
    parseTripListQuery(
      new URLSearchParams({ state: "history", limit: "50", cursor: token }),
    ),
    { state: "history", limit: 50, cursor },
  );
  assert.deepEqual(parseTripListQuery(new URLSearchParams()), {
    state: "all",
    limit: 20,
    cursor: null,
  });
  for (const v of [
    { version: 2, ...cursor },
    { version: 1, ...cursor, owner: randomUUID() },
    { version: 1, ...cursor, updatedAt: "2026-02-30T00:00:00Z" },
  ])
    bad(() =>
      parseTripListQuery(
        new URLSearchParams({
          cursor: Buffer.from(JSON.stringify(v)).toString("base64url"),
        }),
      ),
    );
});
test("original intent hashing ignores object key order but keeps ordered companions and copy source", () => {
  assert.equal(
    creationIntentHash({ a: 1, b: 2 }),
    creationIntentHash({ b: 2, a: 1 }),
  );
  assert.notEqual(
    creationIntentHash({ ids: ["a", "b"] }),
    creationIntentHash({ ids: ["b", "a"] }),
  );
  assert.notEqual(
    creationIntentHash({ kind: "copy", sourceId: "a" }),
    creationIntentHash({ kind: "copy", sourceId: "b" }),
  );
  const input = create();
  const first = parseTripDraftRequest(input, true);
  input.preferenceOverridePatch = patch();
  input.partySelection.ageReferenceDate = "2028-01-01";
  assert.equal(
    creationIntentHash(first),
    creationIntentHash(parseTripDraftRequest(input, true)),
  );
});
test("HTTP cap is independent of JSONB storage size, exact four MiB valid plan passes", () => {
  const plan = planAtBytes(4194304);
  assert.ok(parseTripSaveRequest({ schemaVersion: "1.0", planSnapshot: plan }));
  assert.ok(
    Buffer.byteLength(
      JSON.stringify({ schemaVersion: "1.0", planSnapshot: plan }),
    ) < TRIP_HTTP_MAX_BYTES.save,
  );
  bad(
    () =>
      parseTripSaveRequest({
        schemaVersion: "1.0",
        planSnapshot: planAtBytes(4194305),
      }),
    "PAYLOAD_TOO_LARGE",
  );
});
test("bounded streaming reader keeps existing 80KiB default and explicit larger opt-in", async () => {
  assert.equal(PRIVATE_HTTP_MAX_BYTES, 81920);
  const error = (code) => Object.assign(new Error(code), { code });
  const raw = JSON.stringify({ value: "x".repeat(90000) });
  const request = () =>
    new NextRequest("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
    });
  await assert.rejects(
    () => readPrivateJson(request(), error),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
  assert.equal(
    (await readPrivateJson(request(), error, TRIP_HTTP_MAX_BYTES.create)).value
      .length,
    90000,
  );
  for (const raw of ["{}x", '{"a":', new Uint8Array([0xff])])
    await assert.rejects(
      () =>
        readPrivateJson(
          new Request("http://localhost", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: raw,
          }),
          error,
        ),
      (e) => e.code === "INVALID_REQUEST",
    );
});
test("chunked cap works without trusting Content-Length", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(50000));
    },
    cancel() {
      cancelled = true;
    },
  });
  const error = (code) => Object.assign(new Error(code), { code });
  await assert.rejects(
    () =>
      readPrivateJson(
        new Request("http://localhost", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          duplex: "half",
        }),
        error,
      ),
    (e) => e.code === "PAYLOAD_TOO_LARGE",
  );
  assert.equal(cancelled, true);
});
test("A-like browser consumer bundles without server or B-private imports", async () => {
  const built = await build({
    entryPoints: ["src/shared/contracts/trip-library/client.ts"],
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "Task049Client",
    write: false,
    metafile: true,
  });
  assert.ok(built.outputFiles[0].contents.length > 0);
  for (const input of Object.keys(built.metafile.inputs))
    assert.doesNotMatch(
      input,
      /src\/(?:server|db|features)\/|supabase|postgres|drizzle|node:crypto/,
    );
  await mkdir(".artifacts/task049", { recursive: true });
  await build({
    entryPoints: ["src/features/trip-library/persistence/client.ts"],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
  });
});
test("server repository import is poisoned outside server conditions", () => {
  const run = spawnSync(
    process.execPath,
    [
      "--import",
      "./tests/register-planner-ts.mjs",
      "--input-type=module",
      "-e",
      "await import('./src/server/trip-library/repository.ts')",
    ],
    { encoding: "utf8", windowsHide: true },
  );
  assert.notEqual(run.status, 0);
  assert.match(
    run.stderr,
    /cannot be imported from a Client Component|server-only/,
  );
});
test("public save transport sends exact CAS and extracts safe result, preserving failures", async () => {
  const id = randomUUID(),
    plan = fullSnapshotFixture();
  let called;
  const transport = async (path, options) => {
    called = { path, options };
    return Response.json(
      {
        ok: true,
        data: {
          schemaVersion: "1.0",
          id,
          storageRevision: 2,
          canonicalTripId: plan.trip.id,
          libraryState: "saved",
          updatedAt: "2026-09-12T00:00:00.123456Z",
        },
      },
      { headers: { etag: '"2"' } },
    );
  };
  const result = await saveTripPlan(
    { recordId: id, storageRevision: 1 },
    { planSnapshot: plan },
    transport,
  );
  assert.equal(called.options.headers["If-Match"], '"1"');
  assert.equal(called.options.credentials, "same-origin");
  assert.deepEqual(JSON.parse(called.options.body), {
    schemaVersion: "1.0",
    planSnapshot: plan,
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "canonicalTripId",
    "libraryState",
    "recordId",
    "storageRevision",
    "updatedAt",
  ]);
  await assert.rejects(
    () =>
      saveTripPlan(
        { recordId: id, storageRevision: 1 },
        { planSnapshot: plan },
        async () =>
          Response.json(
            { ok: false, error: { code: "STALE_TRIP_LIBRARY_REVISION" } },
            { status: 409 },
          ),
      ),
    (e) => e.code === "STALE_TRIP_LIBRARY_REVISION",
  );
});
test("new routes delegate only to B server; unchanged UI and canonical types are not imported", async () => {
  for (const route of [
    "",
    "/[id]",
    "/[id]/save",
    "/[id]/history",
    "/[id]/copy",
  ]) {
    const text = await readFile(
      "src/app/api/trip-library" + route + "/route.ts",
      "utf8",
    );
    assert.match(text, /runtime = "nodejs"/);
    assert.match(text, /handleTripLibrary/);
    assert.doesNotMatch(text, /service.role|Planner|trip-library-page/);
  }
});
import { parseTripPage } from "../src/features/trip-library/persistence/resource.ts";
import { tripLibraryClient } from "../src/features/trip-library/persistence/client.ts";
test("browser summary parser rejects hidden full plans, fabricated fields and oversized pages", () => {
  const summary = {
    id: randomUUID(),
    libraryState: "draft",
    canonicalTripId: null,
    storageRevision: 1,
    title: null,
    destinations: [],
    departure: null,
    returning: null,
    participantCount: 0,
    wizardPhase: "trip_basics",
    planStatus: null,
    createdAt: "2026-09-12T00:00:00.123456Z",
    updatedAt: "2026-09-12T00:00:00.123456Z",
    frozenAt: null,
  };
  const page = { schemaVersion: "1.0", items: [summary], nextCursor: null };
  assert.deepEqual(parseTripPage(page), page);
  for (const key of ["planSnapshot", "reservation", "favorite", "ownerUserId"])
    assert.throws(() =>
      parseTripPage({ ...page, items: [{ ...summary, [key]: null }] }),
    );
  assert.throws(() =>
    parseTripPage({ ...page, items: Array(51).fill(summary) }),
  );
  assert.throws(() => parseTripPage({ ...page, nextCursor: "invalid=" }));
});
test("B read client validates page DTO and sends only whitelisted query choices", async () => {
  let url;
  const client = tripLibraryClient(async (path, options) => {
    url = path;
    assert.equal(options.credentials, "same-origin");
    return Response.json({
      ok: true,
      data: { schemaVersion: "1.0", items: [], nextCursor: null },
    });
  });
  assert.deepEqual(await client.list({ state: "saved", limit: 20 }), {
    schemaVersion: "1.0",
    items: [],
    nextCursor: null,
  });
  assert.equal(url, "/api/trip-library?state=saved&limit=20");
});
