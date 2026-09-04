"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { FloatingPanel } from "@/components/ui/floating-panel";

import {
  applyTripWizardDraftPatch,
  calculateDurationDays,
  createTripWizardDraft,
} from "../model/start-flow-draft";
import type {
  AnchorType,
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
import { PreferencesStep } from "./preferences-step";
import { StartFlowHeader } from "./start-flow-header";
import { StepProgress } from "./step-progress";
import { TripBasicsStep } from "./trip-basics-step";

type StepIndex = 0 | 1 | 2;

interface StoredWizardState {
  currentStep: StepIndex;
  draft: TripWizardDraft;
  version: 1;
}

interface StartFlowShellProps {
  initialDraft?: TripWizardDraftPatch;
}

const STORAGE_KEY = "travelassist.trip-wizard.v1";

function isStepIndex(value: unknown): value is StepIndex {
  return value === 0 || value === 1 || value === 2;
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
    version: 1,
  };

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return fallback;
    }

    const stored = JSON.parse(storedValue) as Partial<StoredWizardState>;
    return {
      currentStep: isStepIndex(stored.currentStep) ? stored.currentStep : 0,
      draft: createTripWizardDraft(stored.draft ?? initialDraft),
      version: 1,
    };
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
      <div className={styles.flowLayout}>
        <StartFlowHeader />
        <FloatingPanel className={styles.flowPanel}>
          <p className={styles.loadingState}>正在恢复旅行草稿…</p>
        </FloatingPanel>
      </div>
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
    const stored: StoredWizardState = {
      currentStep,
      draft,
      version: 1,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [currentStep, draft]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

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
    const stored: StoredWizardState = {
      currentStep,
      draft,
      version: 1,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setNotice(message);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (currentStep === 0 && !draft.familiarity) {
      setNotice("请选择你对日本的熟悉程度后再继续。");
      return;
    }

    if (currentStep < 2) {
      goToStep((currentStep + 1) as StepIndex);
      return;
    }

    saveDraft("前三步已保存；行程生成将在后续任务中开放。");
  }

  return (
    <div className={styles.flowLayout}>
      <StartFlowHeader />
      <FloatingPanel className={styles.flowPanel}>
        <StepProgress currentStep={currentStep} />
        <form className={styles.form} noValidate onSubmit={handleSubmit}>
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
              likes={draft.likes}
              notice={notice}
              onInterestCycle={handleInterestCycle}
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
              onAnchorToggle={(value: AnchorType) =>
                updateDraft({
                  anchors: toggleArrayValue(draft.anchors, value),
                })
              }
              onBudgetChange={(value: BudgetLevel) =>
                updateDraft({ budget: value })
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
              onTransportChange={(value: TransportMode) =>
                updateDraft({ transport: value })
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
            <Button className={styles.primaryAction} type="submit">
              {currentStep === 2 ? "保存本次旅行" : "下一步"}
              <span aria-hidden="true">→</span>
            </Button>
            <Button onClick={() => saveDraft()} variant="ghost">
              保存草稿
            </Button>
          </div>
        </form>
      </FloatingPanel>
      <p className={styles.privacyNote}>
        草稿仅保存在当前浏览器，可随时返回继续填写。
      </p>
    </div>
  );
}
