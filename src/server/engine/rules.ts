import type {
  PlanItemV1,
  TripPlanSnapshotV1,
} from "../../shared/contracts/trips";
import type {
  AssessmentScope,
  ProviderFactRefV0_1,
  RuleAssessment,
} from "../../shared/contracts/engine";
import type { EvaluationContext, DayContext } from "./context";
import type { LoadModel } from "./registry";
import type { Reporter } from "./report";
import { strongest } from "./report";
import { detached, digest } from "./json";

type Plan = TripPlanSnapshotV1["plans"][number];
const ms = (v: string) => Date.parse(v);
export const minutes = (item: PlanItemV1) =>
  item.schedule
    ? (ms(item.schedule.end) - ms(item.schedule.start)) / 60000
    : null;
const stateStatus = (severity: "warning" | "confirmation" | "blocking") =>
  severity === "confirmation"
    ? "needsConfirmation"
    : severity === "blocking"
      ? "blocked"
      : "warning";
const round = (n: number) => Math.round(n * 1e6) / 1e6;
const hard = (item: PlanItemV1, ctx: EvaluationContext) =>
  ctx.protectedItemIds.includes(item.id) ||
  ["user_lock", "booking_lock", "payment_lock", "system_hard_lock"].includes(
    item.lockLevel,
  ) ||
  item.booking.status === "confirmed" ||
  ["flight", "train"].includes(item.kind);
export function fresh(
  f: { observedAt: string; expiresAt: string },
  ctx: EvaluationContext,
) {
  return (
    ms(f.observedAt) <= ms(ctx.evaluationTime) &&
    ms(ctx.evaluationTime) < ms(f.expiresAt) &&
    ms(f.observedAt) < ms(f.expiresAt)
  );
}
const safeLoad = (
  model: LoadModel,
  walking: number,
  physical: number,
  minutes: number,
  context: NonNullable<DayContext["context"]>,
) => {
  const input = Object.freeze({
    walking,
    physical,
    minutes,
    context: Object.freeze({ ...context }),
  });
  const n = model.evaluate(input);
  if (!Number.isFinite(n) || n < 0 || n > 1e9)
    throw Error("INVALID_MODEL_OUTPUT");
  return round(n);
};
export function evaluateRules(
  plan: Plan,
  before: Plan,
  ctx: EvaluationContext,
  refs: ProviderFactRefV0_1[],
  models: readonly LoadModel[],
  r: Reporter,
) {
  const loads = new Map<string, number | null>(),
    dayLoads = new Map<string, number | null>(),
    transferMinutes = new Map<string, number>();
  const transferLoads = new Map<string, number>(),
    routeGaps = new Set<string>();
  const model = models.find(
    (m) =>
      m.ref === ctx.policy.model?.ref &&
      m.version === ctx.policy.model?.version,
  );
  const itineraryScope: AssessmentScope = {
    kind: "itinerary",
    planId: plan.id,
    dayIds: plan.days.map((d) => d.id),
  };
  const children = (ids: string[]) =>
    r.report.assessments.filter(
      (a) =>
        (a.scope.kind === "item" || a.scope.kind === "day") &&
        ids.includes(a.scope.dayId),
    );
  const requireInput = (a: RuleAssessment, dependency: string) =>
    r.mark(
      a,
      "ASSESSMENT_INPUT_MISSING",
      "blocked",
      { dependency },
      "insufficient_inputs",
      "input",
    );
  const factIssue = (
    f: ProviderFactRefV0_1,
    subject: string,
  ): string | null => {
    if (
      f.subjectRef !== subject ||
      !refs.some((ref) => digest(ref) === digest(f))
    )
      return "PROVIDER_FACT_MISSING";
    if (!fresh(f, ctx)) return "PROVIDER_FACT_EXPIRED";
    if (
      f.confidence === null ||
      f.confidence < ctx.policy.minimumFactConfidence
    )
      return "PROVIDER_FACT_LOW_CONFIDENCE";
    return null;
  };
  for (const day of plan.days) {
    const dc = ctx.days.find((d) => d.dayId === day.id);
    for (const item of day.items) {
      const scope: AssessmentScope = {
        kind: "item",
        planId: plan.id,
        dayId: day.id,
        itemId: item.id,
      };
      const p = ctx.profiles.find((p) => p.itemId === item.id);
      const duration = r.make(scope, "duration");
      duration.sourceRefs.push({
        kind: "canonical_schedule",
        ref: item.id,
        version: String(plan.revision),
      });
      const time = minutes(item);
      duration.duration = {
        basis: time === null ? "unknown" : "planned_schedule",
        evaluatedMinutes: time,
        minimumMinutes: p?.minimumMinutes ?? null,
        recommendedMinutes: p?.recommendedMinutes ?? null,
        visitModeRef: p?.visitModeRef ?? null,
        sourceRefs: [...duration.sourceRefs],
      };
      if (p) {
        duration.sourceRefs.push({
          kind: "profile",
          ref: p.ref,
          version: p.version,
        });
        duration.duration.sourceRefs = [...duration.sourceRefs];
      }
      const validProfile =
        p &&
        fresh(p, ctx) &&
        p.minimumMinutes !== null &&
        p.recommendedMinutes !== null &&
        p.minimumMinutes <= p.recommendedMinutes &&
        p.visitModeRef !== null;
      if (!validProfile || time === null)
        requireInput(duration, "canonical schedule / versioned visit profile");
      else if (time < p.minimumMinutes!)
        r.mark(
          duration,
          "DURATION_TOO_SHORT",
          stateStatus(ctx.policy.minimum),
          {
            evaluatedMinutes: time,
            minimumMinutes: p.minimumMinutes,
            recommendedMinutes: p.recommendedMinutes,
            durationBasis: "planned_schedule",
          },
        );
      else if (time < p.recommendedMinutes!)
        r.mark(
          duration,
          "COMPRESSED_VISIT",
          stateStatus(ctx.policy.compressed),
          {
            evaluatedMinutes: time,
            minimumMinutes: p.minimumMinutes,
            recommendedMinutes: p.recommendedMinutes,
          },
        );
      else duration.reasonCodes.push("DURATION_RULE_PASSED");

      const load = r.make(scope, "physical_load");
      load.duration = detached(duration.duration);
      load.sourceRefs.push(...duration.sourceRefs);
      if (!model) {
        r.mark(
          load,
          "ASSESSMENT_UNSUPPORTED",
          "unsupported",
          { dependency: "versioned load model" },
          "unsupported",
        );
        r.impact(load, "physical_load", null, null, "unsupported");
        loads.set(item.id, null);
      } else if (
        !validProfile ||
        time === null ||
        p.walking === null ||
        p.physical === null ||
        !dc?.context
      ) {
        requireInput(
          load,
          "duration / intensity / environment / party context",
        );
        r.impact(load, "physical_load", null, null, "insufficient_inputs");
        loads.set(item.id, null);
      } else {
        load.sourceRefs.push({
          kind: "context",
          ref: day.id,
          version: ctx.policy.version,
        });
        try {
          const value = safeLoad(
            model,
            p.walking,
            p.physical,
            time,
            dc.context,
          );
          const old = before.days
            .flatMap((d) => d.items)
            .find((i) => i.id === item.id);
          const oldTime = old ? minutes(old) : null;
          const oldValue =
            oldTime === null
              ? null
              : safeLoad(model, p.walking, p.physical, oldTime, dc.context);
          r.impact(load, "physical_load", value, model, "evaluated", oldValue);
          loads.set(item.id, value);
          load.reasonCodes.push("PHYSICAL_LOAD_IMPACT");
        } catch {
          r.mark(
            load,
            "ASSESSMENT_UNSUPPORTED",
            "unsupported",
            { dependency: "valid deterministic model output" },
            "unsupported",
          );
          r.impact(load, "physical_load", null, null, "unsupported");
          loads.set(item.id, null);
        }
      }

      const opening = r.make(scope, "schedule");
      opening.sourceRefs.push({
        kind: "canonical_schedule",
        ref: item.id,
        version: String(plan.revision),
      });
      if (!item.schedule) requireInput(opening, "canonical schedule");
      if (item.booking.status !== "not_required")
        r.mark(
          opening,
          "ASSESSMENT_UNSUPPORTED",
          "unsupported",
          { dependency: "trusted booking freshness and rule policy" },
          "unsupported",
          "booking",
        );
      if (ctx.policy.requireOpeningHours) {
        const f = ctx.openingHours.find((f) => f.itemId === item.id);
        const error =
          f && f.fact.factKind === "opening_hours"
            ? factIssue(f.fact, item.id)
            : "PROVIDER_FACT_MISSING";
        if (error)
          r.mark(
            opening,
            error,
            "blocked",
            { requiredFor: "opening_hours" },
            "insufficient_inputs",
            "provider_fact",
          );
        else if (f) {
          opening.sourceRefs.push({
            kind: "provider_fact",
            ref: f.fact.factId,
            version: f.fact.observedAt,
          });
          if (
            item.schedule &&
            !f.windows.some(
              (w) =>
                ms(w.start) <= ms(item.schedule!.start) &&
                ms(w.end) >= ms(item.schedule!.end),
            )
          )
            r.mark(opening, "HARD_TIME_CONFLICT", "blocked", {
              constraint: "opening_hours",
            });
        }
      }
    }
  }

  const schedules = new Map<string, RuleAssessment>();
  for (const day of plan.days) {
    const schedule = r.make(
      { kind: "day", planId: plan.id, dayId: day.id },
      "schedule",
    );
    schedules.set(day.id, schedule);
    if (day.items.some((i) => !i.schedule))
      requireInput(schedule, "complete item schedules");
    const timed = day.items.filter((i) => i.schedule);
    for (let i = 0; i < timed.length; i++) {
      if (i && ms(timed[i - 1].schedule!.start) > ms(timed[i].schedule!.start))
        r.mark(schedule, "SOFT_TIME_CONFLICT", "needsConfirmation", {
          constraint: "canonical item order",
        });
      for (let j = i + 1; j < timed.length; j++) {
        const a = timed[i],
          b = timed[j];
        if (
          ms(a.schedule!.start) < ms(b.schedule!.end) &&
          ms(b.schedule!.start) < ms(a.schedule!.end)
        ) {
          const isHard = hard(a, ctx) || hard(b, ctx);
          r.mark(
            schedule,
            isHard ? "HARD_TIME_CONFLICT" : "SOFT_TIME_CONFLICT",
            isHard ? "blocked" : "needsConfirmation",
            { itemId: a.id, conflictingItemId: b.id },
          );
          r.impact(schedule, "schedule_conflict", null, null).relatedItemIds = [
            a.id,
            b.id,
          ];
        }
      }
    }
  }
  const across = r.make(itineraryScope, "schedule");
  const visits = plan.days.flatMap((day) =>
    day.items.map((item) => ({ day, item })),
  );
  for (let i = 1; i < visits.length; i++) {
    const prev = visits[i - 1],
      next = visits[i];
    const schedule =
      prev.day.id === next.day.id ? schedules.get(next.day.id)! : across;
    const dayId = next.day.id;
    const a = prev.item.schedule,
      b = next.item.schedule;
    if (!a || !b) {
      requireInput(schedule, "adjacent schedule");
      routeGaps.add(dayId);
      continue;
    }
    if (prev.day.id !== dayId && ms(a.end) > ms(b.start)) {
      r.mark(schedule, "HARD_TIME_CONFLICT", "blocked", {
        constraint: "cross_day_order",
        itemId: prev.item.id,
        conflictingItemId: next.item.id,
      });
    }
    if (!ctx.policy.requireRoutes) continue;
    const binding = ctx.routes.find(
      (f) => f.fromItemId === prev.item.id && f.toItemId === next.item.id,
    );
    const fail = (code: string) => {
      r.mark(
        schedule,
        code,
        "blocked",
        {
          fromItemId: prev.item.id,
          toItemId: next.item.id,
          requiredFor: "route_impact",
        },
        "insufficient_inputs",
        "provider_fact",
      );
      routeGaps.add(dayId);
    };
    if (!binding) {
      fail("PROVIDER_FACT_MISSING");
      continue;
    }
    let error = factIssue(binding.fact, prev.item.id);
    if (error === "PROVIDER_FACT_EXPIRED") error = "ROUTE_FACT_EXPIRED";
    if (error) {
      fail(error);
      continue;
    }
    const route = binding.response.alternatives.find(
      (a) => a.id === binding.alternativeId,
    );
    if (
      !route ||
      route.durationSeconds === null ||
      !route.departure ||
      !route.arrival ||
      binding.response.source.provider !== binding.fact.provider ||
      binding.response.source.fetchedAt !== binding.fact.observedAt ||
      !["live", "estimated"].includes(binding.response.source.freshness) ||
      !["evaluation", "production"].includes(
        binding.response.source.entitlement,
      ) ||
      binding.fact.factKind !== "route" ||
      route.segments.length === 0 ||
      route.segments.some((s) => s.mode === "other")
    ) {
      fail("PROVIDER_FACT_MISSING");
      continue;
    }
    const first = route.legs[0]?.origin,
      last = route.legs.at(-1)?.destination;
    const matches = (stop: typeof first | undefined, item: PlanItemV1) =>
      !!stop &&
      !!item.place &&
      ((!!item.place.id && stop.referenceId === item.place.id) ||
        (!!stop.coordinates &&
          !!item.place.coordinates &&
          stop.coordinates[0] === item.place.coordinates.longitude &&
          stop.coordinates[1] === item.place.coordinates.latitude));
    if (!matches(first, prev.item) || !matches(last, next.item)) {
      fail("COORDINATES_REQUIRED");
      continue;
    }
    const seconds =
      (ms(route.arrival.instant) - ms(route.departure.instant)) / 1000;
    if (seconds !== route.durationSeconds || seconds < 0) {
      fail("PROVIDER_FACT_MISSING");
      continue;
    }
    schedule.sourceRefs.push({
      kind: "provider_fact",
      ref: binding.fact.factId,
      version: binding.fact.observedAt,
    });
    const routeMinutes = route.durationSeconds / 60;
    // Route segments count once; never sum both segments and their steps.
    let routeLoad: number | null = 0;
    for (const segment of route.segments) {
      if (segment.mode === "walk") {
        if (
          segment.durationSeconds === null ||
          !model ||
          !ctx.days.find((d) => d.dayId === dayId)?.context
        ) {
          routeLoad = null;
          break;
        }
        try {
          routeLoad += safeLoad(
            model,
            1,
            1,
            segment.durationSeconds / 60,
            ctx.days.find((d) => d.dayId === dayId)!.context!,
          );
        } catch {
          routeLoad = null;
          break;
        }
      }
    }
    if (routeLoad === null) {
      requireInput(schedule, "route walking load context");
      routeGaps.add(dayId);
    } else
      transferLoads.set(dayId, (transferLoads.get(dayId) ?? 0) + routeLoad);
    transferMinutes.set(
      dayId,
      (transferMinutes.get(dayId) ?? 0) + routeMinutes,
    );
    if (
      ms(route.departure.instant) < ms(a.end) ||
      ms(route.arrival.instant) + ctx.policy.bufferMinutes * 60000 > ms(b.start)
    ) {
      const isHard = hard(prev.item, ctx) || hard(next.item, ctx);
      r.mark(
        schedule,
        isHard ? "HARD_TIME_CONFLICT" : "SOFT_TIME_CONFLICT",
        isHard ? "blocked" : "needsConfirmation",
        {
          constraint: "transfer_window",
          fromItemId: prev.item.id,
          toItemId: next.item.id,
          requiredMinutes: routeMinutes + ctx.policy.bufferMinutes,
        },
      );
    }
  }
  // Also compare non-adjacent intervals across day boundaries.
  for (let i = 0; i < visits.length; i++)
    for (let j = i + 1; j < visits.length; j++) {
      const a = visits[i],
        b = visits[j];
      if (
        a.day.id !== b.day.id &&
        a.item.schedule &&
        b.item.schedule &&
        ms(a.item.schedule.start) < ms(b.item.schedule.end) &&
        ms(b.item.schedule.start) < ms(a.item.schedule.end)
      )
        r.mark(across, "HARD_TIME_CONFLICT", "blocked", {
          constraint: "cross_day_overlap",
          itemId: a.item.id,
          conflictingItemId: b.item.id,
        });
    }
  for (const day of plan.days) {
    const scope: AssessmentScope = {
      kind: "day",
      planId: plan.id,
      dayId: day.id,
    };
    const dc = ctx.days.find((d) => d.dayId === day.id),
      capacity = r.make(scope, "day_capacity"),
      fatigue = r.make(scope, "fatigue");
    const child = children([day.id]).filter(
      (a) => a !== capacity && a !== fatigue,
    );
    capacity.relatedAssessmentIds = child.map((a) => a.assessmentId);
    fatigue.relatedAssessmentIds = child
      .filter((a) => a.dimension === "physical_load")
      .map((a) => a.assessmentId);
    const times = day.items.map(minutes),
      itemLoads = day.items.map((i) => loads.get(i.id) ?? null);
    if (!dc || times.includes(null) || routeGaps.has(day.id)) {
      requireInput(capacity, "day window / schedules / route facts");
    } else {
      capacity.sourceRefs.push({
        kind: "context",
        ref: day.id,
        version: ctx.policy.version,
      });
      const scheduled = times.reduce<number>((sum, v) => sum + (v ?? 0), 0);
      const total =
        scheduled +
        (transferMinutes.get(day.id) ?? 0) +
        Math.max(0, day.items.length - 1) * ctx.policy.bufferMinutes;
      const available = (ms(dc.window.end) - ms(dc.window.start)) / 60000;
      r.impact(capacity, "day_overload", Math.max(0, total - available), null);
      if (total > available)
        r.mark(capacity, "DAY_OVERLOADED", stateStatus(ctx.policy.overload), {
          scheduledMinutes: scheduled,
          requiredMinutes: total,
          availableMinutes: available,
        });
      if (
        day.items.some(
          (i) =>
            i.schedule &&
            (ms(i.schedule.start) < ms(dc.window.start) ||
              ms(i.schedule.end) > ms(dc.window.end)),
        )
      )
        r.mark(capacity, "HARD_TIME_CONFLICT", "blocked", {
          constraint: "day_window",
        });
      for (const rest of dc.mealRestWindows) {
        const intervals = day.items
          .filter(
            (i) =>
              (rest.kind === "meal"
                ? i.kind === "meal"
                : i.kind === "free_time") && i.schedule,
          )
          .map((i) => [
            Math.max(ms(i.schedule!.start), ms(rest.window.start)),
            Math.min(ms(i.schedule!.end), ms(rest.window.end)),
          ])
          .filter(([s, e]) => e > s)
          .sort((a, b) => a[0] - b[0]);
        let covered = 0,
          end = -Infinity;
        for (const [s, e] of intervals) {
          covered += Math.max(0, e - Math.max(s, end));
          end = Math.max(end, e);
        }
        if (covered / 60000 < rest.minimumMinutes)
          r.mark(capacity, "DAY_OVERLOADED", stateStatus(ctx.policy.overload), {
            constraint: rest.kind + "_window",
            requiredMinutes: rest.minimumMinutes,
            coveredMinutes: covered / 60000,
          });
      }
    }
    if (!dc || itemLoads.includes(null) || routeGaps.has(day.id)) {
      requireInput(fatigue, "complete visit / route / day load inputs");
      r.impact(fatigue, "fatigue_impact", null, null, "insufficient_inputs");
      dayLoads.set(day.id, null);
    } else {
      const total = round(
        itemLoads.reduce<number>((s, v) => s + (v ?? 0), 0) +
          (transferLoads.get(day.id) ?? 0),
      );
      dayLoads.set(day.id, total);
      r.impact(fatigue, "fatigue_impact", total, model ?? null);
      if (total > dc.loadLimit)
        r.mark(fatigue, "DAY_OVERLOADED", stateStatus(ctx.policy.overload), {
          constraint: "physical_load",
          load: total,
          limit: dc.loadLimit,
        });
      else fatigue.reasonCodes.push("FATIGUE_IMPACT");
    }
  }
  const itinerary = r.make(itineraryScope, "itinerary_reasonableness");
  itinerary.relatedAssessmentIds = r.report.assessments
    .filter((a) => a !== itinerary)
    .map((a) => a.assessmentId);
  if (ctx.priorLoad === null)
    requireInput(itinerary, "initial prior load context");
  let carry = ctx.priorLoad ?? 0,
    streak = 0;
  const policy = ctx.policy.itinerary;
  for (let index = 0; index < plan.days.length; index++) {
    const day = plan.days[index],
      dc = ctx.days.find((d) => d.dayId === day.id),
      load = dayLoads.get(day.id);
    if (
      load === null ||
      load === undefined ||
      !dc ||
      (policy.requireRecovery && dc.recoveryBefore === null)
    ) {
      requireInput(itinerary, "cross-day load / recovery context");
      continue;
    }
    if (
      index > 0 &&
      r.report.coverage.some(
        (c) =>
          c.scope.kind === "day" &&
          c.scope.dayId === plan.days[index - 1].id &&
          c.state !== "evaluated",
      )
    )
      requireInput(itinerary, "preceding day coverage");
    carry = round(Math.max(0, carry - (dc.recoveryBefore ?? 0)) + load);
    streak = load >= policy.highLoadThreshold ? streak + 1 : 0;
    if (carry > policy.maxCarryLoad || streak > policy.maxConsecutiveHighDays)
      r.mark(
        itinerary,
        "ITINERARY_UNREASONABLE",
        stateStatus(ctx.policy.overload),
        {
          dayId: day.id,
          carryLoad: carry,
          limit: policy.maxCarryLoad,
          consecutiveHighDays: streak,
        },
      );
  }
  const gaps = r.report.coverage.filter((c) => c.state !== "evaluated");
  if (gaps.length)
    requireInput(itinerary, "incomplete item/day/schedule coverage");
  const failingChildren = r.report.assessments.filter(
    (a) => a !== itinerary && a.reasonableness === "unreasonable",
  );
  if (failingChildren.length) {
    const status = strongest(failingChildren.map((a) => a.status));
    r.mark(
      itinerary,
      "ITINERARY_UNREASONABLE",
      status === "accepted" ? "warning" : status,
      {
        constraint: "item_day_schedule_constraints",
        affectedAssessments: failingChildren.length,
      },
    );
  }
  r.impact(
    itinerary,
    "fatigue_impact",
    gaps.length ? null : carry,
    model ?? null,
    gaps.length ? "insufficient_inputs" : "evaluated",
  );
  return r.finish();
}
