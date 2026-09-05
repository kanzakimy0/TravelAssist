import { useEffect, useRef, type CSSProperties, type Dispatch } from "react";
import {
  currentPlan,
  dayTimeBand,
  itemsForDay,
  mapObjectType,
  minutes,
  reservationLabel,
  type TripAction,
  type TripState,
} from "../model/trip-model";
import { PlaceActions } from "./place-details";
import ui from "../planner-interactions.module.css";
import styles from "../planner.module.css";

export function MapQuickCard({
  state,
  dispatch,
  anchor,
  bounds,
  onClose,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  anchor: { x: number; y: number };
  bounds: { width: number; height: number };
  onClose: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const previousFocus = useRef<HTMLElement | SVGElement | null>(null);
  const closeCallback = useRef(onClose);
  useEffect(() => {
    closeCallback.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const active = document.activeElement;
    if (
      !previousFocus.current &&
      (active instanceof HTMLElement || active instanceof SVGElement)
    )
      previousFocus.current = active;
    const element = surface.current;
    element?.focus({ preventScroll: true });
    function close(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        !document.querySelector("dialog[open], [data-planner-popover]")
      ) {
        e.preventDefault();
        closing.current = true;
        closeCallback.current();
      }
    }
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      const previous = previousFocus.current;
      if (
        previous?.isConnected &&
        (closing.current ||
          document.activeElement === document.body ||
          document.activeElement === element)
      )
        previous.focus({ preventScroll: true });
    };
  }, []);
  const inspection = state.ui.inspection!;
  const plan = currentPlan(state),
    area = state.areas.find((a) => a.id === inspection.id),
    place = state.places.find((p) => p.id === inspection.id);
  if (!area && !place) return null;
  const item =
    plan.items.find(
      (i) => i.id === state.ui.selectedTripItemId && i.placeId === place?.id,
    ) ?? plan.items.find((i) => i.placeId === place?.id);
  const day = area?.day ?? state.ui.focusedDay;
  const departureAnchor = item?.type === "hotel" && day > item.endDay;
  const items = itemsForDay(plan, day),
    index = item ? items.indexOf(item) : -1;
  const before = index > 0 ? items[index - 1] : null,
    after = index >= 0 ? items[index + 1] : null;
  const duration = item
    ? minutes(item.endTime) - minutes(item.startTime)
    : place?.duration;
  const risk =
    item && dayTimeBand(plan, day).segments.find((s) => s.id === item.id)?.risk;
  const width = Math.min(320, bounds.width - 24),
    height = Math.min(390, bounds.height - 70);
  const left = Math.max(
    12,
    Math.min(anchor.x - width / 2, bounds.width - width - 12),
  );
  const top = Math.max(
    55,
    Math.min(anchor.y - 36, bounds.height - height - 12),
  );
  const detail = (id: string) =>
    dispatch({ type: "inspect", id, level: "detail" });
  return (
    <div
      role="dialog"
      aria-label={`${area?.name ?? place!.name} · 快速卡`}
      tabIndex={-1}
      ref={surface}
      className={ui.morphCard}
      data-map-quick-card
      data-object-type={mapObjectType(state, inspection.id)}
      style={
        {
          left,
          top,
          width,
          maxHeight: height,
          "--anchor-x": `${Math.max(22, Math.min(width - 22, anchor.x - left))}px`,
          "--anchor-y": `${Math.max(22, Math.min(height - 22, anchor.y - top))}px`,
        } as CSSProperties
      }
    >
      <div className={ui.morphContent}>
        <header>
          <div>
            <small>
              {area
                ? area.type === "hotelArea"
                  ? "推荐住宿区"
                  : "推荐餐饮区"
                : item
                  ? "行程内地点"
                  : "推荐备选"}{" "}
              · D{day}
            </small>
            <h3>{area?.name ?? place!.name}</h3>
          </div>
          <button
            type="button"
            aria-label="关闭地图快速卡"
            onClick={() => {
              closing.current = true;
              onClose();
            }}
          >
            ×
          </button>
        </header>
        {area ? (
          <>
            <p>{area.reason}</p>
            <p>
              {area.access} · {area.tradeoff}
            </p>
            <div className={ui.areaCandidates}>
              {area.recommendationIds.slice(0, 4).map((id) => {
                const candidate = state.places.find((p) => p.id === id)!;
                return (
                  <button type="button" key={id} onClick={() => detail(id)}>
                    <strong>{candidate.name}</strong>
                    <small>
                      {candidate.tags.slice(0, 2).join(" · ")} · 查看详细
                    </small>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => detail(area.id)}>
              查看区域详细与候选对比 →
            </button>
          </>
        ) : (
          <>
            <p>
              <strong>
                {item
                  ? departureAnchor
                    ? `昨晚住宿 · 今日出发锚点 · ${reservationLabel(item)}`
                    : `${item.startTime} · ${duration} 分钟 · ${reservationLabel(item)}`
                  : `建议停留 ${duration} 分钟 · 尚未加入`}
              </strong>
              {item?.fixedTime ? " · 固定时间" : ""}
              {item?.locked ? " · 必去 / 锁定" : ""}
              {risk ? " · 时间较紧" : ""}
            </p>
            <p>{place!.why}</p>
            <section className={ui.localJudgement}>
              <h4>AI 判断展示 · 本地规则 / Mock，未调用 AI</h4>
              <ul>
                <li>
                  {item
                    ? risk
                      ? "与后续时段存在重叠，请先核对固定安排。"
                      : "保持当前停留时长；空档优先用于休息。"
                    : `示例插入 ${place!.type === "hotel" ? "20:00" : place!.type === "restaurant" ? "18:30" : "11:30"}，增加 ${duration} 分钟停留；交通影响待核对，未计算新路线。`}
                </li>
                <li>
                  同行人：{state.settings.travelers}；{place!.tags.join(" · ")}
                  。适配须核对实际设施。
                </li>
                <li>
                  天气策略：{state.settings.weather}。
                  {place!.tags.some((t) => t.includes("室内"))
                    ? "可作室内候选。"
                    : "户外需核对当日天气。"}
                </li>
              </ul>
            </section>
            {item && (
              <p>
                前：{before?.title ?? "当天出发点"}{" "}
                {before?.next ?? "（接驳待核对）"}
                <br />
                后：{after?.title ?? "当天终点"}{" "}
                {after ? (item.next ?? "（接驳待核对）") : ""}
              </p>
            )}
            <PlaceActions
              key={place!.id}
              state={state}
              place={place!}
              dispatch={dispatch}
              day={day}
            />
            {!item && (
              <button
                type="button"
                aria-pressed={state.configuration.alternatives.includes(
                  place!.id,
                )}
                onClick={() => dispatch({ type: "alternative", id: place!.id })}
              >
                {state.configuration.alternatives.includes(place!.id)
                  ? "已留作备选"
                  : "留作备选"}
              </button>
            )}
            <button type="button" onClick={() => detail(place!.id)}>
              查看详细 →
            </button>
          </>
        )}
        <p role="status" className={styles.hint}>
          {state.notice}
        </p>
      </div>
    </div>
  );
}
