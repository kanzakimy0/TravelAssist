import test from "node:test";
import assert from "node:assert/strict";
import { homeViewerFromVerifiedUser } from "../src/features/home/home-viewer.ts";
import {
  informationLinks,
  informationPages,
} from "../src/features/information/information-content.ts";

test("Home profile handles incomplete, invalid and excessively long verified metadata", () => {
  assert.deepEqual(homeViewerFromVerifiedUser({}), {
    name: "个人中心",
    avatar: undefined,
  });
  for (const avatar_url of [
    "javascript:alert(1)",
    "//example.com/a",
    "http://example.com/a",
    "https://user:secret@example.com/a",
    {},
    "invalid",
  ]) {
    assert.equal(
      homeViewerFromVerifiedUser({ user_metadata: { avatar_url } }).avatar,
      undefined,
    );
  }
  const result = homeViewerFromVerifiedUser({
    user_metadata: {
      display_name: "  实际名字  ",
      full_name: "另一个名字",
      avatar_url: "https://example.com/avatar.webp",
    },
  });
  assert.deepEqual(result, {
    name: "实际名字",
    avatar: "https://example.com/avatar.webp",
  });
  assert.equal(
    homeViewerFromVerifiedUser({ user_metadata: { name: "旅".repeat(100) } })
      .name.length,
    60,
  );
  assert.equal(
    homeViewerFromVerifiedUser({
      user_metadata: { name: 42, full_name: " ", display_name: null },
    }).name,
    "个人中心",
  );
});
test("every footer destination has an independent information document; AI boundaries stay explicit", () => {
  assert.equal(informationLinks.length, 4);
  for (const link of informationLinks)
    assert.ok(informationPages[link.href.slice(1)]?.sections.length);
  const ai = informationPages["ai-information"].sections
    .map((s) => s.title)
    .join(" ");
  for (const boundary of [
    "AI 建议不等于官方信息",
    "旅行规划不等于已完成预订",
    "价格显示不等于最终成交价格",
    "预计交通时间不等于实际运行保证",
    "第三方预约状态以对应服务商为准",
  ])
    assert.ok(ai.includes(boundary));
  assert.equal(informationPages.help.sections.length, 5);
});
