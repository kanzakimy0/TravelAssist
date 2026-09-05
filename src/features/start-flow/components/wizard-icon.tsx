import type { Interest } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const PATHS = {
  mountain: "M2 20 9 7l4 7 3-5 6 11H2ZM6.5 11.5 9 14l2.5-2.5",
  torii: "M3 5c6 2 12 2 18 0M4 10h16M7 6v15M17 6v15M5 21h4M15 21h4M12 7v3",
  cutlery: "M5 3v7c0 3 6 3 6 0V3M8 3v18M16 3v9h4M20 3v18",
  camera:
    "M3 7h4l2-3h6l2 3h4v13H3V7ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM18 10h.01",
  onsen:
    "M3 14c-3 8 21 8 18 0M7 15c-4-4 4-5 0-10M12 15c-4-4 4-5 0-10M17 15c-4-4 4-5 0-10",
  art: "M3 4h18v16H3V4ZM6 17l4-6 3 4 2-3 3 5M16 8h.01",
  game: "M7 7h10c4 0 7 13 3 13l-5-4H9l-5 4C0 20 3 7 7 7ZM5 11h6M8 8v6M16 11h.01M19 13h.01",
  bag: "M4 7h16l1 14H3L4 7ZM8 9V6a4 4 0 0 1 8 0v3",
  city: "M2 21h20M4 21V9h6v12M10 21V3h7v18M17 12h4v9M13 6h1M13 10h1M13 14h1M6 12h1M6 16h1",
  hiking: "M3 21 9 9l4 7 3-5 5 10M12 3h.01M12 6l-3 4 5 2 1 5M18 7v12",
  moon: "M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10ZM18 3v4M16 5h4",
  people:
    "M10 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM20 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 21v-5a5 5 0 0 1 10 0v5M14 14a5 5 0 0 1 8 4v3",
  tea: "M4 10h12v5a6 6 0 0 1-12 0v-5ZM16 10h2a3 3 0 0 1 0 6h-2M3 22h16M7 7c-3-3 3-3 0-6M12 7c-3-3 3-3 0-6",
  castle:
    "M3 21V7l3-3 3 3v14M15 21V7l3-3 3 3v14M9 11h6M2 21h20M10 21v-5h4v5M6 4V1M18 4V1",
  house: "M2 11 12 3l10 8M5 9v12h14V9M10 21v-7h4v7",
  blossom:
    "M12 9C5-2 0 9 9 12-2 19 9 24 12 15c7 11 12 0 3-3C26 5 15 0 12 9ZM12 12h.01",
  tower: "M12 2v3M10 5h4M11 5 6 21M13 5l5 16M5 21h14M8 13h8M7 17h10M9 9h6",
  snow: "M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M17 19l-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1",
  waves:
    "M2 7c4-5 6 5 10 0s6 5 10 0M2 12c4-5 6 5 10 0s6 5 10 0M2 17c4-5 6 5 10 0s6 5 10 0",
  map: "M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16",
  sparkle: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z",
  train:
    "M5 16V5c0-4 14-4 14 0v11H5ZM5 10h14M12 3v7M7 14h.01M17 14h.01M8 16l-3 6M16 16l3 6M7 20h10",
  car: "M3 18V11l3-6h12l3 6v7H3ZM3 11h18M6 18v3M18 18v3M6 14h.01M18 14h.01",
  interchange: "M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4",
  coin: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 7l4 5 4-5M8 12h8M8 15h8M12 12v6",
  balance: "M12 3v18M7 21h10M3 7h18M6 7l-4 7h8L6 7ZM18 7l-4 7h8l-4-7Z",
  comfort:
    "M4 12V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5M4 12H2v7h20v-7h-2M4 12v4h16v-4M5 19v3M19 19v3",
  diamond: "m3 8 4-5h10l4 5-9 13L3 8ZM3 8h18M7 3l5 18 5-18",
  calendar:
    "M3 5h18v16H3V5ZM7 2v6M17 2v6M3 10h18M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01",
  tokyoTower:
    "M12 1v4M10 5h4M11 5 5 22M13 5l6 17M4 22h16M8 13h8M7 17h10M9 9h6M9 13l7 4M15 13l-7 4M9 22l3-5 3 5",
  dotonbori:
    "M2 21c3-2 5 2 8 0s5 2 12 0M3 15h18M5 15v3M19 15v3M6 15c3-4 9-4 12 0M2 12V5h5v6M3.5 7h2M9 10V2h7v9M11 4h3M11 6l2 2 2-2M19 12V4h3v9M20 7h1",
  sapporoClockTower:
    "M2 21h20M4 21V12h16v9M2 12l5-4h3M14 8h3l5 4M9 10V5h6v5M8 5l4-4 4 4M13.5 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M12 6.5v1h1M7 15v3M17 15v3M10 21v-6h4v6",
  inariTorii:
    "M2 4c6 2 14 2 20 0M3 8h18M6 5v17M18 5v17M4 22h4M16 22h4M9 11h6M10 12v9M14 12v9M10 15h4M12 6v2",
  shirakawaGo:
    "M2 16 10 2l6 14M5 16v6h9v-6M4 16 10 5l4 8M10 2l12 14h-6M14 16v6h6v-6M3 22h18M8 22v-5h3v5M10 9v3M17 17v2",
  sakurajima:
    "M2 19 8 10l3 2 3-3 8 10M2 22c4-2 6 2 10 0s6 2 10 0M8 10l6-1M11 7c-3-3 3-3 0-6M16 7c-2-2 2-3 0-5M6 17l2-2M16 15l2 2",
  shuriCastle:
    "M2 21h20M4 21v-7h16v7M2 14c4 0 7-3 10-5 3 2 6 5 10 5M5 9c3 0 5-2 7-5 2 3 4 5 7 5M7 9v3M17 9v3M5 17h14M8 21v-4M16 21v-4M11 21v-4M13 21v-4M10 3h4",
  japanPlus:
    "m17 2 5 2-2 4-4-1-2-3 3-2ZM15 9l2 1-3 5-5 3-2-1 4-3 2-4 2-1ZM7 18l-3 4-2-2 2-3 3 1ZM9 20h3M19 15v7M15.5 18.5h7M2 13h.01",
} as const;

export type WizardIconName = keyof typeof PATHS;

export const INTEREST_ICONS: Record<Interest, WizardIconName> = {
  自然风景: "mountain",
  历史文化: "torii",
  美食: "cutlery",
  摄影: "camera",
  温泉疗愈: "onsen",
  艺术展馆: "art",
  动漫娱乐: "game",
  购物: "bag",
  城市探索: "city",
  户外活动: "hiking",
  夜间体验: "moon",
  亲子体验: "people",
  传统体验: "tea",
  主题乐园: "castle",
  乡村小镇: "house",
  季节限定: "blossom",
};

export const DESTINATION_ICONS: Record<string, WizardIconName> = {
  东京: "tokyoTower",
  "大阪/关西": "dotonbori",
  北海道: "sapporoClockTower",
  京都: "inariTorii",
  中部: "shirakawaGo",
  九州: "sakurajima",
  冲绳: "shuriCastle",
};

export function WizardIcon({ name }: { name: WizardIconName }) {
  return (
    <svg
      aria-hidden="true"
      data-wizard-icon={name}
      className={styles.wizardIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
