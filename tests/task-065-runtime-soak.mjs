import assert from "node:assert/strict";
import { defer, bounded, hash } from "./task-065-local-harness.mjs";
import { route } from "./fixtures/engine-feasibility.mjs";
import { parseRuntimeResult } from "../src/shared/contracts/engine/runtime.ts";
export async function runtimeSoak(h, eventCount) {
  for (let i = 0; i < eventCount; i++)
    await h.accept(await h.seed({ reorder: i % 2 === 1 }));
  const state = async () =>
    hash(
      await h.local
        .db`select jsonb_build_object('trip',to_jsonb(t),'plans',(select jsonb_agg(to_jsonb(p) order by p.id) from public.trip_plans p where p.trip_id=t.id),'days',(select jsonb_agg(to_jsonb(d) order by d.id) from public.trip_days d join public.trip_plans p on p.id=d.plan_id where p.trip_id=t.id),'items',(select jsonb_agg(to_jsonb(i) order by i.id) from public.itinerary_items i join public.trip_days d on d.id=i.day_id join public.trip_plans p on p.id=d.plan_id where p.trip_id=t.id)) data from public.trips t order by t.id`,
    );
  const before = await state(),
    pending = (
      await h.local
        .db`select count(*)::int n from public.engine_apply_outbox where status='pending'`
    )[0].n;
  const workers = await Promise.all(
    Array.from({ length: 8 }, async (_, worker) => {
      let processed = 0;
      for (let loop = 0; loop < 5000; loop++) {
        const r = await h.consumer().processNext();
        if (r.state === "idle") return { worker, processed };
        assert.equal(r.state, "processed");
        assert.equal(parseRuntimeResult(r.event).ok, true);
        const s = h.contexts.get(r.event.target.tripId);
        const snapshot = await s.user.repo.read(r.event.target.tripId);
        assert.deepEqual(
          r.event.currentObservedVersion,
          h.version(snapshot, r.event.target.planId),
        );
        processed++;
      }
      throw Error("Runtime loop bound exhausted");
    }),
  );
  assert.equal(
    workers.reduce((n, w) => n + w.processed, 0),
    pending,
  );
  assert.equal(
    await state(),
    before,
    "Runtime never writes authoritative Trip graph",
  );
  assert.ok(
    workers.every((w) => w.processed > 0),
    "All eight workers actually process events",
  );
  const states = await h.local
    .db`select status,count(*)::int n from public.engine_apply_outbox group by status`;
  assert.deepEqual([...states], [{ status: "processed", n: pending }]);
  assert.equal((await h.consumer().processNext()).state, "idle");
  h.evidence.runtime = {
    events: pending,
    explicitFreshEvents: eventCount,
    concurrentWorkers: 8,
    workers,
    readOnlyGraphSha256: before,
    leaseCases: [],
    factCases: [],
  };
  // Expiry/recovery/fencing while the old worker is inside its real read transaction.
  for (let i = 0; i < 4; i++) {
    const s = await h.seed();
    await h.accept(s);
    const entered = defer(),
      release = defer();
    const slow = h.consumer(async (input) => {
      entered.resolve();
      await release.promise;
      return h.resolver(input);
    });
    const first = slow.processNext();
    await bounded(entered.promise, "leased worker inside resolver");
    await h.local
      .db`update public.engine_apply_outbox set lease_expires_at=clock_timestamp()-interval '1 second' where receipt_id=${s.receipt}`;
    let second;
    try {
      second = await h.consumer().processNext();
    } finally {
      release.resolve();
    }
    assert.equal(second.state, "processed");
    assert.equal((await first).state, "lease_lost");
    const [row] = await h.local
      .db`select attempts,status,lease_token from public.engine_apply_outbox where receipt_id=${s.receipt}`;
    assert.deepEqual(row, {
      attempts: 2,
      status: "processed",
      lease_token: null,
    });
    assert.equal(
      (
        await h.local
          .db`select count(*)::int n from public.engine_runtime_results where receipt_id=${s.receipt}`
      )[0].n,
      1,
    );
    h.evidence.runtime.leaseCases.push({
      kind: "expired_running_worker_fenced",
      attempts: 2,
      terminalResults: 1,
    });
  }
  for (const recovery of [true, false]) {
    const s = await h.seed();
    await h.accept(s);
    s.failContext = true;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (recovery && attempt === 2) s.failContext = false;
      const r = await h.consumer().processNext();
      if (recovery && attempt === 2) {
        assert.equal(r.state, "processed");
        break;
      }
      assert.equal(
        r.state,
        attempt < 3 ? "retryable_failure" : "terminal_failure",
      );
      if (attempt < 3) {
        assert.equal(
          (
            await h.local
              .db`select count(*)::int n from public.engine_runtime_results where receipt_id=${s.receipt}`
          )[0].n,
          0,
        );
        await h.local
          .db`update public.engine_apply_outbox set available_at=clock_timestamp()-interval '1 second' where receipt_id=${s.receipt}`;
      } else assert.deepEqual(r.event.issueCodes, ["CONTEXT_UNAVAILABLE"]);
    }
    s.failContext = false;
    h.evidence.runtime.leaseCases.push({
      kind: recovery ? "retry_then_recover" : "bounded_retry_terminal",
      attempts: recovery ? 2 : 3,
      terminalResults: 1,
    });
  }
  const exhausted = await h.seed();
  await h.accept(exhausted);
  const claims = [];
  for (let i = 0; i < 3; i++) {
    claims.push(await h.consumer().claim());
    await h.local
      .db`update public.engine_apply_outbox set lease_expires_at=clock_timestamp()-interval '1 second' where receipt_id=${exhausted.receipt}`;
  }
  const terminal = await h.consumer().processNext();
  assert.equal(terminal.state, "terminal_failure");
  assert.deepEqual(terminal.event.issueCodes, ["RETRY_EXHAUSTED"]);
  for (const c of claims)
    assert.equal((await h.consumer().processClaim(c)).state, "lease_lost");
  h.evidence.runtime.leaseCases.push({
    kind: "abandoned_claims_retry_exhausted",
    attempts: 3,
    terminalResults: 1,
  });
  for (const mode of ["valid", "missing", "stale", "invalid"]) {
    const s = await h.seed({ reorder: true });
    await h.accept(s);
    const [a, b] = s.applied.plans[0].days[0].items;
    route(s, a, b, 15);
    if (mode === "missing") s.context.routes = [];
    if (mode === "stale")
      s.context.routes[0].fact.expiresAt = "2027-03-31T12:00:00Z";
    if (mode === "invalid")
      s.context.routes[0].response.rawProvider = {
        canary: "TASK065_RAW_PROVIDER",
      };
    const r = await h.consumer().processNext();
    assert.equal(r.state, "processed");
    assert.equal(
      r.event.recomputeStatus,
      mode === "valid" ? "accepted" : "blocked",
    );
    if (mode === "missing")
      assert.ok(r.event.issueCodes.includes("PROVIDER_FACT_MISSING"));
    if (mode === "stale")
      assert.ok(r.event.issueCodes.includes("ROUTE_FACT_EXPIRED"));
    assert.deepEqual(await s.user.repo.read(s.snapshot.trip.id), s.applied);
    h.evidence.runtime.factCases.push({
      mode,
      status: r.event.recomputeStatus,
      issueCodes: r.event.issueCodes,
    });
  }
  assert.equal((await h.consumer().processNext()).state, "idle");
  assert.equal(
    (
      await h.local
        .db`select count(*)::int n from public.engine_apply_outbox where status not in ('processed','terminal_failure') or lease_token is not null`
    )[0].n,
    0,
  );
  h.evidence.runtime.graph = await h.graph();
}
