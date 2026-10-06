// Explicit localhost-only acceptance: real Auth and separate PostgreSQL sessions.
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema/index.ts";
import { createTripRepository } from "../src/server/trips/repository.ts";
import { createEngineApplyService } from "../src/server/engine/apply.ts";
import { parseTripPlanSnapshot } from "../src/shared/contracts/trips/index.ts";
import { preview } from "../src/server/engine/index.ts";
import { applyScenario, contextResolver } from "./task-063-fixtures.mjs";
import { preferenceLocalRuntime } from "./task-045-local-helpers.mjs";
import { localDeletionSecret } from "./task-052-local-helpers.mjs";
import { startApp } from "./task-018-local-helpers.mjs";
import { validDeletion } from "./task-052-account-deletion-fixtures.mjs";

const success = (r) => {
  assert.equal(
    r.error?.code ?? null,
    null,
    "Local request succeeds (credentials withheld)",
  );
  return r.data;
};
const tables = [
  "engine_apply_receipts",
  "engine_apply_audits",
  "engine_apply_outbox",
];
test("TASK-063 real Local Engine apply acceptance", async (t) => {
  const local = preferenceLocalRuntime(),
    pool = postgres(local.databaseUrl, {
      prepare: false,
      max: 6,
      onnotice: () => {},
    });
  const orm = drizzle(pool, { schema }),
    users = [],
    cases = [];
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
  const counts = async (s) => {
    const [row] = await local.db`select
      (select count(*)::int from public.engine_apply_receipts where trip_id=${s.change.target.tripId}) receipts,
      (select count(*)::int from public.engine_apply_audits a join public.engine_apply_receipts r on r.id=a.receipt_id where r.trip_id=${s.change.target.tripId}) audits,
      (select count(*)::int from public.engine_apply_outbox o join public.engine_apply_receipts r on r.id=o.receipt_id where r.trip_id=${s.change.target.tripId}) outbox`;
    return row;
  };
  try {
    assert.equal(
      Number((await local.db`select count(*) from auth.users`)[0].count),
      0,
      "Dedicated Local DB must be empty",
    );
    for (let i = 0; i < 2; i++) {
      const email = "task063-" + randomUUID() + "@example.test",
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
          .insert({ id, display_name: "Synthetic TASK-063" }),
      );
    }
    const [owner, other] = users;
    const seed = async (options = {}, mutate = () => {}, user = owner) => {
      const s = applyScenario(user.id, options);
      mutate(s);
      s.snapshot = await user.repo.create(s.snapshot);
      s.service = createEngineApplyService(
        user.client,
        contextResolver(s),
        () => orm,
      );
      s.user = user;
      return s;
    };
    const unchanged = async (s, before) => {
      assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), before);
      const c = await counts(s);
      assert.equal(c.audits, 0);
      assert.equal(c.outbox, 0);
    };
    const accepted = async (s) => {
      const result = await s.service.apply(s.change);
      assert.equal(result.outcome, "accepted", JSON.stringify(result.issues));
      assert.equal(result.transaction.status, "committed");
      assert.equal(result.preview, null);
      const actual = await s.user.repo.read(s.snapshot.trip.id);
      assert.equal(parseTripPlanSnapshot(actual).ok, true);
      assert.deepEqual(result.resultingVersion, {
        tripRevision: actual.trip.revision,
        planRevision: actual.plans[0].revision,
      });
      assert.equal(actual.trip.revision, s.snapshot.trip.revision + 1);
      assert.equal(actual.plans[0].revision, s.snapshot.plans[0].revision + 1);
      assert.deepEqual(await counts(s), { receipts: 1, audits: 1, outbox: 1 });
      return { result, actual };
    };
    await run(
      "owner UPDATE_TIME canonical round-trip and exact resulting revisions; unrelated plan unchanged",
      async () => {
        const s = await seed({ otherPlan: true });
        const { actual } = await accepted(s);
        assert.equal(
          Date.parse(actual.plans[0].days[0].items[0].schedule.start),
          Date.parse(s.change.operations[0].schedule.start),
        );
        assert.deepEqual(actual.plans[1], s.snapshot.plans[1]);
      },
    );
    await run("owner REORDER_ITEMS commits exact accepted order", async () => {
      const s = await seed({ reorder: true });
      const { actual } = await accepted(s);
      assert.deepEqual(
        actual.plans[0].days[0].items.map((i) => i.id),
        s.change.operations[0].orderedItemIds,
      );
    });
    for (const field of ["tripRevision", "planRevision"])
      await run(
        "stale " + field + " changes no Trip/audit/outbox",
        async () => {
          const s = await seed();
          s.change.baseVersion[field]++;
          const r = await s.service.apply(s.change);
          assert.equal(r.issues[0].code, "BASE_VERSION_STALE");
          await unchanged(s, s.snapshot);
          assert.equal((await counts(s)).receipts, 1);
        },
      );
    await run(
      "cross-user and nonexistent targets are indistinguishable and reveal no target details",
      async () => {
        const s = await seed(),
          before = s.snapshot;
        const change = structuredClone(s.change);
        change.source.actorRef = other.id;
        const service = createEngineApplyService(
          other.client,
          () => {
            throw Error("must not resolve");
          },
          () => orm,
        );
        const a = await service.apply(change),
          b = await service.apply({
            ...change,
            target: { tripId: randomUUID(), planId: randomUUID() },
          });
        for (const r of [a, b]) {
          assert.equal(r.issues[0].code, "PERMISSION_DENIED");
          assert.equal(r.observedVersion, null);
          assert.equal(r.assessment, undefined);
        }
        await unchanged(s, before);
        assert.equal((await counts(s)).receipts, 0);
      },
    );
    await run(
      "real anonymous client and actorRef mismatch fail closed",
      async () => {
        const s = await seed();
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const denied = await createEngineApplyService(
          anon,
          contextResolver(s),
          () => orm,
        ).apply(s.change);
        assert.equal(denied.issues[0].code, "PERMISSION_DENIED");
        const mismatch = await s.service.apply({
          ...s.change,
          source: { ...s.change.source, actorRef: other.id },
        });
        assert.equal(mismatch.issues[0].code, "PERMISSION_DENIED");
        await unchanged(s, s.snapshot);
      },
    );
    for (const [lock, outcome] of [
      ["system_hard_lock", "blocked"],
      ["booking_lock", "unsupported"],
      ["payment_lock", "unsupported"],
      ["user_lock", "needsConfirmation"],
    ])
      await run(lock + " cannot mutate", async () => {
        const s = await seed({}, (s) => {
          s.snapshot.plans[0].days[0].items[0].lockLevel = lock;
        });
        const r = await s.service.apply(s.change);
        assert.equal(r.outcome, outcome);
        await unchanged(s, s.snapshot);
        if (outcome === "needsConfirmation")
          assert.ok(r.confirmationRequirements.length);
      });
    await run(
      "protected context requires confirmation; replay retains original requirement; client grant rejected",
      async () => {
        const s = await seed({}, (s) =>
          s.context.protectedItemIds.push(s.change.operations[0].itemId),
        );
        const r = await s.service.apply(s.change);
        assert.equal(r.outcome, "needsConfirmation");
        assert.ok(r.confirmationRequirements.length);
        const replay = await s.service.apply(s.change);
        assert.equal(replay.replay.duplicate, true);
        assert.deepEqual(
          replay.confirmationRequirements,
          r.confirmationRequirements,
        );
        assert.equal(
          (await s.service.apply({ ...s.change, confirmed: true })).issues[0]
            .code,
          "INPUT_INVALID",
        );
        await unchanged(s, s.snapshot);
      },
    );
    await run("reorder of protected items is unsupported", async () => {
      const s = await seed({ reorder: true }, (s) =>
        s.context.protectedItemIds.push(
          s.snapshot.plans[0].days[0].items[0].id,
        ),
      );
      assert.equal((await s.service.apply(s.change)).outcome, "unsupported");
      await unchanged(s, s.snapshot);
    });
    for (const kind of ["ai", "system", "provider_event"])
      await run("source " + kind + " remains unsupported", async () => {
        const s = await seed();
        s.change.source.kind = kind;
        assert.equal((await s.service.apply(s.change)).outcome, "unsupported");
        await unchanged(s, s.snapshot);
      });
    await run(
      "all other recognized operation shapes remain unsupported",
      async () => {
        const ops = [
          { op: "ADD_ITEM", dayId: randomUUID(), position: 0, item: {} },
          {
            op: "MOVE_ITEM",
            itemId: randomUUID(),
            toDayId: randomUUID(),
            toPosition: 0,
            schedule: {},
          },
          { op: "DELETE_ITEM", itemId: randomUUID() },
          { op: "REPLACE_ITEM", itemId: randomUUID(), replacement: {} },
          ...[
            "UPDATE_ITEM",
            "UPDATE_DURATION",
            "REPLACE_TRANSPORT",
            "SKIP_ITEM",
            "RESTORE_ITEM",
            "LINK_BOOKING",
            "UPDATE_BOOKING_STATUS",
            "REPLAN_DAY",
            "REPLAN_RANGE",
          ].map((op) => ({ op, targetRef: null })),
          { op: "UPDATE_PLACE", itemId: randomUUID(), place: {} },
          { op: "LOCK_ITEM", itemId: randomUUID(), toLockLevel: "user_lock" },
          { op: "UNLOCK_ITEM", itemId: randomUUID(), toLockLevel: "none" },
        ];
        for (const op of ops) {
          const s = await seed();
          s.change.operations = [
            { operationId: randomUUID(), reason: null, ...op },
          ];
          assert.equal(
            (await s.service.apply(s.change)).outcome,
            "unsupported",
            op.op,
          );
          await unchanged(s, s.snapshot);
        }
      },
    );
    await run(
      "same key/payload replay uses committed original result despite newer DB version",
      async () => {
        const s = await seed();
        const { result, actual } = await accepted(s);
        const replay = await s.service.apply(
          Object.fromEntries(Object.entries(s.change).reverse()),
        );
        assert.equal(replay.replay.duplicate, true);
        assert.equal(replay.replay.originalChangeSetId, s.change.changeSetId);
        assert.deepEqual({ ...replay, replay: result.replay }, result);
        assert.deepEqual(await owner.repo.read(actual.trip.id), actual);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "same key different payload/target conflicts without mutation",
      async () => {
        const s = await seed();
        const { actual } = await accepted(s);
        for (const change of [
          { ...s.change, reason: "changed" },
          {
            ...s.change,
            target: { tripId: randomUUID(), planId: randomUUID() },
          },
        ]) {
          const r = await s.service.apply(change);
          assert.equal(r.issues[0].code, "IDEMPOTENCY_KEY_REUSED");
          assert.equal(r.resultingVersion, null);
        }
        assert.deepEqual(await owner.repo.read(actual.trip.id), actual);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "same key in different actors has independent ownership scope",
      async () => {
        const a = await seed(),
          b = await seed({}, () => {}, other);
        b.change.idempotencyKey = a.change.idempotencyKey;
        await accepted(a);
        await accepted(b);
      },
    );
    await run(
      "concurrent same key on distinct DB sessions commits once",
      async () => {
        const s = await seed();
        const results = await Promise.all(
          Array.from({ length: 5 }, () => s.service.apply(s.change)),
        );
        assert.ok(results.every((r) => r.outcome === "accepted"));
        assert.equal(results.filter((r) => !r.replay.duplicate).length, 1);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
        assert.equal(
          (await owner.repo.read(s.snapshot.trip.id)).trip.revision,
          2,
        );
      },
    );
    await run(
      "different keys at same base cannot overwrite one another",
      async () => {
        const s = await seed();
        const otherChange = {
          ...structuredClone(s.change),
          idempotencyKey: randomUUID(),
          changeSetId: randomUUID(),
        };
        const results = await Promise.all([
          s.service.apply(s.change),
          s.service.apply(otherChange),
        ]);
        assert.equal(results.filter((r) => r.outcome === "accepted").length, 1);
        assert.equal(
          results.filter((r) =>
            r.issues.some((i) => i.code === "BASE_VERSION_STALE"),
          ).length,
          1,
        );
        assert.deepEqual(await counts(s), {
          receipts: 2,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "DB change after caller preview is reevaluated from authoritative snapshot",
      async () => {
        const s = await seed();
        assert.equal(
          preview(s.snapshot, s.change, s.context).outcome,
          "accepted",
        );
        const changed = structuredClone(s.snapshot);
        changed.plans[0].days[0].items[0].lockLevel = "system_hard_lock";
        const locked = await owner.repo.replace(changed);
        s.change.baseVersion = {
          tripRevision: locked.trip.revision,
          planRevision: locked.plans[0].revision,
        };
        assert.equal((await s.service.apply(s.change)).outcome, "blocked");
        await unchanged(s, locked);
      },
    );
    await run(
      "resolver receives detached state; access is always bound by verified service",
      async () => {
        const s = await seed();
        const service = createEngineApplyService(
          owner.client,
          ({ snapshot, change }) => {
            snapshot.trip.title = "cannot persist";
            change.operations[0].schedule.start = "bad";
            return {
              ...structuredClone(s.context),
              access: { actorRef: other.id, canRead: false, canPropose: false },
            };
          },
          () => orm,
        );
        const r = await service.apply(s.change);
        assert.equal(r.outcome, "accepted");
        assert.equal(
          (await owner.repo.read(s.snapshot.trip.id)).trip.title,
          s.snapshot.trip.title,
        );
      },
    );
    await run(
      "forced outbox insert failure rolls back Trip, terminal receipt and audit; same-key retry works",
      async () => {
        const s = await seed();
        await local.db.unsafe(
          "create function public.task063_fail_outbox() returns trigger language plpgsql as $$ begin raise exception 'synthetic-outbox-failure'; end $$",
        );
        await local.db.unsafe(
          "create trigger task063_fail_outbox before insert on public.engine_apply_outbox for each row execute function public.task063_fail_outbox()",
        );
        try {
          const r = await s.service.apply(s.change);
          assert.equal(r.transaction.status, "rolled_back");
          assert.equal(r.resultingVersion, null);
          assert.equal(r.issues[0].code, "TRANSACTION_FAILED");
          assert.doesNotMatch(
            JSON.stringify(r),
            /synthetic-outbox|postgres|password/i,
          );
          await unchanged(s, s.snapshot);
          assert.equal((await counts(s)).receipts, 0);
        } finally {
          await local.db.unsafe(
            "drop trigger task063_fail_outbox on public.engine_apply_outbox",
          );
          await local.db.unsafe("drop function public.task063_fail_outbox()");
        }
        await accepted(s);
      },
    );
    await run(
      "deterministic lost COMMIT acknowledgement reconciles actual committed Local receipt",
      async () => {
        const s = await seed();
        let first = true;
        const lostAck = new Proxy(orm, {
          get(target, key) {
            if (key !== "transaction") return Reflect.get(target, key);
            return async (...args) => {
              const result = await target.transaction(...args);
              if (first) {
                first = false;
                throw Error("synthetic-lost-ack");
              }
              return result;
            };
          },
        });
        const r = await createEngineApplyService(
          owner.client,
          contextResolver(s),
          () => lostAck,
        ).apply(s.change);
        assert.equal(r.outcome, "accepted");
        assert.equal(r.replay.duplicate, true);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "unknown outcome never invents rollback; later original-key reconciliation returns real commit",
      async () => {
        const s = await seed();
        let first = true;
        const fault = new Proxy(orm, {
          get(target, key) {
            if (key !== "transaction") return Reflect.get(target, key);
            return async (...args) => {
              if (first) {
                first = false;
                await target.transaction(...args);
              }
              throw Error("synthetic-unavailable");
            };
          },
        });
        const r = await createEngineApplyService(
          owner.client,
          contextResolver(s),
          () => fault,
        ).apply(s.change);
        assert.equal(r.transaction.status, "outcome_unknown");
        assert.equal(r.resultingVersion, null);
        const recovered = await s.service.reconcile(s.change);
        assert.equal(recovered.outcome, "accepted");
        assert.equal(recovered.replay.duplicate, true);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
        const missing = await s.service.reconcile({
          ...s.change,
          idempotencyKey: randomUUID(),
        });
        assert.equal(missing.transaction.status, "outcome_unknown");
      },
    );
    await run(
      "authenticated and anonymous roles cannot read/forge Engine metadata",
      async () => {
        const anon = createClient(local.api, local.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        for (const client of [owner.client, anon])
          for (const table of tables) {
            assert.equal(
              (await client.from(table).select("*")).error?.code,
              "42501",
            );
            assert.equal(
              (await client.from(table).insert({})).error?.code,
              "42501",
            );
          }
        const rows =
          await local.db`select relname,relrowsecurity from pg_class where relname in ${local.db(tables)}`;
        assert.equal(rows.length, 3);
        assert.ok(rows.every((r) => r.relrowsecurity));
      },
    );
    await run(
      "receipt metadata is minimal and exactly one accepted audit/pending outbox per accepted decision",
      async () => {
        const [r] =
          await local.db`select count(*)::int n from public.engine_apply_receipts r left join public.engine_apply_audits a on a.receipt_id=r.id left join public.engine_apply_outbox o on o.receipt_id=r.id where (r.outcome='accepted' and (a.receipt_id is null or o.status is distinct from 'pending')) or (r.outcome<>'accepted' and (a.receipt_id is not null or o.receipt_id is not null))`;
        assert.equal(r.n, 0);
        const rows =
          await local.db`select result from public.engine_apply_receipts`;
        assert.ok(rows.length > 0);
        assert.ok(rows.every((r) => r.result.preview === null));
        assert.doesNotMatch(
          JSON.stringify(rows),
          /access_token|refresh_token|Authorization|password|sb_secret|providerResponse/,
        );
      },
    );

    await run(
      "real concurrent key lock wait uses distinct PostgreSQL sessions",
      async () => {
        const s = await seed();
        let entered, release;
        const entry = new Promise((r) => {
          entered = r;
        });
        const gate = new Promise((r) => {
          release = r;
        });
        const service = createEngineApplyService(
          owner.client,
          async () => {
            entered();
            await gate;
            return contextResolver(s)();
          },
          () => orm,
        );
        const first = service.apply(s.change);
        await entry;
        const others = Array.from({ length: 3 }, () => service.apply(s.change));
        let waiting = 0;
        try {
          for (let n = 0; n < 50 && !waiting; n++) {
            const [r] =
              await local.db`select count(*)::int n from pg_stat_activity where datname=current_database() and wait_event='advisory' and pid<>pg_backend_pid()`;
            waiting = r.n;
            if (!waiting) await new Promise((r) => setTimeout(r, 20));
          }
        } finally {
          release();
        }
        const results = await Promise.all([first, ...others]);
        assert.ok(
          waiting > 0,
          "At least one other PostgreSQL session really waited on the original key",
        );
        assert.equal(results.filter((r) => !r.replay.duplicate).length, 1);
        assert.ok(results.every((r) => r.outcome === "accepted"));
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "booking evidence and soft duration policy never bypass apply gates",
      async () => {
        const booked = await seed({}, (s) => {
          s.snapshot.plans[0].days[0].items[0].booking = {
            status: "confirmed",
            referenceId: "synthetic-booking",
            verifiedAt: "2027-04-01T00:00:00Z",
          };
        });
        assert.equal(
          (await booked.service.apply(booked.change)).outcome,
          "unsupported",
        );
        await unchanged(booked, booked.snapshot);
        const soft = await seed({}, (s) => {
          s.context.policy.minimum = "confirmation";
          s.change.operations[0].schedule.end = "2027-04-10T11:30:00+09:00";
        });
        const result = await soft.service.apply(soft.change);
        assert.equal(result.outcome, "needsConfirmation");
        assert.ok(result.confirmationRequirements.length);
        await unchanged(soft, soft.snapshot);
      },
    );
    await run(
      "known deferred COMMIT constraint rejection is rollback, with no terminal/audit/outbox",
      async () => {
        const s = await seed();
        await local.db.unsafe(
          "create function public.task063_commit_failure() returns trigger language plpgsql as $$ begin raise exception using errcode='23514', message='synthetic-deferred-failure'; end $$",
        );
        await local.db.unsafe(
          "create constraint trigger task063_commit_failure after insert on public.engine_apply_outbox deferrable initially deferred for each row execute function public.task063_commit_failure()",
        );
        try {
          const result = await s.service.apply(s.change);
          assert.equal(result.transaction.status, "rolled_back");
          assert.equal(result.issues[0].code, "TRANSACTION_FAILED");
          await unchanged(s, s.snapshot);
          assert.equal((await counts(s)).receipts, 0);
        } finally {
          await local.db.unsafe(
            "drop trigger task063_commit_failure on public.engine_apply_outbox",
          );
          await local.db.unsafe(
            "drop function public.task063_commit_failure()",
          );
        }
      },
    );
    await run(
      "post-COMMIT read serialization failure cannot misreport rollback",
      async () => {
        const s = await seed();
        let calls = 0;
        const fault = new Proxy(orm, {
          get(target, key) {
            if (key !== "transaction") return Reflect.get(target, key);
            return async (...args) => {
              if (++calls === 2) {
                const error = Error("synthetic-read-failure");
                error.code = "40001";
                throw error;
              }
              return target.transaction(...args);
            };
          },
        });
        const r = await createEngineApplyService(
          owner.client,
          contextResolver(s),
          () => fault,
        ).apply(s.change);
        assert.equal(r.outcome, "accepted");
        assert.equal(r.transaction.status, "committed");
        assert.equal(r.replay.duplicate, true);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "target deletion retains safe receipt replay until account deletion",
      async () => {
        const s = await seed();
        const { result, actual } = await accepted(s);
        await owner.repo.remove(actual.trip.id, actual.trip.revision);
        const replay = await s.service.reconcile(s.change);
        assert.equal(replay.replay.duplicate, true);
        assert.deepEqual(replay.resultingVersion, result.resultingVersion);
        assert.deepEqual(await counts(s), {
          receipts: 1,
          audits: 1,
          outbox: 1,
        });
      },
    );
    await run(
      "public account deletion cascades Engine receipts/audits/outbox and Trip/Profile; other owner preserved",
      async () => {
        const keep = await seed({}, () => {}, other);
        await accepted(keep);
        const keepTrip = await other.repo.read(keep.snapshot.trip.id);
        const before =
          await local.db`select * from public.engine_apply_receipts where actor_user_id=${other.id} order by id`;
        local.env.DATABASE_URL = local.databaseUrl;
        local.env.SUPABASE_SECRET_KEY = localDeletionSecret(local);
        app = await startApp(local);
        const response = await fetch(app.origin + "/api/account", {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + owner.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validDeletion()),
        });
        assert.equal(response.status, 204);
        for (const table of ["auth.users", "public.profiles"])
          assert.equal(
            Number(
              (
                await local.db`select count(*) from ${local.db(table)} where id=${owner.id}`
              )[0].count,
            ),
            0,
          );
        assert.equal(
          Number(
            (
              await local.db`select count(*) from public.engine_apply_receipts where actor_user_id=${owner.id}`
            )[0].count,
          ),
          0,
        );
        assert.equal(
          Number(
            (
              await local.db`select count(*) from public.trips where owner_user_id=${owner.id}`
            )[0].count,
          ),
          0,
        );
        const [orphans] =
          await local.db`select (select count(*) from public.engine_apply_audits a left join public.engine_apply_receipts r on r.id=a.receipt_id where r.id is null)+(select count(*) from public.engine_apply_outbox o left join public.engine_apply_audits a on a.receipt_id=o.receipt_id where a.receipt_id is null) n`;
        assert.equal(Number(orphans.n), 0);
        assert.deepEqual(
          await local.db`select * from public.engine_apply_receipts where actor_user_id=${other.id} order by id`,
          before,
        );
        assert.deepEqual(
          await other.repo.read(keep.snapshot.trip.id),
          keepTrip,
        );
      },
    );
  } finally {
    if (app) await app.stop();
    for (const user of users) await local.admin.auth.admin.deleteUser(user.id);
    const remaining = Number(
      (await local.db`select count(*) from auth.users`)[0].count,
    );
    const metadataCounts = {};
    for (const table of tables)
      metadataCounts[table] = Number(
        (await local.db`select count(*) from ${local.db("public." + table)}`)[0]
          .count,
      );
    await mkdir(".artifacts/task063", { recursive: true });
    await writeFile(
      ".artifacts/task063/runtime.json",
      JSON.stringify(
        {
          status:
            cases.length && cases.every((c) => c.status === "PASS")
              ? "PASS"
              : "FAIL",
          realLocalAuth: true,
          concurrencyPoolSize: 6,
          unknownCommit:
            "deterministic acknowledgement fault; real committed DB reconciliation (not live network failure)",
          cases,
          cleanup: { authUsers: remaining, ...metadataCounts },
        },
        null,
        2,
      ) + "\n",
    );
    await pool.end({ timeout: 5 });
    await local.db.end({ timeout: 5 });
    assert.equal(remaining, 0);
    assert.ok(Object.values(metadataCounts).every((n) => n === 0));
  }
});
