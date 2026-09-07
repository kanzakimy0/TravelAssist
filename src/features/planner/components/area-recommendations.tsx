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
  return (
    <div className={ui.areaColumns} data-area-recommendations>
      {(
        [
          ["hotelArea", "住宿区域"],
          ["foodArea", "餐饮区域"],
        ] as const
      ).map(([type, title]) => (
        <section key={type}>
          <h3>{title}</h3>
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
        <h3>衔接与选择理由</h3>
        {model.rows.map((row) => (
          <div key={row.day.day}>
            <strong>
              D{row.day.day} · {row.day.city}
            </strong>
            <p>
              住宿优先衔接当天终点与次日出发点；餐饮优先安排在现有路线附近，减少往返。
            </p>
            {row.stays.length > 0 && (
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
