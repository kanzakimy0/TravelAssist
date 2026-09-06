import type { Metadata } from "next";

import { AccountSubpage } from "@/features/profile/account-subpage";

export const metadata: Metadata = { title: "预订与账户同步" };

export default function BookingSyncPage() {
  return (
    <AccountSubpage
      eyebrow="BOOKING SYNC"
      title="预订与账户同步"
      description="Booking、确认邮件与外部预订同步"
    />
  );
}
