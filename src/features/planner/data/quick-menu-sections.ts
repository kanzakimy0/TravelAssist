export type QuickPreferenceGroup = "sights" | "food" | "stay";
type Section = { title: string; keys: string[] };
type MenuSections = {
  description: string;
  quick: Section[];
  details: Section[];
};

// Presentation groups only. Labels remain the existing TripState keys and
// free-form values are preserved, rather than inventing a new preference schema.
export const quickMenuSections: Record<QuickPreferenceGroup, MenuSections> = {
  sights: {
    description: "挑选想遇见的风景，也给旅途留一点惊喜。",
    quick: [
      {
        title: "风景与文化",
        keys: ["自然风光", "历史文化", "城市探索", "经典地标", "博物馆 / 展览"],
      },
      {
        title: "体验与灵感",
        keys: [
          "摄影",
          "亲子",
          "购物",
          "展望台 / 夜景",
          "温泉",
          "徒步",
          "主题乐园 / 水族馆",
          "当地体验",
        ],
      },
    ],
    details: [
      {
        title: "想去与避开",
        keys: ["必去", "绝对不去", "避开人群", "网红地点", "本地感"],
      },
      {
        title: "光线与环境",
        keys: [
          "摄影优先",
          "日出 / 日落",
          "夜景",
          "室内优先",
          "室外优先",
          "雨天友好",
        ],
      },
      {
        title: "节奏与体验",
        keys: [
          "排队容忍时间",
          "预约型活动",
          "儿童友好",
          "徒步强度",
          "单景点最大停留",
          "自由探索比例",
        ],
      },
    ],
  },
  food: {
    description: "从当地的一餐开始，找到合口味的旅行。",
    quick: [
      {
        title: "想吃什么",
        keys: ["当地料理", "日料", "海鲜", "拉面", "烧肉 / 和牛", "小吃"],
      },
      {
        title: "用餐时光",
        keys: ["居酒屋", "咖啡", "甜品", "高级餐厅", "快速简餐", "夜宵"],
      },
    ],
    details: [
      {
        title: "时间与预算",
        keys: [
          "早餐需求",
          "午餐时间",
          "晚餐时间",
          "每餐预算",
          "正式用餐 / 快速用餐",
          "可接受排队时间",
        ],
      },
      {
        title: "饮食与照顾",
        keys: ["素食", "清真", "无猪肉", "过敏 / 忌口", "儿童餐"],
      },
      {
        title: "用餐体验",
        keys: [
          "需要预约优先",
          "网红店 / 本地店倾向",
          "景观餐厅",
          "深夜营业",
          "不重复料理类型",
          "是否接受便利店 / 简食作为赶路餐",
        ],
      },
    ],
  },
  stay: {
    description: "选一处舒服的落脚点，让每天从容开始。",
    quick: [
      {
        title: "住宿取向",
        keys: ["经济型", "舒适型", "高级型", "温泉酒店", "亲子友好", "大房间"],
      },
      {
        title: "位置与感受",
        keys: ["靠近车站", "安静", "景观", "可停车", "少换酒店", "连住优先"],
      },
    ],
    details: [
      {
        title: "房间与预算",
        keys: [
          "每晚预算",
          "酒店星级",
          "床型",
          "房间数量",
          "独立卫浴",
          "景观房",
          "是否接受民宿",
        ],
      },
      {
        title: "设施与照顾",
        keys: [
          "早餐",
          "停车",
          "行李寄存",
          "洗衣",
          "电梯",
          "无障碍",
          "婴儿床",
          "温泉 / 大浴场",
        ],
      },
      {
        title: "入住与移动",
        keys: [
          "入住时间",
          "退房时间",
          "是否接受换酒店",
          "到车站最大步行时间",
          "到每日第一站 / 最后一站便利度权重",
        ],
      },
    ],
  },
};

export function detailCompletion(
  group: QuickPreferenceGroup,
  values: Record<string, string>,
) {
  return quickMenuSections[group].details
    .flatMap((section) => section.keys)
    .filter((key) => values[key]?.trim()).length;
}
