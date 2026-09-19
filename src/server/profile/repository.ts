import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index";
import { profiles } from "../../db/schema/profiles";
import { profileSettings } from "../../db/schema/profile-settings";
import { emergencyContacts } from "../../db/schema/emergency-contacts";
import {
  ProfileApiError,
  parseEmergencyContactId,
  parseUpdateProfileAccountV1,
  parseCreateEmergencyContactV1,
  parseUpdateEmergencyContactV1,
  parseEmergencyContactViewV1,
  parseProfileAccountViewV1,
  type ProfileAccountViewV1,
  type UpdateProfileAccountRequestV1,
  type CreateEmergencyContactRequestV1,
  type UpdateEmergencyContactRequestV1,
} from "../../features/profile/domain/profile-account-v1";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
const profileColumns = {
  displayName: profiles.displayName,
  fullName: profiles.fullName,
  birthDate: profiles.birthDate,
  genderCode: profiles.genderCode,
  residenceCountryCode: profiles.residenceCountryCode,
  residenceCity: profiles.residenceCity,
  avatarPath: profiles.avatarPath,
  createdAt: profiles.createdAt,
  updatedAt: profiles.updatedAt,
};
const settingsColumns = {
  locale: profileSettings.locale,
  regionCode: profileSettings.regionCode,
  timezone: profileSettings.timezone,
  currencyCode: profileSettings.currencyCode,
  distanceUnit: profileSettings.distanceUnit,
  temperatureUnit: profileSettings.temperatureUnit,
  timeFormat: profileSettings.timeFormat,
  createdAt: profileSettings.createdAt,
  updatedAt: profileSettings.updatedAt,
};
const contactColumns = {
  id: emergencyContacts.id,
  name: emergencyContacts.name,
  relationship: emergencyContacts.relationship,
  phoneE164: emergencyContacts.phoneE164,
  countryCode: emergencyContacts.countryCode,
  email: emergencyContacts.email,
  note: emergencyContacts.note,
  createdAt: emergencyContacts.createdAt,
  updatedAt: emergencyContacts.updatedAt,
};
const empty = (columns: Record<string, unknown>) =>
  Object.fromEntries(Object.keys(columns).map((key) => [key, null]));

function auditView<T extends { createdAt: Date; updatedAt: Date }>(row: T) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
function databaseView<T>(read: () => T): T {
  try {
    return read();
  } catch {
    throw new ProfileApiError("PROFILE_UNAVAILABLE");
  }
}
type ContactRow = Pick<
  typeof emergencyContacts.$inferSelect,
  keyof typeof contactColumns
>;
function contactView(row: ContactRow) {
  return databaseView(() => parseEmergencyContactViewV1(auditView(row)));
}

/** Only call with the owner returned by verifiedPrivateRequest. No caller identity accepted. */
export function profileRepository(verifiedOwner: string) {
  const owner = parseEmergencyContactId(verifiedOwner);
  async function transaction<T>(
    run: (tx: Transaction) => Promise<T>,
    readOnly = false,
  ): Promise<T> {
    return getDb().transaction(
      async (tx) => {
        // Transaction-local role/claims prevent pool leakage and retain existing RLS.
        // DATABASE_URL is the accepted trusted backend connection, never a service-role API client.
        await tx.execute(sql`set local role authenticated`);
        await tx.execute(
          sql`select set_config('request.jwt.claim.sub', ${owner}, true), set_config('request.jwt.claims', ${JSON.stringify({ sub: owner, role: "authenticated" })}, true)`,
        );
        return run(tx);
      },
      readOnly
        ? { isolationLevel: "repeatable read", accessMode: "read only" }
        : undefined,
    );
  }
  async function contacts(tx: Transaction) {
    const rows = await tx
      .select(contactColumns)
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, owner))
      .orderBy(asc(emergencyContacts.createdAt), asc(emergencyContacts.id));
    return rows.map(contactView);
  }
  async function aggregate(
    tx: Transaction,
    authContact: ProfileAccountViewV1["authContact"],
  ) {
    const [profile] = await tx
      .select(profileColumns)
      .from(profiles)
      .where(eq(profiles.id, owner));
    const [settings] = await tx
      .select(settingsColumns)
      .from(profileSettings)
      .where(eq(profileSettings.userId, owner));
    const emergencyContacts = await contacts(tx);
    return databaseView(() =>
      parseProfileAccountViewV1({
        schemaVersion: "1.0",
        profile: profile ? auditView(profile) : empty(profileColumns),
        settings: settings ? auditView(settings) : empty(settingsColumns),
        authContact,
        emergencyContacts,
      }),
    );
  }
  const condition = (id: string) =>
    and(
      eq(emergencyContacts.userId, owner),
      eq(emergencyContacts.id, parseEmergencyContactId(id)),
    );
  function found(rows: ContactRow[]) {
    if (!rows.length) throw new ProfileApiError("EMERGENCY_CONTACT_NOT_FOUND");
    return contactView(rows[0]);
  }
  return {
    read: (authContact: ProfileAccountViewV1["authContact"]) =>
      transaction((tx) => aggregate(tx, authContact), true),
    async patch(
      input: UpdateProfileAccountRequestV1,
      authContact: ProfileAccountViewV1["authContact"],
    ) {
      const patch = parseUpdateProfileAccountV1(
        input,
        new Date().toISOString().slice(0, 10),
      );
      return transaction(async (tx) => {
        if (patch.profile && Object.keys(patch.profile).length)
          await tx
            .insert(profiles)
            .values({ id: owner, ...patch.profile })
            .onConflictDoUpdate({
              target: profiles.id,
              set: patch.profile,
              setWhere: eq(profiles.id, owner),
            });
        if (patch.settings && Object.keys(patch.settings).length)
          await tx
            .insert(profileSettings)
            .values({ userId: owner, ...patch.settings })
            .onConflictDoUpdate({
              target: profileSettings.userId,
              set: patch.settings,
              setWhere: eq(profileSettings.userId, owner),
            });
        return aggregate(tx, authContact);
      });
    },
    listContacts: () => transaction(contacts, true),
    async createContact(input: CreateEmergencyContactRequestV1) {
      const { schemaVersion: _version, ...values } =
        parseCreateEmergencyContactV1(input);
      void _version;
      return transaction(async (tx) =>
        found(
          await tx
            .insert(emergencyContacts)
            .values({ userId: owner, ...values })
            .returning(contactColumns),
        ),
      );
    },
    async updateContact(id: string, input: UpdateEmergencyContactRequestV1) {
      const where = condition(id);
      const { schemaVersion: _version, ...values } =
        parseUpdateEmergencyContactV1(input);
      void _version;
      return transaction(async (tx) =>
        found(
          await tx
            .update(emergencyContacts)
            .set(values)
            .where(where)
            .returning(contactColumns),
        ),
      );
    },
    async deleteContact(id: string) {
      const where = condition(id);
      return transaction(async (tx) => {
        const rows = await tx
          .delete(emergencyContacts)
          .where(where)
          .returning({ id: emergencyContacts.id });
        if (!rows.length)
          throw new ProfileApiError("EMERGENCY_CONTACT_NOT_FOUND");
      });
    },
  };
}
