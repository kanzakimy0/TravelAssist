"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import { GENERATED_PLANS } from "../model/generated-plans";
import {
  applyTripWizardDraftPatch,
  calculateDurationDays,
  createTripWizardDraft,
} from "../model/start-flow-draft";
import type {
  BudgetLevel,
  DateMode,
  Familiarity,
  Interest,
  TransportMode,
  TravelStyleKey,
  TripParty,
  TripWizardDraft,
  TripWizardDraftPatch,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { FamiliarityStep } from "./familiarity-step";
import { GenerationStep } from "./generation-step";
import { PlanSelectionStep } from "./plan-selection-step";
import { PreferencesStep } from "./preferences-step";
import { TripBasicsStep } from "./trip-basics-step";
import { WizardLayout } from "./wizard-layout";

type StepIndex = 0 | 1 | 2 | 3;

interface StoredWizardState {
  currentStep: StepIndex;
  draft: TripWizardDraft;
  version: 2;
}

interface StartFlowShellProps {
  initialDraft?: TripWizardDraftPatch;
}

const STORAGE_KEY = "travelassist.trip-wizard.v1";

function isStepIndex(value: unknown): value is StepIndex {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function subscribeToHydration() {
  return () => undefined;
}

function readStoredState(
  initialDraft?: TripWizardDraftPatch,
): StoredWizardState {
  const fallback: StoredWizardState = {
    currentStep: 0,
    draft: createTripWizardDraft(initialDraft),
    version: 2,
  };

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return fallback;

    const stored = JSON.parse(storedValue) as Partial<StoredWizardState>;
    const currentStep = isStepIndex(stored.currentStep)
      ? stored.currentStep
      : 0;
    let draft = createTripWizardDraft(stored.draft ?? initialDraft);

    if (currentStep === 3 && draft.generationStatus.state === "idle") {
      draft = applyTripWizardDraftPatch(draft, {
        generationStatus: {
          state: "generating",
          activeStage: 0,
          runId: draft.generationStatus.runId + 1,
        },
      });
    }
    if (
      currentStep === 3 &&
      draft.generationStatus.state === "complete" &&
      draft.generatedPlans.length === 0
    ) {
      draft = applyTripWizardDraftPatch(draft, {
        generatedPlans: GENERATED_PLANS,
      });
    }

    return { currentStep, draft, version: 2 };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

export function StartFlowShell({ initialDraft }: StartFlowShellProps) {
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (!hasHydrated) {
    return (
      <WizardLayout currentStep={0}>
        <p className={styles.loadingState}>正在恢复旅行草稿…</p>
      </WizardLayout>
    );
  }

  return <HydratedStartFlow initialDraft={initialDraft} />;
}

function HydratedStartFlow({ initialDraft }: StartFlowShellProps) {
  const [initialState] = useState(() => readStoredState(initialDraft));
  const [currentStep, setCurrentStep] = useState<StepIndex>(
    initialState.currentStep,
  );
  const [draft, setDraft] = useState(initialState.draft);
  const [notice, setNotice] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const stored: StoredWizardState = { currentStep, draft, version: 2 };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [currentStep, draft]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.closest("[data-wizard-content]")?.scrollTo(0, 0);
  }, [currentStep, draft.generationStatus.state]);

  useEffect(() => {
    if (currentStep !== 3 || draft.generationStatus.state !== "generating") {
      return;
    }

    const timer = window.setTimeout(() => {
      setDraft((currentDraft) => {
        const stage = currentDraft.generationStatus.activeStage;
        if (stage >= 5) {
          return applyTripWizardDraftPatch(currentDraft, {
            generatedPlans: GENERATED_PLANS,
            selectedPlanId: null,
            generationStatus: { state: "complete", activeStage: 5 },
          });
        }
        return applyTripWizardDraftPatch(currentDraft, {
          generationStatus: { activeStage: stage + 1 },
        });
      });
    }, 720);

    return () => window.clearTimeout(timer);
  }, [
    currentStep,
    draft.generationStatus.activeStage,
    draft.generationStatus.runId,
    draft.generationStatus.state,
  ]);

  function updateDraft(patch: TripWizardDraftPatch) {
    setDraft((currentDraft) => applyTripWizardDraftPatch(currentDraft, patch));
  }

  function goToStep(step: StepIndex) {
    setNotice("");
    setCurrentStep(step);
  }

  function handleInterestCycle(interest: Interest) {
    const isLiked = draft.likes.includes(interest);
    const isDisliked = draft.dislikes.includes(interest);

    if (!isLiked && !isDisliked) {
      if (draft.likes.length >= 3) {
        setNotice("喜欢的兴趣最多选择 3 个。可先取消一个再继续选择。");
        return;
      }
      updateDraft({ likes: [...draft.likes, interest] });
      setNotice("");
      return;
    }

    if (isLiked) {
      if (draft.dislikes.length >= 3) {
        updateDraft({ likes: draft.likes.filter((item) => item !== interest) });
        setNotice("不喜欢的兴趣已满 3 个，本项已恢复为中性。");
        return;
      }
      updateDraft({
        dislikes: [...draft.dislikes, interest],
        likes: draft.likes.filter((item) => item !== interest),
      });
      setNotice("");
      return;
    }

    updateDraft({
      dislikes: draft.dislikes.filter((item) => item !== interest),
    });
    setNotice("");
  }

  function handleExactDateChange(field: "departure" | "return", value: string) {
    const exactDeparture = field === "departure" ? value : draft.exactDeparture;
    const exactReturn = field === "return" ? value : draft.exactReturn;
    updateDraft({
      exactDeparture,
      exactReturn,
      durationDays: calculateDurationDays(exactDeparture, exactReturn),
    });
  }

  function toggleArrayValue<T extends string>(values: T[], value: T) {
    return values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
  }

  function saveDraft(message = "草稿已保存") {
    const stored: StoredWizardState = { currentStep, draft, version: 2 };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setNotice(message);
  }

  function startGeneration() {
    setNotice("");
    setCurrentStep(3);
    updateDraft({
      generatedPlans: [],
      selectedPlanId: null,
      generationStatus: {
        state: "generating",
        activeStage: 0,
        runId: draft.generationStatus.runId + 1,
      },
    });
  }

  function handleSubmit() {
    if (currentStep === 0 && !draft.familiarity) {
      setNotice("请选择您对日本的熟悉程度后再继续。");
      return;
    }
    if (currentStep < 2) {
      goToStep((currentStep + 1) as StepIndex);
      return;
    }
    startGeneration();
  }

  const showPlans =
    currentStep === 3 &&
    draft.generationStatus.state === "complete" &&
    draft.generatedPlans.length > 0;

  return (
    <WizardLayout currentStep={currentStep}>
      {currentStep <= 2 ? (
        <div className={styles.form}>
          {currentStep === 0 ? (
            <FamiliarityStep
              headingRef={headingRef}
              onChange={(value: Familiarity) => {
                updateDraft({ familiarity: value });
                setNotice("");
              }}
              value={draft.familiarity}
            />
          ) : null}
          {currentStep === 1 ? (
            <PreferencesStep
              dislikes={draft.dislikes}
              headingRef={headingRef}
              interestDetails={draft.interestDetails}
              likes={draft.likes}
              notice={notice}
              onInterestCycle={handleInterestCycle}
              onInterestDetailsChange={(interest, values) =>
                updateDraft({ interestDetails: { [interest]: values } })
              }
              onStyleChange={(key: TravelStyleKey, value: number) =>
                updateDraft({ travelStyle: { [key]: value } })
              }
              travelStyle={draft.travelStyle}
            />
          ) : null}
          {currentStep === 2 ? (
            <TripBasicsStep
              draft={draft}
              headingRef={headingRef}
              onAnchorsChange={(anchors) => updateDraft({ anchors })}
              onBudgetChange={(value: BudgetLevel) =>
                updateDraft({ budget: value })
              }
              onBudgetDetailsChange={(patch) =>
                updateDraft({ budgetDetails: patch })
              }
              onDateModeChange={(value: DateMode) =>
                updateDraft({ dateMode: value })
              }
              onDestinationToggle={(value: string) =>
                updateDraft({
                  destinations: toggleArrayValue(draft.destinations, value),
                })
              }
              onExactDateChange={handleExactDateChange}
              onPartyChange={(key: keyof TripParty, value: number) =>
                updateDraft({ party: { [key]: value } })
              }
              onPlannedDateChange={(field, value) =>
                updateDraft(
                  field === "departure"
                    ? { plannedDeparture: value }
                    : { plannedReturn: value },
                )
              }
              onPrefecturesChange={(values) =>
                updateDraft({ selectedPrefectures: values })
              }
              onTransportChange={(value: TransportMode) =>
                updateDraft({ transport: value })
              }
              onTransportDetailsChange={(patch) =>
                updateDraft({ transportDetails: patch })
              }
              onTravelerDetailsChange={(patch) =>
                updateDraft({ travelerDetails: patch })
              }
            />
          ) : null}

          {currentStep !== 1 ? (
            <p aria-live="polite" className={styles.formNotice}>
              {notice}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button
              disabled={currentStep === 0}
              onClick={() => goToStep((currentStep - 1) as StepIndex)}
              variant="secondary"
            >
              <span aria-hidden="true">←</span>
              上一步
            </Button>
            <Button className={styles.primaryAction} onClick={handleSubmit}>
              {currentStep === 2 ? "生成方案" : "下一步"}
              <span aria-hidden="true">→</span>
            </Button>
            <Button onClick={() => saveDraft()} variant="ghost">
              保存草稿
            </Button>
          </div>
        </div>
      ) : null}

      {currentStep === 3 && !showPlans ? (
        <GenerationStep
          activeStage={draft.generationStatus.activeStage}
          headingRef={headingRef}
        />
      ) : null}
      {showPlans ? (
        <PlanSelectionStep
          headingRef={headingRef}
          onBack={() => goToStep(2)}
          onRegenerate={startGeneration}
          onSelect={(selectedPlanId) => updateDraft({ selectedPlanId })}
          plans={draft.generatedPlans}
          selectedPlanId={draft.selectedPlanId}
        />
      ) : null}
    </WizardLayout>
  );
}
