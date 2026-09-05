import type { Metadata } from "next";

import { PersonalPlaceholder } from "@/features/personal-center/components/personal-placeholder";

export const metadata: Metadata = { title: "旅行偏好" };

export default function PreferencesPage() {
  return (
    <PersonalPlaceholder
      title="旅行偏好"
      description="详细偏好管理将在后续开放。"
    />
  );
}
