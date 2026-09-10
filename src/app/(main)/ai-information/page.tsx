import type { Metadata } from "next";
import { InformationPage } from "@/features/information/information-page";
export const metadata: Metadata = { title: "AI 与信息说明 · TravelAssist" };
export default function Page() {
  return <InformationPage page="ai-information" />;
}
