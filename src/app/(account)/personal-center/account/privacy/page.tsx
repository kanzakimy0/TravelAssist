import type { Metadata } from "next";

import { AccountSubpage } from "@/features/profile/account-subpage";

export const metadata: Metadata = { title: "数据与隐私" };

export default function AccountPrivacyPage() {
  return (
    <AccountSubpage
      eyebrow="PRIVACY & DATA"
      title="数据与隐私"
      description="个人数据、导出与账户相关管理"
    />
  );
}
