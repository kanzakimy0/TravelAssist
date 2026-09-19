import assert from "node:assert/strict";
export async function faultMatrix(h) {
  for (const compensation of [false, true]) {
    for (const boundary of [
      "trip_write",
      "after_trip_write",
      "receipt",
      "audit",
      "preimage",
      "outbox",
      "commit_constraint",
      "serialization_rejection",
      ...(compensation ? ["correlation", "rollback_receipt"] : []),
    ]) {
      const s = await h.seed({ reorder: compensation });
      if (compensation) await h.accept(s);
      const before = await s.user.repo.read(s.snapshot.trip.id),
        counts = await h.count(s);
      const tables = {
        trip_write: "trips",
        after_trip_write: "engine_apply_receipts",
        receipt: "engine_apply_receipts",
        audit: "engine_apply_audits",
        preimage: "engine_apply_preimages",
        outbox: "engine_apply_outbox",
        commit_constraint: compensation
          ? "engine_rollback_receipts"
          : "engine_apply_receipts",
        serialization_rejection: compensation
          ? "engine_rollback_receipts"
          : "engine_apply_receipts",
        correlation: "engine_apply_compensations",
        rollback_receipt: "engine_rollback_receipts",
      };
      const table = tables[boundary],
        deferred = ["commit_constraint", "serialization_rejection"].includes(
          boundary,
        );
      // Actual PostgreSQL trigger/constraint failure, never a mock successful transaction.
      await h.local.db.unsafe(
        "create function public.task065_fault() returns trigger language plpgsql as $$ begin raise exception using errcode='" +
          (boundary === "serialization_rejection" ? "40001" : "23514") +
          "', message='TASK065_SECRET_AUTHORIZATION_CANARY'; end $$",
      );
      await h.local.db.unsafe(
        deferred
          ? "create constraint trigger task065_fault after insert on public." +
              table +
              " deferrable initially deferred for each row execute function public.task065_fault()"
          : "create trigger task065_fault " +
              (boundary === "after_trip_write"
                ? "before insert"
                : boundary === "trip_write"
                  ? "before update"
                  : "before insert") +
              " on public." +
              table +
              " for each row execute function public.task065_fault()",
      );
      let result;
      try {
        result = compensation
          ? await s.rollback.rollback(s.request)
          : await s.apply.apply(s.change);
        assert.equal(result.transaction.status, "rolled_back", boundary);
        assert.equal(result.resultingVersion, null);
        assert.doesNotMatch(
          JSON.stringify(result),
          /TASK065_SECRET|postgres|23514|40001|Authorization/i,
        );
        assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), before);
        assert.deepEqual(await h.count(s), counts);
      } finally {
        await h.local.db.unsafe(
          "drop trigger task065_fault on public." + table,
        );
        await h.local.db.unsafe("drop function public.task065_fault()");
      }
      // Same original key/payload after proven rollback.
      const retry = compensation
        ? await s.rollback.rollback(s.request)
        : await s.apply.apply(s.change);
      assert.equal(retry.outcome, "accepted");
      assert.deepEqual(
        retry.resultingVersion,
        h.version(await s.user.repo.read(s.snapshot.trip.id)),
      );
      h.evidence.faults.push({
        operation: compensation ? "compensation" : "apply",
        boundary,
        mechanism: deferred
          ? "deferred PostgreSQL constraint trigger"
          : "PostgreSQL statement trigger",
        status: result.transaction.status,
        originalKeyRetry: "accepted",
        graph: await h.graph(),
      });
    }
    for (const mode of [
      "lost_commit_ack",
      "post_commit_read_failure",
      "unknown_commit",
      "unknown_post_commit_read",
    ]) {
      const s = await h.seed();
      if (compensation) await h.accept(s);
      let calls = 0;
      const proxy = new Proxy(h.orm, {
        get(target, key) {
          if (key !== "transaction") return Reflect.get(target, key);
          return async (...args) => {
            calls++;
            if (mode === "post_commit_read_failure" && calls === 2)
              throw Object.assign(
                Error("TASK065_SECRET_AUTHORIZATION_CANARY"),
                { code: "40001" },
              );
            if (mode === "unknown_post_commit_read" && calls > 1)
              throw Error("TASK065_SECRET_AUTHORIZATION_CANARY");
            if (mode === "unknown_commit" && calls > 1)
              throw Error("TASK065_SECRET_AUTHORIZATION_CANARY");
            const r = await target.transaction(...args);
            if (
              calls === 1 &&
              (mode === "lost_commit_ack" || mode === "unknown_commit")
            )
              throw Error("TASK065_SECRET_AUTHORIZATION_CANARY");
            return r;
          };
        },
      });
      const service = compensation
        ? h.rollback(s.user, h.resolver, proxy)
        : h.apply(s.user, h.resolver, proxy);
      const request = compensation ? s.request : s.change;
      const result = compensation
        ? await service.rollback(request)
        : await service.apply(request);
      assert.notEqual(result.transaction.status, "rolled_back");
      if (mode.startsWith("unknown"))
        assert.equal(result.transaction.status, "outcome_unknown");
      else {
        assert.equal(result.outcome, "accepted");
        assert.equal(result.replay.duplicate, true);
      }
      assert.doesNotMatch(
        JSON.stringify(result),
        /TASK065_SECRET|Authorization|postgres/,
      );
      const stable = await h.count(s),
        state = await s.user.repo.read(s.snapshot.trip.id);
      const reconciled = await (compensation ? s.rollback : s.apply).reconcile(
        request,
      );
      assert.equal(reconciled.outcome, "accepted");
      assert.equal(reconciled.replay.duplicate, true);
      assert.deepEqual(reconciled.resultingVersion, h.version(state));
      // Never choose a replacement key to recover an ambiguous commit.
      const replay = compensation
        ? await s.rollback.rollback(request)
        : await s.apply.apply(request);
      assert.equal(replay.replay.duplicate, true);
      assert.deepEqual(await h.count(s), stable);
      assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), state);
      h.evidence.faults.push({
        operation: compensation ? "compensation" : "apply",
        boundary: mode,
        mechanism: "real transaction with deterministic transport/read wrapper",
        initialStatus: result.transaction.status,
        recovery: "original key and exact payload only",
        graph: await h.graph(),
      });
    }
  }
}
