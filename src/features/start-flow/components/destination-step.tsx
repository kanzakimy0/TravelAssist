import type { Ref } from "react";

import styles from "../start-flow.module.css";

interface DestinationStepProps {
  error?: string;
  headingRef: Ref<HTMLHeadingElement>;
  inputRef: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  value: string;
}

export function DestinationStep({
  error,
  headingRef,
  inputRef,
  onChange,
  value,
}: DestinationStepProps) {
  return (
    <section aria-labelledby="destination-heading" className={styles.step}>
      <p className={styles.eyebrow}>STEP 1</p>
      <h1
        className={styles.stepTitle}
        id="destination-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        想去哪里？
      </h1>
      <p className={styles.stepDescription}>
        先告诉我们大致方向，城市、地区或一段旅行想法都可以。
      </p>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="destination">
          目的地
        </label>
        <input
          aria-describedby={
            error ? "destination-hint destination-error" : "destination-hint"
          }
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className={styles.textInput}
          id="destination"
          name="destination"
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="东京、京都，或“北海道自驾”"
          ref={inputRef}
          value={value}
        />
        <p className={styles.fieldHint} id="destination-hint">
          暂时只保存文字，不会调用地图或地点搜索。
        </p>
        {error ? (
          <p className={styles.errorText} id="destination-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
