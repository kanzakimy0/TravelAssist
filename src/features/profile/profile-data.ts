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
  kind: "current" | "default";
  path?: string;
};

export type AccountDraft = {
  profile: ProfileDetails;
  settings: DisplaySettings;
  contacts: EmergencyContact[];
  avatar: AvatarState;
};

export const initialAccountDraft: AccountDraft = {
  profile: {
    displayName: "",
    legalName: "",
    birthday: "",
    gender: "",
    countryRegion: "",
    city: "",
  },
  settings: {
    language: "",
    region: "",
    timezone: "",
    currency: "",
    distanceUnit: "",
    temperatureUnit: "",
    timeFormat: "",
  },
  contacts: [],
  avatar: { kind: "default" },
};

export const emptyEmergencyContact = (): EmergencyContact => ({
  id: `contact-${Date.now()}`,
  name: "",
  relationship: "",
  countryCode: "",
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
