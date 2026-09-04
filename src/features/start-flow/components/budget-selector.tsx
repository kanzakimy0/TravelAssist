import type { BudgetLevel } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const OPTIONS: Array<{
  id: BudgetLevel;
  label: string;
  description: string;
}> = [
  { id: "economy", label: "经济", description: "精打细算" },
  { id: "standard", label: "标准", description: "均衡舒适" },
  { id: "comfort", label: "舒适", description: "体验优先" },
  { id: "premium", label: "高端", description: "品质享受" },
];

interface BudgetSelectorProps {
  onChange: (value: BudgetLevel) => void;
  value: BudgetLevel;
}

export function BudgetSelector({ onChange, value }: BudgetSelectorProps) {
  return (
    <fieldset className={styles.choiceGroup}>
      <legend>预算范围</legend>
      <div className={styles.budgetGrid}>
        {OPTIONS.map((option) => (
          <button
            aria-checked={value === option.id}
            className={styles.budgetChoice}
            data-selected={value === option.id}
            key={option.id}
            onClick={() => onChange(option.id)}
            role="radio"
            type="button"
          >
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
