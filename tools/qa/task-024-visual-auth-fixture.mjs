import http from "node:http";
import { randomUUID } from "node:crypto";
// Loopback-only QA adapter. Never imported by runtime; no real credentials or providers.
// TASK-031 extends the existing visual fixture with bounded sign-in/sign-out exercises.
const accountFlow = process.env.TASK_031_AUTH_FIXTURE === "1";
const sessions = new Map();
const legacy = new Map([
  ["task024-visual-fixture", {}],
  [
    "task0252-verified-profile",
    {
      full_name: "验收账户",
      avatar_url: "https://avatar.example.invalid/verified.webp",
    },
  ],
]);
const profile = {
  full_name: "验收账户",
  avatar_url: "https://avatar.example.invalid/verified.webp",
};
function user(metadata) {
  return {
    id: "00000000-0000-4000-8000-000000000024",
    aud: "authenticated",
    role: "authenticated",
    email: "visual@example.invalid",
    created_at: "2026-09-09T00:00:00Z",
    app_metadata: {},
    user_metadata: metadata,
  };
}
http
  .createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const metadata = sessions.get(token) ?? legacy.get(token);
    if (req.url === "/auth/v1/user" && req.method === "GET" && metadata) {
      res.end(JSON.stringify(user(metadata)));
      return;
    }
    if (
      accountFlow &&
      req.url === "/auth/v1/token?grant_type=password" &&
      req.method === "POST"
    ) {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 8192) {
          res.writeHead(413);
          res.end();
          return;
        }
      }
      let input;
      try {
        input = JSON.parse(body);
      } catch {
        input = {};
      }
      if (
        input.email === "visual@example.invalid" &&
        input.password === "LocalFixture031!"
      ) {
        const access_token = "task031-" + randomUUID();
        sessions.set(access_token, profile);
        res.end(
          JSON.stringify({
            access_token,
            refresh_token: "fixture-refresh",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: user(profile),
          }),
        );
        return;
      }
    }
    if (
      accountFlow &&
      req.url?.startsWith("/auth/v1/logout") &&
      req.method === "POST" &&
      metadata
    ) {
      sessions.delete(token);
      res.statusCode = 204;
      res.end();
      return;
    }
    res.statusCode = 401;
    res.end(JSON.stringify({ code: "bad_jwt", message: "local fixture only" }));
  })
  .listen(54224, "127.0.0.1");
