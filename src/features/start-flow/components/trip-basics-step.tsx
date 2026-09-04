import type { RefObject } from "react";

import type {
  AnchorType,
  BudgetLevel,
  DateMode,
  TransportMode,
  TripParty,
  TripWizardDraft,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { AnchorActions } from "./anchor-actions";
import { BudgetSelector } from "./budget-selector";
import { DestinationGrid } from "./destination-grid";
import { ExpandableDateSelector } from "./expandable-date-selector";
import { PartyCounter } from "./party-counter";
import { TransportSelector } from "./transport-selector";

interface TripBasicsStepProps {
  draft: TripWizardDraft;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAnchorToggle: (value: AnchorType) => void;
  onBudgetChange: (value: BudgetLevel) => void;
  onDateModeChange: (mode: DateMode) => void;
  onDestinationToggle: (destination: string) => void;
  onExactDateChange: (field: "departure" | "return", value: string) => void;
  onPartyChange: (key: keyof TripParty, value: number) => void;
  onPlannedDateChange: (field: "departure" | "return", value: string) => void;
  onTransportChange: (value: TransportMode) => void;
}

export function TripBasicsStep({
  draft,
  headingRef,
  onAnchorToggle,
  onBudgetChange,
  onDateModeChange,
  onDestinationToggle,
  onExactDateChange,
  onPartyChange,
  onPlannedDateChange,
  onTransportChange,
}: TripBasicsStepProps) {
  return (
    <section aria-labelledby="trip-basics-title" className={styles.step}>
      <p className={styles.eyebrow}>STEP 3 · 本次旅行</p>
      <h1
        className={styles.stepTitle}
        id="trip-basics-title"
        ref={headingRef}
        tabIndex={-1}
      >
        这次旅行怎么安排？
      </h1>
      <p className={styles.stepDescription}>
        告诉我们时间、地点与同行方式，先把这趟旅行的轮廓定下来。
      </p>
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
          onToggle={onDestinationToggle}
          values={draft.destinations}
        />
        <TransportSelector
          onChange={onTransportChange}
          value={draft.transport}
        />
      </div>
      <div className={styles.basicsRow}>
        <PartyCounter onChange={onPartyChange} value={draft.party} />
        <BudgetSelector onChange={onBudgetChange} value={draft.budget} />
      </div>
      <AnchorActions onToggle={onAnchorToggle} values={draft.anchors} />
    </section>
  );
}
