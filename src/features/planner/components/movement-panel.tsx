import type { Dispatch } from "react";
import type { TripAction, TripState } from "../model/trip-model";
import { PlannerRouteBoard } from "./planner-route-board";

export function MovementPanel({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  return <PlannerRouteBoard state={state} dispatch={dispatch} movement />;
}
