import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  changeRegion,
  defaultSettings,
  regionSuggestion,
  profileErrors,
  emergencyErrors,
  emptyContact,
  isChanged,
} from "../src/features/profile/model.ts";

test("nickname rejects empty or whitespace and accepts a display name", () => {
  for (const nickname of ["", "  ", "\t"])
    assert.equal(profileErrors({ nickname }).nickname, "请输入昵称");
  assert.deepEqual(profileErrors({ nickname: "Yuki" }), {});
});
test("region changes preserve all manually selected localization values", () => {
  const manual = {
    ...defaultSettings,
    timezone: "UTC",
    currency: "EUR €",
    distance: "mi",
    temperature: "°F",
    timeFormat: "12 小时",
  };
  const snapshot = structuredClone(manual);
  for (const region of ["中国", "美国", "英国", "其他"]) {
    assert.deepEqual(changeRegion(manual, region), { ...manual, region });
    assert.deepEqual(manual, snapshot);
  }
});
test("recommendations are separate from state and unknown regions have none", () => {
  assert.equal(regionSuggestion("美国").currency, "USD $");
  assert.equal(regionSuggestion("日本").timezone, "Asia/Tokyo");
  assert.equal(regionSuggestion("其他"), undefined);
  assert.equal(defaultSettings.currency, "JPY ¥");
});
test("emergency contacts validate every required field and email only when provided", () => {
  assert.deepEqual(Object.keys(emergencyErrors(emptyContact())), [
    "name",
    "relationship",
    "callingCode",
    "phone",
  ]);
  const contact = {
    ...emptyContact(),
    name: "Test",
    relationship: "朋友",
    callingCode: "日本 +81",
    phone: "090 0000 0000",
  };
  assert.deepEqual(emergencyErrors(contact), {});
  assert.equal(
    emergencyErrors({ ...contact, email: "invalid" }).email,
    "请输入有效的邮箱地址",
  );
  assert.deepEqual(
    emergencyErrors({ ...contact, email: "test@example.com" }),
    {},
  );
});
test("draft equality handles cancel, changes and deleted avatar distinctly", () => {
  const saved = { nickname: "Yuki", avatar: "default" };
  assert.equal(isChanged(saved, { ...saved }), false);
  assert.equal(isChanged(saved, { ...saved, avatar: null }), true);
  assert.equal(isChanged(saved, { ...saved, nickname: "Ren" }), true);
});
test("account layout stays a server component and profile has no persistence adapters", () => {
  assert.doesNotMatch(
    readFileSync(
      new URL(
        "../src/app/(account)/personal-center/layout.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    /["']use client["']/,
  );
  for (const name of [
    "profile-account.tsx",
    "components/profile-card.tsx",
    "components/settings-card.tsx",
    "components/emergency-contacts.tsx",
    "components/avatar-editor.tsx",
  ]) {
    const source = readFileSync(
      new URL("../src/features/profile/" + name, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /localStorage|sessionStorage|document\.cookie|fetch\(|supabase|axios|\/api\//,
    );
  }
});
