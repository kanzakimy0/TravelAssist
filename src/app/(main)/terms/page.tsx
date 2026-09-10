import type { Metadata } from "next";
import { InformationPage } from "@/features/information/information-page";
export const metadata: Metadata = { title: "服务条款 · TravelAssist" };
export default function Page() {
  return <InformationPage page="terms" />;
}
