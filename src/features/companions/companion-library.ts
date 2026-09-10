import type {
  CompanionGroupViewModel,
  CompanionViewModel,
} from "./companion-view-model";

export const COMPANION_LIBRARY_KEY = "travelassist.companion-library.v1";
export type CompanionLibrary = {
  version: 1;
  companions: CompanionViewModel[];
  groups: CompanionGroupViewModel[];
};
const text = (x: unknown): x is string =>
  typeof x === "string" && x.length <= 1000;
const list = (x: unknown): x is string[] =>
  Array.isArray(x) && x.length <= 100 && x.every(text);
export function parseCompanionLibrary(
  raw: string | null,
): CompanionLibrary | null {
  if (!raw) return null;
  try {
    const x = JSON.parse(raw) as CompanionLibrary;
    if (
      x.version !== 1 ||
      !Array.isArray(x.companions) ||
      !Array.isArray(x.groups) ||
      x.companions.length > 200 ||
      x.groups.length > 100
    )
      return null;
    if (
      !x.companions.every(
        (c) =>
          c &&
          text(c.id) &&
          text(c.displayName) &&
          text(c.relationship) &&
          ["adult", "senior", "child", "infant"].includes(c.ageGroup) &&
          list(c.mobilityNeeds) &&
          list(c.diningNeeds) &&
          list(c.activityPreferences) &&
          (c.dateOfBirth === undefined || text(c.dateOfBirth)) &&
          (c.gender === undefined || text(c.gender)) &&
          (c.avatarUrl === undefined || text(c.avatarUrl)) &&
          (c.diningNote === undefined || text(c.diningNote)) &&
          (c.privateNote === undefined || text(c.privateNote)) &&
          (c.isSelf === undefined || typeof c.isSelf === "boolean"),
      )
    )
      return null;
    const ids = new Set(x.companions.map((c) => c.id));
    if (
      ids.size !== x.companions.length ||
      new Set(x.groups.map((g) => g?.id)).size !== x.groups.length ||
      !x.groups.every(
        (g) =>
          g &&
          text(g.id) &&
          text(g.name) &&
          text(g.description) &&
          list(g.companionIds) &&
          new Set(g.companionIds).size === g.companionIds.length &&
          g.companionIds.every((id) => ids.has(id)),
      )
    )
      return null;
    return x;
  } catch {
    return null;
  }
}
export function writeCompanionLibrary(
  storage: Pick<Storage, "getItem" | "setItem">,
  value: CompanionLibrary,
  expected: string | null,
) {
  if (storage.getItem(COMPANION_LIBRARY_KEY) !== expected)
    throw Error("同行人资料已在另一页面修改，请刷新后重试；本次编辑仍保留。");
  // Uploaded blob avatars only live in the current browser document.
  const raw = JSON.stringify({
    ...value,
    companions: value.companions.map((c) => ({
      ...c,
      avatarUrl: c.avatarUrl?.startsWith("blob:") ? undefined : c.avatarUrl,
    })),
  });
  if (!parseCompanionLibrary(raw))
    throw Error("同行人数据格式无效，未覆盖原资料。");
  storage.setItem(COMPANION_LIBRARY_KEY, raw);
  return raw;
}
