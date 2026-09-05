import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PersonalCenterShell } from "@/features/personal-center/components/personal-center-shell";

export const metadata: Metadata = {
  title: { default: "个人中心 · TravelAssist", template: "%s · TravelAssist" },
  description: "你的旅行、偏好与个人空间。",
};

export default function PersonalCenterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PersonalCenterShell>{children}</PersonalCenterShell>;
}
