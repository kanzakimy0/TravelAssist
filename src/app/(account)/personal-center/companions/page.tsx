import type { Metadata } from "next";

import { PersonalPlaceholder } from "@/features/personal-center/components/personal-placeholder";

export const metadata: Metadata = { title: "同行人" };

export default function CompanionsPage() {
  return (
    <PersonalPlaceholder
      title="同行人"
      description="同行人资料与旅行需求管理将在后续开放。"
    />
  );
}
