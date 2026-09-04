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

export const INTERESTS = [
  "自然风景",
  "历史文化",
  "美食",
  "摄影",
  "温泉疗愈",
  "艺术展馆",
  "动漫娱乐",
  "购物",
  "城市探索",
  "户外活动",
  "夜间体验",
  "亲子体验",
  "传统体验",
  "主题乐园",
  "乡村小镇",
  "季节限定",
] as const;

export type Interest = (typeof INTERESTS)[number];
export type Familiarity = "first" | "some" | "experienced" | "local";
export type DateMode = "exact" | "planned" | "undecided";
export type TransportMode = "recommended" | "public" | "driving" | "mixed";
export type BudgetLevel = "economy" | "standard" | "comfort" | "premium";
export type AnchorType = "flight" | "hotel" | "activity";
export type TravelStyleKey =
  "pace" | "depth" | "discovery" | "movement" | "coverage" | "priority";

export interface TravelStyleValues {
  pace: number;
  depth: number;
  discovery: number;
  movement: number;
  coverage: number;
  priority: number;
}

export interface TripParty {
  adults: number;
  children: number;
  infants: number;
  seniors: number;
}

export interface TripWizardDraft {
  familiarity: Familiarity | null;
  likes: Interest[];
  dislikes: Interest[];
  travelStyle: TravelStyleValues;
  dateMode: DateMode | null;
  exactDeparture: string;
  exactReturn: string;
  plannedDeparture: string;
  plannedReturn: string;
  durationDays: number | null;
  destinations: string[];
  transport: TransportMode;
  party: TripParty;
  budget: BudgetLevel;
  anchors: AnchorType[];
}

export type TripWizardDraftPatch = Partial<
  Omit<TripWizardDraft, "travelStyle" | "party">
> & {
  travelStyle?: Partial<TravelStyleValues>;
  party?: Partial<TripParty>;
};

const EMPTY_TRIP_WIZARD_DRAFT: TripWizardDraft = {
  familiarity: null,
  likes: [],
  dislikes: [],
  travelStyle: {
    pace: 3,
    depth: 3,
    discovery: 3,
    movement: 3,
    coverage: 3,
    priority: 3,
  },
  dateMode: null,
  exactDeparture: "",
  exactReturn: "",
  plannedDeparture: "",
  plannedReturn: "",
  durationDays: null,
  destinations: [],
  transport: "recommended",
  party: {
    adults: 1,
    children: 0,
    infants: 0,
    seniors: 0,
  },
  budget: "standard",
  anchors: [],
};

export function applyTripWizardDraftPatch(
  draft: TripWizardDraft,
  patch: TripWizardDraftPatch,
): TripWizardDraft {
  return {
    ...draft,
    ...patch,
    travelStyle: {
      ...draft.travelStyle,
      ...patch.travelStyle,
    },
    party: {
      ...draft.party,
      ...patch.party,
    },
  };
}

export function createTripWizardDraft(
  initialDraft: TripWizardDraftPatch = {},
): TripWizardDraft {
  return applyTripWizardDraftPatch(EMPTY_TRIP_WIZARD_DRAFT, initialDraft);
}

export function calculateDurationDays(start: string, end: string) {
  if (!start || !end) {
    return null;
  }

  const startTime = Date.parse(`${start}T00:00:00`);
  const endTime = Date.parse(`${end}T00:00:00`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return null;
  }

  const difference = Math.floor((endTime - startTime) / 86_400_000);
  return difference >= 0 ? difference + 1 : null;
}
