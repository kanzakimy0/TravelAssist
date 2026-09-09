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

function routeErrorMessage(error: RouteError | null) {
  if (!error) return "路线查询失败，请稍后重试。";
  if (error.metadata.reason === "unauthorized")
    return "登录状态未通过验证，未向路线 Provider 发起查询。";
  if (error.metadata.reason === "provider_not_configured")
    return "开发期路线服务尚未配置，当前继续使用手动估算。";
  switch (error.code) {
    case "provider_timeout":
      return "路线查询超时，请稍后重试。";
    case "provider_rate_limited":
      return "路线查询暂时繁忙，请稍后重试。";
    case "provider_unavailable":
      return "路线服务暂时不可用，请稍后重试。";
    default:
      return error.message || "路线查询失败，请稍后重试。";
  }
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
    if (!enabled || !resolution.ok) return;
    active.current?.abort();
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
  const summary = state.result
    ? routeResultSummary(state.result, state.selectedAlternativeId)
    : null;
  return (
    <section className={css.routeQuery} data-route-query-status={state.status}>
      <header>
        <strong>开发期路线核对</strong>
        <small>仅当前会话 · 不保存 · 不绘制 Provider 路线</small>
      </header>
      {state.status === "disabled" && <p>路线查询未启用，当前仍为手动估算。</p>}
      {state.status === "unsupported" && !resolution.ok && (
        <p>
          站点尚未可靠解析：{resolution.origin.displayName || "起点"} →{" "}
          {resolution.destination.displayName || "终点"}
          。未用景点名或坐标冒充车站。
        </p>
      )}
      {state.status === "unsupported" && resolution.ok && (
        <p role="status">{routeErrorMessage(state.error)}</p>
      )}
      {state.status === "idle" && resolution.ok && (
        <p>
          {resolution.value.origin.displayName} →{" "}
          {resolution.value.destination.displayName}
        </p>
      )}
      {state.status === "loading" && (
        <p role="status">正在查询已核验站点路线…</p>
      )}
      {state.status === "stale" && (
        <p role="status">端点或时间已变化，旧结果已丢弃。</p>
      )}
      {state.status === "no_route" && (
        <p role="status">没有找到满足条件的路线。</p>
      )}
      {state.status === "error" && (
        <p role="alert">{routeErrorMessage(state.error)}</p>
      )}
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
        {state.status === "loading" ? (
          <button type="button" onClick={query.cancel}>
            取消查询
          </button>
        ) : (
          <button
            type="button"
            disabled={!resolution.ok || state.status === "disabled"}
            onClick={query.run}
          >
            {state.status === "ready"
              ? "重新查询"
              : state.error?.retryable
                ? "重试路线"
                : "查询路线"}
          </button>
        )}
      </footer>
    </section>
  );
}
