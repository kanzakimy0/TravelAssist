import type { RefObject } from "react";

import type { Familiarity } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const OPTIONS: Array<{
  id: Familiarity;
  title: string;
  description: string;
}> = [
  {
    id: "first",
    title: "第一次去日本",
    description: "经典景点优先、说明更详细",
  },
  {
    id: "some",
    title: "去过几次",
    description: "经典与深度体验结合",
  },
  {
    id: "experienced",
    title: "日本旅行经验较多",
    description: "更注重路线效率和区域特色",
  },
  {
    id: "local",
    title: "很熟悉日本",
    description: "偏向小众、本地化和灵活探索",
  },
];

interface FamiliarityStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onChange: (value: Familiarity) => void;
  value: Familiarity | null;
}

export function FamiliarityStep({
  headingRef,
  onChange,
  value,
}: FamiliarityStepProps) {
  return (
    <section aria-labelledby="familiarity-title" className={styles.step}>
      <p className={styles.eyebrow}>STEP 1 · 日本熟悉度</p>
      <h1
        className={styles.stepTitle}
        id="familiarity-title"
        ref={headingRef}
        tabIndex={-1}
      >
        你对日本有多熟悉？
      </h1>
      <p className={styles.stepDescription}>
        选择最接近你的选项，我们会调整推荐的深度与说明方式。
      </p>
      <div className={styles.familiarityGrid} role="radiogroup">
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              aria-checked={selected}
              className={styles.familiarityCard}
              data-selected={selected}
              key={option.id}
              onClick={() => onChange(option.id)}
              role="radio"
              type="button"
            >
              <span>
                <strong>{option.title}</strong>
                <small>{option.description}</small>
              </span>
              <span aria-hidden="true" className={styles.selectionMark}>
                {selected ? "✓" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
