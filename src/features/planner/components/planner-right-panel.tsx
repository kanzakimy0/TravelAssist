import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { MockPlan, PlannerSettings } from "../model/planner-types";
import { TripQuickSettings } from "./trip-quick-settings";
import { MoreTripSettingsPopover } from "./more-trip-settings-popover";
import { PlanRecommendationList } from "./plan-recommendation-list";
import { PlannerIcon } from "./planner-icon";
import styles from "../planner.module.css";

export function PlannerRightPanel({
  plans,
  plan,
  settings,
  onChange,
  onPlan,
  moreOpen,
  onMore,
  refreshing,
  status,
  onReplan,
  pendingCount,
  onBooking,
}: {
  plans: MockPlan[];
  plan: MockPlan;
  settings: PlannerSettings;
  onChange: (key: keyof PlannerSettings, value: string) => void;
  onPlan: (plan: MockPlan) => void;
  moreOpen: boolean;
  onMore: (open: boolean) => void;
  refreshing: boolean;
  status: string;
  onReplan: () => void;
  pendingCount: number;
  onBooking: () => void;
}) {
  const moreTrigger = useRef<HTMLButtonElement>(null);
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
        <TripQuickSettings
          settings={settings}
          onChange={onChange}
          dayCount={plan.days.length}
          nightCount={
            plan.days.filter((day) =>
              day.stops.some((stop) => stop.kind === "stay"),
            ).length
          }
        />
        <div className={styles.settingsActions}>
          <Button
            variant="secondary"
            size="small"
            className={styles.settingsButton}
            ref={moreTrigger}
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? "more-trip-settings" : undefined}
            onClick={() => onMore(!moreOpen)}
          >
            <PlannerIcon name="settings" />
            更多行程设置
          </Button>
          <Button
            variant="secondary"
            size="small"
            className={styles.settingsButton}
            onClick={onReplan}
            disabled={refreshing}
          >
            <PlannerIcon name="refresh" />
            重新生成路线
          </Button>
        </div>
        <p className={styles.mockStatus} role="status">
          {status}
        </p>
        {moreOpen && (
          <MoreTripSettingsPopover
            trigger={moreTrigger}
            settings={settings}
            onChange={onChange}
            onClose={() => onMore(false)}
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
