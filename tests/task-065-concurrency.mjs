import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { defer, bounded, hash } from "./task-065-local-harness.mjs";
import { rollbackRequest } from "./task-064-fixtures.mjs";
const fresh = (c) => ({
  ...structuredClone(c),
  idempotencyKey: randomUUID(),
  changeSetId: randomUUID(),
});
const accepted = (rs) =>
  rs.filter((r) => r.outcome === "accepted" && !r.replay.duplicate);
export async function applyConcurrency(h, rounds) {
  for (const mode of [
    "same_key",
    "mixed_payload",
    "stale_base",
    "two_plans",
    "independent_trips",
    "actor_isolation",
  ]) {
    for (let round = 0; round < rounds; round++) {
      const s = await h.seed(),
        start = Date.now();
      let rs,
        waiters = 0,
        expected = 1,
        requests = 16;
      if (mode === "same_key" || mode === "mixed_payload") {
        const entry = defer(),
          gate = defer();
        const slow = h.apply(s.user, async (i) => {
          entry.resolve();
          await gate.promise;
          return h.resolver(i);
        });
        const first = slow.apply(s.change);
        await bounded(entry.promise, "first apply resolver");
        const changes = Array.from({ length: 15 }, (_, i) =>
          mode === "mixed_payload" && i % 2 === 0
            ? { ...s.change, reason: "semantic-conflict-" + i }
            : s.change,
        );
        const pending = changes.map((c) => s.apply.apply(c));
        try {
          waiters = await h.waiters(15);
        } finally {
          gate.resolve();
        }
        rs = await Promise.all([first, ...pending]);
        assert.equal(accepted(rs).length, 1);
        if (mode === "same_key") {
          assert.equal(rs.filter((r) => r.replay.duplicate).length, 15);
          for (const r of rs)
            assert.deepEqual({ ...r, replay: rs[0].replay }, rs[0]);
        } else
          for (const [i, r] of rs.slice(1).entries()) {
            if (i % 2 === 0)
              assert.ok(
                r.issues.some((x) => x.code === "IDEMPOTENCY_KEY_REUSED"),
              );
            else assert.equal(r.replay.duplicate, true);
          }
      } else if (mode === "stale_base") {
        const entered = defer(),
          release = defer();
        const first = h
          .apply(s.user, async (input) => {
            entered.resolve();
            await release.promise;
            return h.resolver(input);
          })
          .apply(fresh(s.change));
        await bounded(
          entered.promise,
          "stale-base winner inside authoritative lock",
        );
        const pending = Array.from({ length: 15 }, () =>
          s.apply.apply(fresh(s.change)),
        );
        try {
          waiters = await h.waiters(15, true);
        } finally {
          release.resolve();
        }
        rs = await Promise.all([first, ...pending]);
        assert.equal(accepted(rs).length, 1);
        assert.equal(
          rs.filter((r) =>
            r.issues.some((i) => i.code === "BASE_VERSION_STALE"),
          ).length,
          15,
        );
      } else if (mode === "two_plans") {
        // Add a second plan using the existing 8.5 repository, then race the shared root revision.
        const snapshot = await s.user.repo.read(s.snapshot.trip.id),
          second = structuredClone(snapshot.plans[0]);
        const map = new Map([
          [second.id, randomUUID()],
          ...second.days.flatMap((d) => [
            [d.id, randomUUID()],
            ...d.items.map((i) => [i.id, randomUUID()]),
          ]),
        ]);
        const remap = (x) =>
          JSON.parse(
            JSON.stringify(x, (_k, v) =>
              typeof v === "string" && map.has(v) ? map.get(v) : v,
            ),
          );
        snapshot.plans.push(remap(second));
        snapshot.plans[1].revision = 1;
        s.snapshot = await s.user.repo.replace(snapshot);
        const c1 = fresh(s.change);
        c1.baseVersion = h.version(s.snapshot);
        const c2 = remap(fresh(c1));
        c2.baseVersion = h.version(s.snapshot, c2.target.planId);
        const ctx = { context: remap(s.context) };
        h.contexts.set(c2.target.planId, ctx);
        rs = await Promise.all([s.apply.apply(c1), s.apply.apply(c2)]);
        requests = 2;
        const winningChange = [c1, c2].find(
          (c) => c.changeSetId === accepted(rs)[0]?.changeSetId,
        );
        assert.ok(winningChange);
        assert.deepEqual(
          accepted(rs)[0].resultingVersion,
          h.version(
            await s.user.repo.read(s.snapshot.trip.id),
            winningChange.target.planId,
          ),
        );
        assert.equal(accepted(rs).length, 1);
        assert.ok(
          rs.some((r) => r.issues.some((i) => i.code === "BASE_VERSION_STALE")),
        );
      } else {
        const other = await h.seed({
          user: mode === "actor_isolation" ? h.users[1] : s.user,
        });
        if (mode === "actor_isolation")
          other.change.idempotencyKey = s.change.idempotencyKey;
        const both = defer(),
          release = defer();
        let entered = 0;
        const resolver = async (input) => {
          if (++entered === 2) both.resolve();
          await release.promise;
          return h.resolver(input);
        };
        const pending = [
          h.apply(s.user, resolver).apply(s.change),
          h.apply(other.user, resolver).apply(other.change),
        ];
        try {
          await bounded(both.promise, "independent roots enter concurrently");
        } finally {
          release.resolve();
        }
        rs = await Promise.all(pending);
        requests = 2;
        expected = 2;
        assert.equal(accepted(rs).length, 2);
        assert.deepEqual(
          rs[1].resultingVersion,
          h.version(await other.user.repo.read(other.snapshot.trip.id)),
        );
        assert.equal((await h.count(other)).audits, 1);
      }
      const current = await s.user.repo.read(s.snapshot.trip.id);
      const winner = accepted(rs).find((r) => r.changeSetId !== undefined);
      if (mode !== "two_plans")
        assert.deepEqual(winner.resultingVersion, h.version(current));
      else {
        assert.equal(
          winner.resultingVersion.tripRevision,
          current.trip.revision,
        );
        assert.ok(
          current.plans.some(
            (p) => p.revision === winner.resultingVersion.planRevision,
          ),
        );
      }
      const c = await h.count(s);
      assert.equal(c.audits, 1);
      assert.equal(c.outbox, 1);
      assert.equal(c.preimages, 1);
      assert.equal(c.compensations, 0);
      const graph = await h.graph();
      h.evidence.applyRounds.push({
        mode,
        round,
        requests,
        acceptedCommits: expected,
        observedLockWaiters: waiters,
        waitKind:
          mode === "stale_base" ? "Trip root" : waiters ? "advisory" : null,
        durationMs: Date.now() - start,
        graph,
      });
      if (round % 5 === 0) await h.save();
    }
    console.log("TASK065 apply " + mode + " " + rounds + " rounds");
  }
}
export async function rollbackConcurrency(h, rounds) {
  for (const mode of [
    "same_key",
    "different_keys",
    "rollback_wins_apply_race",
    "apply_wins_rollback_race",
    "state_drift",
  ]) {
    for (let round = 0; round < rounds; round++) {
      const reorder = round % 2 === 1,
        s = await h.seed({ reorder });
      const initial = await h.accept(s),
        original = await h.original(s);
      let rs = [],
        expectedCompensations = 1;
      if (mode === "same_key" || mode === "different_keys") {
        rs = await Promise.all(
          Array.from({ length: 8 }, () =>
            s.rollback.rollback(
              mode === "same_key"
                ? s.request
                : rollbackRequest(s.user.id, s.receipt),
            ),
          ),
        );
        assert.equal(accepted(rs).length, 1);
        assert.equal(
          rs.filter((r) => r.outcome === "accepted").length,
          mode === "same_key" ? 8 : 1,
        );
      } else {
        const { change } = await h.currentChange(s);
        // A subsequent accepted normal apply restores the prior target values using current revisions.
        const before = s.snapshot.plans[0].days[0];
        change.operations = before.items.map((i) => ({
          op: "UPDATE_TIME",
          operationId: randomUUID(),
          reason: null,
          itemId: i.id,
          schedule: i.schedule,
        }));
        if (reorder)
          change.operations.push({
            op: "REORDER_ITEMS",
            operationId: randomUUID(),
            reason: null,
            dayId: before.id,
            orderedItemIds: before.items.map((i) => i.id),
          });
        if (mode === "state_drift") {
          await h.accept(s, change);
          const request = {
            ...s.request,
            originalReceiptId: original.receipt.id,
            idempotencyKey: randomUUID(),
          };
          rs = await Promise.all(
            Array.from({ length: 8 }, () => s.rollback.rollback(request)),
          );
          for (const result of rs)
            assert.deepEqual(result.issueCodes, ["ROLLBACK_CONFLICT"]);
          assert.equal(rs.filter((r) => r.replay.duplicate).length, 7);
          expectedCompensations = 0;
        } else {
          const entry = defer(),
            gate = defer(),
            slow = async (i) => {
              entry.resolve();
              await gate.promise;
              return h.resolver(i);
            };
          const rollbackFirst = mode === "rollback_wins_apply_race";
          const first = rollbackFirst
            ? h.rollback(s.user, slow).rollback(s.request)
            : h.apply(s.user, slow).apply(change);
          await bounded(entry.promise, "race winner holds authoritative root");
          const second = rollbackFirst
            ? s.apply.apply(change)
            : s.rollback.rollback(s.request);
          // Observe the competing PostgreSQL root lock, not just Promise scheduling.
          let waiting = 0;
          try {
            for (let i = 0; i < 150; i++) {
              waiting = (
                await h.local
                  .db`select count(*)::int n from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and pid<>pg_backend_pid()`
              )[0].n;
              if (waiting) break;
              await new Promise((r) => setTimeout(r, 20));
            }
          } finally {
            gate.resolve();
          }
          rs = await Promise.all([first, second]);
          assert.ok(waiting > 0);
          assert.equal(rs[0].outcome, "accepted");
          assert.notEqual(rs[1].outcome, "accepted");
          if (rollbackFirst)
            assert.ok(
              rs[1].issues.some((x) => x.code === "BASE_VERSION_STALE"),
            );
          else assert.deepEqual(rs[1].issueCodes, ["ROLLBACK_CONFLICT"]);
          expectedCompensations = rollbackFirst ? 1 : 0;
        }
      }
      // seed.accept updates s.receipt for drift; restore original identity for immutability checks.
      s.receipt = original.receipt.id;
      assert.deepEqual(await h.original(s), original);
      const now = await s.user.repo.read(s.snapshot.trip.id),
        counts = await h.count(s);
      assert.equal(
        now.trip.revision,
        initial.resultingVersion.tripRevision + 1,
      );
      assert.equal(
        now.plans[0].revision,
        initial.resultingVersion.planRevision + 1,
      );
      assert.equal(counts.audits, 2);
      assert.equal(counts.outbox, 2);
      assert.equal(counts.preimages, 2);
      assert.equal(counts.compensations, expectedCompensations);
      const comp = rs.find((r) => r.outcome === "accepted" && r.applyReceiptId);
      if (comp) {
        assert.deepEqual(comp.resultingVersion, h.version(now));
        assert.deepEqual(now.plans[0].days, s.snapshot.plans[0].days);
        const replay = await s.rollback.rollback(
          mode === "same_key"
            ? s.request
            : { ...s.request, idempotencyKey: randomUUID() },
        );
        if (mode === "same_key") assert.equal(replay.replay.duplicate, true);
        else
          assert.deepEqual(replay.issueCodes, ["ROLLBACK_ALREADY_COMPENSATED"]);
        const flip = await s.rollback.rollback(
          rollbackRequest(s.user.id, comp.applyReceiptId),
        );
        assert.deepEqual(flip.issueCodes, ["ROLLBACK_OUT_OF_SCOPE"]);
      }
      const replay = await s.apply.reconcile(s.change);
      assert.equal(replay.replay.duplicate, true);
      assert.deepEqual(replay.resultingVersion, initial.resultingVersion);
      assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), now);
      h.evidence.rollbackRounds.push({
        mode,
        round,
        operations: reorder
          ? ["UPDATE_TIME", "REORDER_ITEMS"]
          : ["UPDATE_TIME"],
        requests: mode.includes("key") || mode === "state_drift" ? 8 : 2,
        acceptedCompensations: expectedCompensations,
        originalSha256: hash(original),
        currentVersion: h.version(now),
        graph: await h.graph(),
      });
      if (round % 5 === 0) await h.save();
    }
    console.log("TASK065 rollback " + mode + " " + rounds + " rounds");
  }
}
