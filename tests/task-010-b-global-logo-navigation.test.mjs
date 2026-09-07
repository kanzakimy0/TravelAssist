import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
function links(source) {
  const file = ts.createSourceFile(
    "component.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const result = [];
  function visit(node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      if (["Link", "GuardedLink"].includes(opening.tagName.getText(file))) {
        const props = {};
        for (const attr of opening.attributes.properties) {
          if (
            ts.isJsxAttribute(attr) &&
            attr.initializer &&
            ts.isStringLiteral(attr.initializer)
          ) {
            props[attr.name.getText(file)] = attr.initializer.text;
          }
        }
        result.push({
          ...props,
          tag: opening.tagName.getText(file),
          text: node.children.map((child) => child.getText(file)).join(" "),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}

test("product brands target home, both account variants retain GuardedLink", async () => {
  for (const file of [
    "src/features/home/components/compact-header.tsx",
    "src/features/start-flow/components/start-flow-header.tsx",
    "src/features/planner/components/workspace-header.tsx",
  ]) {
    const brands = links(await read(file)).filter((link) =>
      `${link.text} ${link["aria-label"]}`.includes("TravelAssist"),
    );
    assert.ok(brands.length > 0, file);
    assert.ok(
      brands.every((link) => link.href === "/"),
      file,
    );
  }
  const brands = links(
    await read("src/features/personal-center/components/personal-sidebar.tsx"),
  ).filter((link) => link["aria-label"] === "TravelAssist 首页");
  assert.equal(brands.length, 2);
  assert.ok(
    brands.every((link) => link.href === "/" && link.tag === "GuardedLink"),
  );
  assert.match(
    await read("src/features/personal-center/constants/personal-navigation.ts"),
    /href: "\/personal-center", label: "我的首页"/,
  );
});

test("Personal Home and Trips expose exact destinations without enabling fake features", async () => {
  const home = await read(
    "src/features/personal-center/components/personal-home-preview.tsx",
  );
  const actions = links(home);
  for (const [label, href] of [
    ["继续规划", "/planner"],
    ["开始新旅行", "/start?entry=step3"],
  ]) {
    assert.ok(
      actions.some(
        (link) =>
          link.text.includes(label) &&
          link.href === href &&
          link.tag === "GuardedLink",
      ),
    );
  }
  assert.match(home, /尚未接入真实保存行程/);
  const trips = await read("src/app/(account)/personal-center/trips/page.tsx");
  assert.match(trips, /href: "\/start\?entry=step3", label: "开始新旅行"/);
  assert.match(trips, /href: "\/planner", label: "返回当前规划"/);
  assert.match(trips, /真实保存行程列表尚未接入/);
  const avatar = await read(
    "src/features/personal-center/components/avatar-popover.tsx",
  );
  const menu = await read(
    "src/features/personal-center/constants/avatar-menu.ts",
  );
  assert.doesNotMatch(avatar + menu, /返回首页|返回 TravelAssist|href="#"/);
  assert.match(avatar, /disabled/);
  assert.doesNotMatch(home + trips, /href="#"/);
});
