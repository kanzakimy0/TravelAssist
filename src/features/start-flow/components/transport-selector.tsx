import type { TransportMode } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const OPTIONS: Array<{ id: TransportMode; label: string }> = [
  { id: "recommended", label: "✨ 系统推荐" },
  { id: "public", label: "公共交通" },
  { id: "driving", label: "自驾" },
  { id: "mixed", label: "混合方式" },
];

interface TransportSelectorProps {
  onChange: (value: TransportMode) => void;
  value: TransportMode;
}

export function TransportSelector({ onChange, value }: TransportSelectorProps) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>交通方式</legend>
      <div className={styles.transportGrid}>
        {OPTIONS.map((option) => (
          <button
            aria-checked={value === option.id}
            className={styles.compactChoice}
            data-selected={value === option.id}
            key={option.id}
            onClick={() => onChange(option.id)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
