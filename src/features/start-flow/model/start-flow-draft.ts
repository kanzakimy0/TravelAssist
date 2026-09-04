export interface StartFlowTiming {
  startDate: string;
  endDate: string;
  durationDays: number | null;
}

export interface StartFlowCompanions {
  adultMale: number;
  adultFemale: number;
  child: number;
  infant: number;
}

export interface StartFlowDraft {
  destination: string;
  timing: StartFlowTiming;
  companions: StartFlowCompanions;
  hardConstraintsNote: string;
}

export interface StartFlowDraftPatch {
  destination?: string;
  timing?: Partial<StartFlowTiming>;
  companions?: Partial<StartFlowCompanions>;
  hardConstraintsNote?: string;
}

const EMPTY_START_FLOW_DRAFT: StartFlowDraft = {
  destination: "",
  timing: {
    startDate: "",
    endDate: "",
    durationDays: null,
  },
  companions: {
    adultMale: 0,
    adultFemale: 0,
    child: 0,
    infant: 0,
  },
  hardConstraintsNote: "",
};

export function applyStartFlowDraftPatch(
  draft: StartFlowDraft,
  patch: StartFlowDraftPatch,
): StartFlowDraft {
  return {
    ...draft,
    ...patch,
    timing: {
      ...draft.timing,
      ...patch.timing,
    },
    companions: {
      ...draft.companions,
      ...patch.companions,
    },
  };
}

export function createStartFlowDraft(
  initialDraft: StartFlowDraftPatch = {},
): StartFlowDraft {
  return applyStartFlowDraftPatch(EMPTY_START_FLOW_DRAFT, initialDraft);
}
