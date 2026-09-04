export interface JapanPrefecture {
  id: string;
  name: string;
}

export interface JapanRegion {
  id: string;
  name: string;
  mapPath: string;
  labelX: number;
  labelY: number;
  prefectures: JapanPrefecture[];
}

function prefectures(names: string[]): JapanPrefecture[] {
  return names.map((name) => ({
    id: name,
    name,
  }));
}

export const JAPAN_REGIONS: JapanRegion[] = [
  {
    id: "hokkaido",
    name: "北海道",
    mapPath: "M244 22c35-11 71 0 89 27l-11 55-68 5-28-39z",
    labelX: 280,
    labelY: 67,
    prefectures: prefectures(["北海道"]),
  },
  {
    id: "tohoku",
    name: "东北",
    mapPath: "M222 108l49 3 10 83-56 4-18-43z",
    labelX: 247,
    labelY: 154,
    prefectures: prefectures(["青森", "岩手", "宫城", "秋田", "山形", "福岛"]),
  },
  {
    id: "kanto",
    name: "关东",
    mapPath: "M213 200l68-3 19 48-61 35-39-33z",
    labelX: 251,
    labelY: 238,
    prefectures: prefectures([
      "茨城",
      "栃木",
      "群马",
      "埼玉",
      "千叶",
      "东京",
      "神奈川",
    ]),
  },
  {
    id: "chubu",
    name: "中部",
    mapPath: "M143 188l65-20 30 31-39 55-66 10-22-35z",
    labelX: 176,
    labelY: 221,
    prefectures: prefectures([
      "新潟",
      "富山",
      "石川",
      "福井",
      "山梨",
      "长野",
      "岐阜",
      "静冈",
      "爱知",
    ]),
  },
  {
    id: "kansai",
    name: "关西",
    mapPath: "M105 252l40-9 45 23-11 55-59 12-31-40z",
    labelX: 140,
    labelY: 289,
    prefectures: prefectures([
      "三重",
      "滋贺",
      "京都",
      "大阪",
      "兵库",
      "奈良",
      "和歌山",
    ]),
  },
  {
    id: "chugoku",
    name: "中国",
    mapPath: "M24 270l79-19 13 67-78 14-25-28z",
    labelX: 67,
    labelY: 294,
    prefectures: prefectures(["鸟取", "岛根", "冈山", "广岛", "山口"]),
  },
  {
    id: "shikoku",
    name: "四国",
    mapPath: "M71 337l69-10 17 34-69 24-29-17z",
    labelX: 107,
    labelY: 356,
    prefectures: prefectures(["德岛", "香川", "爱媛", "高知"]),
  },
  {
    id: "kyushu",
    name: "九州",
    mapPath: "M18 337l50 25 6 69-39 40-27-34 12-37-15-31z",
    labelX: 40,
    labelY: 405,
    prefectures: prefectures([
      "福冈",
      "佐贺",
      "长崎",
      "熊本",
      "大分",
      "宫崎",
      "鹿儿岛",
    ]),
  },
  {
    id: "okinawa",
    name: "冲绳",
    mapPath: "M109 424l18 8-8 19-17-7zm-33 34 13 7-7 15-13-7z",
    labelX: 111,
    labelY: 480,
    prefectures: prefectures(["冲绳"]),
  },
];

export const ALL_PREFECTURES = JAPAN_REGIONS.flatMap(
  (region) => region.prefectures,
);
