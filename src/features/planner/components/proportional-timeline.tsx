import type { Dispatch } from "react";
import {
  currentPlan,
  confirmedStay,
  dayTimeBand,
  rangeDays,
  reservationLabel,
  timeBandPosition,
  type TripState,
  type TripAction,
} from "../model/trip-model";
import ui from "../planner-interactions.module.css";
const clock = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export function ProportionalTimeline({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const plan = currentPlan(state),
    bands = rangeDays(state).map((d) => dayTimeBand(plan, d.day));
  const populated = bands.filter((b) => b.segments.length);
  if (!populated.length)
    return (
      <p>
        {bands
          .map((b) => {
            const stay = confirmedStay(plan, b.day - 1);
            return stay ? `D${b.day} 出发锚点：${stay.title}。` : "";
          })
          .join(" ")}
        这段日期尚无后续安排；未生成或伪造路线。
      </p>
    );
  const start = Math.min(...populated.map((b) => b.start)),
    end = Math.max(...populated.map((b) => b.end));
  const compare = state.ui.rangeMode === "threeDays";
  return (
    <div className={ui.timelineViewport}>
      <div
        className={ui.bands}
        data-time-bands
        data-compare={compare}
        data-axis-start={start}
        data-axis-end={end}
      >
        <div className={ui.axis}>
          <small className={ui.bandHint}>真实时长比例 · Mock</small>
          <div className={ui.axisTrack}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i}>
                {clock(Math.round(start + ((end - start) * i) / 4))}
              </span>
            ))}
          </div>
        </div>
        {bands.map((band) => (
          <div className={ui.bandRow} key={band.day} data-time-day={band.day}>
            <div className={ui.bandMeta} title={band.suggestion}>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "range", mode: "day", start: band.day })
                }
              >
                D{band.day} ·{" "}
                {band.segments.length
                  ? `${clock(band.start)}–${clock(band.end)}`
                  : "自由安排"}
              </button>
              {compare && (
                <span>
                  {" "}
                  · 约{band.bookings} · {band.intensity}
                </span>
              )}
              <p>
                活动 {band.activity}分 · 移动 {band.movement}分
                {compare ? ` · 步行 ${band.walking}分*` : ""}
              </p>
              {!compare && (
                <>
                  <p>
                    步行 {band.walking}分* · 预约 {band.bookings} ·{" "}
                    {band.intensity}
                  </p>
                  <p>
                    {confirmedStay(plan, band.day - 1)
                      ? `出发：${confirmedStay(plan, band.day - 1)!.title}`
                      : "按当天安排出发"}
                  </p>
                </>
              )}
            </div>
            <div className={ui.track}>
              {band.segments.map((segment) => {
                const item = plan.items.find((i) => i.id === segment.itemId)!;
                const status = [
                  reservationLabel(item),
                  item.fixedTime ? "固定时间" : "",
                  item.locked ? "必去 / 锁定" : "",
                  segment.risk ? "时间较紧" : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                const label = `${clock(segment.start)}–${clock(segment.end)} · ${segment.end - segment.start}分钟 · ${segment.title} · ${status}`;
                return (
                  <button
                    key={segment.id}
                    type="button"
                    className={ui.segment}
                    data-kind={segment.kind}
                    data-risk={segment.risk}
                    data-timeline-stop={
                      segment.kind === "movement" ? undefined : item.id
                    }
                    data-start={segment.start}
                    data-end={segment.end}
                    style={timeBandPosition(
                      segment.start,
                      segment.end,
                      start,
                      end,
                    )}
                    title={label}
                    aria-label={label}
                    aria-pressed={state.ui.selectedTripItemId === item.id}
                    onClick={() => dispatch({ type: "select", id: item.id })}
                    onDoubleClick={() =>
                      dispatch({
                        type: "inspect",
                        id: item.placeId,
                        level: "detail",
                      })
                    }
                  >
                    <small>
                      {clock(segment.start)} · {segment.end - segment.start}分
                    </small>
                    <strong>{segment.title}</strong>
                    <small>{status}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p
          className={ui.bandHint}
          title={bands.map((b) => `D${b.day} ${b.suggestion}`).join(" ")}
        >
          {compare
            ? `本地建议：${
                bands
                  .filter((b) => b.intensity === "较紧")
                  .map((b) => `D${b.day}`)
                  .join(" / ") || "各日"
              } 核对衔接，保留预约与空档。`
            : bands[0].suggestion}{" "}
          *步行只计已有示例；虚线=冲突，非实时 AI。
          {state.ui.selectedTripItemId && (
            <button
              type="button"
              onClick={() => {
                const item = plan.items.find(
                  (i) => i.id === state.ui.selectedTripItemId,
                );
                if (item)
                  dispatch({
                    type: "inspect",
                    id: item.placeId,
                    level: "detail",
                  });
              }}
            >
              查看选中安排
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
