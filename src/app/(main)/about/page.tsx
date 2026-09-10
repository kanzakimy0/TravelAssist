import type { Metadata } from "next";
import { InformationPage } from "@/features/information/information-page";
export const metadata: Metadata = { title: "关于与联系 · TravelAssist" };
export default function Page() {
  return <InformationPage page="about" />;
}
