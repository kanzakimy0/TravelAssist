import type { Metadata } from "next";

import { PersonalHomePreview } from "@/features/personal-center/components/personal-home-preview";

export const metadata: Metadata = { title: "我的首页" };

export default function PersonalCenterPage() {
  return <PersonalHomePreview />;
}
