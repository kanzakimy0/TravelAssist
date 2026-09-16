import { CanonicalPreferenceEditor } from "./persistence/canonical-preference-editor";
export function DiningPreferencePage() {
  return <CanonicalPreferenceEditor category="dining" />;
}
export function AccommodationPreferencePage() {
  return <CanonicalPreferenceEditor category="accommodation" />;
}
export function BudgetPreferencePage() {
  return <CanonicalPreferenceEditor category="budget" />;
}
