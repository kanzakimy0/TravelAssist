import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { metadata, hash } from "./task-065-local-harness.mjs";
import { localDeletionSecret } from "./task-052-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { validDeletion } from "./task-052-account-deletion-fixtures.mjs";
export async function refusalsAndSecurity(h) {
  for (const kind of [
    "system_hard_lock",
    "user_lock",
    "booking_lock",
    "payment_lock",
    "protected",
    "booking",
    "context_missing",
    "missing_item",
    "missing_day",
  ]) {
    const s = await h.seed();
    await h.accept(s);
    const original = await h.original(s);
    let current = await s.user.repo.read(s.snapshot.trip.id);
    const item = current.plans[0].days[0].items[0];
    if (kind.endsWith("_lock")) item.lockLevel = kind;
    if (kind === "booking")
      item.booking = {
        status: "confirmed",
        referenceId: "SYNTHETIC-BOOKING",
        verifiedAt: "2027-04-01T00:00:00Z",
      };
    if (kind === "missing_item") current.plans[0].days[0].items = [];
    if (kind === "missing_day") current.plans[0].days = [];
    if (kind === "protected") s.context.protectedItemIds = [item.id];
    else if (kind === "context_missing") s.context.profiles = [];
    else current = await s.user.repo.replace(current);
    const counts = await h.count(s);
    const result = await s.rollback.rollback(s.request);
    assert.notEqual(result.outcome, "accepted", kind);
    if (kind === "user_lock" || kind === "protected")
      assert.equal(result.outcome, "needsConfirmation");
    assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), current);
    const after = await h.count(s);
    for (const key of ["audits", "outbox", "preimages", "compensations"])
      assert.equal(after[key], counts[key]);
    assert.deepEqual(await h.original(s), original);
    h.evidence.checks.push({
      kind: "rollback_" + kind,
      outcome: result.outcome,
      codes: result.issueCodes,
    });
    await h.graph();
  }
  const history = await h.seed();
  await h.accept(history);
  const [saved] = await h.local
    .db`select * from public.engine_apply_preimages where receipt_id=${history.receipt}`;
  // Synthetic historical receipt fixture; restore it after exercising the legacy no-history gate.
  await h.local
    .db`delete from public.engine_apply_preimages where receipt_id=${history.receipt}`;
  try {
    const current = await history.user.repo.read(history.snapshot.trip.id);
    const r = await history.rollback.rollback(history.request);
    assert.equal(r.outcome, "unsupported");
    assert.deepEqual(r.issueCodes, ["ROLLBACK_HISTORY_UNAVAILABLE"]);
    assert.deepEqual(
      await history.user.repo.read(history.snapshot.trip.id),
      current,
    );
  } finally {
    await h.local
      .db`insert into public.engine_apply_preimages ${h.local.db(saved)}`;
  }
  h.evidence.checks.push({
    kind: "historical_receipt_without_preimage",
    outcome: "unsupported",
  });
  const s = await h.seed();
  await h.accept(s);
  const anon = createClient(h.local.api, h.local.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    stranger = h.users[1];
  for (const user of [{ id: s.user.id, client: anon }, stranger]) {
    const change = structuredClone(s.change);
    change.source.actorRef = user.id;
    change.idempotencyKey = randomUUID();
    const request = {
      ...s.request,
      actorRef: user.id,
      idempotencyKey: randomUUID(),
    };
    const a = await h.apply(user).apply(change),
      b = await h.rollback(user).rollback(request);
    assert.deepEqual(
      a.issues.map((i) => i.code),
      ["PERMISSION_DENIED"],
    );
    assert.deepEqual(b.issueCodes, ["PERMISSION_DENIED"]);
    assert.equal(a.observedVersion, null);
    assert.equal(b.observedVersion, null);
    const absent = await h.apply(user).apply({
      ...change,
      target: { tripId: randomUUID(), planId: randomUUID() },
    });
    assert.deepEqual(absent.issues, a.issues);
  }
  const mismatch = await s.apply.apply({
    ...s.change,
    source: { ...s.change.source, actorRef: stranger.id },
  });
  assert.deepEqual(
    mismatch.issues.map((i) => i.code),
    ["PERMISSION_DENIED"],
  );
  const identity = await h.count(s);
  assert.equal(identity.audits, 1);
  const access = [];
  for (const [role, client] of [
    ["anon", anon],
    ["authenticated/browser", s.user.client],
  ]) {
    for (const table of metadata) {
      for (const [verb, result] of [
        ["read", await client.from(table).select("*").limit(1)],
        ["forge", await client.from(table).insert({})],
        [
          "modify",
          await client
            .from(table)
            .update(
              table === "engine_apply_outbox"
                ? { status: "pending" }
                : table === "engine_apply_compensations"
                  ? { compensation_receipt_id: randomUUID() }
                  : table === "engine_runtime_results"
                    ? { recompute_status: "accepted" }
                    : table === "engine_apply_preimages"
                      ? { preimage: {} }
                      : table === "engine_apply_audits"
                        ? { preview_hash: "a".repeat(64) }
                        : { idempotency_key: "forged" },
            )
            .eq(
              table === "engine_apply_receipts" ||
                table === "engine_rollback_receipts"
                ? "id"
                : table === "engine_apply_compensations"
                  ? "original_receipt_id"
                  : "receipt_id",
              randomUUID(),
            ),
        ],
      ]) {
        assert.equal(
          result.error?.code,
          "42501",
          role + " " + table + " " + verb,
        );
        access.push({ role, table, verb, code: result.error.code });
      }
    }
  }
  h.evidence.metadataAccess = access;
  h.evidence.checks.push({
    kind: "foreign_absent_anon_actor_mismatch",
    mutation: 0,
    existenceLeak: false,
  });
}
export async function minimization(h) {
  const forbidden = new Set(
    [
      "trip",
      "plans",
      "inputContractVersion",
      "profiles",
      "rawProviderResponse",
      "cardNumber",
      "paymentPayload",
      "snapshot",
      "tripSnapshot",
      "trustedContext",
      "rawProvider",
      "rawResponse",
      "authorization",
      "cookie",
      "token",
      "access_token",
      "refresh_token",
      "paymentPayload",
      "reactState",
      "mapboxState",
      "uiState",
      "context",
    ].map((k) => k.toLowerCase()),
  );
  let scanned = 0,
    bytes = 0;
  const walk = (x) => {
    if (Array.isArray(x)) {
      for (const v of x) walk(v);
      return;
    }
    if (x && typeof x === "object")
      for (const [k, v] of Object.entries(x)) {
        assert.ok(
          !forbidden.has(k.toLowerCase()),
          "Forbidden persisted key " + k,
        );
        walk(v);
      }
  };
  const tables = [];
  for (const table of metadata) {
    const rows = await h.local
      .db`select to_jsonb(x) data from ${h.local.db("public." + table)} x`;
    const text = JSON.stringify(rows);
    assert.doesNotMatch(
      text,
      /TASK065_SECRET_AUTHORIZATION_CANARY|TASK065_RAW_PROVIDER|Bearer |supabase_secret|eyJhbGci|Mapbox|ReactState/,
    );
    for (const u of h.users)
      assert.ok(!text.includes(u.token), "Auth token never persisted");
    for (const row of rows) walk(row.data);
    scanned += rows.length;
    bytes += Buffer.byteLength(text);
    tables.push({ table, rows: rows.length, sha256: hash(rows) });
  }
  h.evidence.minimization = {
    scannedRows: scanned,
    bytes,
    tables,
    forbiddenMatches: 0,
  };
}
export async function cascade(h) {
  const owner = h.users[0],
    other = h.users[1],
    survivor = await h.seed({ user: other });
  await h.accept(survivor);
  assert.equal(
    (await survivor.rollback.rollback(survivor.request)).outcome,
    "accepted",
  );
  // Process pending events from fault and rejection fixtures. Throwing contexts were reset.
  for (let i = 0; i < 2000; i++) {
    const r = await h.consumer().processNext();
    if (r.state === "idle") break;
    assert.notEqual(r.state, "retryable_failure");
  }
  const state = await other.repo.read(survivor.snapshot.trip.id),
    counts = await h.count(survivor);
  const owned = await h.local
    .db`select id from public.engine_apply_receipts where actor_user_id=${owner.id}`;
  const ids = owned.map((r) => r.id);
  assert.ok(ids.length > 0);
  await minimization(h);
  h.evidence.aggregateGraph = await h.graph();
  h.local.env.DATABASE_URL = h.local.databaseUrl;
  h.local.env.SUPABASE_SECRET_KEY = localDeletionSecret(h.local);
  const app = await startApp(h.local);
  try {
    const response = await fetch(app.origin + "/api/account", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Origin: app.origin,
        Authorization: "Bearer " + owner.token,
      },
      body: JSON.stringify(validDeletion()),
    });
    assert.equal(response.status, 204);
  } finally {
    await app.stop();
  }
  assert.equal(
    (
      await h.local
        .db`select count(*)::int n from auth.users where id=${owner.id}`
    )[0].n,
    0,
  );
  assert.equal(
    (
      await h.local
        .db`select count(*)::int n from public.trips where owner_user_id=${owner.id}`
    )[0].n,
    0,
  );
  assert.equal(
    (
      await h.local
        .db`select count(*)::int n from public.engine_apply_receipts where actor_user_id=${owner.id}`
    )[0].n,
    0,
  );
  assert.equal(
    (
      await h.local
        .db`select count(*)::int n from public.engine_rollback_receipts where actor_user_id=${owner.id}`
    )[0].n,
    0,
  );
  for (const table of [
    "engine_apply_audits",
    "engine_apply_outbox",
    "engine_apply_preimages",
    "engine_runtime_results",
  ]) {
    assert.equal(
      (
        await h.local
          .db`select count(*)::int n from ${h.local.db("public." + table)} where receipt_id in ${h.local.db(ids)}`
      )[0].n,
      0,
    );
  }
  assert.equal(
    (
      await h.local
        .db`select count(*)::int n from public.engine_apply_compensations where original_receipt_id in ${h.local.db(ids)} or compensation_receipt_id in ${h.local.db(ids)}`
    )[0].n,
    0,
  );
  assert.deepEqual(await other.repo.read(survivor.snapshot.trip.id), state);
  assert.deepEqual(await h.count(survivor), counts);
  h.evidence.cascade = {
    publicDeleteStatus: 204,
    deletedOwnerReceipts: ids.length,
    allSevenMetadataTablesChecked: true,
    otherUserPreserved: true,
  };
}
