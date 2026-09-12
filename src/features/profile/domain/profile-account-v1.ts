export const profileErrorStatuses = {
  AUTH_REQUIRED: 401,
  AUTH_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_REQUEST: 400,
  PAYLOAD_TOO_LARGE: 413,
  PROFILE_UNAVAILABLE: 503,
  EMERGENCY_CONTACT_NOT_FOUND: 404,
} as const;
export type ProfileErrorCode = keyof typeof profileErrorStatuses;
export class ProfileApiError extends Error {
  readonly code: ProfileErrorCode;
  constructor(code: ProfileErrorCode) {
    super(code);
    this.code = code;
    this.name = "ProfileApiError";
  }
}
function invalid(): never {
  throw new ProfileApiError("INVALID_REQUEST");
}

// Accept JSON records only; inspect descriptors before reading untrusted properties.
function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    invalid();
  for (const key of Reflect.ownKeys(value)) {
    const d = Object.getOwnPropertyDescriptor(value, key)!;
    if (
      typeof key !== "string" ||
      !keys.includes(key) ||
      !d.enumerable ||
      !("value" in d)
    )
      invalid();
  }
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number): string {
  if (
    typeof value !== "string" ||
    !value.isWellFormed() ||
    /\p{Cc}/u.test(value)
  )
    invalid();
  const result = value.trim();
  if (!result || [...result].length > max) invalid();
  return result;
}
const bounded = (max: number) => (value: unknown) => text(value, max);
const nullable =
  <T>(parse: (value: unknown) => T) =>
  (value: unknown): T | null =>
    value === null ? null : parse(value);
function choice<const T extends readonly string[]>(values: T) {
  return (value: unknown): T[number] => {
    if (typeof value !== "string" || !values.includes(value)) invalid();
    return value as T[number];
  };
}
function country(value: unknown) {
  if (typeof value !== "string" || !/^[A-Z]{2}$/.test(value)) invalid();
  return value;
}
function date(value: unknown) {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value))
    invalid();
  const parsed = new Date(value + "T00:00:00.000Z");
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    invalid();
  return value;
}
function avatar(value: unknown) {
  const path = text(value, 1024);
  // Relative provider-neutral reference, never a URL, credential or encoded traversal.
  if (path !== value || /(^\/|[:\\%?#@]|(^|\/)\.\.?($|\/))/.test(path))
    invalid();
  return path;
}
function locale(value: unknown) {
  const tag = text(value, 255);
  if (tag !== value || !/^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*$/.test(tag))
    invalid();
  try {
    const canonical = Intl.getCanonicalLocales(tag)[0];
    if (
      Intl.DateTimeFormat.supportedLocalesOf([canonical], {
        localeMatcher: "lookup",
      }).length !== 1
    )
      invalid();
    return canonical;
  } catch {
    return invalid();
  }
}
function timezone(value: unknown) {
  const zone = text(value, 100);
  if (zone !== value || !/^[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)*$/.test(zone))
    invalid();
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
  } catch {
    invalid();
  }
  return zone;
}
const currencies = new Set(Intl.supportedValuesOf("currency"));
function currency(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[A-Z]{3}$/.test(value) ||
    !currencies.has(value)
  )
    invalid();
  return value;
}
function phone(value: unknown) {
  if (typeof value !== "string" || !/^\+[1-9][0-9]{1,14}$/.test(value))
    invalid();
  return value;
}
function email(value: unknown) {
  const result = text(value, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) invalid();
  const [local, domain] = result.split("@");
  return `${local}@${domain.toLowerCase()}`;
}
const profileFields = {
  displayName: nullable(bounded(100)),
  fullName: nullable(bounded(200)),
  birthDate: nullable(date),
  genderCode: nullable(bounded(64)),
  residenceCountryCode: nullable(country),
  residenceCity: nullable(bounded(200)),
  avatarPath: nullable(avatar),
};
const settingsFields = {
  locale: nullable(locale),
  regionCode: nullable(country),
  timezone: nullable(timezone),
  currencyCode: nullable(currency),
  distanceUnit: nullable(choice(["km", "mi"] as const)),
  temperatureUnit: nullable(choice(["celsius", "fahrenheit"] as const)),
  timeFormat: nullable(choice(["12h", "24h"] as const)),
};
const contactFields = {
  name: bounded(200),
  relationship: bounded(100),
  phoneE164: phone,
  countryCode: nullable(country),
  email: nullable(email),
  note: nullable(bounded(2000)),
};
type Fields = Record<string, (value: unknown) => unknown>;
type Parsed<F extends Fields> = { [K in keyof F]: ReturnType<F[K]> };
function fields<F extends Fields>(
  input: unknown,
  parsers: F,
  complete = false,
): Partial<Parsed<F>> {
  const value = record(input, Object.keys(parsers));
  const result: Record<string, unknown> = {};
  for (const [key, parse] of Object.entries(parsers)) {
    if (Object.hasOwn(value, key)) result[key] = parse(value[key]);
    else if (complete) invalid();
  }
  return result as Partial<Parsed<F>>;
}
export type ProfileFieldsV1 = Parsed<typeof profileFields>;
export type ProfileSettingsV1 = Parsed<typeof settingsFields>;
export interface UpdateProfileAccountRequestV1 {
  schemaVersion: "1.0";
  profile?: Partial<ProfileFieldsV1>;
  settings?: Partial<ProfileSettingsV1>;
}
export function parseUpdateProfileAccountV1(
  input: unknown,
  today: string,
): UpdateProfileAccountRequestV1 {
  const value = record(input, ["schemaVersion", "profile", "settings"]);
  if (value.schemaVersion !== "1.0") invalid();
  const result: UpdateProfileAccountRequestV1 = { schemaVersion: "1.0" };
  if (Object.hasOwn(value, "profile")) {
    result.profile = fields(value.profile, profileFields);
    if (result.profile.birthDate && result.profile.birthDate > date(today))
      invalid();
  }
  if (Object.hasOwn(value, "settings"))
    result.settings = fields(value.settings, settingsFields);
  if (
    !Object.keys(result.profile ?? {}).length &&
    !Object.keys(result.settings ?? {}).length
  )
    invalid();
  return result;
}
export type EmergencyContactFieldsV1 = Parsed<typeof contactFields>;
export type CreateEmergencyContactRequestV1 = { schemaVersion: "1.0" } & Pick<
  EmergencyContactFieldsV1,
  "name" | "relationship" | "phoneE164"
> &
  Partial<Pick<EmergencyContactFieldsV1, "countryCode" | "email" | "note">>;
export type UpdateEmergencyContactRequestV1 = {
  schemaVersion: "1.0";
} & Partial<EmergencyContactFieldsV1>;
export function parseUpdateEmergencyContactV1(
  input: unknown,
): UpdateEmergencyContactRequestV1 {
  const value = record(input, ["schemaVersion", ...Object.keys(contactFields)]);
  if (value.schemaVersion !== "1.0") invalid();
  const { schemaVersion: _version, ...patch } = value;
  void _version;
  const result = fields(patch, contactFields);
  if (!Object.keys(result).length) invalid();
  return { schemaVersion: "1.0", ...result };
}
export function parseCreateEmergencyContactV1(
  input: unknown,
): CreateEmergencyContactRequestV1 {
  const result = parseUpdateEmergencyContactV1(input);
  if (
    result.name === undefined ||
    result.relationship === undefined ||
    result.phoneE164 === undefined
  )
    invalid();
  return result as CreateEmergencyContactRequestV1;
}
export function parseEmergencyContactId(input: unknown): string {
  if (
    typeof input !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input,
    )
  )
    invalid();
  return input.toLowerCase();
}
function timestamp(input: unknown): string {
  if (
    typeof input !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/.test(
      input,
    ) ||
    !Number.isFinite(Date.parse(input))
  )
    invalid();
  return input;
}
const audit = {
  createdAt: nullable(timestamp),
  updatedAt: nullable(timestamp),
};
export type EmergencyContactViewV1 = EmergencyContactFieldsV1 & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export interface ProfileAccountViewV1 {
  schemaVersion: "1.0";
  profile: ProfileFieldsV1 & {
    createdAt: string | null;
    updatedAt: string | null;
  };
  settings: ProfileSettingsV1 & {
    createdAt: string | null;
    updatedAt: string | null;
  };
  authContact: {
    email: string | null;
    emailVerified: boolean;
    phone: string | null;
    phoneVerified: boolean;
  };
  emergencyContacts: EmergencyContactViewV1[];
}
export function parseEmergencyContactViewV1(
  input: unknown,
): EmergencyContactViewV1 {
  return fields(
    input,
    {
      ...contactFields,
      id: parseEmergencyContactId,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    true,
  ) as EmergencyContactViewV1;
}
function boolean(input: unknown): boolean {
  if (typeof input !== "boolean") invalid();
  return input;
}
export function parseProfileAccountViewV1(
  input: unknown,
): ProfileAccountViewV1 {
  const value = record(input, [
    "schemaVersion",
    "profile",
    "settings",
    "authContact",
    "emergencyContacts",
  ]);
  if (value.schemaVersion !== "1.0" || !Array.isArray(value.emergencyContacts))
    invalid();
  return {
    schemaVersion: "1.0",
    profile: fields(
      value.profile,
      { ...profileFields, ...audit },
      true,
    ) as ProfileAccountViewV1["profile"],
    settings: fields(
      value.settings,
      { ...settingsFields, ...audit },
      true,
    ) as ProfileAccountViewV1["settings"],
    authContact: fields(
      value.authContact,
      {
        email: nullable(bounded(320)),
        phone: nullable(bounded(32)),
        emailVerified: boolean,
        phoneVerified: boolean,
      },
      true,
    ) as ProfileAccountViewV1["authContact"],
    emergencyContacts: value.emergencyContacts.map(parseEmergencyContactViewV1),
  };
}
