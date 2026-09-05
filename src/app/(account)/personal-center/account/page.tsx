import type { Metadata } from "next";

import { PersonalPlaceholder } from "@/features/personal-center/components/personal-placeholder";

export const metadata: Metadata = { title: "账户" };

export default function AccountPage() {
  return (
    <PersonalPlaceholder
      title="账户"
      description="个人资料与账户设置将在后续开放。"
    />
  );
}
