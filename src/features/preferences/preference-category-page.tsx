import { CanonicalPreferenceEditor } from "./persistence/canonical-preference-editor";
import type { CategoryKey } from "./preference-model";
export function PreferenceCategoryPage({
  categoryKey,
}: {
  categoryKey: CategoryKey | "advanced";
}) {
  return <CanonicalPreferenceEditor category={categoryKey} />;
}
