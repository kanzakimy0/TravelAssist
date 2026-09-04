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
export type RouteTransportMode =
  "train" | "shinkansen" | "drive" | "flight" | "ferry";
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

export interface TransportDetails {
  railFirst: boolean;
  busAcceptable: boolean;
  fewerTransfers: boolean;
  lessWalking: boolean;
  shinkansenFirst: boolean;
  useHighways: boolean;
  mountainRoads: boolean;
  nightDriving: boolean;
  maxDrivingHours: string;
  snowDriving: boolean;
  intercityRail: boolean;
  suburbanDriving: boolean;
  autoCombine: boolean;
}

export interface TravelerDetails {
  childAge: string;
  childSeat: boolean;
  infantAge: string;
  stroller: boolean;
  crib: boolean;
  seniorWalking: "standard" | "light" | "limited";
  reduceStairs: boolean;
  restFrequency: "standard" | "often" | "frequent";
}

export interface BudgetDetails {
  totalBudget: string;
  perPersonBudget: string;
  lodgingPerNight: string;
  diningPerDay: string;
  paidAttractions: "low" | "medium" | "high";
  experienceUpgrade: "no" | "maybe" | "yes";
}

export interface FlightAnchor {
  id: string;
  source: "manual" | "lookup" | "paste" | "ai";
  departureAirport: string;
  arrivalAirport: string;
  date: string;
  departureTime: string;
  flightNumber: string;
}

export interface HotelAnchor {
  id: string;
  source: "manual" | "poi" | "paste" | "ai";
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  address: string;
}

export interface ActivityAnchor {
  id: string;
  source: "manual" | "lookup" | "paste" | "ai";
  activityName: string;
  date: string;
  time: string;
  location: string;
  fixed: boolean;
  nonCancellable: boolean;
}

export interface TripAnchors {
  flights: FlightAnchor[];
  hotels: HotelAnchor[];
  activities: ActivityAnchor[];
}

export interface GenerationStatus {
  state: "idle" | "generating" | "complete";
  activeStage: number;
  runId: number;
}

export interface RouteNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface RouteSegment {
  from: string;
  to: string;
  mode: RouteTransportMode;
}

export interface GeneratedPlan {
  id: string;
  name: "经典均衡" | "深度慢游" | "高效探索";
  recommendation: string;
  tagline: string;
  days: number;
  locations: string[];
  interests: string[];
  attractionDensity: string;
  movementIntensity: string;
  budgetLevel: string;
  imagePosition: string;
  route: {
    nodes: RouteNode[];
    segments: RouteSegment[];
  };
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
  selectedPrefectures: string[];
  transport: TransportMode;
  transportDetails: TransportDetails;
  party: TripParty;
  travelerDetails: TravelerDetails;
  budget: BudgetLevel;
  budgetDetails: BudgetDetails;
  interestDetails: Partial<Record<Interest, string[]>>;
  anchors: TripAnchors;
  generationStatus: GenerationStatus;
  generatedPlans: GeneratedPlan[];
  selectedPlanId: string | null;
}

export type TripWizardDraftPatch = Partial<
  Omit<
    TripWizardDraft,
    | "travelStyle"
    | "party"
    | "transportDetails"
    | "travelerDetails"
    | "budgetDetails"
    | "interestDetails"
    | "anchors"
    | "generationStatus"
  >
> & {
  travelStyle?: Partial<TravelStyleValues>;
  party?: Partial<TripParty>;
  transportDetails?: Partial<TransportDetails>;
  travelerDetails?: Partial<TravelerDetails>;
  budgetDetails?: Partial<BudgetDetails>;
  interestDetails?: Partial<Record<Interest, string[]>>;
  anchors?: Partial<TripAnchors> | AnchorType[];
  generationStatus?: Partial<GenerationStatus>;
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
  selectedPrefectures: [],
  transport: "recommended",
  transportDetails: {
    railFirst: true,
    busAcceptable: true,
    fewerTransfers: false,
    lessWalking: false,
    shinkansenFirst: false,
    useHighways: true,
    mountainRoads: true,
    nightDriving: false,
    maxDrivingHours: "4",
    snowDriving: false,
    intercityRail: true,
    suburbanDriving: true,
    autoCombine: true,
  },
  party: {
    adults: 1,
    children: 0,
    infants: 0,
    seniors: 0,
  },
  travelerDetails: {
    childAge: "",
    childSeat: false,
    infantAge: "",
    stroller: false,
    crib: false,
    seniorWalking: "standard",
    reduceStairs: false,
    restFrequency: "standard",
  },
  budget: "standard",
  budgetDetails: {
    totalBudget: "",
    perPersonBudget: "",
    lodgingPerNight: "",
    diningPerDay: "",
    paidAttractions: "medium",
    experienceUpgrade: "maybe",
  },
  interestDetails: {},
  anchors: {
    flights: [],
    hotels: [],
    activities: [],
  },
  generationStatus: {
    state: "idle",
    activeStage: 0,
    runId: 0,
  },
  generatedPlans: [],
  selectedPlanId: null,
};

function normalizeAnchors(
  anchors: TripWizardDraftPatch["anchors"],
  fallback: TripAnchors,
): TripAnchors {
  if (!anchors || Array.isArray(anchors)) {
    return fallback;
  }

  return {
    flights: anchors.flights ?? fallback.flights,
    hotels: anchors.hotels ?? fallback.hotels,
    activities: anchors.activities ?? fallback.activities,
  };
}

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
    transportDetails: {
      ...draft.transportDetails,
      ...patch.transportDetails,
    },
    travelerDetails: {
      ...draft.travelerDetails,
      ...patch.travelerDetails,
    },
    budgetDetails: {
      ...draft.budgetDetails,
      ...patch.budgetDetails,
    },
    interestDetails: {
      ...draft.interestDetails,
      ...patch.interestDetails,
    },
    anchors: normalizeAnchors(patch.anchors, draft.anchors),
    generationStatus: {
      ...draft.generationStatus,
      ...patch.generationStatus,
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
