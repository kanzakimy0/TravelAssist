import type { RefObject } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { GeneratedPlan } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { SectionHeader } from "./section-header";
import { WizardStepBody } from "./wizard-step-body";
import { RouteMiniMap } from "./route-mini-map";
import { InfoPopover } from "./info-popover";

interface PlanSelectionStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onRegenerate: () => void;
  onSelect: (planId: string) => void;
  onUsePlan: (planId: string) => void;
  plans: GeneratedPlan[];
  selectedPlanId: string | null;
}

export function PlanSelectionStep({
  headingRef,
  onBack,
  onRegenerate,
  onSelect,
  onUsePlan,
  plans,
  selectedPlanId,
}: PlanSelectionStepProps) {
  return (
    <section
      aria-labelledby="plans-title"
      className={`${styles.step} ${styles.plansStep}`}
    >
      <SectionHeader
        eyebrow="STEP 4 · 生成方案"
        id="plans-title"
        title="为您准备了 3 个旅行方案"
        headingRef={headingRef}
      >
        <p className={styles.stepDescription}>
          从节奏、移动方式与体验密度不同的路线中，选择最接近您的一个。
        </p>
      </SectionHeader>
      <WizardStepBody>
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
                      <dt>
                        景点密度{" "}
                        <InfoPopover
                          label={`${plan.name}景点密度说明`}
                          text="描述每天安排的密集程度，不代表精确的景点数量。"
                        />
                      </dt>
                      <dd>{plan.attractionDensity}</dd>
                    </div>
                    <div>
                      <dt>
                        移动强度{" "}
                        <InfoPopover
                          label={`${plan.name}移动强度说明`}
                          text="综合跨城次数与交通距离，帮助您判断旅途是否轻松。"
                        />
                      </dt>
                      <dd>{plan.movementIntensity}</dd>
                    </div>
                    <div>
                      <dt>
                        预算{" "}
                        <InfoPopover
                          label={`${plan.name}预算说明`}
                          text="这是相对消费档位，不是实时价格或预订报价。"
                        />
                      </dt>
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
                  {selected ? (
                    <Link
                      className={styles.planUseLink}
                      href="/planner"
                      onClick={() => onUsePlan(plan.id)}
                    >
                      使用此方案并进入地图
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </WizardStepBody>
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
