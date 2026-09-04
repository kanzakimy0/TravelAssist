import type { GeneratedPlan } from "./start-flow-draft";

export const GENERATED_PLANS: GeneratedPlan[] = [
  {
    id: "classic-balanced",
    name: "经典均衡",
    recommendation: "初次访日首选",
    tagline: "经典名所与街区散策恰到好处，第一次去也从容。",
    days: 7,
    locations: ["东京", "箱根", "京都", "大阪"],
    interests: ["历史文化", "美食", "城市探索"],
    attractionDensity: "丰富",
    movementIntensity: "适中",
    budgetLevel: "标准",
    imagePosition: "center 48%",
    route: {
      nodes: [
        { id: "tokyo", label: "东京", x: 238, y: 54 },
        { id: "hakone", label: "箱根", x: 203, y: 105 },
        { id: "kyoto", label: "京都", x: 111, y: 142 },
        { id: "osaka", label: "大阪", x: 72, y: 164 },
      ],
      segments: [
        { from: "tokyo", to: "hakone", mode: "train" },
        { from: "hakone", to: "kyoto", mode: "shinkansen" },
        { from: "kyoto", to: "osaka", mode: "train" },
      ],
    },
  },
  {
    id: "slow-depth",
    name: "深度慢游",
    recommendation: "体验感最佳",
    tagline: "把时间留给温泉、古都与海边小城，慢慢感受在地生活。",
    days: 8,
    locations: ["京都", "城崎", "直岛", "高松"],
    interests: ["温泉疗愈", "艺术展馆", "传统体验"],
    attractionDensity: "适中",
    movementIntensity: "舒缓",
    budgetLevel: "舒适",
    imagePosition: "left 44%",
    route: {
      nodes: [
        { id: "kyoto", label: "京都", x: 226, y: 48 },
        { id: "kinosaki", label: "城崎", x: 157, y: 76 },
        { id: "naoshima", label: "直岛", x: 102, y: 145 },
        { id: "takamatsu", label: "高松", x: 55, y: 166 },
      ],
      segments: [
        { from: "kyoto", to: "kinosaki", mode: "train" },
        { from: "kinosaki", to: "naoshima", mode: "drive" },
        { from: "naoshima", to: "takamatsu", mode: "ferry" },
      ],
    },
  },
  {
    id: "efficient-explorer",
    name: "高效探索",
    recommendation: "假期利用率最高",
    tagline: "串联南北代表城市，用高效交通换取更多地域体验。",
    days: 7,
    locations: ["札幌", "东京", "福冈", "长崎"],
    interests: ["美食", "摄影", "夜间体验"],
    attractionDensity: "充实",
    movementIntensity: "紧凑",
    budgetLevel: "舒适",
    imagePosition: "right 52%",
    route: {
      nodes: [
        { id: "sapporo", label: "札幌", x: 240, y: 40 },
        { id: "tokyo", label: "东京", x: 193, y: 91 },
        { id: "fukuoka", label: "福冈", x: 86, y: 144 },
        { id: "nagasaki", label: "长崎", x: 42, y: 173 },
      ],
      segments: [
        { from: "sapporo", to: "tokyo", mode: "flight" },
        { from: "tokyo", to: "fukuoka", mode: "flight" },
        { from: "fukuoka", to: "nagasaki", mode: "shinkansen" },
      ],
    },
  },
];
