import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import {
  ProfileApiError,
  parseUpdateProfileAccountV1,
  parseCreateEmergencyContactV1,
  parseUpdateEmergencyContactV1,
  parseEmergencyContactId,
  parseProfileAccountViewV1,
  parseEmergencyContactViewV1,
} from "../src/features/profile/domain/profile-account-v1.ts";
import {
  fullProfilePatch,
  contactInput,
  emptyProfileView,
  invalidProfilePatches,
  invalidContactPatches,
} from "./task-050-profile-fixtures.mjs";
const parse = (v) => parseUpdateProfileAccountV1(v, "2026-09-12");
const invalid = (run) =>
  assert.throws(
    run,
    (e) => e instanceof ProfileApiError && e.code === "INVALID_REQUEST",
  );
for (const [i, value] of invalidProfilePatches().entries())
  test(`TASK-050 invalid profile/settings case ${i + 1}`, () =>
    invalid(() => parse(value)));
for (const [i, value] of invalidContactPatches().entries())
  test(`TASK-050 invalid contact case ${i + 1}`, () =>
    invalid(() => parseUpdateEmergencyContactV1(value)));
test("TASK-050 complete profile round-trip and explicit missing/null semantics", () => {
  assert.deepEqual(parse(fullProfilePatch()), fullProfilePatch());
  assert.deepEqual(
    parse({ schemaVersion: "1.0", profile: { displayName: null } }),
    { schemaVersion: "1.0", profile: { displayName: null } },
  );
  const input = fullProfilePatch();
  for (const group of [input.profile, input.settings])
    for (const key of Object.keys(group)) group[key] = null;
  assert.deepEqual(parse(input), input);
  invalid(() =>
    parse({ schemaVersion: "1.0", profile: { displayName: undefined } }),
  );
});
test("TASK-050 profile normalizes text/locale and bounds Unicode code points", () => {
  const v = parse({
    schemaVersion: "1.0",
    profile: {
      displayName: " 界 ",
      fullName: "😀".repeat(200),
      genderCode: "future-gender",
    },
    settings: { locale: "EN-us", timezone: "UTC", currencyCode: "USD" },
  });
  assert.equal(v.profile.displayName, "界");
  assert.equal(v.settings.locale, "en-US");
  assert.equal(v.profile.genderCode, "future-gender");
});
test("TASK-050 birth date uses explicit UTC date and real leap days", () => {
  for (const birthDate of ["0001-01-01", "2000-02-29", "2026-09-12"])
    assert.equal(
      parse({ schemaVersion: "1.0", profile: { birthDate } }).profile.birthDate,
      birthDate,
    );
  invalid(() =>
    parse({ schemaVersion: "1.0", profile: { birthDate: "2026-09-13" } }),
  );
});
test("TASK-050 no getters/prototypes/symbols/non-enumerable keys accepted", () => {
  let reads = 0;
  const getter = {
    schemaVersion: "1.0",
    get profile() {
      reads++;
      return {};
    },
  };
  invalid(() => parse(getter));
  assert.equal(reads, 0);
  for (const value of [
    new Date(),
    Object.assign(Object.create({ owner: "x" }), { schemaVersion: "1.0" }),
    { ...fullProfilePatch(), [Symbol("x")]: 1 },
    Object.defineProperty(fullProfilePatch(), "secret", { value: "x" }),
  ])
    invalid(() => parse(value));
  invalid(() =>
    parse(
      JSON.parse('{"schemaVersion":"1.0","profile":{"__proto__":{"x":1}}}'),
    ),
  );
});
test("TASK-050 contact create requires all three fields, defaults remain missing", () => {
  const v = contactInput();
  const normalized = parseCreateEmergencyContactV1(v);
  assert.equal(normalized.email, "Contact@example.test");
  for (const field of ["name", "relationship", "phoneE164"]) {
    const copy = { ...v };
    delete copy[field];
    invalid(() => parseCreateEmergencyContactV1(copy));
  }
  assert.deepEqual(
    parseUpdateEmergencyContactV1({
      schemaVersion: "1.0",
      email: null,
      note: null,
    }),
    { schemaVersion: "1.0", email: null, note: null },
  );
  assert.equal(
    parseCreateEmergencyContactV1({ ...v, phoneE164: "+123456789012345" })
      .phoneE164.length,
    16,
  );
});
test("TASK-050 strict UUID syntax normalizes case", () => {
  assert.equal(
    parseEmergencyContactId("01234567-89AB-CDEF-0123-456789ABCDEF"),
    "01234567-89ab-cdef-0123-456789abcdef",
  );
  for (const v of [
    "x",
    null,
    "0123456789abcdef0123456789abcdef",
    "../profile",
    "01234567-89ab-cdef-0123-456789abcdef\n",
  ])
    invalid(() => parseEmergencyContactId(v));
});
test("TASK-050 response contract strips nothing silently and exposes no metadata", () => {
  const empty = emptyProfileView();
  assert.deepEqual(parseProfileAccountViewV1(empty), empty);
  for (const key of ["ownerUserId", "userId", "access_token", "metadata"]) {
    invalid(() => parseProfileAccountViewV1({ ...empty, [key]: "secret" }));
    invalid(() =>
      parseProfileAccountViewV1({
        ...empty,
        authContact: { ...empty.authContact, [key]: "secret" },
      }),
    );
  }
  invalid(() =>
    parseProfileAccountViewV1({ ...empty, authContact: { email: null } }),
  );
  invalid(() => parseProfileAccountViewV1({ ...empty, profile: {} }));
  const { schemaVersion: _v, ...contact } = contactInput();
  void _v;
  const item = {
    ...contact,
    id: "01234567-89ab-cdef-0123-456789abcdef",
    createdAt: "2026-09-12T00:00:00.000Z",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };
  assert.equal(parseEmergencyContactViewV1(item).email, "Contact@example.test");
  invalid(() => parseEmergencyContactViewV1({ ...item, userId: "secret" }));
  invalid(() => parseEmergencyContactViewV1({ ...item, updatedAt: null }));
});
test("TASK-050 pure contract builds for a browser without DB/Auth imports", async () => {
  const output = await build({
    entryPoints: ["src/features/profile/domain/profile-account-v1.ts"],
    bundle: true,
    write: false,
    platform: "browser",
    metafile: true,
  });
  assert.ok(output.outputFiles[0].contents.length > 0);
  assert.deepEqual(Object.keys(output.metafile.inputs), [
    "src/features/profile/domain/profile-account-v1.ts",
  ]);
});
test("TASK-050 server repository imports are poisoned outside server context", () => {
  for (const p of ["repository"]) {
    const r = spawnSync(
      process.execPath,
      [
        "--import",
        "./tests/register-planner-ts.mjs",
        "--input-type=module",
        "-e",
        `await import('./src/server/profile/${p}.ts')`,
      ],
      { encoding: "utf8", windowsHide: true },
    );
    assert.notEqual(r.status, 0);
    assert.match(
      r.stderr,
      /cannot be imported from a Client Component|server-only/,
    );
  }
});
test("TASK-050 only prescribed methods have thin Node private route handlers", () => {
  for (const p of [
    "profile/route.ts",
    "emergency-contacts/route.ts",
    "emergency-contacts/[id]/route.ts",
  ]) {
    const source = readFileSync("src/app/api/" + p, "utf8");
    assert.match(source, /runtime = "nodejs"/);
    assert.match(source, /force-dynamic/);
    assert.doesNotMatch(source, /\.from\(|auth\.|getDb|DELETE.*account/);
  }
});
