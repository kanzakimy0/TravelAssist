import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  projectHistoryDetail,
  projectHistoryList,
} from "../src/features/personal-center/ai-history/projection.ts";

const source = {
  id: "canonical-conversation-1",
  updatedAt: "2026-09-27T01:00:00.000Z",
  title: "Hidden system title",
  messages: [
    {
      id: "system-1",
      role: "system",
      blocks: [{ type: "text", visibility: "user", text: "SECRET SYSTEM" }],
    },
    {
      id: "user-1",
      role: "user",
      createdAt: "2026-09-27T00:00:00.000Z",
      blocks: [
        {
          type: "text",
          visibility: "user",
          text: "Visit Kyoto <script>alert(1)</script>",
        },
        { type: "text", visibility: "internal", text: "HIDDEN USER NOTES" },
      ],
    },
    {
      id: "tool-1",
      role: "tool",
      blocks: [{ type: "text", visibility: "user", text: "RAW TOOL OUTPUT" }],
    },
    {
      id: "assistant-1",
      role: "assistant",
      blocks: [
        { type: "text", visibility: "user", text: "Try the north path." },
        {
          type: "citation",
          visibility: "user",
          label: "Official guide",
          url: "javascript:alert(1)",
        },
        {
          type: "tool_output",
          visibility: "user",
          raw: "RAW PROVIDER RESPONSE",
        },
        { type: "reasoning", visibility: "internal", text: "CHAIN OF THOUGHT" },
      ],
    },
    {
      id: "developer-1",
      role: "developer",
      blocks: [{ type: "text", visibility: "user", text: "SECRET DEVELOPER" }],
    },
  ],
  providerRequest: { authorization: "TOKEN" },
};

// Test-only in-memory reader. The production module never imports this file.
function fixtureReader(ownerId, snapshots) {
  return {
    async listHistory(actorId) {
      if (actorId !== ownerId) return { status: "unavailable" };
      const data = projectHistoryList(snapshots);
      return data.length ? { status: "ready", data } : { status: "empty" };
    },
    async readHistoryDetail(actorId, conversationId) {
      if (actorId !== ownerId) return { status: "unavailable" };
      const snapshot = snapshots.find((item) => item.id === conversationId);
      return snapshot
        ? { status: "ready", data: projectHistoryDetail(snapshot) }
        : { status: "empty" };
    },
  };
}

test("fixture reader distinguishes ready, empty and unavailable with actor scope", async () => {
  const reader = fixtureReader("owner", [source]);
  assert.equal((await reader.listHistory("owner")).status, "ready");
  assert.equal((await reader.listHistory("other")).status, "unavailable");
  assert.equal(
    (await reader.readHistoryDetail("owner", source.id)).status,
    "ready",
  );
  assert.equal(
    (await reader.readHistoryDetail("other", source.id)).status,
    "unavailable",
  );
  assert.equal(
    (await reader.readHistoryDetail("owner", "missing")).status,
    "empty",
  );
  assert.equal(
    (await fixtureReader("owner", []).listHistory("owner")).status,
    "empty",
  );
});

test("projection keeps canonical IDs and visible text while dropping internal material", () => {
  const detail = projectHistoryDetail(source);
  assert.equal(detail.conversationId, source.id);
  assert.deepEqual(
    detail.messages.map((message) => message.id),
    ["user-1", "assistant-1"],
  );
  assert.equal(detail.title, "Visit Kyoto <script>alert(1)</script>");
  assert.equal(detail.partial, true);
  assert.equal(
    detail.messages[0].blocks[0].text,
    source.messages[1].blocks[0].text,
  );
  assert.deepEqual(detail.messages[1].blocks[1], {
    kind: "citation",
    label: "Official guide",
  });
  const serialized = JSON.stringify(detail);
  for (const forbidden of [
    "SECRET",
    "HIDDEN",
    "RAW",
    "CHAIN",
    "TOKEN",
    "javascript:",
  ])
    assert.equal(serialized.includes(forbidden), false, forbidden);
  const html = renderToStaticMarkup(
    createElement("p", null, detail.messages[0].blocks[0].text),
  );
  assert.equal(html.includes("<script>"), false);
  assert.match(html, /&lt;script&gt;/);
});

test("list is newest first with deterministic ties, exact timestamps and bounded previews", () => {
  const older = {
    ...source,
    id: "older",
    updatedAt: "2026-09-26T00:00:00.000Z",
  };
  const tied = {
    ...source,
    id: "aaa",
    messages: [
      {
        id: "u2",
        role: "user",
        blocks: [{ type: "text", visibility: "user", text: "x".repeat(300) }],
      },
    ],
  };
  const items = projectHistoryList([older, source, tied]);
  assert.deepEqual(
    items.map((item) => item.conversationId),
    ["aaa", source.id, "older"],
  );
  assert.equal(items[1].lastActivityAt, source.updatedAt);
  assert.ok(Array.from(items[0].preview).length <= 141);
  assert.equal(items[1].visibleMessageCount, 2);
});

test("unknown fields are omitted and no artificial identity or timestamp is invented", () => {
  assert.equal(projectHistoryDetail({ messages: [] }), null);
  assert.deepEqual(projectHistoryList([]), []);
  const detail = projectHistoryDetail({
    id: "canonical",
    messages: [
      {
        id: "m",
        role: "assistant",
        blocks: [{ type: "text", visibility: "user", text: "Hello" }],
      },
    ],
  });
  assert.equal(detail.title, "未命名对话");
  assert.equal(detail.messages[0].createdAt, null);
  assert.deepEqual(Object.keys(detail), [
    "conversationId",
    "title",
    "messages",
    "partial",
  ]);
});

test("production is unavailable; UI keeps empty, unavailable, error, loading and back paths", () => {
  const reader = readFileSync(
    "src/features/personal-center/ai-history/production-reader.ts",
    "utf8",
  );
  const ui = readFileSync(
    "src/features/personal-center/ai-history/history-surface.tsx",
    "utf8",
  );
  const loading = readFileSync(
    "src/app/(account)/personal-center/ai-history/loading.tsx",
    "utf8",
  );
  assert.equal((reader.match(/status: "unavailable"/g) ?? []).length, 2);
  assert.doesNotMatch(
    reader,
    /createFixture|historyFixture|localStorage|indexedDB|cookie|fetch\(/i,
  );
  for (const state of [
    "empty",
    "unavailable",
    "error",
    "重新加载",
    "返回个人中心",
    "返回 AI 历史",
  ])
    assert.ok(ui.includes(state), state);
  assert.match(loading, /PersonalPageSkeleton/);
  assert.doesNotMatch(
    ui,
    /dangerouslySetInnerHTML|localStorage|indexedDB|document\.cookie/,
  );
});

test("history is a secondary entry and five primary destinations remain frozen", () => {
  const home = readFileSync(
    "src/features/personal-center/components/personal-home-preview.tsx",
    "utf8",
  );
  const nav = readFileSync(
    "src/features/personal-center/constants/personal-navigation.ts",
    "utf8",
  );
  assert.match(home, /href="\/personal-center\/ai-history"/);
  assert.equal((nav.match(/href: "\/personal-center/g) ?? []).length, 5);
  assert.doesNotMatch(nav, /ai-history/);
});

test("Task adds no persistence or mutation endpoint", () => {
  const routes = readdirSync("src/app/(account)/personal-center/ai-history", {
    recursive: true,
  });
  assert.equal(
    routes.some((path) => String(path).endsWith("route.ts")),
    false,
  );
  const css = readFileSync(
    "src/features/personal-center/ai-history/history.module.css",
    "utf8",
  );
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 44px/);
  assert.match(
    readFileSync(
      "src/features/personal-center/personal-center.module.css",
      "utf8",
    ),
    /prefers-reduced-motion: reduce/,
  );
});
