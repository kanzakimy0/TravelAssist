import type { Metadata } from "next";

import { PersonalPlaceholder } from "@/features/personal-center/components/personal-placeholder";

export const metadata: Metadata = { title: "我的旅行" };

export default function TripsPage() {
  return (
    <PersonalPlaceholder
      title="我的旅行"
      description="保存、规划中、已完成与收藏的旅行管理将在后续开放。"
    />
  );
}
