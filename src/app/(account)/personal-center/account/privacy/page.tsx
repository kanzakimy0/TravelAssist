import type { Metadata } from "next";

import { AccountSubpage } from "@/features/profile/account-subpage";

export const metadata: Metadata = { title: "数据与隐私" };

export default function AccountPrivacyPage() {
  return <AccountSubpage kind="privacy" />;
}
