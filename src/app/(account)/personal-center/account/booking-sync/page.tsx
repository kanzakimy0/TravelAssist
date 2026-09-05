import type { Metadata } from "next";
import { AccountSubpage } from "@/features/profile/components/account-entries";
export const metadata: Metadata = { title: "预订与账户同步" };
export default function Page() {
  return <AccountSubpage slug="booking-sync" />;
}
