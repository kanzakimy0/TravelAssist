import type { Ref } from "react";

import type { TimingErrors } from "../lib/validation";
import type { StartFlowTiming } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

interface TimingStepProps {
  durationInputRef: Ref<HTMLInputElement>;
  endDateInputRef: Ref<HTMLInputElement>;
  errors: TimingErrors;
  headingRef: Ref<HTMLHeadingElement>;
  onChange: <Field extends keyof StartFlowTiming>(
    field: Field,
    value: StartFlowTiming[Field],
  ) => void;
  startDateInputRef: Ref<HTMLInputElement>;
  timing: StartFlowTiming;
}

function getRangeDurationDays(startDate: string, endDate: string) {
  if (!startDate || !endDate || endDate < startDate) {
    return null;
  }

  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function TimingStep({
  durationInputRef,
  endDateInputRef,
  errors,
  headingRef,
  onChange,
  startDateInputRef,
  timing,
}: TimingStepProps) {
  const rangeDuration = getRangeDurationDays(timing.startDate, timing.endDate);

  return (
    <section aria-labelledby="timing-heading" className={styles.step}>
      <p className={styles.eyebrow}>STEP 2</p>
      <h1
        className={styles.stepTitle}
        id="timing-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        大概什么时候出发？
      </h1>
      <p className={styles.stepDescription}>
        日期确定就填完整区间；还没定也可以只告诉我们旅行天数。
      </p>
      <div className={styles.dateGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="start-date">
            开始日期
          </label>
          <input
            aria-describedby={errors.startDate ? "start-date-error" : undefined}
            aria-invalid={Boolean(errors.startDate)}
            className={styles.textInput}
            id="start-date"
            name="startDate"
            onInput={(event) =>
              onChange("startDate", event.currentTarget.value)
            }
            ref={startDateInputRef}
            type="date"
            value={timing.startDate}
          />
          {errors.startDate ? (
            <p className={styles.errorText} id="start-date-error" role="alert">
              {errors.startDate}
            </p>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="end-date">
            结束日期
          </label>
          <input
            aria-describedby={errors.endDate ? "end-date-error" : undefined}
            aria-invalid={Boolean(errors.endDate)}
            className={styles.textInput}
            id="end-date"
            name="endDate"
            onInput={(event) => onChange("endDate", event.currentTarget.value)}
            ref={endDateInputRef}
            type="date"
            value={timing.endDate}
          />
          {errors.endDate ? (
            <p className={styles.errorText} id="end-date-error" role="alert">
              {errors.endDate}
            </p>
          ) : null}
        </div>
      </div>
      <div className={styles.timingDivider}>
        <span>或</span>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="duration-days">
          旅行天数
        </label>
        <div className={styles.durationControl}>
          <input
            aria-describedby={
              errors.durationDays ? "duration-error" : "duration-hint"
            }
            aria-invalid={Boolean(errors.durationDays)}
            className={styles.numberInput}
            id="duration-days"
            inputMode="numeric"
            min="1"
            name="durationDays"
            onInput={(event) => {
              const value = event.currentTarget.valueAsNumber;
              onChange("durationDays", Number.isNaN(value) ? null : value);
            }}
            ref={durationInputRef}
            step="1"
            type="number"
            value={timing.durationDays ?? ""}
          />
          <span>天</span>
        </div>
        <p className={styles.fieldHint} id="duration-hint">
          有完整日期时可以留空。
        </p>
        {errors.durationDays ? (
          <p className={styles.errorText} id="duration-error" role="alert">
            {errors.durationDays}
          </p>
        ) : null}
      </div>
      {rangeDuration ? (
        <p className={styles.summaryNote}>这段日期共 {rangeDuration} 天。</p>
      ) : null}
    </section>
  );
}
