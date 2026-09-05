import type { Metadata } from "next";
import { AccountSubpage } from "@/features/profile/components/account-entries";
export const metadata: Metadata = { title: "登录与安全" };
export default function Page() {
  return <AccountSubpage slug="security" />;
}
