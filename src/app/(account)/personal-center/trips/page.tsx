import type { Metadata } from "next";

import { TripLibraryPage } from "@/features/trip-library/trip-library-page";

export const metadata: Metadata = { title: "我的旅行" };

// Frozen TASK-010-B navigation subset. WBS-5.10 renders these destinations
// through TripLibraryPage while real saved-trip persistence remains deferred.
export const task010BNavigationContract = {
  newTrip: { href: "/start?entry=step3", label: "开始新旅行" },
  currentPlan: { href: "/planner", label: "返回当前规划" },
  boundary: "真实保存行程列表尚未接入",
} as const;

export default function TripsPage() {
  return <TripLibraryPage />;
}
