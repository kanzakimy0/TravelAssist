import type { RefObject } from "react";

import styles from "../start-flow.module.css";
import { SectionHeader } from "./section-header";
import { WizardStepBody } from "./wizard-step-body";
import { InfoPopover } from "./info-popover";

const STAGES = [
  "分析您的旅行偏好",
  "筛选适合的目的地",
  "组合最佳路线",
  "优化交通与移动时间",
  "匹配住宿与餐饮区域",
  "生成不同风格的旅行方案",
] as const;

const STAGE_HELP = [
  "整理熟悉度、兴趣和旅行风格，建立本次旅行的偏好概况。",
  "结合已选地区与旅行时间，整理适合的目的地组合。",
  "串联目的地，并把已确定的机票、酒店和活动纳入考虑。",
  "结合交通偏好，调整跨城顺序和每天的移动负担。",
  "根据路线和预算，整理适合停留、住宿和用餐的区域。",
  "按不同节奏整理三个候选方案，供您比较与选择。",
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
      <WizardStepBody>
        <svg
          aria-hidden="true"
          className={styles.generationArtwork}
          viewBox="0 0 240 72"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="172" cy="20" r="13" opacity=".35" />
          <path
            d="M19 52 73 11l51 41M55 25l18 7 14-9M8 56h224M34 67h173M60 60v7M113 60v7M164 60v7"
            opacity=".55"
          />
          <path d="M109 39h88c10 0 15 7 19 15H109V39ZM119 44h13v7h-13v-7ZM140 44h13v7h-13v-7ZM161 44h13v7h-13v-7ZM182 44h13l8 7h-21v-7M118 58h82" />
          <path
            d="M26 44v-9M20 38l6-5 6 5M215 24v-9M210 18l5-5 5 5"
            opacity=".45"
          />
        </svg>
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
                  <strong className={styles.generationStageLabel}>
                    {stage}{" "}
                    <InfoPopover
                      label={`${stage}说明`}
                      text={STAGE_HELP[index]}
                    />
                  </strong>
                  {status === "current" ? <small>正在处理</small> : null}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={styles.generationNote}>
          方案会综合您的草稿与确定安排，生成期间可放心返回调整。
        </p>
      </WizardStepBody>
    </section>
  );
}
