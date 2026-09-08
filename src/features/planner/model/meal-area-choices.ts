import { currentPlan, type TripState } from "./trip-model";

// Planning regions derived from existing itinerary anchors, not queried POIs.
export function mealAreaChoices(state: TripState, day: number, hotel: boolean) {
  const plan = currentPlan(state),
    region = state.areas.find(
      (a) => a.day === day && a.type === (hotel ? "hotelArea" : "foodArea"),
    );
  const sights = plan.items.filter(
    (i) =>
      i.day === day &&
      ["attraction", "activity"].includes(i.type) &&
      !i.planningPlaceholder,
  );
  const anchors = [sights[0], sights.at(-1)].filter(
    (i, index, all) =>
      i && all.findIndex((x) => x?.placeId === i.placeId) === index,
  );
  const choices = anchors.map((item, index) => ({
    id: item!.placeId,
    label: `${item!.title}周边`,
    level: "quick" as const,
    reason: hotel
      ? `${index === 0 ? "靠近当天起点，适合早出发" : "靠近当天后段，减少晚间折返"}；选住宿前需核对次日交通、噪音与价格。`
      : `${index === 0 ? "结合当天首站安排用餐" : "结合后半段景点安排用餐"}，优先步行可达区域；实际营业时间、餐厅与座位尚未查询。`,
  }));
  return region
    ? [
        ...choices,
        {
          id: region.id,
          label: region.name,
          level: "area" as const,
          reason: `${region.reason} ${region.tradeoff}`,
        },
      ].slice(0, 3)
    : choices;
}
