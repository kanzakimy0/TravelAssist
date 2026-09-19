import type { RefObject } from "react";

import styles from "../start-flow.module.css";
import { SectionHeader } from "./section-header";
import { WizardStepBody } from "./wizard-step-body";
import { StateNotice, StateSkeleton } from "@/components/ui/state-notice";
import { StateAction } from "@/components/ui/state-action";

interface GenerationStepProps {
  onBack: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function GenerationStep({ onBack, headingRef }: GenerationStepProps) {
  return (
    <section
      aria-labelledby="generation-title"
      className={`${styles.step} ${styles.generationStep}`}
    >
      <SectionHeader
        eyebrow="STEP 4 · 本地示例"
        id="generation-title"
        title="正在准备本地示例方案…"
        headingRef={headingRef}
      >
        <p className={styles.stepDescription}>
          示例用于比较展示，不代表真实 AI 或路线计算
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
        <StateNotice
          kind="loading"
          title="本地示例准备中"
          description="准备好后会显示已有示例；您可以返回修改需求。"
        >
          <StateSkeleton />
        </StateNotice>
        <StateAction onAction={onBack}>返回修改需求</StateAction>
      </WizardStepBody>
    </section>
  );
}
