// Opt-in, loopback-only certification harness. No product endpoint or worker daemon.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../src/db/schema/index.ts";
import { createTripRepository } from "../src/server/trips/repository.ts";
import { createEngineApplyService } from "../src/server/engine/apply.ts";
import { createEngineRollbackService } from "../src/server/engine/rollback.ts";
import { createLocalEngineRuntime } from "../src/server/engine/runtime.ts";
import { parsePreimage } from "../src/server/engine/preimage.ts";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { applyScenario, contextResolver } from "./task-063-fixtures.mjs";
import { reversibleReorder, rollbackRequest } from "./task-064-fixtures.mjs";
export const metadata = [
  "engine_apply_receipts",
  "engine_apply_audits",
  "engine_apply_outbox",
  "engine_apply_preimages",
  "engine_apply_compensations",
  "engine_rollback_receipts",
  "engine_runtime_results",
];
export const hash = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
export const defer = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
export async function bounded(p, label, ms = 30000) {
  let timer;
  try {
    return await Promise.race([
      p,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("Timeout: " + label)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function createHarness() {
  const local = preferenceLocalRuntime();
  assert.ok(
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(local.api).hostname),
  );
  const pool = postgres(local.databaseUrl, {
    prepare: false,
    max: 24,
    onnotice() {},
  });
  const orm = drizzle(pool, { schema }),
    users = [],
    contexts = new Map();
  const evidence = {
    version: 1,
    scope: "Local synthetic certification only",
    startedAt: new Date().toISOString(),
    poolMax: 24,
    applyRounds: [],
    rollbackRounds: [],
    runtime: {},
    faults: [],
    checks: [],
    network: { nonLoopbackAttempts: 0 },
    cleanup: null,
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, ...args) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
      evidence.network.nonLoopbackAttempts++;
      throw Error("TASK065_NONLOCAL_NETWORK_FORBIDDEN");
    }
    return originalFetch(input, ...args);
  };
  const success = (r) => {
    assert.equal(
      r.error?.code ?? null,
      null,
      "Local Auth/API succeeds (credentials withheld)",
    );
    return r.data;
  };
  const resolver = async ({ snapshot, change }) => {
    const s =
      contexts.get(change.target.planId) ?? contexts.get(snapshot.trip.id);
    if (s?.failContext) throw Error("TASK065_SECRET_AUTHORIZATION_CANARY");
    return contextResolver(s)();
  };
  const apply = (user, res = resolver, db = orm) =>
    createEngineApplyService(user.client, res, () => db);
  const rollback = (user, res = resolver, db = orm) =>
    createEngineRollbackService(user.client, res, () => db);
  const consumer = (res = resolver, db = orm) =>
    createLocalEngineRuntime(res, () => db);
  const version = (snapshot, planId = snapshot.plans[0].id) => ({
    tripRevision: snapshot.trip.revision,
    planRevision: snapshot.plans.find((p) => p.id === planId).revision,
  });
  const count = async (s) =>
    (
      await local.db`select
    (select count(*)::int from public.engine_apply_receipts where trip_id=${s.snapshot.trip.id}) receipts,
    (select count(*)::int from public.engine_apply_audits a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.snapshot.trip.id}) audits,
    (select count(*)::int from public.engine_apply_outbox a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.snapshot.trip.id}) outbox,
    (select count(*)::int from public.engine_apply_preimages a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.snapshot.trip.id}) preimages,
    (select count(*)::int from public.engine_apply_compensations a join public.engine_apply_receipts r on r.id=a.original_receipt_id where r.trip_id=${s.snapshot.trip.id}) compensations`
    )[0];
  const save = async () => {
    await mkdir(".artifacts/task065", { recursive: true });
    await writeFile(
      ".artifacts/task065/runtime-evidence.json",
      JSON.stringify(evidence, null, 2) + "\n",
    );
  };
  async function graph() {
    const rows = await local.db`select r.id,r.outcome,r.result,
       a.before_trip_revision,a.before_plan_revision,a.resulting_trip_revision,a.resulting_plan_revision,
       a.receipt_id audit,o.receipt_id outbox,p.receipt_id preimage,p.preimage payload
       from public.engine_apply_receipts r
       left join public.engine_apply_audits a on a.receipt_id=r.id
       left join public.engine_apply_outbox o on o.receipt_id=r.id
       left join public.engine_apply_preimages p on p.receipt_id=r.id`;
    let accepted = 0;
    for (const r of rows) {
      assert.equal(
        r.result.preview,
        null,
        "No persisted full preview/snapshot",
      );
      if (r.outcome === "accepted") {
        accepted++;
        assert.equal(r.audit, r.id);
        assert.equal(r.outbox, r.id);
        assert.equal(r.preimage, r.id);
        assert.equal(parsePreimage(r.payload).ok, true);
        assert.equal(
          Number(r.resulting_trip_revision),
          Number(r.before_trip_revision) + 1,
        );
        assert.equal(
          Number(r.resulting_plan_revision),
          Number(r.before_plan_revision) + 1,
        );
        assert.deepEqual(r.result.resultingVersion, {
          tripRevision: Number(r.resulting_trip_revision),
          planRevision: Number(r.resulting_plan_revision),
        });
      } else {
        assert.equal(r.audit, null);
        assert.equal(r.outbox, null);
        assert.equal(r.preimage, null);
        assert.equal(r.result.resultingVersion, null);
      }
    }
    const [bad] = await local.db`select
      (select count(*)::int from public.engine_apply_compensations c left join public.engine_apply_audits a on a.receipt_id=c.compensation_receipt_id left join public.engine_apply_preimages p on p.receipt_id=c.compensation_receipt_id where a.receipt_id is null or p.receipt_id is null or c.original_receipt_id=c.compensation_receipt_id) links,
      (select count(*)::int from public.engine_runtime_results x left join public.engine_apply_outbox o on o.receipt_id=x.receipt_id where o.receipt_id is null or o.status not in ('processed','terminal_failure')) runtime,
      (select count(*)::int from (select receipt_id from public.engine_runtime_results group by receipt_id having count(*)>1) d) duplicates`;
    assert.deepEqual(bad, { links: 0, runtime: 0, duplicates: 0 });
    return {
      receipts: rows.length,
      accepted,
      nonAccepted: rows.length - accepted,
      violations: 0,
    };
  }
  async function init() {
    assert.equal(
      Number((await local.db`select count(*) from auth.users`)[0].count),
      0,
      "Dedicated Local starts empty",
    );
    for (let i = 0; i < 2; i++) {
      const email = "task065-" + randomUUID() + "@example.test",
        password = randomUUID() + "aA!9";
      const id = success(
        await local.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      ).user.id;
      const user = { id };
      users.push(user);
      user.client = createClient(local.api, local.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      user.token = success(
        await user.client.auth.signInWithPassword({ email, password }),
      ).session.access_token;
      user.repo = createTripRepository(user.client, () => orm);
      success(
        await user.client
          .from("profiles")
          .insert({ id, display_name: "Synthetic TASK-065" }),
      );
    }
  }
  async function seed({
    reorder = false,
    user = users[0],
    mutate = () => {},
  } = {}) {
    const s = reorder ? reversibleReorder(user.id) : applyScenario(user.id);
    mutate(s);
    s.snapshot = await user.repo.create(s.snapshot);
    s.user = user;
    contexts.set(s.snapshot.trip.id, s);
    s.apply = apply(user);
    s.rollback = rollback(user);
    return s;
  }
  async function accept(s, change = s.change, service = s.apply) {
    const result = await service.apply(change);
    assert.equal(result.outcome, "accepted", JSON.stringify(result.issues));
    assert.equal(result.transaction.status, "committed");
    const [receipt] =
      await local.db`select id from public.engine_apply_receipts where actor_user_id=${s.user.id} and idempotency_key=${change.idempotencyKey}`;
    s.receipt = receipt.id;
    s.request = rollbackRequest(s.user.id, s.receipt);
    s.applied = await s.user.repo.read(s.snapshot.trip.id);
    assert.deepEqual(
      result.resultingVersion,
      version(s.applied, change.target.planId),
    );
    return result;
  }
  async function original(s) {
    return (
      await local.db`select to_jsonb(r) receipt,to_jsonb(a) audit from public.engine_apply_receipts r join public.engine_apply_audits a on a.receipt_id=r.id where r.id=${s.receipt}`
    )[0];
  }
  async function currentChange(s) {
    const snapshot = await s.user.repo.read(s.snapshot.trip.id),
      change = structuredClone(s.change);
    change.changeSetId = randomUUID();
    change.idempotencyKey = randomUUID();
    change.baseVersion = version(snapshot, change.target.planId);
    return { snapshot, change };
  }
  async function waiters(minimum, rootLocks = false) {
    let observed = 0;
    for (let i = 0; i < 150; i++) {
      observed = (
        await local.db`select count(*)::int n from pg_stat_activity where datname=current_database() and (wait_event='advisory' or (${rootLocks} and wait_event_type='Lock')) and pid<>pg_backend_pid()`
      )[0].n;
      if (observed >= minimum) return observed;
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.ok(
      observed >= minimum,
      "Expected " + minimum + " independent DB lock waiters; saw " + observed,
    );
  }
  async function cleanup() {
    globalThis.fetch = originalFetch;
    for (const user of users) await local.admin.auth.admin.deleteUser(user.id);
    const remaining = {
      auth: Number((await local.db`select count(*) from auth.users`)[0].count),
    };
    for (const table of metadata)
      remaining[table] = Number(
        (await local.db`select count(*) from ${local.db("public." + table)}`)[0]
          .count,
      );
    remaining.faultFunctions = Number(
      (
        await local.db`select count(*) from pg_proc where proname like 'task065_fault%'`
      )[0].count,
    );
    evidence.cleanup = remaining;
    evidence.finishedAt = new Date().toISOString();
    await save();
    await pool.end({ timeout: 5 });
    await local.db.end({ timeout: 5 });
    for (const n of Object.values(remaining))
      assert.equal(n, 0, "All synthetic fixtures and fault DDL cleaned");
  }
  return {
    local,
    orm,
    users,
    contexts,
    evidence,
    resolver,
    apply,
    rollback,
    consumer,
    version,
    count,
    save,
    graph,
    init,
    seed,
    accept,
    original,
    currentChange,
    waiters,
    cleanup,
  };
}
