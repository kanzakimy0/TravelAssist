import type { AccountDraft, EmergencyContact } from "../profile-data";
import {
  parseProfileAccountViewV1,
  parseEmergencyContactViewV1,
  parseUpdateProfileAccountV1,
  parseCreateEmergencyContactV1,
} from "../domain/profile-account-v1";
type ProfileView = ReturnType<typeof parseProfileAccountViewV1>;
type ContactView = ReturnType<typeof parseEmergencyContactViewV1>;
const countries = { JP: "日本", CN: "中国", FR: "法国", US: "美国" };
const genders = {
  female: "女",
  male: "男",
  "non-binary": "非二元性别",
  "prefer-not-to-say": "不愿透露",
};
const settings = {
  language: [
    "locale",
    {
      "zh-Hans-CN": "简体中文",
      "zh-Hant-TW": "繁體中文",
      ja: "日本語",
      en: "English",
    },
  ],
  region: ["regionCode", countries],
  timezone: ["timezone", {}],
  currency: [
    "currencyCode",
    { JPY: "JPY (¥)", CNY: "CNY (¥)", EUR: "EUR (€)", USD: "USD ($)" },
  ],
  distanceUnit: ["distanceUnit", { km: "公里 (km)", mi: "英里 (mi)" }],
  temperatureUnit: [
    "temperatureUnit",
    { celsius: "摄氏度 (°C)", fahrenheit: "华氏度 (°F)" },
  ],
  timeFormat: [
    "timeFormat",
    { "24h": "24 小时制 (13:00)", "12h": "12 小时制 (1:00 PM)" },
  ],
} as const;
const profile = {
  displayName: ["displayName", {}],
  legalName: ["fullName", {}],
  birthday: ["birthDate", {}],
  gender: ["genderCode", genders],
  countryRegion: ["residenceCountryCode", countries],
  city: ["residenceCity", {}],
} as const;
function label(value: string | null, labels: Record<string, string>) {
  return value === null ? "" : (labels[value] ?? value);
}
function code(value: string, labels: Record<string, string>) {
  const trimmed = value.trim();
  return trimmed
    ? (Object.entries(labels).find(([, v]) => v === trimmed)?.[0] ?? trimmed)
    : null;
}
export function contactDraft(contact: ContactView): EmergencyContact {
  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phoneE164,
    countryCode: contact.countryCode ?? "",
    email: contact.email ?? "",
    note: contact.note ?? "",
  };
}
export function accountDraft(view: ProfileView): AccountDraft {
  return {
    profile: Object.fromEntries(
      Object.entries(profile).map(([key, [api, labels]]) => [
        key,
        label(view.profile[api], labels),
      ]),
    ) as AccountDraft["profile"],
    settings: Object.fromEntries(
      Object.entries(settings).map(([key, [api, labels]]) => [
        key,
        label(view.settings[api], labels),
      ]),
    ) as AccountDraft["settings"],
    contacts: view.emergencyContacts.map(contactDraft),
    avatar: view.profile.avatarPath
      ? { kind: "current", path: view.profile.avatarPath }
      : { kind: "default" },
  };
}
// Compare the display projection first: untouched unknown codes and nulls stay untouched.
export function accountPatch(saved: AccountDraft, draft: AccountDraft) {
  const patch: Record<string, unknown> = { schemaVersion: "1.0" };
  for (const [section, fields] of [
    ["profile", profile],
    ["settings", settings],
  ] as const) {
    const changes: Record<string, unknown> = {};
    for (const [key, [api, labels]] of Object.entries(fields)) {
      const current = draft[section] as Record<string, string>,
        previous = saved[section] as Record<string, string>;
      if (current[key] !== previous[key])
        changes[api] = code(current[key], labels);
    }
    if (
      section === "profile" &&
      saved.avatar.path &&
      draft.avatar.kind === "default"
    )
      changes.avatarPath = null;
    if (Object.keys(changes).length) patch[section] = changes;
  }
  return Object.keys(patch).length === 1
    ? null
    : parseUpdateProfileAccountV1(patch, new Date().toISOString().slice(0, 10));
}
export function contactInput(draft: EmergencyContact) {
  return parseCreateEmergencyContactV1({
    schemaVersion: "1.0",
    name: draft.name,
    relationship: draft.relationship,
    phoneE164: draft.phone.trim(),
    countryCode: draft.countryCode.trim() || null,
    email: draft.email.trim() || null,
    note: draft.note.trim() || null,
  });
}
