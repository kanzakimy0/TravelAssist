import type { Ref } from "react";

import type { CompanionErrors, CompanionField } from "../lib/validation";
import type { StartFlowCompanions } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const COMPANION_OPTIONS: Array<{
  description: string;
  field: CompanionField;
  label: string;
}> = [
  { field: "adultMale", label: "成人男性", description: "18 岁及以上" },
  { field: "adultFemale", label: "成人女性", description: "18 岁及以上" },
  { field: "child", label: "小孩", description: "需要单独座位的儿童" },
  { field: "infant", label: "婴儿", description: "年龄较小的婴幼儿" },
];

interface CompanionsStepProps {
  errors: CompanionErrors;
  headingRef: Ref<HTMLHeadingElement>;
  inputRefs: Record<CompanionField, Ref<HTMLInputElement>>;
  onChange: (field: CompanionField, value: number) => void;
  value: StartFlowCompanions;
}

export function CompanionsStep({
  errors,
  headingRef,
  inputRefs,
  onChange,
  value,
}: CompanionsStepProps) {
  return (
    <section aria-labelledby="companions-heading" className={styles.step}>
      <p className={styles.eyebrow}>STEP 3</p>
      <h1
        className={styles.stepTitle}
        id="companions-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        这次和谁一起出发？
      </h1>
      <p className={styles.stepDescription}>
        只记录同行人数，不会自动判断你们的旅行类型。
      </p>
      <fieldset
        aria-describedby={errors.group ? "companions-error" : undefined}
        className={styles.companionFieldset}
      >
        <legend className={styles.srOnly}>同行人人数</legend>
        <div className={styles.companionGrid}>
          {COMPANION_OPTIONS.map((option) => {
            const errorId = `${option.field}-error`;
            const inputId = `companions-${option.field}`;

            return (
              <div className={styles.companionCard} key={option.field}>
                <div>
                  <label className={styles.label} htmlFor={inputId}>
                    {option.label}
                  </label>
                  <p className={styles.companionDescription}>
                    {option.description}
                  </p>
                </div>
                <input
                  aria-describedby={errors[option.field] ? errorId : undefined}
                  aria-invalid={Boolean(errors[option.field])}
                  className={styles.companionInput}
                  id={inputId}
                  inputMode="numeric"
                  min="0"
                  name={option.field}
                  onInput={(event) => {
                    const inputValue = event.currentTarget.valueAsNumber;
                    onChange(
                      option.field,
                      Number.isNaN(inputValue) ? 0 : inputValue,
                    );
                  }}
                  ref={inputRefs[option.field]}
                  step="1"
                  type="number"
                  value={value[option.field]}
                />
                {errors[option.field] ? (
                  <p className={styles.errorText} id={errorId} role="alert">
                    {errors[option.field]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        {errors.group ? (
          <p className={styles.errorText} id="companions-error" role="alert">
            {errors.group}
          </p>
        ) : null}
      </fieldset>
    </section>
  );
}
