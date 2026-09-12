import "server-only";

// Query mappings only; supabase/migrations/*.sql remains the sole schema history.
export { profiles } from "./profiles";
export { profileSettings } from "./profile-settings";
export { emergencyContacts } from "./emergency-contacts";
export { travelPreferences } from "./travel-preferences";
export {
  companions,
  companionGroups,
  companionGroupMembers,
} from "./companions";
export { tripLibraryRecords } from "./trip-library";
