/** Synthetic contract examples, never provider evidence or real reservations. */
import type {
  TripDraftFactsV1,
  TripPlanSnapshotV1,
  WizardProgressV1,
  PlanItemV1,
} from "./index";

export function minimalDraftFixture(): TripDraftFactsV1 {
  return {
    contractVersion: "1.0",
    title: null,
    defaultTimezone: null,
    destinations: [],
    dates: {
      mode: "undecided",
      departure: null,
      returning: null,
      plannedDeparture: null,
      plannedReturn: null,
      durationDays: null,
    },
    participants: { adults: 0, children: 0, infants: 0, seniors: 0 },
    participantNeeds: null,
    budget: null,
    constraints: [],
    fixedArrangements: { flights: [], hotels: [], activities: [] },
  };
}
export function fullDraftFixture(): TripDraftFactsV1 {
  return {
    ...minimalDraftFixture(),
    title: "日本旅行（契约测试）",
    defaultTimezone: "Asia/Tokyo",
    destinations: [
      { id: "example-destination", name: "东京", coordinates: null },
    ],
    dates: {
      mode: "exact",
      departure: "2027-04-10",
      returning: "2027-04-12",
      plannedDeparture: null,
      plannedReturn: null,
      durationDays: 3,
    },
    participants: { adults: 2, children: 1, infants: 0, seniors: 1 },
    participantNeeds: {
      childAgeInput: "6",
      childSeat: true,
      infantAgeInput: null,
      stroller: false,
      crib: false,
      seniorWalking: "light",
      reduceStairs: true,
      restFrequency: "often",
    },
    budget: {
      currency: "JPY",
      totalMinor: 120000,
      perPersonMinor: null,
      lodgingPerNightMinor: 20000,
      diningPerDayMinor: 0,
    },
    constraints: [
      {
        id: "example-need",
        kind: "participant_need",
        note: "同行长者需要较多休息；示例输入，不是医学判断",
      },
    ],
    fixedArrangements: {
      flights: [
        {
          id: "example-flight",
          inputMethod: "manual",
          departureAirport: "待确认出发机场",
          arrivalAirport: "待确认到达机场",
          date: "2027-04-10",
          departureTime: "08:30",
          timezone: null,
          flightNumber: null,
        },
      ],
      hotels: [
        {
          id: "example-hotel",
          inputMethod: "manual",
          address: "待核对的手动地址（示例）",
          name: "示例住宿",
          city: "东京",
          checkIn: "2027-04-10",
          checkOut: "2027-04-12",
          location: null,
        },
      ],
      activities: [
        {
          id: "example-activity",
          inputMethod: "manual",
          name: "示例固定活动",
          date: "2027-04-11",
          time: "15:00",
          timezone: "Asia/Tokyo",
          location: null,
          fixed: true,
          nonCancellable: false,
        },
      ],
    },
  };
}
export function progressFixture(): WizardProgressV1 {
  return {
    contractVersion: "1.0",
    phase: "plan_selection",
    completedPhases: [
      "familiarity",
      "preferences",
      "trip_basics",
      "generating",
    ],
  };
}
export function minimalSnapshotFixture(): TripPlanSnapshotV1 {
  return {
    contractVersion: "1.0",
    provenance: "fixture",
    trip: {
      id: "example-trip",
      title: "示例旅行",
      status: "draft",
      defaultTimezone: "Asia/Tokyo",
      activePlanId: null,
      revision: 1,
    },
    updatedAt: "2026-09-08T00:00:00Z",
    plans: [],
  };
}
export function itemFixture(): PlanItemV1 {
  return {
    id: "example-item",
    kind: "place",
    title: "示例景点",
    place: null,
    schedule: {
      start: "2027-04-10T10:00:00+09:00",
      end: "2027-04-10T11:00:00+09:00",
      startTimezone: "Asia/Tokyo",
      endTimezone: "Asia/Tokyo",
    },
    lockLevel: "none",
    assessment: "unknown",
    booking: { status: "unknown", referenceId: null, verifiedAt: null },
  };
}
export function fullSnapshotFixture(): TripPlanSnapshotV1 {
  return {
    ...minimalSnapshotFixture(),
    trip: {
      id: "example-trip",
      title: "三日旅行（合成示例）",
      status: "planned",
      defaultTimezone: "Asia/Tokyo",
      activePlanId: "example-plan",
      revision: 4,
    },
    plans: [
      {
        id: "example-plan",
        title: "经典均衡",
        revision: 3,
        days: [
          {
            id: "example-day-one",
            dayNumber: 1,
            localDate: "2027-04-10",
            timezone: "Asia/Tokyo",
            items: [
              itemFixture(),
              {
                ...itemFixture(),
                id: "example-meal",
                kind: "meal",
                title: "未安排午餐",
                schedule: null,
                assessment: "warning",
              },
            ],
            alternatives: [
              {
                ...itemFixture(),
                id: "example-alternative",
                title: "备用景点",
                schedule: null,
              },
            ],
          },
          {
            id: "example-day-two",
            dayNumber: 2,
            localDate: "2027-04-11",
            timezone: "Asia/Tokyo",
            items: [],
            alternatives: [],
          },
          {
            id: "example-day-three",
            dayNumber: 3,
            localDate: "2027-04-12",
            timezone: "Asia/Tokyo",
            items: [],
            alternatives: [],
          },
        ],
      },
      { id: "example-second-plan", title: "深度慢游", revision: 1, days: [] },
    ],
  };
}
