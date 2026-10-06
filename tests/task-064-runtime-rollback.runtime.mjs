// Explicit Local-only acceptance. Real Auth, RLS, SQL locks and separate sessions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../src/db/schema/index.ts";
import { createTripRepository } from "../src/server/trips/repository.ts";
import { createEngineApplyService } from "../src/server/engine/apply.ts";
import { createEngineRollbackService } from "../src/server/engine/rollback.ts";
import { createLocalEngineRuntime } from "../src/server/engine/runtime.ts";
import { capturePreimage } from "../src/server/engine/preimage.ts";
import {
  parseRuntimeResult,
  parseRollbackResult,
} from "../src/shared/contracts/engine/runtime.ts";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { localDeletionSecret } from "./task-052-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { validDeletion } from "./task-052-account-deletion-fixtures.mjs";
import { applyScenario, contextResolver } from "./task-063-fixtures.mjs";
import { reversibleReorder, rollbackRequest } from "./task-064-fixtures.mjs";
import { route } from "./fixtures/engine-feasibility.mjs";
const success = (r) => {
  assert.equal(
    r.error?.code ?? null,
    null,
    "Local request succeeds (credentials withheld)",
  );
  return r.data;
};
const metadata = [
  "engine_apply_receipts",
  "engine_apply_audits",
  "engine_apply_outbox",
  "engine_apply_preimages",
  "engine_apply_compensations",
  "engine_rollback_receipts",
  "engine_runtime_results",
];
test("TASK-064 real Local runtime and compensation acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    pool = postgres(local.databaseUrl, {
      prepare: false,
      max: 8,
      onnotice() {},
    });
  const orm = drizzle(pool, { schema }),
    users = [],
    cases = [],
    contexts = new Map(),
    evidence = {
      policy: { leaseSeconds: 60, maxAttempts: 3, retrySeconds: 5 },
      cases,
    };
  let app;
  const run = (name, fn) =>
    t.test(name, async () => {
      try {
        await fn();
        cases.push({ name, status: "PASS" });
      } catch (e) {
        cases.push({ name, status: "FAIL" });
        throw e;
      }
    });
  const resolver = async ({ snapshot }) =>
    contextResolver(contexts.get(snapshot.trip.id))();
  const consumer = () => createLocalEngineRuntime(resolver, () => orm);
  const count = async (s) =>
    (
      await local.db`select
 (select count(*)::int from public.engine_apply_receipts where trip_id=${s.snapshot.trip.id}) receipts,
 (select count(*)::int from public.engine_apply_audits a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.snapshot.trip.id}) audits,
 (select count(*)::int from public.engine_apply_outbox a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.snapshot.trip.id}) outbox,
 (select count(*)::int from public.engine_apply_preimages a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.snapshot.trip.id}) preimages,
 (select count(*)::int from public.engine_apply_compensations a join public.engine_apply_receipts r on r.id=a.original_receipt_id where r.trip_id=${s.snapshot.trip.id}) compensations`
    )[0];
  const state = async (id) =>
    (
      await local.db`select status,attempts,lease_token,failure_code from public.engine_apply_outbox where receipt_id=${id}`
    )[0];
  const runtimeCount = async (id) =>
    (
      await local.db`select count(*)::int n from public.engine_runtime_results where receipt_id=${id}`
    )[0].n;
  const due = async (id) =>
    local.db`update public.engine_apply_outbox set available_at=clock_timestamp()-interval '1 second' where receipt_id=${id}`;
  const unchanged = async (s, before, c) => {
    assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), before);
    assert.deepEqual(await count(s), c);
  };
  try {
    assert.equal(
      Number((await local.db`select count(*) from auth.users`)[0].count),
      0,
      "Dedicated Local DB starts empty",
    );
    for (let i = 0; i < 2; i++) {
      const email = "task064-" + randomUUID() + "@example.test",
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
          .insert({ id, display_name: "Synthetic TASK-064" }),
      );
    }
    const [owner, other] = users;
    const seed = async ({
      reorder = false,
      user = owner,
      mutate = () => {},
    } = {}) => {
      const s = reorder ? reversibleReorder(user.id) : applyScenario(user.id);
      mutate(s);
      s.snapshot = await user.repo.create(s.snapshot);
      s.user = user;
      contexts.set(s.snapshot.trip.id, s);
      s.apply = createEngineApplyService(user.client, resolver, () => orm);
      s.rollback = createEngineRollbackService(
        user.client,
        resolver,
        () => orm,
      );
      return s;
    };
    const accept = async (s) => {
      const r = await s.apply.apply(s.change);
      assert.equal(r.outcome, "accepted", JSON.stringify(r.issues));
      const [receipt] =
        await local.db`select id from public.engine_apply_receipts where actor_user_id=${s.user.id} and idempotency_key=${s.change.idempotencyKey}`;
      s.receipt = receipt.id;
      s.request = rollbackRequest(s.user.id, s.receipt);
      s.applied = await s.user.repo.read(s.snapshot.trip.id);
      return r;
    };
    const changeCurrent = async (s, fn) => {
      const now = await s.user.repo.read(s.snapshot.trip.id);
      fn(now);
      return s.user.repo.replace(now);
    };
    const processOne = async (s, runtime = consumer()) => {
      const r = await runtime.processNext();
      assert.equal(r.event?.eventId, s.receipt);
      return r;
    };
    await run(
      "01-04 accepted event pending -> claim -> one terminal recompute; repeated invocation idempotent",
      async () => {
        const s = await seed();
        await accept(s);
        assert.equal((await state(s.receipt)).status, "pending");
        const c = await consumer().claim();
        assert.equal(c.eventId, s.receipt);
        assert.equal((await state(s.receipt)).status, "processing");
        const r = await consumer().processClaim(c);
        assert.equal(r.state, "processed");
        assert.equal(r.event.recomputeStatus, "accepted");
        assert.equal(parseRuntimeResult(r.event).ok, true);
        assert.equal(await runtimeCount(s.receipt), 1);
        assert.equal((await consumer().processClaim(c)).state, "lease_lost");
        assert.equal((await consumer().processNext()).state, "idle");
        assert.deepEqual(await owner.repo.read(s.snapshot.trip.id), s.applied);
        evidence.firstEvent = r.event;
      },
    );
    await run(
      "05 concurrent workers claim distinct events and at most one result each",
      async () => {
        const seeds = await Promise.all(
          Array.from({ length: 4 }, () => seed()),
        );
        for (const s of seeds) await accept(s);
        const claims = await Promise.all(
          Array.from({ length: 8 }, () => consumer().claim()),
        );
        const active = claims.filter(Boolean);
        assert.equal(active.length, 4);
        assert.equal(new Set(active.map((c) => c.eventId)).size, 4);
        const rs = await Promise.all(
          active.flatMap((c) => [
            consumer().processClaim(c),
            consumer().processClaim(c),
          ]),
        );
        assert.equal(rs.filter((r) => r.state === "processed").length, 4);
        assert.equal(rs.filter((r) => r.state === "lease_lost").length, 4);
        for (const s of seeds) {
          assert.equal(await runtimeCount(s.receipt), 1);
          assert.deepEqual(
            await owner.repo.read(s.snapshot.trip.id),
            s.applied,
          );
        }
      },
    );
    await run(
      "06 expired abandoned lease is recovered; stale running worker is fenced",
      async () => {
        const s = await seed();
        await accept(s);
        let entered, release;
        const entry = new Promise((r) => (entered = r)),
          gate = new Promise((r) => (release = r));
        const slow = createLocalEngineRuntime(
          async (input) => {
            entered();
            await gate;
            return resolver(input);
          },
          () => orm,
        );
        const first = slow.processNext();
        await Promise.race([
          entry,
          first.then(() => {
            throw Error("Expected resolver entry before completion");
          }),
        ]);
        await local.db`update public.engine_apply_outbox set lease_expires_at=clock_timestamp()-interval '1 second' where receipt_id=${s.receipt}`;
        let second;
        try {
          second = await processOne(s);
        } finally {
          release();
        }
        assert.equal(second.state, "processed");
        assert.equal((await first).state, "lease_lost");
        assert.equal((await state(s.receipt)).attempts, 2);
        assert.equal(await runtimeCount(s.receipt), 1);
      },
    );
    await run(
      "07-08 forced retryable failure has no Trip mutation and stops after three attempts",
      async () => {
        const s = await seed();
        await accept(s);
        const before = s.applied,
          counts = await count(s);
        const bad = createLocalEngineRuntime(
          async () => {
            throw Error(
              "private provider credential SQL must never be retained",
            );
          },
          () => orm,
        );
        const transitions = [];
        for (let i = 1; i <= 3; i++) {
          const r = await bad.processNext();
          transitions.push(r.state);
          assert.equal((await state(s.receipt)).attempts, i);
          await due(s.receipt);
        }
        assert.deepEqual(transitions, [
          "retryable_failure",
          "retryable_failure",
          "terminal_failure",
        ]);
        assert.equal(await runtimeCount(s.receipt), 1);
        assert.equal((await bad.processNext()).state, "idle");
        assert.equal(
          (await state(s.receipt)).failure_code,
          "CONTEXT_UNAVAILABLE",
        );
        await unchanged(s, before, counts);
        evidence.retryTransitions = transitions;
      },
    );
    await run(
      "08 crash on each attempt is bounded, including abandoned final lease",
      async () => {
        const s = await seed();
        await accept(s);
        for (let i = 1; i <= 3; i++) {
          const c = await consumer().claim();
          assert.equal(c.eventId, s.receipt);
          assert.equal(c.exhausted, false);
          await local.db`update public.engine_apply_outbox set lease_expires_at=clock_timestamp()-interval '1 second' where receipt_id=${s.receipt}`;
        }
        const r = await processOne(s);
        assert.equal(r.state, "terminal_failure");
        assert.deepEqual(r.event.issueCodes, ["RETRY_EXHAUSTED"]);
        assert.equal((await state(s.receipt)).attempts, 3);
      },
    );
    await run(
      "09-10 recompute observes later current revisions and remains read-only",
      async () => {
        const s = await seed();
        const r = await accept(s);
        const current = await changeCurrent(s, (x) => {
          x.trip.title = "Later current title";
          x.plans[0].days[0].items[0].schedule.start =
            "2027-04-10T11:15:00+09:00";
        });
        const counts = await count(s),
          done = await processOne(s);
        assert.deepEqual(
          done.event.originalResultingVersion,
          r.resultingVersion,
        );
        assert.deepEqual(done.event.currentObservedVersion, {
          tripRevision: current.trip.revision,
          planRevision: current.plans[0].revision,
        });
        await unchanged(s, current, counts);
      },
    );
    for (const mode of ["valid", "missing", "stale", "invalid"])
      await run(
        "11-12 normalized route facts " +
          mode +
          " use 7.5/4.21 and no live network",
        async () => {
          const s = await seed({ reorder: true });
          await accept(s);
          const [a, b] = s.applied.plans[0].days[0].items;
          const binding = route(s, a, b);
          if (mode === "missing") s.context.routes = [];
          if (mode === "stale") binding.fact.expiresAt = "2027-03-31T01:00:00Z";
          if (mode === "invalid") binding.response.contractVersion = "future";
          const prior = globalThis.fetch;
          globalThis.fetch = () => {
            throw Error("Forbidden Provider network");
          };
          let r;
          try {
            r = await processOne(s);
          } finally {
            globalThis.fetch = prior;
          }
          assert.equal(
            r.event.recomputeStatus,
            mode === "valid" ? "accepted" : "blocked",
          );
          assert.deepEqual(
            await owner.repo.read(s.snapshot.trip.id),
            s.applied,
          );
          assert.equal(JSON.stringify(r.event).includes("alternatives"), false);
        },
      );
    await run(
      "13 identical current state/context across separate accepted events has identical fingerprint",
      async () => {
        const s = await seed();
        await accept(s);
        const first = s.receipt;
        s.change = {
          ...s.change,
          changeSetId: randomUUID(),
          idempotencyKey: randomUUID(),
          baseVersion: {
            tripRevision: s.applied.trip.revision,
            planRevision: s.applied.plans[0].revision,
          },
        };
        await accept(s);
        const a = await consumer().processNext(),
          b = await consumer().processNext();
        assert.equal(a.event.eventId, first);
        assert.equal(b.event.eventId, s.receipt);
        assert.equal(a.event.fingerprint, b.event.fingerprint);
      },
    );
    await run(
      "target deleted before recompute becomes stable terminal failure",
      async () => {
        const s = await seed();
        await accept(s);
        await owner.repo.remove(s.applied.trip.id, s.applied.trip.revision);
        const r = await processOne(s);
        assert.equal(r.state, "terminal_failure");
        assert.deepEqual(r.event.issueCodes, ["TARGET_UNAVAILABLE"]);
      },
    );
    await run(
      "14 typed runtime metadata and bounded preimage reject raw payload and malformed JSON",
      async () => {
        const s = await seed();
        await accept(s);
        await processOne(s);
        const [history] =
          await local.db`select preimage from public.engine_apply_preimages where receipt_id=${s.receipt}`;
        assert.deepEqual(
          history.preimage,
          capturePreimage(s.snapshot, s.applied, s.change),
        );
        for (const bad of [
          {},
          [],
          null,
          { ...history.preimage, token: "secret" },
          { ...history.preimage, entries: [] },
          {
            ...history.preimage,
            entries: [{ ...history.preimage.entries[0], rawProvider: {} }],
          },
          {
            ...history.preimage,
            entries: Array(101).fill(history.preimage.entries[0]),
          },
        ]) {
          const [r] =
            await local.db`select public.is_engine_preimage_v1(${local.db.json(bad)}) valid`;
          assert.equal(r.valid, false);
          await assert.rejects(
            local.db`update public.engine_apply_preimages set preimage=${local.db.json(bad)} where receipt_id=${s.receipt}`,
            (e) => ["23514", "23502"].includes(e.code),
          );
        }
        const cols =
          await local.db`select column_name,data_type from information_schema.columns where table_schema='public' and table_name='engine_runtime_results'`;
        assert.equal(
          cols.some((c) => c.data_type === "jsonb"),
          false,
        );
      },
    );
    await run(
      "14 browser and authenticated roles cannot read or forge queue/history/correlations",
      async () => {
        for (const role of ["anon", "authenticated"])
          for (const table of metadata) {
            const [r] =
              await local.db`select has_table_privilege(${role},${"public." + table},'SELECT') s,has_table_privilege(${role},${"public." + table},'INSERT') i,has_table_privilege(${role},${"public." + table},'UPDATE') u,has_table_privilege(${role},${"public." + table},'DELETE') d`;
            assert.deepEqual(r, { s: false, i: false, u: false, d: false });
            const denied = await owner.client.from(table).select("*");
            assert.ok(denied.error, "PostgREST cannot read " + table);
          }
      },
    );
    await run(
      "16-18 UPDATE_TIME compensates through new revisions and preserves unrelated current changes",
      async () => {
        const s = await seed();
        await accept(s);
        const current = await changeCurrent(s, (x) => {
          x.trip.title = "Keep current title";
        });
        const r = await s.rollback.rollback(s.request);
        assert.equal(r.outcome, "accepted", JSON.stringify(r));
        assert.equal(parseRollbackResult(r).ok, true);
        const after = await owner.repo.read(s.snapshot.trip.id);
        assert.deepEqual(
          after.plans[0].days[0].items[0].schedule,
          s.snapshot.plans[0].days[0].items[0].schedule,
        );
        assert.equal(after.trip.title, "Keep current title");
        assert.equal(after.trip.revision, current.trip.revision + 1);
        assert.equal(after.plans[0].revision, current.plans[0].revision + 1);
        assert.deepEqual(r.resultingVersion, {
          tripRevision: after.trip.revision,
          planRevision: after.plans[0].revision,
        });
        assert.deepEqual(await count(s), {
          receipts: 2,
          audits: 2,
          outbox: 2,
          preimages: 2,
          compensations: 1,
        });
      },
    );
    await run(
      "19-20 REORDER_ITEMS compensation restores beforeOrder with current validation",
      async () => {
        const s = await seed({ reorder: true });
        await accept(s);
        const r = await s.rollback.rollback(s.request);
        assert.equal(r.outcome, "accepted", JSON.stringify(r));
        assert.equal(parseRollbackResult(r).ok, true);
        const after = await owner.repo.read(s.snapshot.trip.id);
        assert.deepEqual(
          after.plans[0].days[0].items,
          s.snapshot.plans[0].days[0].items,
        );
        assert.equal(after.trip.revision, s.applied.trip.revision + 1);
      },
    );
    await run(
      "21-22 original receipt/audit immutable; new receipt audit outbox and correlation",
      async () => {
        const s = await seed();
        await accept(s);
        const original =
          await local.db`select to_jsonb(r) receipt,to_jsonb(a) audit from public.engine_apply_receipts r join public.engine_apply_audits a on a.receipt_id=r.id where r.id=${s.receipt}`;
        const r = await s.rollback.rollback(s.request);
        assert.equal(r.outcome, "accepted");
        assert.notEqual(r.applyReceiptId, s.receipt);
        assert.deepEqual(
          await local.db`select to_jsonb(r) receipt,to_jsonb(a) audit from public.engine_apply_receipts r join public.engine_apply_audits a on a.receipt_id=r.id where r.id=${s.receipt}`,
          original,
        );
        const [link] =
          await local.db`select compensation_receipt_id from public.engine_apply_compensations where original_receipt_id=${s.receipt}`;
        assert.equal(link.compensation_receipt_id, r.applyReceiptId);
        assert.equal((await state(r.applyReceiptId)).status, "pending");
      },
    );
    for (const kind of ["schedule", "order", "missing-item", "missing-day"])
      await run(
        "23-25 " + kind + " drift fails ROLLBACK_CONFLICT with zero mutation",
        async () => {
          const s = await seed({ reorder: kind === "order" });
          await accept(s);
          const now = await changeCurrent(s, (x) => {
            const day = x.plans[0].days[0];
            if (kind === "schedule")
              day.items[0].schedule.start = "2027-04-10T11:05:00+09:00";
            if (kind === "order") day.items.reverse();
            if (kind === "missing-item") day.items = [];
            if (kind === "missing-day") x.plans[0].days = [];
          });
          const counts = await count(s);
          const r = await s.rollback.rollback(s.request);
          assert.deepEqual(r.issueCodes, ["ROLLBACK_CONFLICT"]);
          await unchanged(s, now, counts);
        },
      );
    await run(
      "26-28 cross-user anonymous and actor mismatch reveal no authoritative state",
      async () => {
        const s = await seed();
        await accept(s);
        const counts = await count(s);
        const stranger = createEngineRollbackService(
          other.client,
          () => {
            throw Error("must not resolve");
          },
          () => orm,
        );
        const bad = await stranger.rollback({
          ...s.request,
          actorRef: other.id,
        });
        const missing = await stranger.rollback({
          ...s.request,
          actorRef: other.id,
          originalReceiptId: randomUUID(),
        });
        assert.deepEqual(bad.issueCodes, ["PERMISSION_DENIED"]);
        assert.deepEqual(missing.issueCodes, bad.issueCodes);
        assert.equal(bad.observedVersion, null);
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        assert.deepEqual(
          (
            await createEngineRollbackService(
              anon,
              resolver,
              () => orm,
            ).rollback(s.request)
          ).issueCodes,
          ["PERMISSION_DENIED"],
        );
        assert.deepEqual(
          (await s.rollback.rollback({ ...s.request, actorRef: other.id }))
            .issueCodes,
          ["PERMISSION_DENIED"],
        );
        await unchanged(s, s.applied, counts);
      },
    );
    for (const kind of [
      "system_hard_lock",
      "booking_lock",
      "payment_lock",
      "user_lock",
      "booking",
      "protected",
      "context-missing",
    ])
      await run(
        "29 current " + kind + " prevents rollback, no accepted audit/outbox",
        async () => {
          const s = await seed();
          await accept(s);
          let now = s.applied;
          if (kind.endsWith("_lock"))
            now = await changeCurrent(
              s,
              (x) => (x.plans[0].days[0].items[0].lockLevel = kind),
            );
          if (kind === "booking")
            now = await changeCurrent(
              s,
              (x) =>
                (x.plans[0].days[0].items[0].booking = {
                  status: "confirmed",
                  referenceId: "synthetic-booking",
                  verifiedAt: "2027-04-01T00:00:00Z",
                }),
            );
          if (kind === "protected")
            s.context.protectedItemIds = [now.plans[0].days[0].items[0].id];
          if (kind === "context-missing") s.context.profiles = [];
          const counts = await count(s),
            r = await s.rollback.rollback(s.request);
          assert.notEqual(r.outcome, "accepted", JSON.stringify(r));
          if (kind === "user_lock" || kind === "protected")
            assert.equal(r.outcome, "needsConfirmation");
          const afterCount = await count(s);
          assert.equal(afterCount.audits, counts.audits);
          assert.equal(afterCount.outbox, counts.outbox);
          assert.equal(afterCount.compensations, 0);
          assert.deepEqual(await owner.repo.read(s.snapshot.trip.id), now);
        },
      );
    await run(
      "30 historical accepted receipt without preimage is unsupported",
      async () => {
        const s = await seed();
        await accept(s);
        await local.db`delete from public.engine_apply_preimages where receipt_id=${s.receipt}`;
        const counts = await count(s);
        const r = await s.rollback.rollback(s.request);
        assert.equal(r.outcome, "unsupported");
        assert.deepEqual(r.issueCodes, ["ROLLBACK_HISTORY_UNAVAILABLE"]);
        await unchanged(s, s.applied, counts);
        const malformed = await seed();
        await accept(malformed);
        await local.db`update public.engine_apply_audits set operation_refs='[null]'::jsonb where receipt_id=${malformed.receipt}`;
        const malformedCounts = await count(malformed);
        const blocked = await malformed.rollback.rollback(malformed.request);
        assert.equal(blocked.outcome, "unsupported");
        assert.deepEqual(blocked.issueCodes, ["ROLLBACK_HISTORY_UNAVAILABLE"]);
        await unchanged(malformed, malformed.applied, malformedCounts);
      },
    );
    await run(
      "31 same request retry replays and changed payload conflicts",
      async () => {
        const s = await seed();
        await accept(s);
        const a = await s.rollback.rollback(s.request),
          now = await owner.repo.read(s.snapshot.trip.id),
          counts = await count(s);
        const b = await s.rollback.rollback(s.request);
        assert.equal(b.replay.duplicate, true);
        assert.deepEqual({ ...b, replay: { duplicate: false } }, a);
        const c = await s.rollback.rollback({
          ...s.request,
          reason: "different",
        });
        assert.deepEqual(c.issueCodes, ["IDEMPOTENCY_KEY_REUSED"]);
        await unchanged(s, now, counts);
      },
    );
    for (const sameKey of [true, false])
      await run(
        "32 real concurrent rollback " +
          (sameKey ? "same key" : "different keys") +
          " commits at most once",
        async () => {
          const s = await seed();
          await accept(s);
          let entered, release;
          const entry = new Promise((r) => (entered = r)),
            gate = new Promise((r) => (release = r));
          const slow = createEngineRollbackService(
            owner.client,
            async (input) => {
              entered();
              await gate;
              return resolver(input);
            },
            () => orm,
          );
          const first = slow.rollback(s.request);
          await Promise.race([
            entry,
            first.then(() => {
              throw Error("Expected resolver entry before completion");
            }),
          ]);
          const others = Array.from({ length: 3 }, () =>
            s.rollback.rollback(
              sameKey ? s.request : rollbackRequest(owner.id, s.receipt),
            ),
          );
          let waiting = 0;
          try {
            for (let n = 0; n < 50 && !waiting; n++) {
              waiting = (
                await local.db`select count(*)::int n from pg_stat_activity where datname=current_database() and wait_event='advisory' and pid<>pg_backend_pid()`
              )[0].n;
              if (!waiting) await new Promise((r) => setTimeout(r, 20));
            }
          } finally {
            release();
          }
          const rs = await Promise.all([first, ...others]);
          assert.ok(waiting > 0, "Distinct PostgreSQL session waits");
          assert.equal(
            rs.filter((r) => r.outcome === "accepted" && !r.replay.duplicate)
              .length,
            1,
          );
          assert.equal(
            rs.filter((r) => r.outcome === "accepted").length,
            sameKey ? 4 : 1,
          );
          assert.equal((await count(s)).compensations, 1);
          assert.equal((await count(s)).audits, 2);
        },
      );
    await run(
      "33 consumed original and compensation receipt cannot flip state back",
      async () => {
        const s = await seed();
        await accept(s);
        const r = await s.rollback.rollback(s.request),
          now = await owner.repo.read(s.snapshot.trip.id),
          counts = await count(s);
        assert.deepEqual(
          (await s.rollback.rollback(rollbackRequest(owner.id, s.receipt)))
            .issueCodes,
          ["ROLLBACK_ALREADY_COMPENSATED"],
        );
        assert.deepEqual(
          (
            await s.rollback.rollback(
              rollbackRequest(owner.id, r.applyReceiptId),
            )
          ).issueCodes,
          ["ROLLBACK_OUT_OF_SCOPE"],
        );
        await unchanged(s, now, counts);
      },
    );
    for (const where of ["preimage", "correlation", "deferred-commit"])
      await run(
        "34 forced " +
          where +
          " transaction failure rolls back Trip and all new metadata",
        async () => {
          const s = await seed();
          if (where !== "preimage") await accept(s);
          const before = where === "preimage" ? s.snapshot : s.applied,
            counts = await count(s);
          const table =
            where === "preimage"
              ? "engine_apply_preimages"
              : where === "correlation"
                ? "engine_apply_compensations"
                : "engine_rollback_receipts";
          await local.db.unsafe(
            "create function public.task064_failure() returns trigger language plpgsql as $$ begin raise exception using errcode='23514', message='synthetic-transaction-failure'; end $$",
          );
          await local.db.unsafe(
            where === "deferred-commit"
              ? "create constraint trigger task064_failure after insert on public." +
                  table +
                  " deferrable initially deferred for each row execute function public.task064_failure()"
              : "create trigger task064_failure before insert on public." +
                  table +
                  " for each row execute function public.task064_failure()",
          );
          try {
            const r =
              where === "preimage"
                ? await s.apply.apply(s.change)
                : await s.rollback.rollback(s.request);
            assert.equal(r.transaction.status, "rolled_back");
            await unchanged(s, before, counts);
          } finally {
            await local.db.unsafe(
              "drop trigger task064_failure on public." + table,
            );
            await local.db.unsafe("drop function public.task064_failure()");
          }
        },
      );
    await run(
      "34 ambiguous commit acknowledgement reconciles original rollback key",
      async () => {
        const s = await seed();
        await accept(s);
        let calls = 0;
        const fault = new Proxy(orm, {
          get(target, key) {
            if (key !== "transaction") return Reflect.get(target, key);
            return async (...args) => {
              const r = await target.transaction(...args);
              if (++calls === 1)
                throw Error("synthetic lost commit acknowledgement");
              return r;
            };
          },
        });
        const r = await createEngineRollbackService(
          owner.client,
          resolver,
          () => fault,
        ).rollback(s.request);
        assert.equal(r.outcome, "accepted");
        assert.equal(r.replay.duplicate, true);
        assert.equal((await count(s)).compensations, 1);
        assert.equal(
          (await s.rollback.reconcile(s.request)).applyReceiptId,
          r.applyReceiptId,
        );
      },
    );
    await run(
      "current owner/RLS is rechecked on rollback replay and reconciliation",
      async () => {
        const s = await seed();
        await accept(s);
        const r = await s.rollback.rollback(s.request);
        assert.equal(r.outcome, "accepted");
        const now = await owner.repo.read(s.snapshot.trip.id);
        await owner.repo.remove(now.trip.id, now.trip.revision);
        for (const value of [
          await s.rollback.rollback(s.request),
          await s.rollback.reconcile(s.request),
        ]) {
          assert.deepEqual(value.issueCodes, ["PERMISSION_DENIED"]);
          assert.equal(value.resultingVersion, null);
        }
      },
    );
    await run(
      "35 original apply replay/reconcile after compensation remains immutable",
      async () => {
        const s = await seed();
        const original = await accept(s);
        await s.rollback.rollback(s.request);
        const now = await owner.repo.read(s.snapshot.trip.id),
          counts = await count(s);
        for (const r of [
          await s.apply.apply(s.change),
          await s.apply.reconcile(s.change),
        ]) {
          assert.equal(r.replay.duplicate, true);
          assert.deepEqual(r.resultingVersion, original.resultingVersion);
        }
        await unchanged(s, now, counts);
      },
    );
    await run(
      "15/36 real account deletion cascades runtime/history/rollback metadata and preserves another user",
      async () => {
        const survivor = await seed({ user: other });
        await accept(survivor);
        await survivor.rollback.rollback(survivor.request);
        // Drain remaining events, including protected and drifted current state; findings stay read-only.
        for (let i = 0; i < 200; i++) {
          const r = await consumer().processNext();
          if (r.state === "idle") break;
          assert.notEqual(r.state, "retryable_failure");
        }
        const survivorBefore = await other.repo.read(survivor.snapshot.trip.id),
          survivorCounts = await count(survivor);
        for (const table of metadata) {
          const [r] = await local.db.unsafe(
            "select count(*)::int n from public." + table,
          );
          assert.ok(r.n > 0, "Real metadata fixture " + table);
        }
        local.env.DATABASE_URL = local.databaseUrl;
        local.env.SUPABASE_SECRET_KEY = localDeletionSecret(local);
        app = await startApp(local);
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
        owner.deleted = true;
        assert.equal(
          (
            await local.db`select count(*)::int n from public.engine_apply_receipts where actor_user_id=${owner.id}`
          )[0].n,
          0,
        );
        assert.equal(
          (
            await local.db`select count(*)::int n from public.engine_rollback_receipts where actor_user_id=${owner.id}`
          )[0].n,
          0,
        );
        await unchanged(survivor, survivorBefore, survivorCounts);
        evidence.cascade = {
          publicDeleteStatus: 204,
          otherUserPreserved: true,
        };
      },
    );
  } finally {
    if (app) await app.stop();
    for (const u of users)
      if (!u.deleted) success(await local.admin.auth.admin.deleteUser(u.id));
    const cleanup = {};
    for (const table of metadata)
      cleanup[table] = (
        await local.db.unsafe("select count(*)::int n from public." + table)
      )[0].n;
    cleanup.authUsers = Number(
      (await local.db`select count(*) from auth.users`)[0].count,
    );
    evidence.cleanup = cleanup;
    await mkdir(".artifacts/task064", { recursive: true });
    await writeFile(
      ".artifacts/task064/runtime-evidence.json",
      JSON.stringify(evidence, null, 2) + "\n",
    );
    await pool.end();
    await local.db.end();
    assert.ok(
      Object.values(cleanup).every((n) => n === 0),
      "All synthetic metadata/Auth fixtures removed",
    );
  }
});
