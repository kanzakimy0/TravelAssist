import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { isoDay } from "../model/trip-model";
import type { TripAction, TripItem, TripState } from "../model/trip-model";
import {
  displayTimelineTime,
  plannerTimeline,
  timelineAxis,
  timelineDuration,
  timelineMinute,
  timelineProtected,
  timelineTitle,
  timelineClock,
  snapTimelineBandMinute,
  timelineCollisionGroups,
  timelineBandSegments,
  timelineDisplayBands,
} from "../model/planner-timeline";
import { PlannerPopover } from "./planner-popover";
import css from "../planner-sight-timeline.module.css";

type Drop = {
  to: "planned" | "reserve";
  afterId: string | null;
  startMinute?: number;
};
type Pickup = {
  id: string;
  title: string;
  x: number;
  y: number;
  moved: boolean;
  keyboard: boolean;
  target: Drop | null;
  portalTarget?: HTMLElement;
};

export function PlannerSightTimeline({
  state,
  dispatch,
  day,
  onSelect,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  day: number;
  onSelect: (item: TripItem) => void;
}) {
  const { plan, planned, reserve } = plannerTimeline(state, day);
  const axis = timelineAxis(planned);
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const reserveViewport = useRef<HTMLDivElement>(null);
  const compare = state.ui.rangeMode !== "day";
  const pickupRef = useRef<Pickup | null>(null);
  const suppressClick = useRef(false);
  const [pickup, setPickup] = useState<Pickup | null>(null);
  const [frontId, setFrontId] = useState<string | null>(null);
  const [timeAligned, setTimeAligned] = useState(false);
  const publish = (value: Pickup | null) => {
    pickupRef.current = value;
    setPickup(value);
  };
  const cancel = () => publish(null);
  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        pickupRef.current = null;
        setPickup(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const move = (id: string, target: Drop) =>
    dispatch({ type: "timelineDrop", planId: plan.id, day, id, ...target });
  function targetAt(x: number, y: number, id: string): Drop | null {
    const hit = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-drop-row]");
    if (!hit || !root.current?.contains(hit)) return null;
    if (hit.dataset.dropRow === "reserve")
      return { to: "reserve", afterId: null };
    const rulerElement = hit.querySelector<HTMLElement>("[data-axis-start]");
    if (!rulerElement || !id) return null;
    const ruler = rulerElement.getBoundingClientRect();
    const bandStart = Number(rulerElement.dataset.axisStart);
    const bandEnd = Number(rulerElement.dataset.axisEnd);
    return {
      to: "planned",
      afterId: null,
      startMinute: snapTimelineBandMinute(
        (x - ruler.left) / ruler.width,
        Number.isFinite(bandStart) ? bandStart : axis.start,
        Number.isFinite(bandEnd) && bandEnd > bandStart ? bandEnd : axis.end,
        rulerElement.dataset.axisExclusiveEnd === "true",
      ),
    };
  }
  function down(event: PointerEvent<HTMLButtonElement>, item: TripItem) {
    if (event.button !== 0 || timelineProtected(item)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = false;
    publish({
      id: item.id,
      title: timelineTitle(item),
      x: event.clientX,
      y: event.clientY,
      moved: false,
      keyboard: false,
      target: null,
      portalTarget: event.currentTarget.closest("dialog") ?? document.body,
    });
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    const p = pickupRef.current;
    if (!p || p.keyboard) return;
    if (!p.moved && Math.hypot(event.clientX - p.x, event.clientY - p.y) < 6)
      return;
    event.preventDefault();
    const v = [viewport.current, reserveViewport.current].find((node) => {
      if (!node) return false;
      const r = node.getBoundingClientRect();
      return event.clientY >= r.top && event.clientY <= r.bottom;
    });
    if (v) {
      const r = v.getBoundingClientRect();
      if (event.clientX < r.left + 32) v.scrollLeft -= 20;
      if (event.clientX > r.right - 32) v.scrollLeft += 20;
    }
    suppressClick.current = true;
    publish({
      ...p,
      moved: true,
      x: event.clientX,
      y: event.clientY,
      target: targetAt(event.clientX, event.clientY, p.id),
    });
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const p = pickupRef.current;
    if (p?.moved && !p.keyboard) {
      const target = targetAt(event.clientX, event.clientY, p.id);
      if (target) move(p.id, target);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    cancel();
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, item: TripItem) {
    if (timelineProtected(item)) return;
    const p = pickupRef.current;
    if (!p && event.key === " ") {
      event.preventDefault();
      publish({
        id: item.id,
        title: timelineTitle(item),
        x: 0,
        y: 0,
        moved: true,
        keyboard: true,
        target: {
          to: "planned",
          afterId: null,
          startMinute: Math.round(timelineMinute(item.startTime) / 5) * 5,
        },
      });
    } else if (p?.keyboard && p.id === item.id) {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Enter",
          " ",
          "Escape",
        ].includes(event.key)
      )
        event.preventDefault();
      if (event.key === "Enter" || event.key === " ") {
        if (p.target) move(p.id, p.target);
        cancel();
      } else if (event.key === "Escape") cancel();
      else if (event.key === "ArrowDown")
        publish({ ...p, target: { to: "reserve", afterId: null } });
      else if (event.key === "ArrowUp")
        publish({
          ...p,
          target: {
            to: "planned",
            afterId: null,
            startMinute: Math.round(timelineMinute(item.startTime) / 5) * 5,
          },
        });
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const next = Math.max(
          0,
          Math.min(
            10075,
            (p.target?.startMinute ??
              Math.round(timelineMinute(item.startTime) / 5) * 5) +
              (event.key === "ArrowRight" ? 5 : -5),
          ),
        );
        publish({
          ...p,
          target: { to: "planned", afterId: null, startMinute: next },
        });
      }
    }
  }
  function card(
    item: TripItem,
    isReserve: boolean,
    segment?: { start: number; end: number; primary: boolean },
  ) {
    const protectedItem = timelineProtected(item);
    return (
      <article
        className={css.card}
        data-planned-sight={
          !isReserve && (!segment || segment.primary) ? item.id : undefined
        }
        data-planned-segment={segment ? item.id : undefined}
        data-continuation={segment && !segment.primary ? true : undefined}
        data-reserve-sight={isReserve ? item.id : undefined}
        data-kind={item.type}
        data-locked={protectedItem}
        data-dragging={pickup?.moved && pickup.id === item.id}
        data-selected={state.ui.selectedTripItemId === item.id}
      >
        <button
          type="button"
          className={css.info}
          data-timeline-stop={item.id}
          data-drag-handle
          aria-label={`${isReserve ? "备用" : "行程"} ${timelineTitle(item)}，${isReserve ? "待安排" : displayTimelineTime(item.startTime)}，${timelineDuration(item)}分钟${protectedItem ? "，已锁定" : "；空格拿起，左右每次5分钟，上下换轨，回车放下"}`}
          aria-pressed={pickup?.keyboard && pickup.id === item.id}
          title={`${timelineTitle(item)} · ${isReserve ? "拖到上轨安排时间" : `${displayTimelineTime(item.startTime)}–${displayTimelineTime(item.endTime)}`} · ${protectedItem ? "已保护，不可拖动" : "拖动调序 / 点击查看"}`}
          onPointerDown={(e) => down(e, item)}
          onPointerMove={drag}
          onPointerUp={end}
          onPointerCancel={cancel}
          onKeyDown={(e) => keyboard(e, item)}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            if (pickupRef.current?.keyboard) return;
            if (!isReserve) onSelect(item);
            else {
              dispatch({
                type: "inspect",
                id: item.placeId,
                level: "quick",
                day,
              });
              dispatch({
                type: "ui",
                patch: { isBottomPanelOverlayOpen: false },
              });
            }
          }}
        >
          <small>
            {isReserve ? (
              "待安排"
            ) : segment ? (
              <time>
                {displayTimelineTime(timelineClock(segment.start))}–
                {displayTimelineTime(timelineClock(segment.end))}
              </time>
            ) : (
              <time>{displayTimelineTime(item.startTime)}</time>
            )}
            {!segment && <span> · {timelineDuration(item)}分</span>}
          </small>
          <strong>{timelineTitle(item)}</strong>
        </button>
        {(!segment || segment.primary) && (
          <TimelineActions
            key={`${item.id}-${isReserve}`}
            item={item}
            reserve={isReserve}
            state={state}
            day={day}
            dispatch={dispatch}
          />
        )}
      </article>
    );
  }
  const displayBands = timelineDisplayBands(planned);
  const targetText =
    pickup?.target?.to === "reserve"
      ? "移到备用，保留资料"
      : pickup?.target?.startMinute !== undefined
        ? `${displayTimelineTime(timelineClock(pickup.target.startMinute)).replace(":", "时")}分`
        : pickup?.target?.afterId
          ? `插在 ${planned.find((i) => i.id === pickup.target?.afterId)?.title ?? "前一项"} 后，结束时间 +15 分钟`
          : "放在当天开头";
  return (
    <div
      ref={root}
      className={css.timeline}
      data-compare={compare}
      data-sight-timeline
      data-picking={Boolean(pickup?.moved)}
      data-time-aligned={timeAligned}
    >
      {!compare && (
        <div className={css.labels}>
          <h3
            id={`sights-${day}`}
            aria-label={`当日行程，第${day}天，共${planned.length}项`}
          >
            当日行程
          </h3>
          <button
            type="button"
            className={css.alignmentToggle}
            aria-label="切换卡片样式（按时间对齐）"
            aria-pressed={timeAligned}
            onClick={() => setTimeAligned((current) => !current)}
          >
            <span>切换卡片样式</span>
          </button>
          <h3
            id={`reserves-${day}`}
            aria-label={`备用项目，共${reserve.length}项`}
          >
            备用项目
          </h3>
        </div>
      )}
      <div className={css.tracks}>
        {timeAligned ? (
          <div
            ref={viewport}
            className={`${css.viewport} ${css.alignedViewport}`}
            data-sight-scroll="planned"
          >
            <div className={css.alignedPlanned} data-aligned-planned>
              {displayBands.map((band) => (
                <div
                  key={band.key}
                  className={css.alignedBand}
                  data-drop-row="planned"
                  data-drop-active={pickup?.target?.to === "planned"}
                >
                  <div
                    className={css.alignedRuler}
                    style={
                      {
                        "--five-minute-step": `${500 / (band.end - band.start)}%`,
                      } as CSSProperties
                    }
                    data-axis-start={band.start}
                    data-axis-end={band.end}
                    data-axis-exclusive-end={
                      band.key === "morning" ? true : undefined
                    }
                    aria-label={`${displayTimelineTime(timelineClock(band.start))}至${displayTimelineTime(timelineClock(band.end))}五分钟刻度`}
                  >
                    {band.ticks.map((tick) => (
                      <span
                        key={tick}
                        style={{
                          left: `${((tick - band.start) / (band.end - band.start)) * 100}%`,
                        }}
                      >
                        {displayTimelineTime(timelineClock(tick))}
                      </span>
                    ))}
                  </div>
                  <ol className={`${css.rail} ${css.alignedRail}`}>
                    {planned.flatMap((item) =>
                      timelineBandSegments(item, displayBands)
                        .filter((segment) => segment.band === band.key)
                        .map((segment) => {
                          const span = band.end - band.start;
                          return (
                            <li
                              key={`${item.id}-${band.key}`}
                              className={css.alignedStop}
                              data-axis-item={item.id}
                              data-start-minute={segment.start}
                              style={{
                                left: `${((segment.start - band.start) / span) * 100}%`,
                                width: `max(46px, calc(${((segment.end - segment.start) / span) * 100}% - 4px))`,
                                zIndex: frontId === item.id ? 10 : undefined,
                              }}
                            >
                              {card(item, false, segment)}
                            </li>
                          );
                        }),
                    )}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={viewport}
            className={css.viewport}
            data-sight-scroll="planned"
          >
            <div
              className={css.plannedLane}
              style={{ minWidth: axis.width }}
              data-drop-row="planned"
              data-drop-active={pickup?.target?.to === "planned"}
            >
              <div
                className={css.ruler}
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #819f9270 1px, transparent 1px)",
                  backgroundSize: `${500 / axis.span}% 4px`,
                  backgroundPosition: `${((Math.ceil(axis.start / 5) * 5 - axis.start) / axis.span) * 100}% bottom`,
                  backgroundRepeat: "repeat-x",
                }}
                data-axis-start={axis.start}
                data-axis-end={axis.end}
                aria-label="当天等分时间刻度"
              >
                {axis.ticks.map((t, i) => (
                  <span key={i} style={{ left: `${(i * 100) / 6}%` }}>
                    {displayTimelineTime(timelineClock(Math.round(t)))}
                  </span>
                ))}
              </div>
              <ol
                className={css.rail}
                data-sight-row="planned"
                aria-label={`第${day}天当日行程`}
              >
                {planned.map((item, index) => {
                  const ratio =
                    (timelineMinute(item.startTime) - axis.start) / axis.span;
                  const same = planned
                    .slice(0, index)
                    .filter((i) => i.startTime === item.startTime).length;
                  return (
                    <li
                      key={item.id}
                      className={css.stop}
                      data-axis-item={item.id}
                      data-start-minute={timelineMinute(item.startTime)}
                      style={
                        {
                          left: `calc(58px + (100% - 116px) * ${ratio})`,
                          "--stack": Math.min(same, 3),
                          zIndex: frontId === item.id ? 10 : undefined,
                        } as CSSProperties
                      }
                    >
                      <div className={css.anchor} aria-hidden="true">
                        <i />
                      </div>
                      {card(item, false)}
                    </li>
                  );
                })}
                {timelineCollisionGroups(planned, axis.width, axis.span).map(
                  (group) => {
                    const time = group[0].startTime;
                    return (
                      <li
                        key={time}
                        className={css.overlapChoice}
                        style={{
                          left: `calc(58px + (100% - 116px) * ${(timelineMinute(time) - axis.start) / axis.span})`,
                        }}
                      >
                        <OverlapPicker
                          items={group}
                          onSelect={(id) => {
                            setFrontId(id);
                            requestAnimationFrame(() => {
                              const selected = [
                                ...(root.current?.querySelectorAll<HTMLElement>(
                                  "[data-axis-item]",
                                ) ?? []),
                              ].find((node) => node.dataset.axisItem === id);
                              selected?.scrollIntoView({
                                block: "nearest",
                                inline: "center",
                              });
                              selected
                                ?.querySelector<HTMLButtonElement>(
                                  "[data-drag-handle]",
                                )
                                ?.focus({ preventScroll: true });
                            });
                          }}
                        />
                      </li>
                    );
                  },
                )}
                {!planned.length && (
                  <li className={css.empty}>
                    把下方项目拖到这里，开始安排这一天。
                  </li>
                )}
              </ol>
            </div>
          </div>
        )}
        {compare && (
          <div className={css.dayDivider} data-timeline-day-label>
            <strong>第{day}天</strong>
            <time>{isoDay(state.settings.startDate, day)}</time>
          </div>
        )}
        <div
          ref={reserveViewport}
          className={css.viewport}
          data-sight-scroll="reserve"
        >
          <ol
            className={`${css.rail} ${css.reserve}`}
            data-sight-row="reserve"
            data-drop-row="reserve"
            data-drop-active={pickup?.target?.to === "reserve"}
            aria-label={`第${day}天备用项目`}
          >
            {reserve.map((item) => (
              <li key={item.id} className={css.reserveStop}>
                {card(item, true)}
              </li>
            ))}
            {!reserve.length && (
              <li className={css.empty}>将上方未锁定项目拖到这里作为备用。</li>
            )}
          </ol>
        </div>
      </div>
      {pickup?.moved && (
        <div className={css.dragStatus} role="status">
          {pickup.title} ·{" "}
          {pickup.target ? targetText : "拖到上轨或备用区；Esc 取消"}
        </div>
      )}
      {pickup?.moved &&
        !pickup.keyboard &&
        createPortal(
          <div
            className={css.ghost}
            style={{
              left: Math.max(
                8,
                Math.min(pickup.x + 12, window.innerWidth - 225),
              ),
              top: Math.max(8, pickup.y - 42),
            }}
            aria-hidden="true"
            data-drop-minute={pickup.target?.startMinute}
          >
            {pickup.target ? targetText : "拖到时间轴选择时间"}
          </div>,
          pickup.portalTarget ?? document.body,
        )}
    </div>
  );
}

function OverlapPicker({
  items,
  onSelect,
}: {
  items: TripItem[];
  onSelect: (id: string) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null),
    [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        ref={trigger}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        重叠 {items.length} 项 ▾
      </button>
      {open && (
        <PlannerPopover
          id={`overlap-${items[0].id}`}
          title="选择要拖动的项目"
          trigger={trigger}
          placement="above"
          onClose={() => setOpen(false)}
        >
          <div className={css.overlapItems}>
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
              >
                {item.startTime} · {timelineTitle(item)}
                {timelineProtected(item) ? "（已锁定）" : " · 置顶后拖动"}
              </button>
            ))}
          </div>
        </PlannerPopover>
      )}
    </>
  );
}

function TimelineActions({
  item,
  reserve,
  state,
  day,
  dispatch,
}: {
  item: TripItem;
  reserve: boolean;
  state: TripState;
  day: number;
  dispatch: Dispatch<TripAction>;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [lockHelp, setLockHelp] = useState(false);
  const lockTrigger = useRef<HTMLButtonElement>(null);
  const [start, setStart] = useState(
    timelineMinute(item.startTime) < 1440 ? item.startTime : "08:00",
  );
  const [duration, setDuration] = useState(timelineDuration(item));
  const [afterId, setAfterId] = useState("");
  const { planned } = plannerTimeline(state, day);
  const scope = { planId: state.ui.currentPlanId, day, id: item.id };
  const protectedItem = timelineProtected(item);
  const hard =
    item.fixedTime ||
    item.day !== item.endDay ||
    ["booking", "booked", "ticketed", "pay_on_site"].includes(
      item.reservationStatus,
    );
  return (
    <div className={css.actions}>
      <button
        ref={trigger}
        type="button"
        aria-label={`编辑${item.title}的时间`}
        aria-expanded={open}
        disabled={protectedItem}
        title="开始时间 / 持续时间"
        onClick={() => {
          setStart(
            timelineMinute(item.startTime) < 1440 ? item.startTime : "08:00",
          );
          setDuration(timelineDuration(item));
          setOpen(!open);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`${hard ? "查看锁定原因：" : protectedItem ? "解锁" : "锁定"}${item.title}`}
        ref={lockTrigger}
        aria-pressed={protectedItem}
        aria-expanded={hard ? lockHelp : undefined}
        title={
          hard
            ? "已有固定预约 / 跨日保护，请在详情核对"
            : protectedItem
              ? "解锁后可拖动"
              : "锁定后不可拖动"
        }
        onClick={() =>
          hard
            ? setLockHelp(!lockHelp)
            : dispatch({ type: "timelineLock", ...scope })
        }
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path
            d={
              protectedItem
                ? "M8 10V7a4 4 0 0 1 8 0v3M12 14v3"
                : "M8 10V7a4 4 0 0 1 8 0M12 14v3"
            }
          />
        </svg>
      </button>
      {lockHelp && (
        <PlannerPopover
          id={`lock-${item.id}`}
          title="为什么已锁定"
          trigger={lockTrigger}
          onClose={() => setLockHelp(false)}
          placement="above"
          className={css.timeMenu}
        >
          <p className={css.lockExplanation}>
            {item.day !== item.endDay
              ? "这是跨日项目，不能在单日滑轨直接改动。"
              : item.fixedTime
                ? "这是固定时间安排，可能关联已订活动或交通。"
                : "项目已有预约或出票状态，受到保护。"}{" "}
            请点击项目卡，在行程详情核对后调整；不会自动取消真实预约。普通手动锁定可再点击锁图标解除。
          </p>
        </PlannerPopover>
      )}
      {open && (
        <PlannerPopover
          id={`time-${item.id}`}
          title={item.title}
          trigger={trigger}
          onClose={() => setOpen(false)}
          placement="above"
          className={css.timeMenu}
          maxHeight={310}
        >
          <form
            className={css.timeForm}
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({
                type: "timelineTime",
                ...scope,
                startTime: start,
                duration,
              });
              setOpen(false);
            }}
          >
            <label>
              开始时间
              <input
                aria-label="开始时间"
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              持续时间（分钟）
              <input
                aria-label="持续时间（分钟）"
                type="number"
                required
                min={1}
                max={720}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
            <p>仅调整草案，不检查空档；其他项目不移动。可行性在详情核对。</p>
            <button type="submit">应用时间</button>
          </form>
          {reserve && (
            <label className={css.insertSelect}>
              插入位置
              <select
                aria-label="插入位置"
                value={afterId}
                onChange={(e) => setAfterId(e.target.value)}
              >
                <option value="">当天开头</option>
                {planned.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}之后 · {displayTimelineTime(i.endTime)} +15分
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className={css.menuMove}
            type="button"
            onClick={() => {
              dispatch({
                type: "timelineDrop",
                ...scope,
                to: reserve ? "planned" : "reserve",
                afterId: afterId || null,
              });
              setOpen(false);
            }}
          >
            {reserve ? "放入时间轴" : "移到备用项目"}
          </button>
        </PlannerPopover>
      )}
    </div>
  );
}
