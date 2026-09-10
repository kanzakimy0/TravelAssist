import { currentPlan, type MealSlot, type TripState } from "./trip-model";
import { routineSlotFor, timelineMinute } from "./planner-timeline";

/** Rank existing route anchors separately for each meal; never invent POIs or availability. */
export function mealAreaChoices(
  state: TripState,
  day: number,
  slot: MealSlot | "hotel" | boolean,
) {
  const kind = typeof slot === "boolean" ? (slot ? "hotel" : "lunch") : slot;
  const hotel = kind === "hotel";
  const plan = currentPlan(state);
  const region = state.areas.find(
    (a) => a.day === day && a.type === (hotel ? "hotelArea" : "foodArea"),
  );
  const items = plan.items.filter(
    (i) => i.day === day && !i.planningPlaceholder,
  );
  const sights = items
    .filter((i) => ["attraction", "activity"].includes(i.type))
    .sort((a, b) => timelineMinute(a.startTime) - timelineMinute(b.startTime));
  const meal = items.find(
    (i) => routineSlotFor(i) === kind && i.type === "restaurant",
  );
  const target = meal
    ? timelineMinute(meal.startTime)
    : { breakfast: 420, lunch: 720, dinner: 1080, hotel: 1200 }[kind];
  const nearest = [...sights].sort(
    (a, b) =>
      Math.abs(timelineMinute(a.startTime) - target) -
      Math.abs(timelineMinute(b.startTime) - target),
  );
  const ordered =
    kind === "breakfast"
      ? [
          items.find((i) => i.planningSlot === "departure"),
          sights[0],
          ...nearest,
        ]
      : kind === "dinner" || hotel
        ? [sights.at(-1), items.find((i) => i.type === "hotel"), ...nearest]
        : nearest;
  const anchors = ordered
    .filter(
      (item, index, all) =>
        item && all.findIndex((i) => i?.placeId === item.placeId) === index,
    )
    .slice(0, 2);
  const label = {
    breakfast: "早餐",
    lunch: "午餐",
    dinner: "晚餐",
    hotel: "住宿",
  }[kind];
  const purpose = {
    breakfast: "结合出发住宿与首站，减少早晨绕路；优先核对早餐营业时间",
    lunch: "结合午间所在路段，优先步行可达、便于衔接下午行程的区域",
    dinner: "结合当天后段与回酒店方向，减少晚间折返；核对晚间营业与返程交通",
    hotel: "结合当天后段与次日出发，核对交通、噪音与住宿价格",
  }[kind];
  const choices = anchors.flatMap((item) =>
    item
      ? [
          {
            id: item.placeId,
            label: `${item.title}周边`,
            level: "quick" as const,
            reason: `${label}建议：${purpose}。依据当前路线排序，未查询实时营业、座位或库存。`,
          },
        ]
      : [],
  );
  return region
    ? [
        ...choices,
        {
          id: region.id,
          label: region.name,
          level: "area" as const,
          reason: `${label}备选区域：${purpose}。${region.reason} ${region.tradeoff}`,
        },
      ].slice(0, 3)
    : choices;
}
