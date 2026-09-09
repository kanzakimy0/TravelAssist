import http from "node:http";
// Local visual QA fixture only: no real Auth, DB, credentials or external traffic.
http
  .createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (
      req.url === "/auth/v1/user" &&
      [
        "Bearer task024-visual-fixture",
        "Bearer task0252-verified-profile",
      ].includes(req.headers.authorization)
    ) {
      res.end(
        JSON.stringify({
          id: "00000000-0000-4000-8000-000000000024",
          aud: "authenticated",
          role: "authenticated",
          email: "visual@example.invalid",
          created_at: "2026-09-09T00:00:00Z",
          app_metadata: {},
          user_metadata:
            req.headers.authorization === "Bearer task0252-verified-profile"
              ? {
                  full_name: "验收账户",
                  avatar_url: "https://avatar.example.invalid/verified.webp",
                }
              : {},
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
