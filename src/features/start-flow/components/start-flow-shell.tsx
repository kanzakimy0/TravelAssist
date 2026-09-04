"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { FloatingPanel } from "@/components/ui/floating-panel";

import {
  hasValidationErrors,
  normalizeDestination,
  validateCompanions,
  validateDestination,
  validateTiming,
} from "../lib/validation";
import type {
  CompanionErrors,
  CompanionField,
  TimingErrors,
} from "../lib/validation";
import {
  applyStartFlowDraftPatch,
  createStartFlowDraft,
} from "../model/start-flow-draft";
import type {
  StartFlowDraftPatch,
  StartFlowTiming,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { CompanionsStep } from "./companions-step";
import { ConstraintsStep } from "./constraints-step";
import { DestinationStep } from "./destination-step";
import { ReadyState } from "./ready-state";
import { ReviewStep } from "./review-step";
import { StartFlowHeader } from "./start-flow-header";
import { TimingStep } from "./timing-step";

type StepIndex = 0 | 1 | 2 | 3 | 4;

interface FlowErrors {
  companions: CompanionErrors;
  destination?: string;
  timing: TimingErrors;
}

interface StartFlowShellProps {
  initialDraft?: StartFlowDraftPatch;
}

const EMPTY_ERRORS: FlowErrors = {
  companions: {},
  timing: {},
};

export function StartFlowShell({ initialDraft }: StartFlowShellProps) {
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [draft, setDraft] = useState(() => createStartFlowDraft(initialDraft));
  const [errors, setErrors] = useState<FlowErrors>(EMPTY_ERRORS);
  const [isReady, setIsReady] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const durationInputRef = useRef<HTMLInputElement>(null);
  const adultMaleInputRef = useRef<HTMLInputElement>(null);
  const adultFemaleInputRef = useRef<HTMLInputElement>(null);
  const childInputRef = useRef<HTMLInputElement>(null);
  const infantInputRef = useRef<HTMLInputElement>(null);

  const companionInputRefs = {
    adultMale: adultMaleInputRef,
    adultFemale: adultFemaleInputRef,
    child: childInputRef,
    infant: infantInputRef,
  };

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep, isReady]);

  function updateDraft(patch: StartFlowDraftPatch) {
    setDraft((currentDraft) => applyStartFlowDraftPatch(currentDraft, patch));
  }

  function goToStep(step: StepIndex) {
    setErrors(EMPTY_ERRORS);
    setCurrentStep(step);
  }

  function handleDestinationChange(value: string) {
    updateDraft({ destination: value });
    setErrors((current) => ({ ...current, destination: undefined }));
  }

  function handleTimingChange<Field extends keyof StartFlowTiming>(
    field: Field,
    value: StartFlowTiming[Field],
  ) {
    updateDraft({ timing: { [field]: value } });
    setErrors((current) => ({
      ...current,
      timing: { ...current.timing, [field]: undefined },
    }));
  }

  function handleCompanionChange(field: CompanionField, value: number) {
    updateDraft({ companions: { [field]: value } });
    setErrors((current) => ({
      ...current,
      companions: {
        ...current.companions,
        [field]: undefined,
        group: undefined,
      },
    }));
  }

  function validateCurrentStep() {
    if (currentStep === 0) {
      const destinationError = validateDestination(draft.destination);
      if (destinationError) {
        setErrors((current) => ({
          ...current,
          destination: destinationError,
        }));
        destinationInputRef.current?.focus();
        return false;
      }

      updateDraft({ destination: normalizeDestination(draft.destination) });
      return true;
    }

    if (currentStep === 1) {
      const timingErrors = validateTiming(draft.timing);
      if (hasValidationErrors(timingErrors)) {
        setErrors((current) => ({ ...current, timing: timingErrors }));
        if (timingErrors.startDate) {
          startDateInputRef.current?.focus();
        } else if (timingErrors.endDate) {
          endDateInputRef.current?.focus();
        } else {
          durationInputRef.current?.focus();
        }
        return false;
      }

      return true;
    }

    if (currentStep === 2) {
      const companionErrors = validateCompanions(draft.companions);
      if (hasValidationErrors(companionErrors)) {
        setErrors((current) => ({
          ...current,
          companions: companionErrors,
        }));
        const invalidField = (
          ["adultMale", "adultFemale", "child", "infant"] as const
        ).find((field) => companionErrors[field]);
        companionInputRefs[invalidField ?? "adultMale"].current?.focus();
        return false;
      }

      return true;
    }

    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep === 3) {
      updateDraft({ hardConstraintsNote: draft.hardConstraintsNote.trim() });
      goToStep(4);
      return;
    }

    if (currentStep === 4) {
      setIsReady(true);
      return;
    }

    goToStep((currentStep + 1) as StepIndex);
  }

  function handlePrevious() {
    if (currentStep > 0) {
      goToStep((currentStep - 1) as StepIndex);
    }
  }

  return (
    <div className={styles.flowLayout}>
      <StartFlowHeader currentStep={currentStep} />
      <FloatingPanel className={styles.flowPanel}>
        {isReady ? (
          <ReadyState
            headingRef={headingRef}
            onReturnToReview={() => setIsReady(false)}
          />
        ) : (
          <form className={styles.form} noValidate onSubmit={handleSubmit}>
            {currentStep === 0 ? (
              <DestinationStep
                error={errors.destination}
                headingRef={headingRef}
                inputRef={destinationInputRef}
                onChange={handleDestinationChange}
                value={draft.destination}
              />
            ) : null}
            {currentStep === 1 ? (
              <TimingStep
                durationInputRef={durationInputRef}
                endDateInputRef={endDateInputRef}
                errors={errors.timing}
                headingRef={headingRef}
                onChange={handleTimingChange}
                startDateInputRef={startDateInputRef}
                timing={draft.timing}
              />
            ) : null}
            {currentStep === 2 ? (
              <CompanionsStep
                errors={errors.companions}
                headingRef={headingRef}
                inputRefs={companionInputRefs}
                onChange={handleCompanionChange}
                value={draft.companions}
              />
            ) : null}
            {currentStep === 3 ? (
              <ConstraintsStep
                headingRef={headingRef}
                onChange={(value) =>
                  updateDraft({ hardConstraintsNote: value })
                }
                value={draft.hardConstraintsNote}
              />
            ) : null}
            {currentStep === 4 ? (
              <ReviewStep
                draft={draft}
                headingRef={headingRef}
                onEdit={(step) => goToStep(step as StepIndex)}
              />
            ) : null}

            <div className={styles.actions}>
              {currentStep === 0 ? (
                <ButtonLink href="/" variant="secondary">
                  返回首页
                </ButtonLink>
              ) : (
                <Button onClick={handlePrevious} variant="secondary">
                  上一步
                </Button>
              )}
              <Button type="submit">
                {currentStep === 4 ? "确认信息" : "下一步"}
                <span aria-hidden="true">{currentStep === 4 ? "✓" : "→"}</span>
              </Button>
            </div>
          </form>
        )}
      </FloatingPanel>
      <p className={styles.privacyNote}>
        本次填写只保留在当前页面，刷新后会重置。
      </p>
    </div>
  );
}
