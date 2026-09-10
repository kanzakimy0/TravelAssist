import type { Metadata } from "next";
import { InformationPage } from "@/features/information/information-page";
export const metadata: Metadata = { title: "使用指南 · TravelAssist" };
export default function Page() {
  return <InformationPage page="help" />;
}
