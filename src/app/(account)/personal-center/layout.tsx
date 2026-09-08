import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PersonalCenterShell } from "@/features/personal-center/components/personal-center-shell";
import { verifyPersonalAccess } from "@/features/auth/personal-access";
import { AuthUnavailable } from "@/features/auth/auth-page";

export const metadata: Metadata = {
  title: { default: "个人中心 · TravelAssist", template: "%s · TravelAssist" },
  description: "你的旅行、偏好与个人空间。",
};

export default async function PersonalCenterLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await verifyPersonalAccess();
  if (!session.ok) return <AuthUnavailable />;
  return <PersonalCenterShell>{children}</PersonalCenterShell>;
}
