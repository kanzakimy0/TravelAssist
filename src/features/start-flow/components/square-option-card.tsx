import styles from "../start-flow.module.css";
import { WizardIcon } from "./wizard-icon";
import type { WizardIconName } from "./wizard-icon";

export function SquareOptionCard({
  label,
  description,
  icon,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  icon: WizardIconName;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-checked={selected}
      className={styles.squareOptionCard}
      data-selected={selected}
      onClick={onClick}
      role="radio"
      type="button"
      title={description}
    >
      <WizardIcon name={icon} />
      <strong>{label}</strong>
    </button>
  );
}
