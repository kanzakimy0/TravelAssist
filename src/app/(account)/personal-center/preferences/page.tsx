import type { Metadata } from "next";

import { PreferenceCenter } from "@/features/preferences/preference-center";

export const metadata: Metadata = { title: "旅行偏好" };

export default function PreferencesPage() {
  return <PreferenceCenter />;
}
