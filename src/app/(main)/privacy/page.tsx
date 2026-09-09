import type { Metadata } from "next";
import { InformationPage } from "@/features/information/information-page";
export const metadata: Metadata = { title: "隐私政策 · TravelAssist" };
export default function Page() {
  return <InformationPage page="privacy" />;
}
