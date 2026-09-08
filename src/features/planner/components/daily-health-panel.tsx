import type { Dispatch } from "react";
import type { TripAction, TripState } from "../model/trip-model";
import {
  secondaryPanelModel,
  isProtectedItem,
} from "../model/secondary-panels";
import { useWorkspaceCapabilities } from "./workspace-capabilities";
import css from "../workspace-panels.module.css";
export function DailyHealthPanel({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const model = secondaryPanelModel(state),
    row = model.rows[0];
  const { enterDetail } = useWorkspaceCapabilities();
  const meals = row.mealSlots.filter(
    (x) => x.item && !x.item.planningPlaceholder,
  ).length;
  const lodging =
    row.stays.some((x) => !x.planningPlaceholder) ||
    row.day.day === model.plan.days.length;
  return (
    <div
      className={css.dailyPanels}
      data-secondary-panel="details"
      data-range-mode="day"
    >
      <section>
        <header>
          <small>D{row.day.day} · 本地结构检查</small>
          <h3>当天出行体检</h3>
          <span>不使用虚构评分</span>
        </header>
        <div className={css.healthTiles}>
          <div data-tone={row.tightLegs.length ? "warning" : "normal"}>
            <strong>{row.tightLegs.length}</strong>
            <span>衔接待核对</span>
          </div>
          <div data-tone={row.unknownLegs ? "warning" : "normal"}>
            <strong>{row.unknownLegs}</strong>
            <span>交通待估段</span>
          </div>
          <div data-tone={meals < 3 || !lodging ? "missing" : "normal"}>
            <strong>{meals}/3</strong>
            <span>三餐覆盖 · {lodging ? "住宿已核对范围" : "住宿待选"}</span>
          </div>
          <div>
            <strong>{row.items.filter(isProtectedItem).length}</strong>
            <span>固定 / 受保护</span>
          </div>
        </div>
      </section>
      <section>
        <header>
          <small>先处理影响执行的项目</small>
          <h3>需要留意</h3>
        </header>
        <div className={css.dailyProblems}>
          {row.issues.length ? (
            row.issues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => dispatch({ type: "select", id: issue.id })}
              >
                <strong>{issue.title}</strong>
                <span>{issue.reason}</span>
                <small>定位项目 →</small>
              </button>
            ))
          ) : (
            <p>本地已检查项正常。仍需核对实时交通、营业时间和预约有效性。</p>
          )}
          {row.tightLegs.slice(0, 3).map((leg) => (
            <p key={leg.key}>交通衔接 · {leg.label}</p>
          ))}
        </div>
        <button type="button" onClick={enterDetail}>
          进入详情处理问题 →
        </button>
      </section>
      <section>
        <header>
          <small>负担与准备</small>
          <h3>让这一天更从容</h3>
        </header>
        <dl className={css.dailyFacts}>
          <div>
            <dt>安排跨度</dt>
            <dd>{row.span}</dd>
          </div>
          <div>
            <dt>活动 / 交通</dt>
            <dd>
              {row.playMinutes} 分 / 已估 {row.estimatedTravel} 分
              {row.unknownLegs ? "（不完整）" : ""}
            </dd>
          </div>
          <div>
            <dt>出发前核对</dt>
            <dd>预约提前到场、行李寄存、天气及体力需求</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "ui", patch: { isMoreSettingsOpen: true } })
          }
        >
          调整节奏与出行偏好 →
        </button>
        <small>
          没有调用实时路线、天气或 AI；锁定和已确认预约不会被自动移动。
        </small>
      </section>
    </div>
  );
}
