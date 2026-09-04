import type { AnchorType } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const OPTIONS: Array<{ id: AnchorType; label: string }> = [
  { id: "flight", label: "机票" },
  { id: "hotel", label: "酒店" },
  { id: "activity", label: "已订活动" },
];

interface AnchorActionsProps {
  onToggle: (value: AnchorType) => void;
  values: AnchorType[];
}

export function AnchorActions({ onToggle, values }: AnchorActionsProps) {
  return (
    <fieldset className={styles.anchorGroup}>
      <legend>已有确定安排</legend>
      <div className={styles.anchorActions}>
        {OPTIONS.map((option) => {
          const selected = values.includes(option.id);
          return (
            <button
              aria-pressed={selected}
              data-selected={selected}
              key={option.id}
              onClick={() => onToggle(option.id)}
              type="button"
            >
              {selected ? "✓" : "＋"}{" "}
              {selected ? `已添加${option.label}` : `添加${option.label}`}
            </button>
          );
        })}
      </div>
      {values.length > 0 ? (
        <p className={styles.anchorPlaceholder} role="status">
          已保存基础占位；详细订单信息将在后续预订接入任务中补充。
        </p>
      ) : null}
    </fieldset>
  );
}
