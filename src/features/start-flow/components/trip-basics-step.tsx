import type { RefObject } from "react";

import type {
  BudgetDetails,
  BudgetLevel,
  DateMode,
  TransportDetails,
  TransportMode,
  TravelerDetails,
  TripParty,
  TripAnchors,
  TripWizardDraft,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { SectionHeader } from "./section-header";
import { AnchorActions } from "./anchor-actions";
import { BudgetSelector } from "./budget-selector";
import { DestinationGrid } from "./destination-grid";
import { ExpandableDateSelector } from "./expandable-date-selector";
import { PartyCounter } from "./party-counter";
import { TransportSelector } from "./transport-selector";

interface TripBasicsStepProps {
  draft: TripWizardDraft;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAnchorsChange: (value: TripAnchors) => void;
  onBudgetChange: (value: BudgetLevel) => void;
  onBudgetDetailsChange: (patch: Partial<BudgetDetails>) => void;
  onDateModeChange: (mode: DateMode) => void;
  onDestinationToggle: (destination: string) => void;
  onExactDateChange: (field: "departure" | "return", value: string) => void;
  onPartyChange: (key: keyof TripParty, value: number) => void;
  onPlannedDateChange: (field: "departure" | "return", value: string) => void;
  onPrefecturesChange: (values: string[]) => void;
  onTransportChange: (value: TransportMode) => void;
  onTransportDetailsChange: (patch: Partial<TransportDetails>) => void;
  onTravelerDetailsChange: (patch: Partial<TravelerDetails>) => void;
}

export function TripBasicsStep({
  draft,
  headingRef,
  onAnchorsChange,
  onBudgetChange,
  onBudgetDetailsChange,
  onDateModeChange,
  onDestinationToggle,
  onExactDateChange,
  onPartyChange,
  onPlannedDateChange,
  onPrefecturesChange,
  onTransportChange,
  onTransportDetailsChange,
  onTravelerDetailsChange,
}: TripBasicsStepProps) {
  return (
    <section aria-labelledby="trip-basics-title" className={styles.step}>
      <SectionHeader
        eyebrow="STEP 3 · 本次旅行"
        id="trip-basics-title"
        title="这次旅行怎么安排？"
        headingRef={headingRef}
      >
        <p className={styles.stepDescription}>
          告诉我们时间、地点与同行方式，先把这趟旅行的轮廓定下来。
        </p>
      </SectionHeader>
      <ExpandableDateSelector
        dateMode={draft.dateMode}
        durationDays={draft.durationDays}
        exactDeparture={draft.exactDeparture}
        exactReturn={draft.exactReturn}
        onDateModeChange={onDateModeChange}
        onExactDateChange={onExactDateChange}
        onPlannedDateChange={onPlannedDateChange}
        plannedDeparture={draft.plannedDeparture}
        plannedReturn={draft.plannedReturn}
      />
      <div className={styles.basicsRow}>
        <DestinationGrid
          onPrefecturesChange={onPrefecturesChange}
          onToggle={onDestinationToggle}
          selectedPrefectures={draft.selectedPrefectures}
          values={draft.destinations}
        />
        <TransportSelector
          details={draft.transportDetails}
          onChange={onTransportChange}
          onDetailsChange={onTransportDetailsChange}
          value={draft.transport}
        />
      </div>
      <div className={styles.basicsRow}>
        <PartyCounter
          details={draft.travelerDetails}
          onChange={onPartyChange}
          onDetailsChange={onTravelerDetailsChange}
          value={draft.party}
        />
        <BudgetSelector
          details={draft.budgetDetails}
          onChange={onBudgetChange}
          onDetailsChange={onBudgetDetailsChange}
          value={draft.budget}
        />
      </div>
      <AnchorActions onChange={onAnchorsChange} value={draft.anchors} />
    </section>
  );
}
