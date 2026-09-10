import type { Dispatch } from "react";
import type { TripAction, TripState } from "../model/trip-model";
import { PlannerRouteBoard } from "./planner-route-board";

export function ProportionalTimeline({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  compactSummary?: boolean;
}) {
  return <PlannerRouteBoard state={state} dispatch={dispatch} />;
}
