export * from "./ai";
export * from "./candidates";
export * from "./common";
export * from "./facts";
export * from "./features";
export * from "./fixtures";
export * from "./poi";
export * from "./regions";
export * from "./replanning";
export * from "./scoring";
export * from "./trace";
export * from "./validation";

// Compatibility exports reference canonical owners; this namespace does not copy them.
export { TRIP_CONTRACT_VERSION } from "../trips";
export type { PlanItemV1, TripPlanSnapshotV1 } from "../trips";
export { ROUTE_CONTRACT_VERSION } from "../routes";
export type { RouteAlternative, RouteRequest, RouteResponse } from "../routes";
