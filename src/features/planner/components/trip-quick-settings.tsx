import { useRef, useState } from "react";
import { dateForDay } from "../model/planner-state";
import type { PlannerSettings } from "../model/planner-types";
import { PlannerIcon } from "./planner-icon";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";

const fields = [
  {
    key: "travelers",
    title: "同行人",
    icon: "users",
    options: ["1 位成人", "2 位成人", "2 成人 · 1 儿童", "4 位成人"],
  },
  { key: "startDate", title: "旅行日期", icon: "calendar", options: [] },
  {
    key: "sights",
    title: "景点偏好",
    icon: "sight",
    options: ["自然风光 · 经典地标", "历史街区 · 摄影", "艺术展馆 · 温泉"],
  },
  {
    key: "food",
    title: "餐饮偏好",
    icon: "food",
    options: ["当地美食 · 日料", "咖啡 · 甜品", "清淡 · 素食友好"],
  },
  {
    key: "stay",
    title: "住宿偏好",
    icon: "stay",
    options: ["舒适型 · 靠近车站", "温泉旅馆 · 含早餐", "经济型 · 城市中心"],
  },
] as const;

function QuickCard({
  field,
  settings,
  onChange,
  dayCount,
  nightCount,
}: {
  field: (typeof fields)[number];
  settings: PlannerSettings;
  onChange: (key: keyof PlannerSettings, value: string) => void;
  dayCount: number;
  nightCount: number;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const isDate = field.key === "startDate";
  return (
    <>
      <button
        type="button"
        className={styles.quickCard}
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? `quick-${field.key}` : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.quickLabel}>
          <PlannerIcon name={field.icon} />
          {field.title}
        </span>
        <strong>
          {isDate
            ? `${dateForDay(settings.startDate, 1)}–${dateForDay(settings.startDate, dayCount)}`
            : settings[field.key]}
        </strong>
        {isDate && (
          <small>
            {dayCount}天{nightCount}晚 · 示例
          </small>
        )}
      </button>
      {open && (
        <PlannerPopover
          id={`quick-${field.key}`}
          title={field.title}
          trigger={trigger}
          onClose={() => setOpen(false)}
        >
          <p className={styles.hint}>
            本次旅行的示例设置，不读取或修改个人偏好。
          </p>
          {isDate ? (
            <label className={styles.field}>
              出发日期
              <input
                type="date"
                value={settings.startDate}
                min="2026-01-01"
                max="2099-12-31"
                onChange={(event) => {
                  if (
                    /^\d{4}-\d{2}-\d{2}$/.test(event.target.value) &&
                    event.target.validity.valid
                  )
                    onChange("startDate", event.target.value);
                }}
              />
              <small>保持示例行程 {dayCount} 天，地图与底栏日期同步。</small>
            </label>
          ) : (
            <div className={styles.choices}>
              {field.options.map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-pressed={settings[field.key] === option}
                  onClick={() => onChange(field.key, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </PlannerPopover>
      )}
    </>
  );
}
export function TripQuickSettings(props: {
  settings: PlannerSettings;
  onChange: (key: keyof PlannerSettings, value: string) => void;
  dayCount: number;
  nightCount: number;
}) {
  return (
    <>
      <div className={styles.quickPair}>
        {fields.slice(0, 2).map((field) => (
          <QuickCard key={field.key} field={field} {...props} />
        ))}
      </div>
      <div className={styles.quickTriple}>
        {fields.slice(2).map((field) => (
          <QuickCard key={field.key} field={field} {...props} />
        ))}
      </div>
    </>
  );
}
