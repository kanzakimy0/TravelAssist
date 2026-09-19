import { useState } from "react";
import { flightError, type Flight } from "../model/trip-preparation";
import { PlannerIcon } from "./planner-icon";
import css from "../trip-preparation.module.css";
import project from "../detail-map-inspector.module.css";

export function FlightProject({
  flight,
  startDate,
  onSave,
  onRemove,
  onClose,
}: {
  flight?: Flight;
  startDate: string;
  onSave: (f: Flight) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<Flight>(
    () =>
      flight ?? {
        id: `flight-${crypto.randomUUID()}`,
        direction: "outbound",
        from: "",
        to: "",
        departure: `${startDate}T08:00`,
        arrival: `${startDate}T12:00`,
        departureZone: "+09:00",
        arrivalZone: "+09:00",
        number: "",
        note: "",
        status: "recorded",
      },
  );
  const [confirmed, setConfirmed] = useState(false),
    [message, setMessage] = useState("");
  const [remove, setRemove] = useState(false);
  function save(status: Flight["status"]) {
    const error = flightError(f);
    if (error) {
      setMessage(error);
      return;
    }
    onSave({ ...f, status });
    setMessage(
      status === "queued"
        ? "购票需求已加入预约清单。没有查询价格、扣款或出票，请自行在可信渠道购票后核对。"
        : "航班已写入行程草稿，请在详情保存。",
    );
  }
  return (
    <aside
      className={`${project.inspector} ${css.flightProject}`}
      data-detail-map-inspector
      data-flight-project
      aria-label="项目详情框 · 航班"
    >
      <header>
        <div>
          <small>项目详情框</small>
          <h2>{flight ? "航班详情" : "添加航班"}</h2>
          <p>当地时间 + UTC 时差 · 支持跨日</p>
        </div>
        <button type="button" aria-label="关闭项目详情框" onClick={onClose}>
          <PlannerIcon name="close" />
        </button>
      </header>
      <div className={`${project.editor} ${css.flightForm}`}>
        <label>
          航段
          <select
            value={f.direction}
            onChange={(e) =>
              setF({ ...f, direction: e.target.value as Flight["direction"] })
            }
          >
            <option value="outbound">去程</option>
            <option value="return">返程</option>
            <option value="connection">中转航段</option>
          </select>
        </label>
        {(
          [
            ["from", "出发机场"],
            ["to", "到达机场"],
            ["number", "航班号（可选）"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              value={f[key]}
              maxLength={80}
              onChange={(e) => setF({ ...f, [key]: e.target.value })}
            />
          </label>
        ))}
        {(
          [
            ["departure", "出发当地时间", "departureZone"],
            ["arrival", "到达当地时间", "arrivalZone"],
          ] as const
        ).map(([key, label, zone]) => (
          <div key={key} className={css.flightTime}>
            <label>
              {label}
              <input
                type="datetime-local"
                value={f[key]}
                onChange={(e) => setF({ ...f, [key]: e.target.value })}
              />
            </label>
            <label>
              UTC时差
              <select
                value={f[zone]}
                onChange={(e) => setF({ ...f, [zone]: e.target.value })}
              >
                {Array.from({ length: 105 }, (_, i) => {
                  const n = i * 15 - 720;
                  const z = `${n < 0 ? "-" : "+"}${String(Math.floor(Math.abs(n) / 60)).padStart(2, "0")}:${String(Math.abs(n) % 60).padStart(2, "0")}`;
                  return (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        ))}
        <label>
          行李 / 航站楼 / 接驳备注（可选）
          <textarea
            value={f.note}
            maxLength={1000}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </label>
        <label className={css.check}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          我已自行核对出票信息（不代表系统验证）
        </label>
        <div className={css.actions}>
          <button
            type="button"
            onClick={() => save(confirmed ? "confirmed" : "recorded")}
          >
            保存航班草稿
          </button>
          <button type="button" onClick={() => save("queued")}>
            加入购票预约
          </button>
        </div>
        <p className={css.warning}>
          暂未接入航班查询或购买服务。此入口记录购票需求，不提供虚构价格，不会扣款。请另核对机场接驳、行李托运和提前到场时间。
        </p>
        {flight && (
          <button type="button" onClick={() => setRemove(!remove)}>
            移除本地航班记录
          </button>
        )}
        {remove && (
          <div className={css.warning}>
            仅移除记录，不会取消航空公司订单。
            <button type="button" onClick={onRemove}>
              确认移除记录
            </button>
          </div>
        )}
        <p role="status">{message}</p>
      </div>
    </aside>
  );
}
