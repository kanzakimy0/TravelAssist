import "server-only";

// Query mappings only; supabase/migrations/*.sql remains the sole schema history.
export { profiles } from "./profiles";
export { profileSettings } from "./profile-settings";
export { emergencyContacts } from "./emergency-contacts";
export {
  travelPreferences,
  tripDrafts,
  tripPreferenceSnapshots,
  tripPreferenceOverrides,
} from "./travel-preferences";
