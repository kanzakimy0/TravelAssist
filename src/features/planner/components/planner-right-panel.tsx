import { useRef, useState, type Dispatch } from "react";
import { pendingSettingsCount } from "../model/secondary-panels";
import { Button } from "@/components/ui/button";
import type { MockPlan } from "../model/planner-types";
import type { TripState, TripAction } from "../model/trip-model";
import { TripQuickSettings } from "./trip-quick-settings";
import { MoreTripSettingsPopover } from "./more-trip-settings-popover";
import { PlanRecommendationList } from "./plan-recommendation-list";
import { PlannerIcon } from "./planner-icon";
import styles from "../planner.module.css";

export function PlannerRightPanel({
  plans,
  plan,
  state,
  dispatch,
  onPlan,
  moreOpen,
  onMore,
  refreshing,
  status,
  onReplan,
  pendingCount,
  onBooking,
  onOpenDetail,
}: {
  plans: MockPlan[];
  plan: MockPlan;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onPlan: (plan: MockPlan) => void;
  moreOpen: boolean;
  onMore: (open: boolean) => void;
  refreshing: boolean;
  status: string;
  onReplan: () => void;
  pendingCount: number;
  onBooking: () => void;
  onOpenDetail: () => void;
}) {
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState(false);
  const pending = pendingSettingsCount(state);
  return (
    <div className={styles.rightPanel} data-right-panel>
      <section
        className={styles.quickSettings}
        data-right-upper
        aria-labelledby="settings-title"
      >
        <div className={styles.sectionTitle}>
          <span className={styles.eyebrow}>YOUR JOURNEY</span>
          <h2 id="settings-title">让旅程，更合您心意</h2>
        </div>
        <TripQuickSettings state={state} dispatch={dispatch} />
        <div className={styles.settingsActions}>
          <Button
            variant="secondary"
            size="small"
            className={styles.settingsButton}
            ref={moreTrigger}
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? "more-trip-settings" : undefined}
            onClick={() => {
              setPreview(false);
              onMore(!moreOpen);
            }}
          >
            <PlannerIcon name="settings" />
            更多行程设置
          </Button>
          <Button
            variant="secondary"
            size="small"
            className={`${styles.settingsButton} ${styles.replanButton}`}
            onClick={() => {
              setPreview(true);
              onMore(true);
            }}
            disabled={refreshing}
          >
            <PlannerIcon name="refresh" />
            {refreshing
              ? "刷新中…"
              : pending
                ? `预览 ${pending} 项变更`
                : "重新生成路线"}
          </Button>
        </div>
        <p className={styles.mockStatus} role="status">
          {status}
        </p>
        <Button
          className={styles.openDetailButton}
          onClick={onOpenDetail}
          size="small"
        >
          进入行程详情
          <PlannerIcon name="chevron" />
        </Button>
        {moreOpen && (
          <MoreTripSettingsPopover
            trigger={moreTrigger}
            state={state}
            dispatch={dispatch}
            onClose={() => {
              setPreview(false);
              onMore(false);
            }}
            preview={preview}
            onGenerate={onReplan}
          />
        )}
      </section>
      <PlanRecommendationList
        plans={plans}
        selectedId={plan.id}
        onSelect={onPlan}
        pendingCount={pendingCount}
        onBooking={onBooking}
      />
    </div>
  );
}
