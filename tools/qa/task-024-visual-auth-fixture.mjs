import http from "node:http";
// Local visual QA fixture only: no real Auth, DB, credentials or external traffic.
http
  .createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (
      req.url === "/auth/v1/user" &&
      req.headers.authorization === "Bearer task024-visual-fixture"
    ) {
      res.end(
        JSON.stringify({
          id: "00000000-0000-4000-8000-000000000024",
          aud: "authenticated",
          role: "authenticated",
          email: "visual@example.invalid",
          created_at: "2026-09-09T00:00:00Z",
          app_metadata: {},
          user_metadata: {},
        }),
      );
    } else {
      res.statusCode = 401;
      res.end(
        JSON.stringify({ code: "bad_jwt", message: "visual fixture only" }),
      );
    }
  })
  .listen(54224, "127.0.0.1");
