import type { RefObject } from "react";

import type {
  Interest,
  TravelStyleKey,
  TravelStyleValues,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { SectionHeader } from "./section-header";
import { WizardStepBody } from "./wizard-step-body";
import { InterestGrid } from "./interest-grid";
import { TravelStyleGroup } from "./travel-style-group";

const PACE_ITEMS = [
  { key: "pace", left: "悠闲", right: "紧凑" },
  { key: "depth", left: "打卡优先", right: "深度体验" },
  { key: "discovery", left: "经典必去", right: "当地小众" },
] as const;

const METHOD_ITEMS = [
  { key: "movement", left: "定点游玩", right: "一路移动" },
  { key: "coverage", left: "单城深玩", right: "多地巡游" },
  { key: "priority", left: "预算优先", right: "体验优先" },
] as const;

interface PreferencesStepProps {
  dislikes: Interest[];
  interestDetails: Partial<Record<Interest, string[]>>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  likes: Interest[];
  notice: string;
  onInterestCycle: (interest: Interest) => void;
  onInterestDetailsChange: (interest: Interest, values: string[]) => void;
  onStyleChange: (key: TravelStyleKey, value: number) => void;
  travelStyle: TravelStyleValues;
}

export function PreferencesStep({
  dislikes,
  interestDetails,
  headingRef,
  likes,
  notice,
  onInterestCycle,
  onInterestDetailsChange,
  onStyleChange,
  travelStyle,
}: PreferencesStepProps) {
  return (
    <section aria-labelledby="preferences-title" className={styles.step}>
      <SectionHeader
        eyebrow="STEP 2 · 旅行偏好"
        id="preferences-title"
        title="您对什么感兴趣？"
        headingRef={headingRef}
      >
        <p className={styles.stepDescription}>
          用一级兴趣与六条旅行风格滑轨，勾勒这趟旅程的方向。
        </p>
      </SectionHeader>
      <WizardStepBody>
        <InterestGrid
          notice={notice}
          details={interestDetails}
          dislikes={dislikes}
          likes={likes}
          onCycle={onInterestCycle}
          onDetailsChange={onInterestDetailsChange}
        />
        <div className={styles.styleSection}>
          <div className={styles.sectionHeadingRow}>
            <h2>您喜欢怎么玩</h2>
          </div>
          <div className={styles.styleGroups}>
            <TravelStyleGroup
              items={[...PACE_ITEMS]}
              onChange={onStyleChange}
              title="旅行节奏"
              values={travelStyle}
            />
            <TravelStyleGroup
              items={[...METHOD_ITEMS]}
              onChange={onStyleChange}
              title="旅行方式"
              values={travelStyle}
            />
          </div>
        </div>
      </WizardStepBody>
    </section>
  );
}
