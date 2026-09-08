import { useState, type Dispatch } from "react";
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
  const [chosenAreas, setChosenAreas] = useState<Record<string, string>>({});
  const { canBook, enterDetail } = useWorkspaceCapabilities();
  if (state.ui.rangeMode === "day") {
    const row = model.rows[0];
    const inspect = (id: string) =>
      dispatch({ type: "inspect", id, level: "area" });
    return (
      <div
        className={`${ui.dailyPanels} ${ui.mealStayCards}`}
        data-area-recommendations
        data-range-mode="day"
      >
        {(["breakfast", "lunch", "dinner", "hotel"] as const).map((slot) => {
          const candidates = state.areas.filter(
            (a) =>
              a.day === row.day.day &&
              a.type === (slot === "hotel" ? "hotelArea" : "foodArea"),
          );
          const key = `${model.plan.id}:${row.day.day}:${slot}`;
          const selected =
            candidates.find((a) => a.id === chosenAreas[key]) ?? candidates[0];
          const item =
            slot === "hotel"
              ? row.stays.find((i) => !i.planningPlaceholder)
              : row.mealSlots.find((s) => s.slot === slot)?.item;
          return (
            <section key={slot} data-area-slot={slot}>
              <header>
                <small>
                  D{row.day.day} · {row.day.city}
                </small>
                <h3>
                  {
                    {
                      breakfast: "早餐",
                      lunch: "午餐",
                      dinner: "晚餐",
                      hotel: "住宿",
                    }[slot]
                  }
                </h3>
              </header>
              <strong>
                {item && !item.planningPlaceholder ? item.title : "地点待确定"}
              </strong>
              <div className={ui.areaChoices} aria-label={`${slot}可选区域`}>
                {candidates.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    aria-pressed={selected?.id === area.id}
                    onClick={() =>
                      setChosenAreas((current) => ({
                        ...current,
                        [key]: area.id,
                      }))
                    }
                  >
                    {area.name}
                  </button>
                ))}
                {!candidates.length && (
                  <small>当前没有已核对的可选区域，去详情补充。</small>
                )}
              </div>
              <p>
                {selected?.reason ??
                  (slot === "hotel"
                    ? "优先衔接当天终点和次日出发；返程日按需安排。"
                    : "在相邻行程附近安排用餐，减少折返。具体地区待核对。")}
              </p>
              <button
                type="button"
                title={selected?.access ?? "交通与营业时间待核对"}
                onClick={() =>
                  selected ? inspect(selected.id) : enterDetail()
                }
              >
                {selected ? "查看区域与理由 →" : "到详情补充 →"}
              </button>
            </section>
          );
        })}
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
