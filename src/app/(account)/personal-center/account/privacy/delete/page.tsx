import type { Metadata } from "next";

import { AccountSubpage } from "@/features/profile/account-subpage";

export const metadata: Metadata = { title: "删除账户" };

export default function DeleteAccountPage() {
  return <AccountSubpage kind="deleteAccount" />;
}
