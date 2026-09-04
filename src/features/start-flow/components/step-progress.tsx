import styles from "../start-flow.module.css";

const STEPS = ["目的地", "日期", "同行人", "限制", "确认"];

interface StepProgressProps {
  currentStep: number;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <nav aria-label="需求收集进度" className={styles.progressNav}>
      <p className={styles.progressSummary}>
        {currentStep < 4 ? `${currentStep + 1} / 4` : "确认"}
      </p>
      <ol className={styles.progressList}>
        {STEPS.map((step, index) => (
          <li
            aria-current={index === currentStep ? "step" : undefined}
            className={styles.progressItem}
            data-complete={index < currentStep}
            key={step}
          >
            <span aria-hidden="true" className={styles.progressDot} />
            <span className={styles.progressLabel}>{step}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
