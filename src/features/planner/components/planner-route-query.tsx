import {
  StateNotice,
  StateSkeleton,
} from "../../../components/ui/state-notice";
import { StateAction } from "../../../components/ui/state-action";
import { routeErrorPresentation } from "../model/route-presentation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  RouteError,
  RouteResponse,
} from "../../../shared/contracts/routes";
import type { PlannerPlace } from "../model/trip-model";
import type { plannerMovementLegs } from "../model/planner-route";
import {
  fetchPlannerRoute,
  plannerRouteSnapshot,
  routeResultCanApply,
  routeRequestFromSnapshot,
  routeResultSummary,
} from "../model/route-query";
import css from "../planner-route-board.module.css";

type Leg = ReturnType<typeof plannerMovementLegs>[number];
type QueryStatus =
  | "idle"
  | "disabled"
  | "loading"
  | "ready"
  | "stale"
  | "no_route"
  | "unsupported"
  | "error";

export interface PlannerRouteQueryState {
  status: QueryStatus;
  result: RouteResponse | null;
  error: RouteError | null;
  selectedAlternativeId: string | null;
}

function initialState(status: QueryStatus): PlannerRouteQueryState {
  return { status, result: null, error: null, selectedAlternativeId: null };
}

export function usePlannerRouteQuery({
  enabled,
  planId,
  leg,
  places,
}: {
  enabled: boolean;
  planId: string;
  leg: Leg;
  places: readonly PlannerPlace[];
}) {
  const resolution = useMemo(
    () =>
      plannerRouteSnapshot({
        planId,
        day: leg.day,
        segmentId: leg.key,
        originPlace: places.find((place) => place.id === leg.from.placeId),
        destinationPlace: places.find((place) => place.id === leg.to.placeId),
        localDate: leg.from.date,
        localTime: leg.from.endTime,
      }),
    [
      leg.day,
      leg.from.date,
      leg.from.endTime,
      leg.from.placeId,
      leg.key,
      leg.to.placeId,
      planId,
      places,
    ],
  );
  const snapshotKey = resolution.ok ? resolution.value.key : null;
  const [state, setState] = useState(() =>
    initialState(
      !enabled ? "disabled" : resolution.ok ? "idle" : "unsupported",
    ),
  );
  const sequence = useRef(0);
  const active = useRef<AbortController | null>(null);
  const currentKey = useRef(snapshotKey);

  useEffect(() => {
    const changed = currentKey.current !== snapshotKey;
    currentKey.current = snapshotKey;
    active.current?.abort();
    active.current = null;
    setState((previous) =>
      !enabled
        ? initialState("disabled")
        : !resolution.ok
          ? initialState("unsupported")
          : changed && previous.result
            ? { ...previous, status: "stale", error: null }
            : initialState("idle"),
    );
    return () => active.current?.abort();
  }, [enabled, resolution, snapshotKey]);

  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
    sequence.current += 1;
    setState((previous) =>
      previous.result ? { ...previous, status: "stale" } : initialState("idle"),
    );
  }, []);

  const run = useCallback(async () => {
    if (!enabled || !resolution.ok || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const requestSequence = ++sequence.current;
    const expectedKey = resolution.value.key;
    setState(initialState("loading"));
    try {
      const result = await fetchPlannerRoute(
        routeRequestFromSnapshot(resolution.value, requestSequence),
        controller.signal,
      );
      if (
        !routeResultCanApply({
          currentSnapshotKey: currentKey.current,
          expectedSnapshotKey: expectedKey,
          currentSequence: sequence.current,
          requestSequence,
          aborted: controller.signal.aborted,
        })
      )
        return;
      if (result.ok) {
        setState({
          status: "ready",
          result: result.value,
          error: null,
          selectedAlternativeId: result.value.alternatives[0]?.id ?? null,
        });
        return;
      }
      setState({
        status:
          result.error.code === "no_route"
            ? "no_route"
            : result.error.code === "unsupported_mode" ||
                result.error.code === "invalid_request"
              ? "unsupported"
              : "error",
        result: null,
        error: result.error,
        selectedAlternativeId: null,
      });
    } catch (error) {
      if (controller.signal.aborted || sequence.current !== requestSequence)
        return;
      setState({
        status: "error",
        result: null,
        selectedAlternativeId: null,
        error: {
          code: "provider_unavailable",
          retryable: true,
          category: "availability",
          message: "路线服务暂时不可用。",
          diagnosticFingerprint: null,
          metadata: {
            reason: error instanceof TypeError ? "invalid_envelope" : "network",
          },
        },
      });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, [enabled, resolution]);

  return {
    resolution,
    state,
    run,
    cancel,
    select: (id: string) =>
      setState((previous) => ({ ...previous, selectedAlternativeId: id })),
  };
}

export function PlannerRouteQueryPanel({
  query,
}: {
  query: ReturnType<typeof usePlannerRouteQuery>;
}) {
  const { resolution, state } = query;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionHadFocus = useRef(false);
  const failure = routeErrorPresentation(state.error);
  const canQuery =
    (resolution.ok &&
      ["idle", "ready", "stale", "loading"].includes(state.status)) ||
    (resolution.ok && state.status === "error" && failure.retryable);
  useEffect(() => {
    if (
      state.status !== "loading" &&
      actionHadFocus.current &&
      document.activeElement === document.body
    )
      titleRef.current?.focus({ preventScroll: true });
    if (state.status !== "loading") actionHadFocus.current = false;
  }, [state.status, canQuery]);
  const summary = state.result
    ? routeResultSummary(state.result, state.selectedAlternativeId)
    : null;
  return (
    <section className={css.routeQuery} data-route-query-status={state.status}>
      <header>
        <h3 ref={titleRef} tabIndex={-1}>
          开发期路线核对
        </h3>
        <small>仅当前会话 · 不保存 · 不绘制 Provider 路线</small>
      </header>
      <StateNotice
        compact
        kind={
          state.status === "loading"
            ? "loading"
            : state.status === "no_route"
              ? "empty"
              : state.status === "error"
                ? "error"
                : state.status === "stale"
                  ? "degraded"
                  : "info"
        }
        title={
          state.status === "disabled"
            ? "路线查询尚未开放"
            : state.status === "loading"
              ? "正在加载路线预览…"
              : state.status === "stale"
                ? "路线信息需要更新"
                : state.status === "no_route"
                  ? "没有找到符合条件的路线"
                  : state.status === "error" ||
                      (state.status === "unsupported" && resolution.ok)
                    ? failure.title
                    : state.status === "unsupported"
                      ? "暂时无法查询此路线"
                      : state.status === "ready"
                        ? "路线预览已载入"
                        : "选择已核验站点查询路线"
        }
        description={
          state.status === "disabled"
            ? "当前仅展示已有估算，不能据此确认真实班次或票价。"
            : state.status === "loading"
              ? "其他区域仍可使用；请勿重复查询。"
              : state.status === "stale"
                ? "旧信息不用于确认耗时或可行性；请按当前条件重新查询。"
                : state.status === "no_route"
                  ? "请调整出发时间或已支持的查询条件。"
                  : state.status === "error" ||
                      (state.status === "unsupported" && resolution.ok)
                    ? failure.description
                    : state.status === "unsupported"
                      ? "站点尚未可靠解析；当前行程和手动估算保持不变。"
                      : state.status === "idle" && resolution.ok
                        ? resolution.value.origin.displayName +
                          " → " +
                          resolution.value.destination.displayName
                        : "仅用于当前预览，不代表真实班次、票价或可行性保证。"
        }
      >
        {state.status === "loading" && <StateSkeleton rows={1} />}
      </StateNotice>
      {state.status === "ready" && state.result && summary && (
        <>
          <dl>
            <div>
              <dt>耗时</dt>
              <dd>{summary.duration}</dd>
            </div>
            <div>
              <dt>换乘</dt>
              <dd>{summary.transfers} 次</dd>
            </div>
            <div>
              <dt>票价</dt>
              <dd>{summary.fare}</dd>
            </div>
            <div>
              <dt>距离</dt>
              <dd>{summary.distance}</dd>
            </div>
          </dl>
          <p>
            来源 {summary.source} ({summary.entitlement}) · 查询于{" "}
            {new Date(summary.queriedAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            {summary.departure
              ? new Date(summary.departure).toLocaleTimeString("zh-CN", {
                  timeZone: "Asia/Tokyo",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "出发时间未知"}
            {" → "}
            {summary.arrival
              ? new Date(summary.arrival).toLocaleTimeString("zh-CN", {
                  timeZone: "Asia/Tokyo",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "到达时间未知"}
            （日本时间）
          </p>
          <p>
            {summary.geometryAvailable
              ? "含路线几何；本任务不叠加到 Mapbox。"
              : "Provider 未返回可展示几何，地图继续显示既有示意线。"}
          </p>
          {state.result.alternatives.length > 1 && (
            <div className={css.routeAlternatives} aria-label="路线备选">
              {state.result.alternatives.map((alternative, index) => (
                <button
                  type="button"
                  key={alternative.id}
                  aria-pressed={state.selectedAlternativeId === alternative.id}
                  onClick={() => query.select(alternative.id)}
                >
                  方案 {index + 1} ·{" "}
                  {alternative.durationSeconds === null
                    ? "耗时未知"
                    : `${Math.round(alternative.durationSeconds / 60)} 分`}
                </button>
              ))}
            </div>
          )}
          <small>
            班次与票价为查询时结果，不代表出发时实时保证；选择只影响当前预览。
          </small>
        </>
      )}
      <footer>
        {canQuery && (
          <StateAction
            pending={state.status === "loading"}
            pendingLabel="正在查询…"
            onAction={() => {
              actionHadFocus.current =
                document.activeElement?.tagName === "BUTTON";
              return query.run();
            }}
          >
            {state.status === "error"
              ? "重试路线"
              : state.status === "ready" || state.status === "stale"
                ? "重新查询"
                : "查询路线"}
          </StateAction>
        )}
        {state.status === "loading" && (
          <StateAction onAction={query.cancel}>取消查询</StateAction>
        )}
      </footer>
    </section>
  );
}
