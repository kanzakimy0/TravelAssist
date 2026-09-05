import type {
  MockDay,
  MockPlan,
  MockStop,
  PlannerSettings,
} from "../model/planner-types";

const stop = (
  id: string,
  name: string,
  time: string,
  x: number,
  y: number,
  kind: MockStop["kind"],
  duration: string,
  next?: string,
  fixed?: boolean,
): MockStop => ({ id, name, time, x, y, kind, duration, next, fixed });
const days: MockDay[] = [
  {
    day: 1,
    date: "4月10日",
    title: "东京 · 城市初见",
    color: "#b95849",
    stops: [
      stop(
        "arrival",
        "抵达羽田机场",
        "08:30",
        850,
        390,
        "transport",
        "入境 60 分",
        "电车 · 50 分",
      ),
      stop(
        "asakusa",
        "浅草寺",
        "10:00",
        760,
        130,
        "sight",
        "游览 90 分",
        "步行 · 10 分",
      ),
      stop(
        "lunch",
        "浅草午餐",
        "12:30",
        850,
        175,
        "food",
        "用餐 60 分",
        "电车 · 15 分",
      ),
      stop(
        "skytree",
        "东京晴空塔",
        "14:00",
        875,
        260,
        "booking",
        "观景 90 分",
        "电车 · 35 分",
        true,
      ),
      stop(
        "ginza",
        "银座散步",
        "17:00",
        760,
        310,
        "sight",
        "漫步与晚餐",
        "电车 · 15 分",
      ),
      stop(
        "tokyo-hotel",
        "东京站区域酒店",
        "20:00",
        685,
        225,
        "stay",
        "入住 · 示例",
      ),
    ],
    movement: [
      "电车为主 · 约 2 小时 05 分 / 46 km",
      "机场至浅草：京急 / 都营浅草线 · 1 次换乘",
      "步行约 5 km；可用 IC 卡，费用为示例估算",
    ],
    booking: [
      "14:00 晴空塔展望台 · 示例已预约",
      "请提前 15 分钟报到 · 门票约 ¥2,100",
      "东京地铁通票：待确认；本页不提供购买",
    ],
    weather: [
      "示例天气：晴间多云 · 15–22°C",
      "日出 05:15 / 日落 18:10（非实时）",
      "雨天备选：将银座户外散步改为室内展馆",
    ],
    stayFood: [
      "住宿：东京站区域 · 20:00 入住 / 次日 08:00 退房",
      "午餐：浅草日式定食 · ¥1,500 / 人 · 未预约",
      "晚餐：银座区域 · 与当天电车路线衔接",
    ],
    details: [
      "区域：东京都台东区浅草；游览时段 10:00–11:30",
      "当日费用约 ¥12,000 / 人（不含住宿）；联系信息未接入",
      "所有时间、票务、天气均为示例，请勿用于真实出行；AI 说明尚未接入",
    ],
  },
  {
    day: 2,
    date: "4月11日",
    title: "河口湖 · 富士山之约",
    color: "#6e7d98",
    stops: [
      stop(
        "departure",
        "东京站出发",
        "08:00",
        685,
        225,
        "transport",
        "乘车 120 分",
        "巴士 · 120 分",
      ),
      stop(
        "lake",
        "河口湖湖畔",
        "10:00",
        305,
        165,
        "sight",
        "散步 90 分",
        "步行 · 15 分",
      ),
      stop(
        "lake-lunch",
        "湖畔乡土午餐",
        "12:00",
        230,
        225,
        "food",
        "用餐 60 分",
        "巴士 · 25 分",
      ),
      stop(
        "fujiq",
        "富士急乐园",
        "14:00",
        390,
        255,
        "booking",
        "体验 180 分",
        "接驳 · 20 分",
        true,
      ),
      stop("onsen", "河口湖温泉旅馆", "18:00", 280, 320, "stay", "入住与晚餐"),
    ],
    movement: [
      "高速巴士 + 当地接驳 · 约 3 小时 / 125 km",
      "东京至河口湖约 120 分 · 直达示例",
      "步行约 3 km；大件行李可寄存车站",
    ],
    booking: [
      "14:00 富士急乐园 · 示例待确认",
      "当日票价约 ¥6,000；入园前预留 20 分钟",
      "温泉旅馆晚餐 18:30 · 示例固定安排",
    ],
    weather: [
      "示例天气：晴 · 9–18°C",
      "日出 05:20 / 日落 18:15（非实时）",
      "雨天备选：河口湖音乐森林室内展馆；山景能见度不保证",
    ],
    stayFood: [
      "住宿：河口湖南岸 · 18:00 入住 / 次日 09:00 退房",
      "午餐：乡土馎饦面 · ¥1,800 / 人 · 未预约",
      "晚餐：旅馆会席 · 示例已含住宿餐",
    ],
    details: [
      "区域：山梨县富士河口湖町；湖畔停留 10:00–11:30",
      "预算约 ¥18,000 / 人；山区温差大，请带外套",
      "巴士与乐园时段为布局示例，非真实班次；联系信息 / AI 未接入",
    ],
  },
  {
    day: 3,
    date: "4月12日",
    title: "箱根 · 山与湖的余韵",
    color: "#a87d49",
    stops: [
      stop(
        "lake-departure",
        "河口湖出发",
        "09:00",
        280,
        320,
        "transport",
        "乘车 90 分",
        "巴士 · 90 分",
      ),
      stop(
        "hakone",
        "箱根汤本",
        "10:30",
        610,
        365,
        "sight",
        "漫步 60 分",
        "巴士 · 35 分",
      ),
      stop(
        "ashi",
        "芦之湖游船",
        "12:00",
        510,
        450,
        "booking",
        "乘船与午餐",
        "巴士 · 30 分",
        true,
      ),
      stop(
        "museum",
        "雕刻之森美术馆",
        "14:30",
        660,
        460,
        "sight",
        "游览 90 分",
        "电车 · 120 分",
      ),
      stop(
        "return",
        "返回羽田机场",
        "18:00",
        850,
        390,
        "transport",
        "结束示例旅行",
      ),
    ],
    movement: [
      "巴士 + 游船 + 电车 · 约 4 小时 / 150 km",
      "箱根至机场：小田原换乘 · 示例 2 次换乘",
      "步行约 3.5 km；游船受天气影响",
    ],
    booking: [
      "12:00 芦之湖游船 · 示例待确认",
      "建议提前 20 分钟到码头 · 票价约 ¥1,200",
      "返程机票：未接入，请自行核对实际航班",
    ],
    weather: [
      "示例天气：多云 · 10–19°C",
      "日出 05:20 / 日落 18:15（非实时）",
      "大风备选：取消游船，停留室内美术馆",
    ],
    stayFood: [
      "住宿：当天返程，无新增住宿",
      "午餐：芦之湖码头区域 · ¥2,000 / 人",
      "晚餐：机场内自选 · 未预约",
    ],
    details: [
      "区域：神奈川县箱根町；美术馆示例时段 14:30–16:00",
      "费用约 ¥13,000 / 人；预留机场报到时间",
      "营业时间、联系方式、AI 建议均需后续 Provider 校验",
    ],
  },
];

function variant(
  id: string,
  name: string,
  summary: string,
  replacements: Record<string, Partial<MockStop>>,
  titles: string[],
): MockPlan {
  return {
    id,
    name,
    summary,
    days: days.map((day, index) => ({
      ...day,
      title: titles[index],
      stops: day.stops.map((item) => ({
        ...item,
        ...replacements[item.id],
        id: `${id}-${item.id}`,
      })),
      details: [`${name} · ${summary}`, ...day.details],
    })),
  };
}

export const plannerMockPlans: MockPlan[] = [
  variant(
    "classic",
    "东京·富士山经典之旅",
    "经典地标 · 山湖风景 · 适中节奏",
    {},
    days.map((day) => day.title),
  ),
  variant(
    "depth",
    "深度体验之旅",
    "街区文化 · 美术馆 · 留白更多",
    {
      skytree: { name: "东京国立博物馆", x: 705, y: 115, kind: "booking" },
      ginza: { name: "谷中老街", x: 625, y: 160 },
      fujiq: {
        name: "河口湖音乐森林",
        x: 190,
        y: 120,
        duration: "展馆 180 分",
      },
      ashi: { name: "箱根玻璃之森", x: 505, y: 380 },
    },
    ["东京 · 街巷与文博", "河口湖 · 湖畔艺术", "箱根 · 艺术漫游"],
  ),
  variant(
    "relax",
    "轻松休闲之旅",
    "湖畔休憩 · 温泉 · 少走一点",
    {
      asakusa: { name: "滨离宫庭园", x: 750, y: 350 },
      lunch: { name: "筑地午餐", x: 830, y: 310 },
      skytree: { name: "东京湾观景游船", x: 905, y: 360 },
      ginza: { name: "丸之内咖啡时光", x: 655, y: 275, kind: "food" },
      fujiq: {
        name: "富士山观景露台",
        x: 350,
        y: 360,
        kind: "sight",
        duration: "观景与茶歇",
      },
      museum: { name: "箱根温泉休憩", x: 610, y: 410, duration: "休息 90 分" },
    },
    ["东京 · 海风与庭园", "河口湖 · 富士山慢时光", "箱根 · 温泉休憩"],
  ),
];

// Derived alternative summaries stay with the same plan's stops, never a parallel itinerary.
for (const plan of plannerMockPlans.slice(1)) {
  for (const day of plan.days) {
    day.booking = day.stops
      .filter((item) => item.fixed)
      .map(
        (item) => `${item.time} ${item.name} · 示例待确认 · 提前 15 分钟到场`,
      );
    day.stayFood = day.stops
      .filter((item) => item.kind === "stay" || item.kind === "food")
      .map(
        (item) => `${item.time} ${item.name} · ${item.duration} · 示例未下单`,
      );
    if (!day.stayFood.length) {
      day.stayFood = [
        "当天返程，无新增住宿",
        `午餐：${day.title.split(" · ")[0]}当地餐饮 · 未预约`,
        "晚餐：机场内自选 · 示例未下单",
      ];
    }
    day.details = [
      `${plan.name} · ${day.title}`,
      `地点顺序：${day.stops.map((item) => item.name).join(" → ")}`,
      "费用约 ¥12,000–18,000 / 人；营业时间、地址、联系方式及 AI 说明尚未接入，请勿用于真实出行",
    ];
    day.weather = [
      day.weather[0],
      day.weather[1],
      `雨天备选：${plan.id === "depth" ? "延长室内展馆停留" : "增加咖啡馆与温泉休息"}（示例）`,
    ];
    day.movement = [
      `${day.title} · ${plan.id === "depth" ? "公共交通 + 街区步行" : "接驳优先，减少步行"}`,
      "约 2–4 小时 / 天 · 80–140 km · 示例估算",
      "换乘 1–2 次；步行约 2–4 km，未调用路线计算",
    ];
  }
}

export const initialPlannerSettings: PlannerSettings = {
  travelers: "2 位成人",
  startDate: "2027-04-10",
  sights: "自然风光 · 经典地标",
  food: "当地美食 · 日料",
  stay: "舒适型 · 靠近车站",
  budget: "中等预算",
  pace: "偏轻松",
  movement: "公共交通优先",
  timing: "09:00–20:00",
  queues: "避开长队",
  photography: "日落与湖景",
  bookings: "保留已预约活动",
  needs: "暂无特殊需求",
  luggage: "随身小件",
  weather: "保留雨天备选",
  constraints: "保留固定时段",
  filters: "暂不额外筛选",
};
