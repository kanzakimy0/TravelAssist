import type { RefObject } from "react";
import type { PlannerSettings } from "../model/planner-types";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";

const details = [
  ["movement", "移动偏好"],
  ["timing", "时间偏好"],
  ["queues", "拥挤与排队"],
  ["photography", "摄影与观景"],
  ["bookings", "已预约活动"],
  ["needs", "特殊需求"],
  ["luggage", "行李设置"],
  ["weather", "天气策略"],
  ["constraints", "方案约束"],
  ["filters", "更多筛选"],
] as const;
export function MoreTripSettingsPopover({
  trigger,
  settings,
  onChange,
  onClose,
}: {
  trigger: RefObject<HTMLButtonElement | null>;
  settings: PlannerSettings;
  onChange: (key: keyof PlannerSettings, value: string) => void;
  onClose: () => void;
}) {
  return (
    <PlannerPopover
      id="more-trip-settings"
      title="更多行程设置"
      trigger={trigger}
      onClose={onClose}
    >
      <p className={styles.hint}>本地 UI 演示 · 设置仅在当前页面保留。</p>
      <div className={styles.settingsGrid}>
        <label className={styles.field}>
          预算
          <input
            value={settings.budget}
            onChange={(event) => onChange("budget", event.target.value)}
            maxLength={40}
          />
          <small>¥15,000–25,000 / 人 / 天</small>
        </label>
        <label className={styles.field}>
          旅行节奏
          <input
            value={settings.pace}
            onChange={(event) => onChange("pace", event.target.value)}
            maxLength={40}
          />
          <small>每天 2–4 个主要地点</small>
        </label>
        {details.map(([key, label]) => (
          <label key={key} className={styles.field}>
            {label}
            <input
              value={settings[key]}
              onChange={(event) => onChange(key, event.target.value)}
              maxLength={80}
            />
          </label>
        ))}
      </div>
    </PlannerPopover>
  );
}
