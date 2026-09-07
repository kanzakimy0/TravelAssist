import { useRef, useState, type Dispatch } from "react";
import {
  currentPlan,
  rangeDays,
  type TripAction,
  type TripItem,
  type TripState,
} from "../model/trip-model";
import {
  isPlannerSight,
  movementAssessment,
  plannerCandidates,
  plannerDayItems,
  plannerMovementLegs,
  protectedSight,
  transportModes,
  type MovementEdit,
} from "../model/planner-route";
import { PlannerIcon } from "./planner-icon";
import { PlannerPopover } from "./planner-popover";
import css from "../planner-route-board.module.css";

export function PlannerRouteBoard({
  state,
  dispatch,
  movement = false,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  movement?: boolean;
}) {
  const plan = currentPlan(state);
  const days = rangeDays(state);
  function select(item: TripItem) {
    dispatch({ type: "select", id: item.id });
    dispatch({ type: "ui", patch: { isBottomPanelOverlayOpen: false } });
  }
  return (
    <div
      className={css.workspace}
      data-planner-route-board={movement ? "movement" : "itinerary"}
    >
      <div className={css.days} data-time-bands data-compare={days.length > 1}>
        {days.map((day) => {
          const all = plannerDayItems(plan, day.day);
          const sights = all.filter(isPlannerSight);
          const candidates = plannerCandidates(state, day.day);
          const legs = plannerMovementLegs(plan, day.day);
          return (
            <section
              key={day.day}
              className={movement ? css.movementDay : css.itineraryDay}
              data-time-day={day.day}
              aria-label={`第${day.day}天${movement ? "交通" : "景点方案"}`}
            >
              {movement ? (
                <>
                  <header className={css.dayHeading}>
                    <strong>
                      第{day.day}天 · {day.city}
                    </strong>
                    <small>红：本地冲突 · 黄：待核对 · 非实时</small>
                  </header>
                  <div className={css.journey} data-movement-cards>
                    {all.map((item, index) => (
                      <div className={css.journeyPair} key={item.id}>
                        <button
                          type="button"
                          className={css.stopSummary}
                          aria-pressed={state.ui.selectedTripItemId === item.id}
                          aria-label={`查看行程：${item.title}，${item.startTime}–${item.endTime}${item.fixedTime || item.locked ? "，固定安排" : ""}`}
                          title={`${item.title} · ${item.startTime}–${item.endTime}${item.fixedTime || item.locked ? " · 固定安排" : ""}`}
                          onClick={() => select(item)}
                        >
                          <small>{item.startTime}</small>
                          <strong>{item.title}</strong>
                        </button>
                        {legs[index] && (
                          <MovementConnector
                            key={legs[index].key}
                            leg={legs[index]}
                            state={state}
                            dispatch={dispatch}
                          />
                        )}
                      </div>
                    ))}
                    {all.length < 2 && (
                      <p className={css.empty}>
                        至少两个行程项目才能编辑移动段；可先在行程页加入景点。
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className={css.row} data-sight-row="planned">
                    <h3>
                      方案
                      <br />
                      景点<small>{sights.length} 项</small>
                    </h3>
                    <div className={css.cards}>
                      {sights.map((item) => (
                        <article
                          className={css.sight}
                          data-planned-sight={item.id}
                          key={item.id}
                        >
                          <button
                            type="button"
                            className={css.sightInfo}
                            data-timeline-stop={item.id}
                            aria-pressed={
                              state.ui.selectedTripItemId === item.id
                            }
                            onClick={() => select(item)}
                          >
                            <PlannerIcon name="sight" />
                            <span>
                              <strong>{item.title}</strong>
                              <small>
                                {item.startTime}–{item.endTime}
                                {protectedSight(item) ? " · 已保护" : ""}
                              </small>
                            </span>
                          </button>
                          <button
                            type="button"
                            className={css.transfer}
                            disabled={protectedSight(item)}
                            title={
                              protectedSight(item)
                                ? "已锁定或已确认预约，请先在详情核对"
                                : "保留原项目资料，移入备用"
                            }
                            onClick={() =>
                              dispatch({ type: "reserveSight", id: item.id })
                            }
                          >
                            {protectedSight(item)
                              ? "已锁定 / 已预约"
                              : "↓ 移为备用"}
                          </button>
                        </article>
                      ))}
                      {!sights.length && (
                        <p className={css.empty}>
                          还没有方案景点，从下方备用区加入 ↑
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={css.axis}>
                    <span>
                      第{day.day}天 · {day.city}
                    </span>
                    <i aria-hidden="true" />
                    <small>上方参与路线 · 下方备用</small>
                  </div>
                  <div
                    className={`${css.row} ${css.reserveRow}`}
                    data-sight-row="reserve"
                  >
                    <h3>
                      备用
                      <br />
                      景点<small>{candidates.length} 项</small>
                    </h3>
                    <div className={css.cards}>
                      {candidates.map(({ place, held }) => (
                        <article
                          className={css.sight}
                          key={place.id}
                          data-reserve-sight={place.id}
                        >
                          <button
                            type="button"
                            className={css.sightInfo}
                            aria-label={`查看备用景点 ${place.name}`}
                            onClick={() => {
                              dispatch({
                                type: "inspect",
                                id: place.id,
                                level: "quick",
                                day: day.day,
                              });
                              dispatch({
                                type: "ui",
                                patch: { isBottomPanelOverlayOpen: false },
                              });
                            }}
                          >
                            <PlannerIcon name="sight" />
                            <span>
                              <strong>{place.name}</strong>
                              <small>
                                {held
                                  ? "已从方案移出 · 可恢复"
                                  : `建议 ${place.duration} 分 · 目录示例`}
                              </small>
                            </span>
                          </button>
                          <button
                            type="button"
                            className={css.transfer}
                            onClick={() =>
                              dispatch({
                                type: "promoteSight",
                                placeId: place.id,
                                day: day.day,
                              })
                            }
                          >
                            ↑ {held ? "放回方案" : "加入方案"}
                          </button>
                        </article>
                      ))}
                      {!candidates.length && (
                        <p className={css.empty}>
                          暂无备用景点，可将上方可调整景点移到这里。
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
      <p className={css.notice} role="status" data-route-feedback>
        {state.notice ||
          (movement
            ? "修改方式、预计时长与缓冲，不会自动移动已确定的项目。"
            : "点击景点查看地图，使用上下箭头在方案与备用之间移动。")}
      </p>
    </div>
  );
}

type Leg = ReturnType<typeof plannerMovementLegs>[number];
function MovementConnector({
  leg,
  state,
  dispatch,
}: {
  leg: Leg;
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const response = state.configuration.movementAdvice?.[leg.id];
  return (
    <div
      className={css.connector}
      data-movement-card={leg.key}
      data-conflict={leg.conflict}
      data-mode={leg.mode}
      data-risk={leg.risk}
    >
      <i aria-hidden="true">→</i>
      <button
        type="button"
        ref={trigger}
        aria-label={`修改交通：${leg.from.title} → ${leg.to.title}`}
        aria-expanded={open}
        title={`${leg.riskReason}${leg.edited ? "（已手动修改）" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <strong>{transportModes[leg.mode]}</strong>
        <span className={css.travelTime}>
          {leg.duration === null ? "时长待核对" : `${leg.duration} 分`}
          <em>缓冲 {leg.buffer} 分</em>
        </span>
        <small>{leg.riskLabel}</small>
        <b>修改交通</b>
      </button>
      <i aria-hidden="true">→</i>
      {open && (
        <PlannerPopover
          id={`movement-edit-${leg.from.id}`}
          title="修改移动段"
          trigger={trigger}
          onClose={() => setOpen(false)}
          placement="above"
          maxHeight={560}
          className={css.editor}
        >
          <MovementEditor
            key={`${leg.key}:${leg.from.endTime}:${leg.to.startTime}:${leg.mode}:${leg.duration}:${leg.buffer}`}
            leg={leg}
            onCancel={() => setOpen(false)}
            onApply={(edit) => {
              dispatch({ type: "editMovement", edit });
              setOpen(false);
            }}
          />
          <div className={css.decisions} aria-label="交通提醒处理">
            {(
              [
                ["accepted", "接受提示"],
                ["ignored", "忽略提示"],
                ["later", "稍后核对"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={response === value}
                onClick={() =>
                  dispatch({
                    type: "movementAdvice",
                    id: leg.id,
                    response: value,
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </PlannerPopover>
      )}
    </div>
  );
}
function MovementEditor({
  leg,
  onApply,
  onCancel,
}: {
  leg: Leg;
  onApply: (edit: MovementEdit) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState(leg.mode);
  const [duration, setDuration] = useState(String(leg.duration ?? 30));
  const [buffer, setBuffer] = useState(String(leg.buffer));
  const conflict = Number(duration) + Number(buffer) > leg.gap;
  const assessment = movementAssessment({
    gap: leg.gap,
    duration: duration === "" ? null : Number(duration),
    buffer: Number(buffer),
    mode,
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          day: leg.day,
          fromId: leg.from.id,
          toId: leg.to.id,
          mode,
          duration: Number(duration),
          buffer: Number(buffer),
        });
      }}
    >
      <p>
        <strong>
          {leg.from.title} → {leg.to.title}
        </strong>
      </p>
      <small>
        {leg.from.endTime} 出发 · 下一项 {leg.to.startTime} 开始 · 空档{" "}
        {leg.gap} 分
      </small>
      <fieldset>
        <legend>交通方式</legend>
        <div className={css.modeChoices}>
          {Object.entries(transportModes).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value as MovementEdit["mode"])}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className={css.durationFields}>
        <label>
          预计移动（分钟）
          <input
            type="number"
            required
            min="0"
            max="720"
            step="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </label>
        <label>
          额外缓冲（分钟）
          <input
            type="number"
            required
            min="0"
            max="180"
            step="1"
            value={buffer}
            onChange={(event) => setBuffer(event.target.value)}
          />
        </label>
      </div>
      <div className={css.presets} aria-label="常用移动时长">
        {[15, 30, 45, 60, 90].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={duration === String(value)}
            onClick={() => setDuration(String(value))}
          >
            {value} 分
          </button>
        ))}
      </div>
      <p className={css.warning} role="status">
        {conflict
          ? `预计超出空档 ${Number(duration) + Number(buffer) - leg.gap} 分。应用后标记冲突，不会移动后续项目。`
          : assessment.riskReason}
      </p>
      <small>手动交通草案；未查询地图路线或实时交通，不产生预约。</small>
      <footer>
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button type="submit">
          {conflict ? "应用并标记冲突" : "应用交通修改"}
        </button>
      </footer>
    </form>
  );
}
