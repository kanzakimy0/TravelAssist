export const validDeletion = () => ({
  schemaVersion: "1.0",
  confirmation: "DELETE_ACCOUNT",
  externalBookingsAcknowledged: true,
});
export function invalidDeletions() {
  const result = [
    ["null", null],
    ["array", []],
    ["string", "DELETE_ACCOUNT"],
  ];
  for (const key of Object.keys(validDeletion())) {
    const x = validDeletion();
    delete x[key];
    result.push(["missing " + key, x]);
  }
  for (const [key, values] of [
    ["schemaVersion", [null, 1, "2.0", "1.0\n"]],
    ["confirmation", [null, "删除账户", "DELETE_ACCOUNT ", true]],
    ["externalBookingsAcknowledged", [false, null, "true", 1]],
  ])
    for (const v of values)
      result.push([
        "wrong " + key + " " + String(v),
        { ...validDeletion(), [key]: v },
      ]);
  for (const key of [
    "id",
    "userId",
    "ownerUserId",
    "target",
    "email",
    "phone",
    "role",
    "createdAt",
    "unknown",
  ])
    result.push(["injected " + key, { ...validDeletion(), [key]: "other" }]);
  return result;
}
