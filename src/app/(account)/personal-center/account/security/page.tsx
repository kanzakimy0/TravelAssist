import type { Metadata } from "next";

import { AccountSubpage } from "@/features/profile/account-subpage";

export const metadata: Metadata = { title: "登录与安全" };

export default function AccountSecurityPage() {
  return <AccountSubpage kind="security" />;
}
