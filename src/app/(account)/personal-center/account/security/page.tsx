import type { Metadata } from "next";

import { AccountSubpage } from "@/features/profile/account-subpage";

export const metadata: Metadata = { title: "登录与安全" };

export default function AccountSecurityPage() {
  return (
    <AccountSubpage
      eyebrow="ACCOUNT SECURITY"
      title="登录与安全"
      description="密码、手机、邮箱、登录方式与账户安全"
    />
  );
}
