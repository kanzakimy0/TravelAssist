export type Profile = {
  nickname: string;
  name: string;
  birthday: string;
  gender: string;
  region: string;
  city: string;
  avatar: string | null;
};

export type Settings = {
  language: string;
  region: string;
  timezone: string;
  currency: string;
  distance: string;
  temperature: string;
  timeFormat: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  callingCode: string;
  phone: string;
  email: string;
  note: string;
};

export const regions = [
  "日本",
  "中国",
  "美国",
  "英国",
  "法国",
  "澳大利亚",
  "其他",
];
export const defaultSettings: Settings = {
  language: "简体中文",
  region: "日本",
  timezone: "Asia/Tokyo",
  currency: "JPY ¥",
  distance: "km",
  temperature: "°C",
  timeFormat: "24 小时",
};
export const settingsOptions: Record<keyof Settings, string[]> = {
  language: ["简体中文", "繁體中文", "日本語", "English"],
  region: regions,
  timezone: [
    "Asia/Tokyo",
    "Asia/Shanghai",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Australia/Sydney",
    "UTC",
  ],
  currency: ["JPY ¥", "CNY ¥", "USD $", "GBP £", "EUR €", "AUD $"],
  distance: ["km", "mi"],
  temperature: ["°C", "°F"],
  timeFormat: ["24 小时", "12 小时"],
};
export const settingsLabels: Record<keyof Settings, string> = {
  language: "界面语言",
  region: "国家 / 地区",
  timezone: "时区",
  currency: "默认货币",
  distance: "距离单位",
  temperature: "温度单位",
  timeFormat: "时间格式",
};
type Suggestion = Pick<
  Settings,
  "timezone" | "currency" | "distance" | "temperature"
>;
const suggestions: Record<string, Suggestion> = {
  日本: {
    timezone: "Asia/Tokyo",
    currency: "JPY ¥",
    distance: "km",
    temperature: "°C",
  },
  中国: {
    timezone: "Asia/Shanghai",
    currency: "CNY ¥",
    distance: "km",
    temperature: "°C",
  },
  美国: {
    timezone: "America/New_York",
    currency: "USD $",
    distance: "mi",
    temperature: "°F",
  },
  英国: {
    timezone: "Europe/London",
    currency: "GBP £",
    distance: "mi",
    temperature: "°C",
  },
  法国: {
    timezone: "Europe/Paris",
    currency: "EUR €",
    distance: "km",
    temperature: "°C",
  },
  澳大利亚: {
    timezone: "Australia/Sydney",
    currency: "AUD $",
    distance: "km",
    temperature: "°C",
  },
};
export function regionSuggestion(region: string) {
  return suggestions[region];
}
// Region selection only changes the selected region. Recommendations require an explicit action.
export function changeRegion(settings: Settings, region: string): Settings {
  return { ...settings, region };
}
export function profileErrors(profile: Profile): Record<string, string> {
  return profile.nickname.trim() ? {} : { nickname: "请输入昵称" };
}
export function emergencyErrors(
  contact: EmergencyContact,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, label] of [
    ["name", "姓名"],
    ["relationship", "关系"],
    ["callingCode", "国家 / 区号"],
    ["phone", "电话"],
  ] as const) {
    if (!contact[key].trim()) errors[key] = `请填写${label}`;
  }
  if (
    contact.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())
  )
    errors.email = "请输入有效的邮箱地址";
  return errors;
}
export function emptyContact(): EmergencyContact {
  return {
    id: "",
    name: "",
    relationship: "",
    callingCode: "",
    phone: "",
    email: "",
    note: "",
  };
}
export function isChanged<T>(saved: T, draft: T) {
  return JSON.stringify(saved) !== JSON.stringify(draft);
}
export type DirtyReporter = (section: string, dirty: boolean) => void;
