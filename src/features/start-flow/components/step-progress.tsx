import styles from "../start-flow.module.css";

const STEPS = ["日本熟悉度", "旅行偏好", "本次旅行", "生成方案"];

interface StepProgressProps {
  currentStep: number;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <nav aria-label="新旅行向导进度" className={styles.progressNav}>
      <ol className={styles.progressList}>
        {STEPS.map((step, index) => (
          <li
            aria-current={index === currentStep ? "step" : undefined}
            className={styles.progressItem}
            data-complete={index < currentStep}
            key={step}
          >
            <span aria-hidden="true" className={styles.progressNumber}>
              {index < currentStep ? "✓" : index + 1}
            </span>
            <span className={styles.progressLabel}>{step}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
