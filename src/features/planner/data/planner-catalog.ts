import type { MockPlan } from "../model/planner-types";
import type {
  BookingOption,
  Coordinates,
  PlannerArea,
  PlannerPlace,
  PlaceType,
} from "../model/trip-model";

// Approximate, hand-authored Tokyo / Fuji / Hakone fixtures. Not a POI or route service.
const coordinates: Record<string, Coordinates> = {
  抵达羽田机场: [139.7798, 35.5494],
  返回羽田机场: [139.7798, 35.5494],
  浅草寺: [139.7966, 35.7148],
  浅草午餐: [139.795, 35.7105],
  东京晴空塔: [139.8107, 35.7101],
  银座散步: [139.765, 35.671],
  东京站区域酒店: [139.769, 35.681],
  东京站出发: [139.767, 35.681],
  河口湖湖畔: [138.755, 35.522],
  湖畔乡土午餐: [138.764, 35.508],
  富士急乐园: [138.7805, 35.4875],
  河口湖温泉旅馆: [138.772, 35.516],
  河口湖出发: [138.769, 35.499],
  箱根汤本: [139.103, 35.233],
  芦之湖游船: [139.025, 35.204],
  雕刻之森美术馆: [139.05, 35.244],
  东京国立博物馆: [139.776, 35.719],
  谷中老街: [139.766, 35.727],
  河口湖音乐森林: [138.763, 35.532],
  箱根玻璃之森: [139.018, 35.269],
  滨离宫庭园: [139.763, 35.66],
  筑地午餐: [139.772, 35.666],
  东京湾观景游船: [139.766, 35.649],
  丸之内咖啡时光: [139.763, 35.68],
  富士山观景露台: [138.777, 35.503],
  箱根温泉休憩: [139.103, 35.23],
};
export function mockBookingOptions(
  type: PlaceType,
  price: number,
): BookingOption[] {
  const channels =
    type === "hotel"
      ? ["官方", "Booking.com", "Agoda"]
      : type === "restaurant"
        ? ["官方", "TableCheck", "OpenTable"]
        : ["官方", "Klook", "GetYourGuide"];
  return channels.map((name, i) => ({
    providerId:
      name === "官方" ? "official" : name.toLowerCase().replace(/\W/g, ""),
    name,
    bookingMode: "redirect",
    price: price + i * 300,
    currency: "JPY",
    availabilityStatus: i === 2 ? "limited" : "unknown",
    cancellationSummary:
      i === 0
        ? "示例：前一日 18:00 前可取消；须以渠道条款为准"
        : "示例：部分退款，需再次核对",
    official: i === 0,
    affiliate: i === 2,
    lastCheckedAt: "2026-09-05T00:00:00Z",
  }));
}
function place(
  id: string,
  name: string,
  type: PlaceType,
  city: string,
  point: Coordinates,
  tags: string[] = [],
): PlannerPlace {
  const price = type === "hotel" ? 18000 : type === "restaurant" ? 4500 : 2100;
  return {
    id,
    name,
    type,
    city,
    coordinates: point,
    image: type,
    duration: type === "hotel" ? 30 : type === "restaurant" ? 60 : 90,
    hours:
      type === "hotel"
        ? "示例：15:00 入住 / 10:00 退房"
        : type === "restaurant"
          ? "示例：11:00–14:00 / 17:00–21:00"
          : "示例：09:00–18:00；实际开放待核对",
    why:
      type === "hotel"
        ? "邻近当天终点与次日出发枢纽，减少携带行李折返"
        : type === "restaurant"
          ? "安排在前后景点之间的用餐区域，适合当地美食偏好"
          : "结合经典地标与摄影偏好，适合两位成人按轻松节奏停留",
    advice:
      type === "hotel"
        ? "选择双床房；早餐、停车位与行李寄存需向酒店确认；无障碍客房请提前预约"
        : type === "restaurant"
          ? "建议选择当季定食；预留约一小时，过敏原与儿童座椅需事先询问"
          : "上午光线柔和；预留步行与休息时间，雨天优先考虑室内部分",
    tags: tags.length
      ? tags
      : type === "hotel"
        ? ["舒适型 · 示例", "双床房", "行李寄存", "亲子 / 无障碍待确认"]
        : type === "restaurant"
          ? ["日式定食", "约 ¥4,500 / 人", "排队示例 15–30 分", "过敏原需确认"]
          : ["摄影", "经典地标", "步行可达"],
    price,
    bookingRequired: type !== "transport",
    structural: name.includes("机场"),
    providerIds: { mock: `fixture:${id}` },
    bookingOptions: mockBookingOptions(type, price),
  };
}
export function makePlannerCatalog(plans: MockPlan[]) {
  const places: PlannerPlace[] = [];
  for (const plan of plans)
    for (const day of plan.days)
      for (const stop of day.stops) {
        if (places.some((p) => p.name === stop.name)) continue;
        const type: PlaceType = (
          {
            sight: "attraction",
            booking: "activity",
            stay: "hotel",
            food: "restaurant",
            transport: "transport",
          } as const
        )[stop.kind];
        const city = day.day === 1 ? "东京" : day.day === 2 ? "河口湖" : "箱根";
        places.push(
          place(
            `place-${places.length + 1}`,
            stop.name,
            type,
            city,
            coordinates[stop.name],
          ),
        );
      }
  const areas: PlannerArea[] = [];
  const fixtures: {
    city: string;
    center: Coordinates;
    hotels: string[];
    foods: string[];
    alternatives: string[];
  }[] = [
    {
      city: "东京",
      center: [139.771, 35.681],
      hotels: ["丸之内花庭酒店", "八重洲旅人之家", "东京站暖灯旅舍"],
      foods: ["丸之内季节食堂", "日本桥和食小院", "八重洲炭火厨房"],
      alternatives: ["上野公园备选", "日本桥室内展馆", "隅田川摄影步道"],
    },
    {
      city: "河口湖",
      center: [138.767, 35.51],
      hotels: ["湖畔樱庭旅馆", "富士山慢居", "河口湖站前小宿"],
      foods: ["湖畔馎饦食堂", "富士乡土小馆", "南岸季节厨房"],
      alternatives: ["湖畔室内艺廊", "北岸摄影步道", "富士山文化展馆"],
    },
    {
      city: "箱根",
      center: [139.047, 35.245],
      hotels: ["箱根山灯旅馆", "强罗花庭小宿", "汤本温泉别邸"],
      foods: ["强罗山麓食堂", "箱根豆腐小院", "汤本乡土厨房"],
      alternatives: ["强罗公园备选", "箱根室内艺廊", "汤本街区漫步"],
    },
  ];
  fixtures.forEach((fixture, index) => {
    for (const [type, names] of [
      ["hotelArea", fixture.hotels],
      ["foodArea", fixture.foods],
    ] as const) {
      const center: Coordinates = [
        fixture.center[0] + (type === "foodArea" ? 0.025 : 0),
        fixture.center[1],
      ];
      const ids = names.map((name, i) => {
        const id = `${type}-${index + 1}-${i + 1}`;
        places.push(
          place(
            id,
            name,
            type === "hotelArea" ? "hotel" : "restaurant",
            fixture.city,
            [center[0] + (i - 1) * 0.004, center[1] + (i % 2) * 0.003],
          ),
        );
        return id;
      });
      const [x, y] = center;
      areas.push({
        id: `${type}-${index + 1}`,
        name: `${fixture.city}${type === "hotelArea" ? "枢纽住宿区" : "顺路餐饮区"}`,
        type,
        city: fixture.city,
        day: index + 1,
        coordinates: center,
        polygon: [
          [x - 0.009, y - 0.006],
          [x + 0.011, y - 0.004],
          [x + 0.008, y + 0.008],
          [x - 0.008, y + 0.007],
          [x - 0.009, y - 0.006],
        ],
        recommendationIds: ids,
        reason:
          type === "hotelArea"
            ? `适合 Day ${index + 1} 过夜；连接当天最后一站与次日移动，夜间有餐饮选择。`
            : `适合 Day ${index + 1} 午餐或晚餐；从前一景点顺路进入，餐后可继续当天路线。`,
        tradeoff:
          type === "hotelArea"
            ? "优点：枢纽便捷；不足：临路房可能较吵，价格略高。更换区域可能增加次日转乘。"
            : "日式定食 / 乡土料理为主；热门时段需排队，建议预约。区域外选择可能增加绕路。",
        access:
          "示例：步行至车站约 8–12 分；前后节点移动约 15–25 分，尚未调用路线 API",
        price:
          type === "hotelArea"
            ? "示例 ¥15,000–25,000 / 房 / 晚"
            : "示例 ¥2,000–6,000 / 人",
      });
    }
    fixture.alternatives.forEach((name, i) =>
      places.push(
        place(
          `alternative-${index + 1}-${i + 1}`,
          name,
          "attraction",
          fixture.city,
          [
            fixture.center[0] - 0.018 + i * 0.021,
            fixture.center[1] + 0.019 + (i % 2) * 0.007,
          ],
          [i === 1 ? "雨天室内" : "附近备选", "未加入行程"],
        ),
      ),
    );
  });
  return { places, areas };
}
