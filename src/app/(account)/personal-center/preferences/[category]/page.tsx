import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AttractionActivityPreferencePage } from "@/features/preferences/attraction-activity-preference-page";
import { PreferenceCategoryPage } from "@/features/preferences/preference-category-page";
import { MobilityPreferencePage } from "@/features/preferences/mobility-preference-page";
import {
  createDefaultPreferenceState,
  getCategory,
  preferenceCategoryKeys,
  type CategoryKey,
} from "@/features/preferences/preference-model";

const routeKeys = [...preferenceCategoryKeys, "advanced"] as const;
type RouteKey = (typeof routeKeys)[number];

function isRouteKey(value: string): value is RouteKey {
  return routeKeys.includes(value as RouteKey);
}

export function generateStaticParams() {
  return routeKeys.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps<"/personal-center/preferences/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isRouteKey(category)) return { title: "旅行偏好" };
  const item = getCategory(createDefaultPreferenceState(), category);
  return { title: item?.title ?? "更多详细设置" };
}

export default async function PreferenceCategoryRoute({
  params,
}: PageProps<"/personal-center/preferences/[category]">) {
  const { category } = await params;
  if (!isRouteKey(category)) notFound();

  if (category === "mobility") return <MobilityPreferencePage />;
  if (category === "attractions") return <AttractionActivityPreferencePage />;

  return (
    <PreferenceCategoryPage
      categoryKey={
        category === "advanced" ? "advanced" : (category as CategoryKey)
      }
    />
  );
}
