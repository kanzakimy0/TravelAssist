import type { Metadata } from "next";
import { PlannerPage } from "@/features/planner/components/planner-page";

export const metadata: Metadata = {
  title: "旅行规划 · TravelAssist",
  description: "Planner 地图与行程工作区 · 本地示例预览",
};

export default function Page() {
  return <PlannerPage />;
}
