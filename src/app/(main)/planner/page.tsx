import { readHomeViewer } from "@/lib/auth/home-viewer.server";
import { Suspense } from "react";
import type { Metadata } from "next";
import { PlannerPage } from "@/features/planner/components/planner-page";

export const metadata: Metadata = {
  title: "旅行规划 · TravelAssist",
  description: "Planner 地图与行程工作区 · 本地示例预览",
};

export default async function Page() {
  const viewer = await readHomeViewer();
  const deployment = process.env.VERCEL_ENV?.trim().toLowerCase();
  const routeQueriesEnabled =
    process.env.NODE_ENV !== "production" &&
    deployment !== "preview" &&
    deployment !== "production" &&
    process.env.ROUTING_PLANNER_QUERY_ENABLED?.trim().toLowerCase() ===
      "true" &&
    process.env.ROUTING_PROVIDER_MODE?.trim() === "evaluation";
  return (
    <Suspense fallback={<main aria-busy="true">正在加载旅行工作区…</main>}>
      <PlannerPage routeQueriesEnabled={routeQueriesEnabled} viewer={viewer} />
    </Suspense>
  );
}
