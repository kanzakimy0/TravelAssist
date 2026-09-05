import type { RefObject } from "react";

import styles from "../start-flow.module.css";
import { SectionHeader } from "./section-header";

const STAGES = [
  "分析偏好",
  "筛选目的地",
  "组合最佳路线",
  "优化交通与移动时间",
  "匹配住宿与餐饮区域",
  "生成不同风格方案",
] as const;

interface GenerationStepProps {
  activeStage: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function GenerationStep({
  activeStage,
  headingRef,
}: GenerationStepProps) {
  return (
    <section
      aria-labelledby="generation-title"
      aria-live="polite"
      className={`${styles.step} ${styles.generationStep}`}
    >
      <SectionHeader
        eyebrow="STEP 4 · 生成方案"
        id="generation-title"
        title="正在为您规划旅行…"
        headingRef={headingRef}
      >
        <p className={styles.stepDescription}>
          根据您的偏好，生成最合适的行程方案
        </p>
      </SectionHeader>
      <ol className={styles.generationStages}>
        {STAGES.map((stage, index) => {
          const status =
            index < activeStage
              ? "complete"
              : index === activeStage
                ? "current"
                : "pending";
          return (
            <li data-status={status} key={stage}>
              <span aria-hidden="true" className={styles.generationMarker}>
                {status === "complete" ? "✓" : index + 1}
              </span>
              <span>
                <strong>{stage}</strong>
                {status === "current" ? <small>正在处理</small> : null}
              </span>
            </li>
          );
        })}
      </ol>
      <p className={styles.generationNote}>
        方案会综合您的草稿与确定安排，生成期间可放心返回调整。
      </p>
    </section>
  );
}
