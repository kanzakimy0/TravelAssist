import type { RefObject } from "react";

import { Button } from "@/components/ui/button";

import type { GeneratedPlan } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { RouteMiniMap } from "./route-mini-map";

interface PlanSelectionStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onRegenerate: () => void;
  onSelect: (planId: string) => void;
  plans: GeneratedPlan[];
  selectedPlanId: string | null;
}

export function PlanSelectionStep({
  headingRef,
  onBack,
  onRegenerate,
  onSelect,
  plans,
  selectedPlanId,
}: PlanSelectionStepProps) {
  return (
    <section
      aria-labelledby="plans-title"
      className={`${styles.step} ${styles.plansStep}`}
    >
      <p className={styles.eyebrow}>STEP 4 · 生成方案</p>
      <h1
        className={styles.stepTitle}
        id="plans-title"
        ref={headingRef}
        tabIndex={-1}
      >
        为你准备了 3 个旅行方案
      </h1>
      <p className={styles.stepDescription}>
        从节奏、移动方式与体验密度不同的路线中，选择最接近你的一个。
      </p>
      <div className={styles.planGrid}>
        {plans.map((plan) => {
          const selected = selectedPlanId === plan.id;
          return (
            <article
              className={styles.planCard}
              data-selected={selected}
              key={plan.id}
            >
              <div
                aria-hidden="true"
                className={styles.planImage}
                style={{ backgroundPosition: plan.imagePosition }}
              >
                <span>{plan.recommendation}</span>
              </div>
              <div className={styles.planCardBody}>
                <div className={styles.planTitleRow}>
                  <h2>{plan.name}</h2>
                  <strong>{plan.days} 天</strong>
                </div>
                <p>{plan.tagline}</p>
                <div className={styles.planTags}>
                  {plan.interests.map((interest) => (
                    <span key={interest}>{interest}</span>
                  ))}
                </div>
                <dl className={styles.planFacts}>
                  <div>
                    <dt>城市</dt>
                    <dd>{plan.locations.join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>景点密度</dt>
                    <dd>{plan.attractionDensity}</dd>
                  </div>
                  <div>
                    <dt>移动强度</dt>
                    <dd>{plan.movementIntensity}</dd>
                  </div>
                  <div>
                    <dt>预算</dt>
                    <dd>{plan.budgetLevel}</dd>
                  </div>
                </dl>
                <RouteMiniMap
                  nodes={plan.route.nodes}
                  segments={plan.route.segments}
                />
                <Button
                  aria-pressed={selected}
                  className={styles.planSelectButton}
                  onClick={() => onSelect(plan.id)}
                  variant={selected ? "primary" : "secondary"}
                >
                  {selected ? "已选择这个方案" : "查看这个方案"}
                  <span aria-hidden="true">→</span>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className={styles.planFooterActions}>
        <Button onClick={onBack} variant="secondary">
          ← 返回调整
        </Button>
        <Button onClick={onRegenerate} variant="ghost">
          重新生成
        </Button>
      </div>
    </section>
  );
}
