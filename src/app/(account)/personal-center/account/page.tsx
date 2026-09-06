import type { Metadata } from "next";

import { ProfileAccount } from "@/features/profile/profile-account";

export const metadata: Metadata = { title: "账户" };

export default function AccountPage() {
  return <ProfileAccount />;
}
