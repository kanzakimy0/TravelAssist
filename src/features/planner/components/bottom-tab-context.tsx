import type { RefObject } from "react";
import {
  secondaryPanelModel,
  isProtectedItem,
} from "../model/secondary-panels";
import type { TripState } from "../model/trip-model";
import { PlannerPopover } from "./planner-popover";
import ui from "../workspace-panels.module.css";

export function BottomTabContext({
  state,
  title,
  trigger,
  onClose,
}: {
  state: TripState;
  title: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const model = secondaryPanelModel(state);
  const row =
    model.rows.find((row) => row.day.day === state.ui.focusedDay) ??
    model.rows[0];
  if (!row) return null;
  const tab = state.ui.activeBottomTab;
  const protectedCount = row.items.filter(isProtectedItem).length;
  const dayAreas = model.areas.filter((area) => area.day === row.day.day);
  const metrics =
    tab === "movement"
      ? [
          ["移动段", `${row.legs.length} 段`, row.day.city],
          ["接驳间隙", `${row.travelMinutes} 分`, "行程时段差，非实际车程"],
          [
            "缓冲待核对",
            `${row.legs.filter((leg) => leg.minutes < 15).length} 段`,
            "间隙少于 15 分钟",
          ],
        ]
      : tab === "booking"
        ? [
            [
              "待核对购票",
              `${model.tickets.filter((item) => item.day === row.day.day).length} 项`,
              "仅本地渠道样例",
            ],
            [
              "已确认预约",
              `${row.bookings.filter((item) => ["booked", "ticketed"].includes(item.reservationStatus)).length} 项`,
              "已有安排不重复购票",
            ],
            ["办理位置", "行程详情", "不在 Planner 下单"],
          ]
        : tab === "stayFood"
          ? [
              [
                "住宿区域",
                `${dayAreas.filter((area) => area.type === "hotelArea").length} 处`,
                "衔接当天终点",
              ],
              [
                "餐饮区域",
                `${dayAreas.filter((area) => area.type === "foodArea").length} 处`,
                "优先顺路区域",
              ],
              ["已有住宿", `${row.stays.length} 项`, "不自动替换住宿"],
            ]
          : tab === "weather"
            ? [
                [
                  "普通可调整",
                  `${row.items.length - protectedCount} 项`,
                  "预览后才能替换",
                ],
                ["受保护安排", `${protectedCount} 项`, "预约、住宿及锁定节点"],
                ["天气来源", "本地样例", "出发前核对实时预报"],
              ]
            : [
                [
                  "今日停靠",
                  `${row.items.length} 站`,
                  row.items
                    .filter(
                      (item) =>
                        item.type === "attraction" || item.type === "activity",
                    )
                    .slice(0, 2)
                    .map((item) => item.title)
                    .join(" · ") || "当天具体地点待确认",
                ],
                [
                  "时间与负担",
                  `${row.playMinutes} 分`,
                  `活动时长 · 接驳间隙 ${row.travelMinutes} 分`,
                ],
                ["固定安排", `${protectedCount} 项`, "保持预约与住宿衔接"],
              ];
  const notes = {
    itinerary:
      "上方是方案景点，下方是备用景点。可相互移入，已锁定或已确认预约的项目受保护；点击景点联动地图。",
    movement:
      "点击两个地点之间的交通卡，修改方式、预计时长与缓冲。超出空档会标记冲突，不会自动移动后续安排；仍需核对真实交通。",
    booking:
      "仅展示当前行程中有购票渠道样例的待购票项目；实际渠道、库存和价格须在详情核对。",
    weather:
      "备选用于调整普通行程节点：先预览再确认，固定预约、酒店与锁定节点保持不变。",
    stayFood:
      "这里只推荐合适区域和理由；具体酒店、餐厅以及预约在行程详情处理。",
    details:
      "旅行体检依据本地规则检查时间、负担和固定节点；不是实时交通或 AI 评分。",
  }[tab];
  return (
    <PlannerPopover
      id="bottom-context"
      title={`${title}详细信息`}
      trigger={trigger}
      onClose={onClose}
      placement="tab"
      headerless
      className={ui.expandedTab}
      autoFocus={false}
      dismissOutside={false}
    >
      <p className={ui.detailDay}>
        D{row.day.day} · {row.day.city}
      </p>
      <div className={ui.tabFacts}>
        {metrics.map(([label, value, note]) => (
          <section key={label}>
            <h3>{label}</h3>
            <strong>{value}</strong>
            <p>{note}</p>
          </section>
        ))}
      </div>
      <details className={ui.contextNotes}>
        <summary>说明与提醒</summary>
        <p>{notes}</p>
      </details>
      {model.selected && <p role="status">地图已选：{model.selected.title}</p>}
    </PlannerPopover>
  );
}
