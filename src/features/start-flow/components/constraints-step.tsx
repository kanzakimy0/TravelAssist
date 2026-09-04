import type { Ref } from "react";

import styles from "../start-flow.module.css";

interface ConstraintsStepProps {
  headingRef: Ref<HTMLHeadingElement>;
  onChange: (value: string) => void;
  value: string;
}

export function ConstraintsStep({
  headingRef,
  onChange,
  value,
}: ConstraintsStepProps) {
  return (
    <section aria-labelledby="constraints-heading" className={styles.step}>
      <p className={styles.eyebrow}>STEP 4</p>
      <h1
        className={styles.stepTitle}
        id="constraints-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        有什么必须遵守的条件？
      </h1>
      <p className={styles.stepDescription}>
        这一步可以留空。只写真正不能忽略的条件，其他偏好以后再慢慢调整。
      </p>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="hard-constraints">
          必要硬限制 <span className={styles.optionalLabel}>（可选）</span>
        </label>
        <textarea
          aria-describedby="constraints-hint"
          className={styles.textarea}
          id="hard-constraints"
          name="hardConstraintsNote"
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={"例如：\n不坐公交\n必须避免大量步行\n需要婴儿车可达"}
          rows={6}
          value={value}
        />
        <p className={styles.fieldHint} id="constraints-hint">
          当前仅保存原文，不会自动拆分成偏好选项。
        </p>
      </div>
    </section>
  );
}
