import type { Dispatch } from "react";
import { secondaryPanelModel } from "../model/secondary-panels";
import type { TripAction, TripState } from "../model/trip-model";
import { useWorkspaceCapabilities } from "./workspace-capabilities";
import ui from "../workspace-panels.module.css";

export function AreaRecommendations({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const model = secondaryPanelModel(state);
  const { canBook, enterDetail } = useWorkspaceCapabilities();
  if (state.ui.rangeMode === "day") {
    const row = model.rows[0];
    const hotel = model.areas.find((a) => a.type === "hotelArea"),
      food = model.areas.find((a) => a.type === "foodArea");
    const inspect = (id: string) =>
      dispatch({ type: "inspect", id, level: "area" });
    return (
      <div
        className={ui.dailyPanels}
        data-area-recommendations
        data-range-mode="day"
      >
        <section>
          <header>
            <small>
              D{row.day.day} · {row.day.city}
            </small>
            <h3>沿途三餐</h3>
            <span>
              已选{" "}
              {
                row.mealSlots.filter(
                  (s) => s.item && !s.item.planningPlaceholder,
                ).length
              }
              /3
            </span>
          </header>
          <div className={ui.dailyMeals}>
            {row.mealSlots.map(({ slot, item }) => (
              <button
                key={slot}
                type="button"
                onClick={() =>
                  item && !item.planningPlaceholder
                    ? dispatch({ type: "select", id: item.id })
                    : food
                      ? inspect(food.id)
                      : enterDetail()
                }
              >
                <b>{{ breakfast: "早", lunch: "午", dinner: "晚" }[slot]}</b>
                <span>
                  <strong>
                    {item && !item.planningPlaceholder ? item.title : "待安排"}
                  </strong>
                  <small>{food?.name ?? "在行程详情补充地区"}</small>
                </span>
                <span>→</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <header>
            <small>落脚点 · 不绕远</small>
            <h3>当晚住宿</h3>
          </header>
          <strong>
            {row.stays
              .filter((i) => !i.planningPlaceholder)
              .map((i) => i.title)
              .join("、") ||
              hotel?.name ||
              "住宿区域待选择"}
          </strong>
          <p>
            {hotel?.reason ??
              (row.day.day === model.plan.days.length
                ? "返程日按需安排，不自动添加一晚住宿。"
                : "先确定次日出发点，再选当晚落脚区域。")}
          </p>
          <div className={ui.dailyTags}>
            <span>衔接当天终点</span>
            <span>核对次日出发</span>
            <span>已选住宿受保护</span>
          </div>
          <button
            type="button"
            onClick={() => (hotel ? inspect(hotel.id) : enterDetail())}
          >
            {hotel ? "查看住宿区域" : "到详情核对住宿"} →
          </button>
        </section>
        <section>
          <header>
            <small>区域选择 · 理由与取舍</small>
            <h3>为什么推荐这里</h3>
          </header>
          <dl className={ui.dailyFacts}>
            <div>
              <dt>交通衔接</dt>
              <dd>{hotel?.access ?? food?.access ?? "具体接驳时间待核对"}</dd>
            </div>
            <div>
              <dt>用餐便利</dt>
              <dd>{food?.reason ?? "优先现有路线附近，避免专程折返"}</dd>
            </div>
            <div>
              <dt>需要权衡</dt>
              <dd>{hotel?.tradeoff ?? "安静程度、预算与换乘便利需共同考虑"}</dd>
            </div>
          </dl>
          <button type="button" onClick={enterDetail}>
            到详情选择酒店与餐厅 →
          </button>
          <small>区域建议非实时评价；此处不预约、不显示虚构报价。</small>
        </section>
      </div>
    );
  }
  return (
    <div
      className={ui.areaColumns}
      data-area-recommendations
      data-range-mode={state.ui.rangeMode}
    >
      {(
        [
          ["hotelArea", "住宿区域"],
          ["foodArea", "餐饮区域"],
        ] as const
      ).map(([type, title]) => (
        <section key={type}>
          <h3>{title}</h3>
          {model.rows.map((row) => (
            <div className={ui.coverageRow} key={row.day.day}>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "range", mode: "day", start: row.day.day })
                }
              >
                <strong>
                  D{row.day.day} · {row.day.city}
                </strong>
                <small>查看单日 →</small>
              </button>
              {type === "foodArea" ? (
                <div className={ui.mealCoverage}>
                  {row.mealSlots.map(({ slot, item }) => (
                    <span key={slot}>
                      <b>
                        {{ breakfast: "早", lunch: "午", dinner: "晚" }[slot]}
                      </b>
                      {item?.title ?? "待选地区 / 地点"}
                    </span>
                  ))}
                </div>
              ) : (
                <p>
                  {row.stays
                    .filter((i) => !i.planningPlaceholder)
                    .map((i) => i.title)
                    .join(" · ") || "住宿未确定，先选衔接区域"}{" "}
                  ·{" "}
                  {row.day.day === model.plan.days.length
                    ? "返程日按需安排"
                    : "核对下一天出发点"}
                </p>
              )}
            </div>
          ))}
          {model.areas
            .filter((a) => a.type === type)
            .map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() =>
                  dispatch({ type: "inspect", id: area.id, level: "area" })
                }
              >
                <strong>
                  D{area.day} · {area.name}
                </strong>
                <p>{area.reason}</p>
                <small>{area.access}</small>
              </button>
            ))}
          {!model.areas.some((a) => a.type === type) && (
            <p>
              {type === "hotelArea"
                ? "当晚已有住宿锚点，或当前范围无需过夜；不自动推荐替换。"
                : "当前范围暂无已核对的餐饮区域。"}
            </p>
          )}
        </section>
      ))}
      <section>
        <h3>{model.scopeTitle}</h3>
        <p>
          {state.ui.rangeMode === "threeDays"
            ? "对比连续几天的餐饮覆盖，避免为吃饭和换酒店反复折返"
            : `全程 ${model.summary.switches} 次城市衔接；先定住宿城市，再补三餐区域`}
        </p>
        <strong>衔接与选择理由</strong>
        {model.rows.map((row) => (
          <div key={row.day.day}>
            <strong>
              D{row.day.day} · {row.day.city}
            </strong>
            <p>
              住宿优先衔接当天终点与次日出发点；餐饮优先安排在现有路线附近，减少往返。
            </p>
            {row.stays.some((i) => !i.planningPlaceholder) && (
              <p>已有住宿安排受保护，不会因推荐区域变化被替换。</p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            canBook
              ? dispatch({ type: "ui", patch: { bookingOpen: true } })
              : enterDetail()
          }
        >
          {canBook ? "管理酒店与餐饮预约" : "到详情选择酒店与餐厅"}
        </button>
        <p>这里只展示区域和理由，具体地点与渠道在详情处理。</p>
      </section>
    </div>
  );
}
