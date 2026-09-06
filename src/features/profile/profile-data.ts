export type ProfileDetails = {
  displayName: string;
  legalName: string;
  birthday: string;
  gender: string;
  countryRegion: string;
  city: string;
};

export type DisplaySettings = {
  language: string;
  region: string;
  timezone: string;
  currency: string;
  distanceUnit: string;
  temperatureUnit: string;
  timeFormat: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  relationship: string;
  countryCode: string;
  phone: string;
  email: string;
  note: string;
};

export type AvatarState = {
  kind: "current" | "default" | "local";
  fileName?: string;
  previewUrl?: string;
};

export type AccountDraft = {
  profile: ProfileDetails;
  settings: DisplaySettings;
  contacts: EmergencyContact[];
  avatar: AvatarState;
};

export const initialAccountDraft: AccountDraft = {
  profile: {
    displayName: "Yuki",
    legalName: "山田由纪",
    birthday: "1995-08-12",
    gender: "女",
    countryRegion: "日本",
    city: "东京",
  },
  settings: {
    language: "简体中文",
    region: "日本",
    timezone: "Asia/Tokyo",
    currency: "JPY (¥)",
    distanceUnit: "公里 (km)",
    temperatureUnit: "摄氏度 (°C)",
    timeFormat: "24 小时制 (13:00)",
  },
  contacts: [
    {
      id: "contact-yamada-taro",
      name: "山田 太郎",
      relationship: "父亲",
      countryCode: "+81",
      phone: "90-1234-5678",
      email: "",
      note: "",
    },
  ],
  avatar: { kind: "current" },
};

export const emptyEmergencyContact = (): EmergencyContact => ({
  id: `contact-${Date.now()}`,
  name: "",
  relationship: "",
  countryCode: "+81",
  phone: "",
  email: "",
  note: "",
});

export const regionRecommendations: Record<
  string,
  Pick<
    DisplaySettings,
    "timezone" | "currency" | "distanceUnit" | "temperatureUnit"
  >
> = {
  日本: {
    timezone: "Asia/Tokyo",
    currency: "JPY (¥)",
    distanceUnit: "公里 (km)",
    temperatureUnit: "摄氏度 (°C)",
  },
  中国: {
    timezone: "Asia/Shanghai",
    currency: "CNY (¥)",
    distanceUnit: "公里 (km)",
    temperatureUnit: "摄氏度 (°C)",
  },
  法国: {
    timezone: "Europe/Paris",
    currency: "EUR (€)",
    distanceUnit: "公里 (km)",
    temperatureUnit: "摄氏度 (°C)",
  },
  美国: {
    timezone: "America/Los_Angeles",
    currency: "USD ($)",
    distanceUnit: "英里 (mi)",
    temperatureUnit: "华氏度 (°F)",
  },
};
