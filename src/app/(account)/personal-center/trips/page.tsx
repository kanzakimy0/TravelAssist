import type { Metadata } from "next";

import { PersonalPlaceholder } from "@/features/personal-center/components/personal-placeholder";

export const metadata: Metadata = { title: "我的旅行" };

export default function TripsPage() {
  return (
    <PersonalPlaceholder
      title="我的旅行"
      description="真实保存行程列表尚未接入。您可以开始新旅行，或返回当前示例规划。"
      actions={[
        { href: "/start?entry=step3", label: "开始新旅行" },
        { href: "/planner", label: "返回当前规划" },
      ]}
    />
  );
}
