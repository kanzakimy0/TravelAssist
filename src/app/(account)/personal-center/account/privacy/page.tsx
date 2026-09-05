import type { Metadata } from "next";
import { AccountSubpage } from "@/features/profile/components/account-entries";
export const metadata: Metadata = { title: "数据与隐私" };
export default function Page() {
  return <AccountSubpage slug="privacy" />;
}
